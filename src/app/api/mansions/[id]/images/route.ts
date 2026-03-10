import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

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
  return NextResponse.json(data || []);
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
