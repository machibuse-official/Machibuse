import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import { MANSION_IMAGES } from "@/data/mansion-images";

// 建物の画像一覧取得
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { data, error } = await supabase
    .from("property_images")
    .select("*")
    .eq("mansion_id", id)
    .order("sort_order", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // DB画像があればそのまま返す
  if (data && data.length > 0) {
    return NextResponse.json(data);
  }

  // DBに画像がない場合、静的データをフォールバック
  const staticImages = MANSION_IMAGES[id] || [];
  if (staticImages.length > 0) {
    const fallback = staticImages.map((img, i) => ({
      id: `static-${i}`,
      mansion_id: id,
      image_url: img.url,
      image_type: img.type,
      caption: img.caption,
      sort_order: i,
    }));
    return NextResponse.json(fallback);
  }

  return NextResponse.json([]);
}

// 建物に画像を追加
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const body = await request.json();

  // 複数画像の一括追加に対応
  const images = Array.isArray(body) ? body : [body];

  const inserts = images.map((img: { url: string; type?: string; caption?: string }, i: number) => ({
    mansion_id: id,
    image_url: img.url,
    image_type: img.type || "exterior",
    caption: img.caption || null,
    sort_order: i,
  }));

  const { data, error } = await supabase
    .from("property_images")
    .insert(inserts)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

// 建物の画像を全削除
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  const { error } = await supabase
    .from("property_images")
    .delete()
    .eq("mansion_id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
