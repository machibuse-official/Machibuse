import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { MANSION_IMAGES } from "@/data/mansion-images";

/**
 * POST /api/images/seed-static
 * 静的画像データ (mansion-images.ts) を property_images テーブルに一括投入する
 * 既存画像がある建物はスキップ
 */
export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient();
  const body = await request.json().catch(() => ({}));
  const force = body.force === true;

  let seeded = 0;
  let skipped = 0;
  let failed = 0;

  for (const [mansionId, images] of Object.entries(MANSION_IMAGES)) {
    if (!force) {
      // 既存画像チェック
      const { count } = await supabase
        .from("property_images")
        .select("id", { count: "exact", head: true })
        .eq("mansion_id", mansionId);

      if ((count ?? 0) > 0) {
        skipped++;
        continue;
      }
    } else {
      // 強制モード: 既存を削除
      await supabase
        .from("property_images")
        .delete()
        .eq("mansion_id", mansionId);
    }

    // 投入
    const rows = images.map((img, i) => ({
      mansion_id: mansionId,
      image_url: img.url,
      image_type: img.type,
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

  // 静的データにない建物のゴミ画像（同一SUUMOのURL）もクリア
  if (force) {
    const staticIds = new Set(Object.keys(MANSION_IMAGES));
    const { data: allMansions } = await supabase.from("mansions").select("id");
    if (allMansions) {
      for (const m of allMansions) {
        if (!staticIds.has(m.id)) {
          // 静的データにない建物のproperty_imagesを全削除（ゴミデータ一掃）
          await supabase.from("property_images").delete().eq("mansion_id", m.id);
        }
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
