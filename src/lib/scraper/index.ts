import { createServerSupabaseClient } from "@/lib/supabase-server";
import { autoTrackImagesForMansion, deepScrapeFromSourceUrl } from "@/lib/image-tracker";
import { ScrapedListing } from "./types";

interface ProcessResult {
  created: number;
  updated: number;
  skipped: number;
  images_fetched: number;
}

/**
 * スクレイプ結果をDBに保存する
 * - mansion_name で既存建物を検索、なければ新規作成
 * - layout_type + size_sqm で既存ユニットを検索、なければ新規作成
 * - source_url + status で重複チェック、なければ新規listing作成
 */
export async function processScrapedListings(
  listings: ScrapedListing[]
): Promise<ProcessResult> {
  const supabase = await createServerSupabaseClient();

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let imagesFetched = 0;

  // 画像追跡が必要なmansion_idを集める
  const mansionIdsToTrack = new Set<string>();

  for (const item of listings) {
    try {
      // 1. 建物の検索 or 作成
      const mansionId = await findOrCreateMansion(supabase, item);

      // 2. ユニットの検索 or 作成
      const unitId = await findOrCreateUnit(supabase, mansionId, item);

      // 3. 重複チェック & Listing作成
      const result = await findOrCreateListing(supabase, unitId, item);

      if (result === "created") {
        created++;
        mansionIdsToTrack.add(mansionId);
      } else if (result === "updated") {
        updated++;
      } else {
        skipped++;
      }
    } catch (error) {
      console.error(
        `[scraper] 物件処理エラー: ${item.mansion_name}`,
        error
      );
      skipped++;
    }
  }

  // 新規リスティングがあった建物の画像を自動取得
  for (const mansionId of mansionIdsToTrack) {
    try {
      const imgResult = await autoTrackImagesForMansion(mansionId);
      imagesFetched += imgResult.saved;
      console.log(`[image-tracker] ${mansionId}: ${imgResult.saved}枚取得 (${imgResult.source})`);
    } catch (error) {
      console.error(`[image-tracker] ${mansionId} 画像取得エラー:`, error);
    }
  }

  return { created, updated, skipped, images_fetched: imagesFetched };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function findOrCreateMansion(supabase: any, item: ScrapedListing): Promise<string> {
  // 建物名で検索
  const { data: existing, error: searchError } = await supabase
    .from("mansions")
    .select("id")
    .eq("name", item.mansion_name)
    .limit(1)
    .maybeSingle();

  if (searchError) {
    throw new Error(`建物検索エラー: ${searchError.message}`);
  }

  if (existing) {
    return existing.id;
  }

  // 新規作成
  const { data: created, error: insertError } = await supabase
    .from("mansions")
    .insert({
      name: item.mansion_name,
      address: item.address,
      nearest_station: item.nearest_station || null,
      walking_minutes: item.walking_minutes || null,
      exterior_image_url: item.exterior_image_url || null,
    })
    .select("id")
    .single();

  if (insertError) {
    throw new Error(`建物作成エラー: ${insertError.message}`);
  }

  return created.id;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function findOrCreateUnit(supabase: any, mansionId: string, item: ScrapedListing): Promise<string> {
  // layout_type + size_sqm で検索
  const { data: existing, error: searchError } = await supabase
    .from("units")
    .select("id")
    .eq("mansion_id", mansionId)
    .eq("layout_type", item.layout_type)
    .eq("size_sqm", item.size_sqm)
    .limit(1)
    .maybeSingle();

  if (searchError) {
    throw new Error(`ユニット検索エラー: ${searchError.message}`);
  }

  if (existing) {
    // last_rent を更新
    await supabase
      .from("units")
      .update({ last_rent: item.rent })
      .eq("id", existing.id);
    return existing.id;
  }

  // 新規作成
  const { data: created, error: insertError } = await supabase
    .from("units")
    .insert({
      mansion_id: mansionId,
      layout_type: item.layout_type,
      size_sqm: item.size_sqm,
      floor_range: item.floor ? `${item.floor}階` : null,
      last_rent: item.rent,
      floorplan_image_url: item.floorplan_image_url || null,
    })
    .select("id")
    .single();

  if (insertError) {
    throw new Error(`ユニット作成エラー: ${insertError.message}`);
  }

  return created.id;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function findOrCreateListing(supabase: any, unitId: string, item: ScrapedListing): Promise<"created" | "updated" | "skipped"> {
  // source_url + active status で重複チェック
  const { data: existing, error: searchError } = await supabase
    .from("listings")
    .select("id, current_rent")
    .eq("unit_id", unitId)
    .eq("source_url", item.source_url)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (searchError) {
    throw new Error(`Listing検索エラー: ${searchError.message}`);
  }

  if (existing) {
    // 賃料が変わった場合は更新
    if (existing.current_rent !== item.rent) {
      const { error: updateError } = await supabase
        .from("listings")
        .update({
          current_rent: item.rent,
          management_fee: item.management_fee,
          scraped_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      if (updateError) {
        throw new Error(`Listing更新エラー: ${updateError.message}`);
      }
      return "updated";
    }

    // scraped_at だけ更新
    await supabase
      .from("listings")
      .update({ scraped_at: new Date().toISOString() })
      .eq("id", existing.id);

    return "skipped";
  }

  // 新規作成
  const { data: newListing, error: insertError } = await supabase
    .from("listings")
    .insert({
      unit_id: unitId,
      status: "active",
      current_rent: item.rent,
      management_fee: item.management_fee,
      deposit: item.deposit,
      key_money: item.key_money,
      floor: item.floor,
      interior_features: item.interior_features.length > 0 ? item.interior_features : null,
      building_features: item.building_features.length > 0 ? item.building_features : null,
      move_in_date: item.move_in_date,
      source_site: item.source_site,
      source_url: item.source_url,
      detected_at: new Date().toISOString(),
      scraped_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (insertError) {
    throw new Error(`Listing作成エラー: ${insertError.message}`);
  }

  // 画像を property_images テーブルに保存
  if (newListing && item.images.length > 0) {
    const imageRows = item.images.map((img, index) => ({
      listing_id: newListing.id,
      unit_id: unitId,
      image_url: img.url,
      image_type: img.type,
      caption: img.caption,
      sort_order: index,
    }));

    const { error: imgError } = await supabase
      .from("property_images")
      .insert(imageRows);

    if (imgError) {
      console.error(`[scraper] 画像保存エラー: ${imgError.message}`);
    }
  }

  return "created";
}

export { scrapeSuumoPage } from "./suumo";
export { scrapeLIFULLPage } from "./lifull";
export { scrapeAtHomePage } from "./athome";
export { scrapeChintaiPage } from "./chintai";
export type { ScrapedListing } from "./types";
