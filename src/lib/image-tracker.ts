/**
 * 画像自動追跡エンジン
 * 物件の詳細ページから画像をディープスクレイプし、
 * 複数ソースから統合・重複排除してDBに保存する
 */
import * as cheerio from "cheerio";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import type { ScrapedImage } from "@/lib/scraper/types";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const HEADERS = {
  "User-Agent": USER_AGENT,
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "ja,en-US;q=0.7,en;q=0.3",
};

// 画像タイプ分類の正規表現
const IMAGE_TYPE_PATTERNS: { type: ScrapedImage["type"]; pattern: RegExp }[] = [
  { type: "exterior", pattern: /外観|building|outward|(?:^|\/)gaikan/i },
  { type: "entrance", pattern: /エントランス|entrance|ロビー|lobby/i },
  { type: "common", pattern: /共用|共有|common|amenity|ラウンジ|lounge|ジム|gym|プール|pool|コンシェルジュ|concierge|駐車|parking/i },
  { type: "floorplan", pattern: /間取り|madori|floorplan|floor.?plan/i },
  { type: "interior", pattern: /室内|interior|living|居室|リビング|洋室|和室|LD|LDK/i },
  { type: "kitchen", pattern: /キッチン|kitchen|台所/i },
  { type: "bathroom", pattern: /バス|浴室|bath|風呂|洗面|トイレ|toilet/i },
  { type: "view", pattern: /眺望|view|バルコニー|balcony|ベランダ/i },
];

const TYPE_PRIORITY: Record<string, number> = {
  exterior: 0, entrance: 1, common: 2, view: 3, interior: 4,
  kitchen: 5, bathroom: 6, floorplan: 7, other: 8,
};

function classifyImage(text: string): ScrapedImage["type"] {
  for (const { type, pattern } of IMAGE_TYPE_PATTERNS) {
    if (pattern.test(text)) return type;
  }
  return "other";
}

function resolveUrl(url: string, baseUrl: string): string {
  if (url.startsWith("http")) return url;
  if (url.startsWith("//")) return "https:" + url;
  try { return new URL(url, baseUrl).toString(); } catch { return url; }
}

/**
 * 任意のHTMLから画像を抽出（汎用ディープスクレイパー）
 */
function extractImagesFromHtml(html: string, baseUrl: string): ScrapedImage[] {
  const $ = cheerio.load(html);
  const images: ScrapedImage[] = [];
  const seen = new Set<string>();

  // img要素
  $("img").each((_i, el) => {
    const src = $(el).attr("data-src") || $(el).attr("data-original") ||
      $(el).attr("data-lazy") || $(el).attr("src") || "";
    processImageUrl($, el, src, baseUrl, images, seen);
  });

  // picture > source 要素
  $("picture source").each((_i, el) => {
    const srcset = $(el).attr("srcset") || "";
    const firstSrc = srcset.split(",")[0]?.trim().split(" ")[0] || "";
    if (firstSrc) processImageUrl($, el, firstSrc, baseUrl, images, seen);
  });

  // background-image (CSS)
  $("[style*='background-image']").each((_i, el) => {
    const style = $(el).attr("style") || "";
    const match = style.match(/url\(["']?([^"')]+)["']?\)/);
    if (match) {
      const url = resolveUrl(match[1], baseUrl);
      if (!seen.has(url) && isValidImageUrl(url)) {
        seen.add(url);
        const alt = $(el).attr("title") || $(el).attr("data-caption") || "";
        images.push({
          url,
          type: classifyImage(alt + url),
          caption: alt || null,
        });
      }
    }
  });

  // OGP画像
  $('meta[property="og:image"]').each((_i, el) => {
    const content = $(el).attr("content") || "";
    if (content && !seen.has(content) && isValidImageUrl(content)) {
      seen.add(content);
      images.push({ url: content, type: "exterior", caption: "OGP画像" });
    }
  });

  // ソートして返却
  images.sort((a, b) => (TYPE_PRIORITY[a.type] ?? 7) - (TYPE_PRIORITY[b.type] ?? 7));
  return images;
}

function processImageUrl(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  $: cheerio.CheerioAPI,
  el: any,
  src: string,
  baseUrl: string,
  images: ScrapedImage[],
  seen: Set<string>,
) {
  if (!src || !isValidImageUrl(src)) return;

  const fullUrl = resolveUrl(src, baseUrl);
  if (seen.has(fullUrl)) return;

  // サイズチェック
  const width = parseInt($(el).attr("width") || "0");
  const height = parseInt($(el).attr("height") || "0");
  if ((width > 0 && width < 100) || (height > 0 && height < 100)) return;

  seen.add(fullUrl);
  const alt = $(el).attr("alt") || $(el).attr("title") || "";

  images.push({
    url: fullUrl,
    type: classifyImage(alt + fullUrl),
    caption: alt || null,
  });
}

function isValidImageUrl(url: string): boolean {
  if (!url || url.length < 20) return false;
  if (/spacer|noimage|icon|\.gif|logo|btn|pixel|blank|dummy|placeholder/i.test(url)) return false;
  if (/\.svg$/i.test(url)) return false;
  return true;
}

/**
 * URLのHTMLを取得して画像を抽出
 */
async function fetchAndExtractImages(url: string): Promise<ScrapedImage[]> {
  try {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const html = await res.text();
    return extractImagesFromHtml(html, url);
  } catch {
    return [];
  }
}

/**
 * SUUMOで建物名を検索し、詳細ページから画像をディープスクレイプ
 */
async function deepScrapeSuumo(mansionName: string): Promise<ScrapedImage[]> {
  const query = encodeURIComponent(mansionName);
  const searchUrl = `https://suumo.jp/jj/chintai/ichiran/FR301FC001/?fw=${query}&ar=030&bs=040&ta=13`;

  try {
    const res = await fetch(searchUrl, { headers: HEADERS, signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio.load(html);

    // 検索結果から詳細ページURLを取得（複数試行）
    const detailLinks: string[] = [];
    $("a[href*='/chintai/jnc_'], a[href*='/chintai/bc_']").each((_i, el) => {
      const href = $(el).attr("href");
      if (href && detailLinks.length < 3) {
        detailLinks.push(href.startsWith("http") ? href : `https://suumo.jp${href}`);
      }
    });

    const allImages: ScrapedImage[] = [];
    const seen = new Set<string>();

    // 検索結果ページからも画像取得
    const listImages = extractImagesFromHtml(html, searchUrl);
    for (const img of listImages) {
      if (!seen.has(img.url)) { seen.add(img.url); allImages.push(img); }
    }

    // 詳細ページからディープスクレイプ
    for (const detailUrl of detailLinks) {
      const detailImages = await fetchAndExtractImages(detailUrl);
      for (const img of detailImages) {
        if (!seen.has(img.url)) { seen.add(img.url); allImages.push(img); }
      }
      await sleep(500); // レート制限
    }

    return allImages;
  } catch {
    return [];
  }
}

/**
 * LIFULL HOME'Sで建物名を検索して画像取得
 */
async function deepScrapeLIFULL(mansionName: string): Promise<ScrapedImage[]> {
  const query = encodeURIComponent(mansionName);
  const searchUrl = `https://www.homes.co.jp/chintai/tokyo/list/?keyword=${query}`;
  try {
    return await fetchAndExtractImages(searchUrl);
  } catch {
    return [];
  }
}

/**
 * 掲載元URLから直接画像をディープスクレイプ
 */
export async function deepScrapeFromSourceUrl(sourceUrl: string): Promise<ScrapedImage[]> {
  return fetchAndExtractImages(sourceUrl);
}

/**
 * 建物名をキーに複数サイトから画像を横断取得し、統合・重複排除して返す
 */
export async function aggregateImagesForMansion(mansionName: string): Promise<ScrapedImage[]> {
  const [suumoImages, lifullImages] = await Promise.allSettled([
    deepScrapeSuumo(mansionName),
    deepScrapeLIFULL(mansionName),
  ]);

  const allImages: ScrapedImage[] = [];
  const seen = new Set<string>();

  // URLのパス部分で重複判定（クエリパラメータ無視）
  function normalizeUrl(url: string): string {
    try {
      const u = new URL(url);
      return u.hostname + u.pathname;
    } catch {
      return url;
    }
  }

  function addImages(images: ScrapedImage[]) {
    for (const img of images) {
      const key = normalizeUrl(img.url);
      if (!seen.has(key)) {
        seen.add(key);
        allImages.push(img);
      }
    }
  }

  if (suumoImages.status === "fulfilled") addImages(suumoImages.value);
  if (lifullImages.status === "fulfilled") addImages(lifullImages.value);

  // ソートして最大20枚
  allImages.sort((a, b) => (TYPE_PRIORITY[a.type] ?? 7) - (TYPE_PRIORITY[b.type] ?? 7));
  return allImages.slice(0, 20);
}

/**
 * 建物IDに対して自動画像取得・保存を実行する
 * リスティング作成時や定期Cronから呼ばれる
 */
export async function autoTrackImagesForMansion(mansionId: string): Promise<{
  fetched: number;
  saved: number;
  source: string;
}> {
  const supabase = await createServerSupabaseClient();

  // 建物情報取得
  const { data: mansion } = await supabase
    .from("mansions")
    .select("name, address, exterior_image_url")
    .eq("id", mansionId)
    .single();

  if (!mansion) return { fetched: 0, saved: 0, source: "not_found" };

  // 既存画像数を確認
  const { count: existingCount } = await supabase
    .from("property_images")
    .select("id", { count: "exact", head: true })
    .eq("mansion_id", mansionId);

  // 既に十分な画像がある場合はスキップ（5枚以上）
  if ((existingCount ?? 0) >= 5) {
    return { fetched: 0, saved: 0, source: "sufficient" };
  }

  // リスティングの source_url からもディープスクレイプ
  const { data: listings } = await supabase
    .from("listings")
    .select("source_url, source_site")
    .eq("status", "active")
    .in("unit_id",
      (await supabase.from("units").select("id").eq("mansion_id", mansionId))
        .data?.map((u: { id: string }) => u.id) || []
    )
    .limit(5);

  const allImages: ScrapedImage[] = [];
  const seen = new Set<string>();

  function addUnique(images: ScrapedImage[]) {
    for (const img of images) {
      if (!seen.has(img.url)) { seen.add(img.url); allImages.push(img); }
    }
  }

  // 1. リスティングの掲載元URLからディープスクレイプ
  for (const listing of (listings || []).slice(0, 3)) {
    if (listing.source_url) {
      const images = await deepScrapeFromSourceUrl(listing.source_url);
      addUnique(images);
      await sleep(500);
    }
  }

  // 2. 建物名で複数サイト横断検索
  if (allImages.length < 5) {
    const aggregated = await aggregateImagesForMansion(mansion.name);
    addUnique(aggregated);
  }

  if (allImages.length === 0) {
    return { fetched: 0, saved: 0, source: "no_images_found" };
  }

  // ソート
  allImages.sort((a, b) => (TYPE_PRIORITY[a.type] ?? 7) - (TYPE_PRIORITY[b.type] ?? 7));
  const finalImages = allImages.slice(0, 20);

  // 既存画像を削除して入れ替え
  await supabase
    .from("property_images")
    .delete()
    .eq("mansion_id", mansionId);

  const inserts = finalImages.map((img, i) => ({
    mansion_id: mansionId,
    image_url: img.url,
    image_type: img.type,
    caption: img.caption,
    sort_order: i,
  }));

  const { error } = await supabase.from("property_images").insert(inserts);
  if (error) {
    console.error(`[image-tracker] 画像保存エラー (${mansionId}):`, error.message);
    return { fetched: finalImages.length, saved: 0, source: "db_error" };
  }

  // exterior_image_url も更新
  const exteriorImg = finalImages.find((img) => img.type === "exterior");
  if (exteriorImg) {
    await supabase
      .from("mansions")
      .update({ exterior_image_url: exteriorImg.url })
      .eq("id", mansionId);
  }

  return {
    fetched: finalImages.length,
    saved: finalImages.length,
    source: "auto_tracked",
  };
}

/**
 * 画像のない/古い建物を検出して一括自動取得
 * Cronジョブから呼ばれる
 */
export async function autoTrackMissingImages(limit: number = 10): Promise<{
  processed: number;
  totalFetched: number;
  results: Array<{ mansionId: string; name: string; fetched: number; saved: number }>;
}> {
  const supabase = await createServerSupabaseClient();

  // 画像がない or 少ない建物を取得
  const { data: mansions } = await supabase
    .from("mansions")
    .select(`
      id, name,
      property_images(id)
    `)
    .order("updated_at", { ascending: false })
    .limit(100);

  if (!mansions) return { processed: 0, totalFetched: 0, results: [] };

  // 画像が少ない順にソート
  const needsImages = mansions
    .map((m: { id: string; name: string; property_images: { id: string }[] }) => ({
      id: m.id,
      name: m.name,
      imageCount: m.property_images?.length || 0,
    }))
    .filter((m) => m.imageCount < 3)
    .sort((a, b) => a.imageCount - b.imageCount)
    .slice(0, limit);

  const results: Array<{ mansionId: string; name: string; fetched: number; saved: number }> = [];
  let totalFetched = 0;

  for (const mansion of needsImages) {
    const result = await autoTrackImagesForMansion(mansion.id);
    results.push({
      mansionId: mansion.id,
      name: mansion.name,
      fetched: result.fetched,
      saved: result.saved,
    });
    totalFetched += result.saved;
    await sleep(2000); // レート制限
  }

  return { processed: needsImages.length, totalFetched, results };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
