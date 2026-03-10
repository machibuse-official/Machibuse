import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { MANSION_IMAGES } from "@/data/mansion-images";

/**
 * POST /api/images/seed-static
 * 静的画像データ (mansion-images.ts) を property_images テーブルに一括投入する
 * 既存画像がある建物はスキップ
 */
export async function POST() {
  const supabase = await createServerSupabaseClient();

  let seeded = 0;
  let skipped = 0;
  let failed = 0;

  for (const [mansionId, images] of Object.entries(MANSION_IMAGES)) {
    // 既存画像チェック
    const { count } = await supabase
      .from("property_images")
      .select("id", { count: "exact", head: true })
      .eq("mansion_id", mansionId);

    if ((count ?? 0) > 0) {
      skipped++;
      continue;
    }

    // 投入
    const rows = images.map((img, i) => ({
      mansion_id: mansionId,
      image_url: img.url,
      image_type: img.type === "common" ? "entrance" : img.type,
      caption: img.caption,
      sort_order: i,
    }));

    const { error } = await supabase.from("property_images").insert(rows);
    if (error) {
      console.error(`[seed] ${mansionId}: ${error.message}`);
      failed++;
    } else {
      seeded++;

      // exterior_image_url も更新
      const exterior = images.find((img) => img.type === "exterior");
      if (exterior) {
        await supabase
          .from("mansions")
          .update({ exterior_image_url: exterior.url })
          .eq("id", mansionId);
      }
    }
  }

  return NextResponse.json({
    message: `静的画像シード完了: ${seeded}件投入, ${skipped}件スキップ, ${failed}件失敗`,
    seeded,
    skipped,
    failed,
    total_mansions: Object.keys(MANSION_IMAGES).length,
  });
}
