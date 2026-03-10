import { createServerSupabaseClient } from "./supabase-server";
import type {
  Mansion,
  Unit,
  Listing,
  Notification,
  PropertyImage,
  MansionWithStats,
  UnitWithStats,
  MansionStatus,
  UnitStatus,
} from "@/types";

// ─── 建物 ──────────────────────────────────

export async function getMansions(): Promise<MansionWithStats[]> {
  const supabase = await createServerSupabaseClient();
  let userId: string | null = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id || null;
  } catch {
    // 未認証
  }

  // 1. 全mansionを取得
  const { data: mansions, error } = await supabase
    .from("mansions")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error || !mansions) return [];

  const mansionIds = (mansions as Mansion[]).map((m) => m.id);
  if (mansionIds.length === 0) return [];

  // 2. 全unitsを一括取得
  const { data: allUnits } = await supabase
    .from("units")
    .select("id, mansion_id")
    .in("mansion_id", mansionIds);

  const units = (allUnits || []) as { id: string; mansion_id: string }[];
  const unitIds = units.map((u) => u.id);

  // mansion_id -> unitId[] のマップ
  const unitsByMansion = new Map<string, string[]>();
  for (const u of units) {
    const arr = unitsByMansion.get(u.mansion_id) || [];
    arr.push(u.id);
    unitsByMansion.set(u.mansion_id, arr);
  }

  // 3. 全listingsを一括取得
  let allListings: { unit_id: string; status: string; detected_at: string }[] = [];
  if (unitIds.length > 0) {
    const { data: listingsData } = await supabase
      .from("listings")
      .select("unit_id, status, detected_at")
      .in("unit_id", unitIds);
    allListings = (listingsData || []) as typeof allListings;
  }

  // unit_id -> listings のマップ
  const listingsByUnit = new Map<string, typeof allListings>();
  for (const l of allListings) {
    const arr = listingsByUnit.get(l.unit_id) || [];
    arr.push(l);
    listingsByUnit.set(l.unit_id, arr);
  }

  // 4. watchlistを一括取得
  const watchedMansionIds = new Set<string>();
  if (userId) {
    const { data: watches } = await supabase
      .from("user_watchlists")
      .select("target_mansion_id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .not("target_mansion_id", "is", null);
    for (const w of watches || []) {
      if (w.target_mansion_id) watchedMansionIds.add(w.target_mansion_id);
    }
  }

  // 5. メモリ上で集計
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const result: MansionWithStats[] = [];

  for (const mansion of mansions as Mansion[]) {
    const mansionUnitIds = unitsByMansion.get(mansion.id) || [];

    let activeCount = 0;
    let recentCount = 0;
    let lastDate: string | null = null;

    for (const uid of mansionUnitIds) {
      const listings = listingsByUnit.get(uid) || [];
      for (const l of listings) {
        if (l.status === "active") activeCount++;
        if (new Date(l.detected_at) >= thirtyDaysAgo) recentCount++;
        if (!lastDate || l.detected_at > lastDate) lastDate = l.detected_at;
      }
    }

    let status: MansionStatus = "unknown";
    if (activeCount > 0) status = "active";
    else if (lastDate) status = "past";

    result.push({
      ...mansion,
      active_listings_count: activeCount,
      known_unit_types_count: mansionUnitIds.length,
      recent_listings_count: recentCount,
      last_listing_date: lastDate
        ? new Date(lastDate).toISOString().split("T")[0]
        : null,
      is_watched: watchedMansionIds.has(mansion.id),
      status,
    });
  }

  return result;
}

export async function getMansionById(
  id: string
): Promise<MansionWithStats | null> {
  const supabase = await createServerSupabaseClient();
  let userId: string | null = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id || null;
  } catch {
    // 未認証
  }

  // 1. 対象mansionを直接取得
  const { data: mansion, error } = await supabase
    .from("mansions")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !mansion) return null;

  // 2. このmansionのunitsを取得
  const { data: units } = await supabase
    .from("units")
    .select("id")
    .eq("mansion_id", id);

  const unitIds = (units || []).map((u: { id: string }) => u.id);

  // 3. listingsを取得して集計
  let activeCount = 0;
  let recentCount = 0;
  let lastDate: string | null = null;

  if (unitIds.length > 0) {
    const { data: listings } = await supabase
      .from("listings")
      .select("status, detected_at")
      .in("unit_id", unitIds);

    if (listings) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      for (const l of listings) {
        if (l.status === "active") activeCount++;
        if (new Date(l.detected_at) >= thirtyDaysAgo) recentCount++;
        if (!lastDate || l.detected_at > lastDate) lastDate = l.detected_at;
      }
    }
  }

  // 4. watchlist確認
  let isWatched = false;
  if (userId) {
    const { data: watch } = await supabase
      .from("user_watchlists")
      .select("id")
      .eq("user_id", userId)
      .eq("target_mansion_id", id)
      .eq("is_active", true)
      .limit(1);
    isWatched = (watch || []).length > 0;
  }

  let status: MansionStatus = "unknown";
  if (activeCount > 0) status = "active";
  else if (lastDate) status = "past";

  return {
    ...(mansion as Mansion),
    active_listings_count: activeCount,
    known_unit_types_count: unitIds.length,
    recent_listings_count: recentCount,
    last_listing_date: lastDate
      ? new Date(lastDate).toISOString().split("T")[0]
      : null,
    is_watched: isWatched,
    status,
  };
}

// ─── 間取りタイプ ──────────────────────────────

export async function getUnitsByMansionId(
  mansionId: string
): Promise<UnitWithStats[]> {
  const supabase = await createServerSupabaseClient();
  let userId: string | null = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id || null;
  } catch {
    // 未認証
  }

  // 1. unitsを取得
  const { data: units, error } = await supabase
    .from("units")
    .select("*")
    .eq("mansion_id", mansionId)
    .order("size_sqm", { ascending: false });

  if (error || !units) return [];

  const unitIds = (units as Unit[]).map((u) => u.id);
  if (unitIds.length === 0) return [];

  // 2. 全listingsを一括取得
  const { data: allListings } = await supabase
    .from("listings")
    .select("unit_id, status, detected_at, current_rent")
    .in("unit_id", unitIds)
    .order("detected_at", { ascending: false });

  // unit_id -> listings のマップ
  const listingsByUnit = new Map<
    string,
    { status: string; detected_at: string; current_rent: number }[]
  >();
  for (const l of (allListings || []) as {
    unit_id: string;
    status: string;
    detected_at: string;
    current_rent: number;
  }[]) {
    const arr = listingsByUnit.get(l.unit_id) || [];
    arr.push(l);
    listingsByUnit.set(l.unit_id, arr);
  }

  // 3. watchlistを一括取得
  const watchedUnitIds = new Set<string>();
  if (userId) {
    const { data: watches } = await supabase
      .from("user_watchlists")
      .select("target_unit_id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .in("target_unit_id", unitIds);
    for (const w of (watches || []) as { target_unit_id: string | null }[]) {
      if (w.target_unit_id) watchedUnitIds.add(w.target_unit_id);
    }
  }

  // 4. メモリ上で集計
  const result: UnitWithStats[] = [];

  for (const unit of units as Unit[]) {
    const listings = listingsByUnit.get(unit.id) || [];

    let activeCount = 0;
    let lastDate: string | null = null;
    let lastRent: number | null = null;

    for (const l of listings) {
      if (l.status === "active") activeCount++;
      if (!lastDate || l.detected_at > lastDate) {
        lastDate = l.detected_at;
        lastRent = l.current_rent;
      }
    }

    let status: UnitStatus = "unknown";
    if (activeCount > 0) status = "active";
    else if (lastDate) status = "past";

    result.push({
      ...unit,
      active_listings_count: activeCount,
      last_listing_date: lastDate
        ? new Date(lastDate).toISOString().split("T")[0]
        : null,
      last_rent_amount: lastRent,
      is_watched: watchedUnitIds.has(unit.id),
      status,
    });
  }

  return result;
}

export async function getUnitById(id: string): Promise<UnitWithStats | null> {
  const supabase = await createServerSupabaseClient();
  const { data: unit, error } = await supabase
    .from("units")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !unit) return null;

  const units = await getUnitsByMansionId(unit.mansion_id);
  return units.find((u) => u.id === id) || null;
}

// ─── 募集情報 ──────────────────────────────

export async function getListingsByUnitId(unitId: string): Promise<Listing[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("unit_id", unitId)
    .order("detected_at", { ascending: false });

  if (error || !data) return [];
  return data as Listing[];
}

export async function getListingById(id: string): Promise<Listing | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;
  return data as Listing;
}

// ─── 物件画像 ──────────────────────────────

export async function getImagesByListingId(
  listingId: string
): Promise<PropertyImage[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("property_images")
    .select("*")
    .eq("listing_id", listingId)
    .order("sort_order", { ascending: true });

  if (error || !data) return [];
  return data as PropertyImage[];
}

export async function getImagesByMansionId(
  mansionId: string
): Promise<PropertyImage[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("property_images")
    .select("*")
    .eq("mansion_id", mansionId)
    .order("sort_order", { ascending: true });

  if (error || !data) return [];
  return data as PropertyImage[];
}

export async function getImagesByUnitId(
  unitId: string
): Promise<PropertyImage[]> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("property_images")
    .select("*")
    .eq("unit_id", unitId)
    .order("sort_order", { ascending: true });

  if (error || !data) return [];
  return data as PropertyImage[];
}

// ─── 通知 ──────────────────────────────

export async function getNotifications(): Promise<Notification[]> {
  const supabase = await createServerSupabaseClient();
  let userId: string | null = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id || null;
  } catch {
    // 未認証
  }

  if (!userId) return [];

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error || !data) return [];
  return data as Notification[];
}

// ─── ダッシュボード集約 ──────────────────────────────

export async function getDashboardData() {
  const mansions = await getMansions();
  const notifications = await getNotifications();

  const watchedMansions = mansions.filter((m) => m.is_watched);
  const unreadNotifications = notifications.filter((n) => !n.is_read);
  const activeMansions = mansions.filter((m) => m.active_listings_count > 0);
  const totalActiveListings = mansions.reduce(
    (sum, m) => sum + m.active_listings_count,
    0
  );

  return {
    watchedMansions,
    unreadNotifications,
    activeMansions,
    totalActiveListings,
    notifications: notifications.slice(0, 5),
  };
}
