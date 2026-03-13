import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { MANSION_IMAGES } from "@/data/mansion-images";

// 建物一覧取得
export async function GET(request: NextRequest) {
  const supabase = await createServerSupabaseClient();
  const { searchParams } = request.nextUrl;

  // フィルタ用クエリパラメータ
  const layoutsParam = searchParams.get("layouts"); // カンマ区切り: "1K,2LDK"
  const rentMinParam = searchParams.get("rent_min"); // 万円
  const rentMaxParam = searchParams.get("rent_max"); // 万円
  const sizeMinParam = searchParams.get("size_min"); // ㎡

  const filterLayouts = layoutsParam ? layoutsParam.split(",").filter(Boolean) : [];
  const filterRentMin = rentMinParam ? Number(rentMinParam) * 10000 : null; // 万円→円
  const filterRentMax = rentMaxParam ? Number(rentMaxParam) * 10000 : null;
  const filterSizeMin = sizeMinParam ? Number(sizeMinParam) : null;
  const hasFilters = filterLayouts.length > 0 || filterRentMin !== null || filterRentMax !== null || filterSizeMin !== null;

  // ユーザー情報取得（監視リスト照合用）
  let userId: string | null = null;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id || null;
  } catch {
    // 未認証
  }

  const { data: mansions, error } = await supabase
    .from("mansions")
    .select(`
      *,
      units (
        id,
        layout_type,
        size_sqm,
        listings (id, status, detected_at, current_rent)
      ),
      property_images (
        id,
        image_url,
        image_type,
        caption,
        sort_order
      )
    `)
    .order("updated_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 監視リスト取得
  let watchedMansionIds: Set<string> = new Set();
  if (userId) {
    const { data: watchlist } = await supabase
      .from("user_watchlists")
      .select("target_mansion_id")
      .eq("user_id", userId)
      .eq("is_active", true);
    if (watchlist) {
      watchedMansionIds = new Set(
        watchlist.map((w: { target_mansion_id: string | null }) => w.target_mansion_id).filter(Boolean) as string[]
      );
    }
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // MansionWithStats 形式に変換
  const mansionsWithStats = mansions.map((mansion: Record<string, unknown>) => {
    const units = (mansion.units as Array<{
      id: string;
      layout_type: string;
      size_sqm: number;
      listings: Array<{ id: string; status: string; detected_at: string; current_rent: number }>;
    }>) || [];
    const allListings = units.flatMap((u) => u.listings || []);
    const activeListings = allListings.filter((l) => l.status === "active");
    const recentListings = allListings.filter((l) => new Date(l.detected_at) >= thirtyDaysAgo);

    // 最新の掲載日
    let lastListingDate: string | null = null;
    for (const l of allListings) {
      if (!lastListingDate || l.detected_at > lastListingDate) {
        lastListingDate = l.detected_at;
      }
    }

    // フィルタ用: マッチする間取りと家賃範囲を計算
    let matchingLayouts: string[] = [];
    let matchingRentRange: [number, number] | null = null;
    let passesFilter = true;

    if (hasFilters) {
      // 間取りフィルタ
      if (filterLayouts.length > 0) {
        matchingLayouts = [...new Set(
          units
            .filter((u) => filterLayouts.some((fl) => u.layout_type.includes(fl)))
            .map((u) => u.layout_type)
        )];
      }

      // 広さフィルタ
      let sizeMatchedUnits = units;
      if (filterSizeMin !== null) {
        sizeMatchedUnits = units.filter((u) => u.size_sqm >= filterSizeMin);
      }

      // 家賃フィルタ（activeリスティングの賃料で判定）
      const allRents = sizeMatchedUnits.flatMap((u) =>
        (u.listings || []).filter((l) => l.status === "active").map((l) => l.current_rent)
      );

      if (allRents.length > 0) {
        let filteredRents = allRents;
        if (filterRentMin !== null) {
          filteredRents = filteredRents.filter((r) => r >= filterRentMin);
        }
        if (filterRentMax !== null) {
          filteredRents = filteredRents.filter((r) => r <= filterRentMax);
        }
        if (filteredRents.length > 0) {
          matchingRentRange = [Math.min(...filteredRents), Math.max(...filteredRents)];
        }
      }

      // フィルタ判定: 少なくとも1つの条件に合うunitがあるか
      if (filterLayouts.length > 0 && matchingLayouts.length === 0) {
        passesFilter = false;
      }
      if ((filterRentMin !== null || filterRentMax !== null) && matchingRentRange === null && allRents.length > 0) {
        passesFilter = false;
      }
      if (filterSizeMin !== null && sizeMatchedUnits.length === 0) {
        passesFilter = false;
      }
    }

    // 画像を整理（sort_order順）+ 静的データフォールバック
    const dbImages = ((mansion.property_images as Array<{
      id: string;
      image_url: string;
      image_type: string;
      caption: string | null;
      sort_order: number;
    }>) || []).sort((a, b) => a.sort_order - b.sort_order);

    const mansionId = mansion.id as string;
    const staticImages = MANSION_IMAGES[mansionId] || [];

    // DB画像があればそちらを優先、なければ静的データ
    const finalImages = dbImages.length > 0
      ? dbImages.map((img) => ({ url: img.image_url, type: img.image_type, caption: img.caption }))
      : staticImages.map((img) => ({ url: img.url, type: img.type, caption: img.caption }));

    return {
      ...mansion,
      units: undefined,
      property_images: undefined,
      images: finalImages,
      // exterior_image_urlも静的データからフォールバック
      exterior_image_url: (mansion.exterior_image_url as string) ||
        staticImages.find((img) => img.type === "exterior")?.url || null,
      active_listings_count: activeListings.length,
      known_unit_types_count: units.length,
      recent_listings_count: recentListings.length,
      last_listing_date: lastListingDate
        ? new Date(lastListingDate).toISOString().split("T")[0]
        : null,
      is_watched: watchedMansionIds.has(mansion.id as string),
      status: activeListings.length > 0 ? "active" : allListings.length > 0 ? "past" : "unknown",
      ...(hasFilters ? { matching_layouts: matchingLayouts, matching_rent_range: matchingRentRange } : {}),
      _passesFilter: passesFilter,
    };
  });

  // フィルタが設定されている場合、条件を満たす建物のみ返す
  const result = hasFilters
    ? mansionsWithStats.filter((m: Record<string, unknown>) => m._passesFilter).map(({ _passesFilter, ...rest }: Record<string, unknown>) => rest)
    : mansionsWithStats.map(({ _passesFilter, ...rest }: Record<string, unknown>) => rest);

  return NextResponse.json(result);
}

// 建物新規登録
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();

  const body = await request.json();
  const { data, error } = await supabase
    .from("mansions")
    .insert(body)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
