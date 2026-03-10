import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import * as cheerio from "cheerio";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// 建物名でSUUMOを検索して画像を取得・保存
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();

  // 建物情報を取得
  const { data: mansion } = await supabase
    .from("mansions")
    .select("name, address")
    .eq("id", id)
    .single();

  if (!mansion) {
    return NextResponse.json({ error: "建物が見つかりません" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const searchUrl = body.url as string | undefined;

  let images: { url: string; type: string; caption: string }[] = [];

  if (searchUrl) {
    // 指定URLから画像を取得
    images = await scrapeImagesFromUrl(searchUrl);
  } else {
    // SUUMOで建物名検索
    images = await searchAndScrapeImages(mansion.name);
  }

  if (images.length === 0) {
    return NextResponse.json({ message: "画像が見つかりませんでした", count: 0 });
  }

  // 既存画像を削除して入れ替え
  await supabase
    .from("property_images")
    .delete()
    .eq("mansion_id", id);

  // 新しい画像を保存
  const inserts = images.map((img, i) => ({
    mansion_id: id,
    image_url: img.url,
    image_type: img.type,
    caption: img.caption,
    sort_order: i,
  }));

  const { error } = await supabase
    .from("property_images")
    .insert(inserts);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // exterior_image_urlも更新
  const exteriorImg = images.find((img) => img.type === "exterior");
  if (exteriorImg) {
    await supabase
      .from("mansions")
      .update({ exterior_image_url: exteriorImg.url })
      .eq("id", id);
  }

  return NextResponse.json({
    message: `${images.length}件の画像を取得しました`,
    count: images.length,
    images: images.map((img) => ({ url: img.url, type: img.type, caption: img.caption })),
  });
}

async function scrapeImagesFromUrl(url: string) {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html",
        "Accept-Language": "ja",
      },
    });
    if (!res.ok) return [];
    const html = await res.text();
    return extractImages(html, url);
  } catch {
    return [];
  }
}

async function searchAndScrapeImages(mansionName: string) {
  // SUUMOで建物名を検索
  const searchQuery = encodeURIComponent(mansionName + " 賃貸");
  const searchUrl = `https://suumo.jp/jj/chintai/ichiran/FR301FC001/?fw=${searchQuery}&ar=030&bs=040&ta=13`;

  try {
    const res = await fetch(searchUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html",
        "Accept-Language": "ja",
      },
    });
    if (!res.ok) return [];
    const html = await res.text();

    // 検索結果から物件詳細ページURLを取得
    const $ = cheerio.load(html);
    const detailLink = $("a[href*='/chintai/jnc_']").first().attr("href");
    if (!detailLink) {
      // 検索結果ページからも画像を取得してみる
      return extractImages(html, searchUrl);
    }

    const detailUrl = detailLink.startsWith("http")
      ? detailLink
      : `https://suumo.jp${detailLink}`;

    // 詳細ページから画像取得
    const detailRes = await fetch(detailUrl, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html",
        "Accept-Language": "ja",
      },
    });
    if (!detailRes.ok) return extractImages(html, searchUrl);
    const detailHtml = await detailRes.text();
    return extractImages(detailHtml, detailUrl);
  } catch {
    return [];
  }
}

function extractImages(html: string, baseUrl: string) {
  const $ = cheerio.load(html);
  const images: { url: string; type: string; caption: string }[] = [];
  const seen = new Set<string>();

  // 全てのimg要素から画像を取得
  $("img").each((_i, el) => {
    const src = $(el).attr("data-src") || $(el).attr("src") || "";
    const alt = $(el).attr("alt") || "";

    if (!src) return;
    if (src.includes("spacer") || src.includes("noimage") || src.includes("icon")) return;
    if (src.includes(".gif") || src.includes("logo") || src.includes("btn")) return;
    if (src.length < 20) return;

    const fullUrl = src.startsWith("http") ? src : src.startsWith("//") ? `https:${src}` : new URL(src, baseUrl).toString();

    // 画像サイズが小さそうなものを除外
    const width = parseInt($(el).attr("width") || "0");
    const height = parseInt($(el).attr("height") || "0");
    if ((width > 0 && width < 80) || (height > 0 && height < 80)) return;

    if (seen.has(fullUrl)) return;
    seen.add(fullUrl);

    let type = "other";
    let caption = alt;
    if (/外観|building|outward/i.test(alt + src)) { type = "exterior"; caption = caption || "外観"; }
    else if (/エントランス|entrance/i.test(alt + src)) { type = "entrance"; caption = caption || "エントランス"; }
    else if (/間取り|madori|floorplan/i.test(alt + src)) { type = "floorplan"; caption = caption || "間取り"; }
    else if (/室内|interior|living|居室|リビング/i.test(alt + src)) { type = "interior"; caption = caption || "室内"; }
    else if (/キッチン|kitchen/i.test(alt + src)) { type = "kitchen"; caption = caption || "キッチン"; }
    else if (/バス|浴室|bath/i.test(alt + src)) { type = "bathroom"; caption = caption || "バスルーム"; }
    else if (/眺望|view|バルコニー/i.test(alt + src)) { type = "view"; caption = caption || "眺望"; }

    images.push({ url: fullUrl, type, caption: caption || "写真" });
  });

  // 外観・エントランスを優先的に先頭に
  images.sort((a, b) => {
    const priority: Record<string, number> = { exterior: 0, entrance: 1, view: 2, interior: 3, kitchen: 4, bathroom: 5, floorplan: 6, other: 7 };
    return (priority[a.type] ?? 7) - (priority[b.type] ?? 7);
  });

  return images.slice(0, 10); // 最大10枚
}
