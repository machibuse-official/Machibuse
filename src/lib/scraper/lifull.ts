import * as cheerio from "cheerio";
import { ScrapedListing, ScrapedImage } from "./types";
import { parsePrice, parseSize, parseFloor } from "./suumo";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * LIFULL HOME'Sの賃貸物件一覧ページをスクレイプして物件情報を抽出する
 */
export async function scrapeLIFULLPage(
  url: string
): Promise<ScrapedListing[]> {
  const response = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "ja,en-US;q=0.7,en;q=0.3",
    },
  });

  if (!response.ok) {
    throw new Error(
      `LIFULL HOME'Sページの取得に失敗しました: ${response.status} ${response.statusText}`
    );
  }

  const html = await response.text();
  return parseLIFULLHtml(html, url);
}

/**
 * LIFULL HOME'SのHTMLをパースして物件情報を抽出する
 */
export function parseLIFULLHtml(
  html: string,
  baseUrl: string
): ScrapedListing[] {
  const $ = cheerio.load(html);
  const listings: ScrapedListing[] = [];

  // LIFULL HOME'Sの物件カード
  $(".property, .mod-mergeBuilding, [data-unit-id]").each((_index, element) => {
    const $item = $(element);

    // 建物名
    const mansionName =
      $item.find(".property_inner-title a, .prg-building-name, h2.heading--2 a").text().trim() || "";

    // 住所
    const address =
      $item.find(".property_inner-data--address, .prg-address").text().trim() || "";

    // 最寄り駅
    const stationText =
      $item.find(".property_inner-data--traffic, .prg-traffic").first().text().trim() || "";
    const stationInfo = parseLIFULLStation(stationText);

    // 画像取得
    const images: ScrapedImage[] = [];
    let exteriorImageUrl: string | null = null;
    let floorplanImageUrl: string | null = null;

    // 外観画像
    const mainImg =
      $item.find(".property_inner-img img, .prg-building-image img").attr("data-src") ||
      $item.find(".property_inner-img img, .prg-building-image img").attr("src");
    if (mainImg && !mainImg.includes("noimage") && !mainImg.includes("spacer")) {
      const fullUrl = resolveUrl(mainImg, baseUrl);
      exteriorImageUrl = fullUrl;
      images.push({ url: fullUrl, type: "exterior", caption: "外観" });
    }

    // 間取り図
    const floorplanImg =
      $item.find(".property_inner-madori img, .prg-floorplan img").attr("data-src") ||
      $item.find(".property_inner-madori img, .prg-floorplan img").attr("src");
    if (floorplanImg && !floorplanImg.includes("noimage") && !floorplanImg.includes("spacer")) {
      floorplanImageUrl = resolveUrl(floorplanImg, baseUrl);
      images.push({ url: floorplanImageUrl, type: "floorplan", caption: "間取り図" });
    }

    // 室内写真
    $item.find(".property_inner-photo img, .prg-photo img").each((_i, img) => {
      const src = $(img).attr("data-src") || $(img).attr("src");
      const alt = $(img).attr("alt") || "";
      if (src && !src.includes("noimage") && !src.includes("spacer")) {
        images.push({
          url: resolveUrl(src, baseUrl),
          type: classifyImageType(alt),
          caption: alt || null,
        });
      }
    });

    // 建物設備
    const buildingFeatures: string[] = [];
    $item.find(".property_inner-tag li, .prg-tag").each((_i, el) => {
      const text = $(el).text().trim();
      if (text) buildingFeatures.push(text);
    });

    // 各部屋（LIFULL HOME'Sでは部屋ごとに行が分かれる場合がある）
    const $rooms = $item.find(".property_inner-room, .prg-room, tbody tr[data-unit-id]");

    if ($rooms.length > 0) {
      $rooms.each((_i, room) => {
        const $room = $(room);
        const listing = extractLIFULLRoom(
          $, $room, mansionName, address, stationInfo, images,
          buildingFeatures, exteriorImageUrl, floorplanImageUrl, baseUrl
        );
        if (listing) listings.push(listing);
      });
    } else {
      // 部屋が分離していない場合、物件自体を1件として処理
      const listing = extractLIFULLSingle(
        $, $item, mansionName, address, stationInfo, images,
        buildingFeatures, exteriorImageUrl, floorplanImageUrl, baseUrl
      );
      if (listing) listings.push(listing);
    }
  });

  return listings;
}

/**
 * LIFULL HOME'Sの個別部屋行から情報を抽出
 */
function extractLIFULLRoom(
  $: cheerio.CheerioAPI,
  $room: cheerio.Cheerio<any>,
  mansionName: string,
  address: string,
  stationInfo: { station: string; minutes: number },
  images: ScrapedImage[],
  buildingFeatures: string[],
  exteriorImageUrl: string | null,
  floorplanImageUrl: string | null,
  baseUrl: string
): ScrapedListing | null {
  const rentText = $room.find(".rent, .prg-rent").text().trim();
  const rent = parsePrice(rentText);

  const feeText = $room.find(".management-fee, .prg-management-fee").text().trim();
  const managementFee = parsePrice(feeText);

  const depositText = $room.find(".deposit, .prg-deposit").text().trim();
  const deposit = parsePrice(depositText);

  const keyMoneyText = $room.find(".key-money, .prg-key-money, .gratuity, .prg-gratuity").text().trim();
  const keyMoney = parsePrice(keyMoneyText);

  const layoutType = $room.find(".layout, .prg-madori").text().trim() || "不明";
  const sizeText = $room.find(".area, .prg-menseki").text().trim();
  const sizeSqm = parseSize(sizeText);

  const floorText = $room.find(".floor, .prg-floor").text().trim();
  const floor = parseFloor(floorText);

  const moveInDate = $room.find(".move-in, .prg-move-in").text().trim() || null;

  const interiorFeatures: string[] = [];
  $room.find(".room-feature li, .prg-room-feature").each((_i, el) => {
    const text = $(el).text().trim();
    if (text) interiorFeatures.push(text);
  });

  const detailLink = $room.find("a[href*='/chintai/'], a[href*='/rent/']").attr("href") || "";
  const sourceUrl = detailLink ? resolveUrl(detailLink, baseUrl) : baseUrl;

  if (!mansionName || rent <= 0) return null;

  return {
    mansion_name: mansionName,
    address,
    nearest_station: stationInfo.station,
    walking_minutes: stationInfo.minutes,
    layout_type: layoutType,
    size_sqm: sizeSqm,
    floor,
    rent,
    management_fee: managementFee || null,
    deposit: deposit || null,
    key_money: keyMoney || null,
    images: [...images],
    move_in_date: moveInDate,
    interior_features: interiorFeatures,
    building_features: buildingFeatures,
    floorplan_image_url: floorplanImageUrl,
    exterior_image_url: exteriorImageUrl,
    source_site: "lifull",
    source_url: sourceUrl,
  };
}

/**
 * LIFULL HOME'Sの単一物件カードから情報を抽出
 */
function extractLIFULLSingle(
  $: cheerio.CheerioAPI,
  $item: cheerio.Cheerio<any>,
  mansionName: string,
  address: string,
  stationInfo: { station: string; minutes: number },
  images: ScrapedImage[],
  buildingFeatures: string[],
  exteriorImageUrl: string | null,
  floorplanImageUrl: string | null,
  baseUrl: string
): ScrapedListing | null {
  const rentText = $item.find(".rent, .prg-rent, .property_inner-price").text().trim();
  const rent = parsePrice(rentText);

  const feeText = $item.find(".management-fee, .prg-management-fee").text().trim();
  const managementFee = parsePrice(feeText);

  const depositText = $item.find(".deposit, .prg-deposit").text().trim();
  const deposit = parsePrice(depositText);

  const keyMoneyText = $item.find(".key-money, .prg-key-money, .gratuity, .prg-gratuity").text().trim();
  const keyMoney = parsePrice(keyMoneyText);

  const layoutType = $item.find(".layout, .prg-madori, .property_inner-madori").text().trim() || "不明";
  const sizeText = $item.find(".area, .prg-menseki, .property_inner-menseki").text().trim();
  const sizeSqm = parseSize(sizeText);

  const floorText = $item.find(".floor, .prg-floor").text().trim();
  const floor = parseFloor(floorText);

  const moveInDate = $item.find(".move-in, .prg-move-in").text().trim() || null;

  const interiorFeatures: string[] = [];
  $item.find(".room-feature li, .prg-room-feature").each((_i, el) => {
    const text = $(el).text().trim();
    if (text) interiorFeatures.push(text);
  });

  const detailLink = $item.find("a[href*='/chintai/'], a[href*='/rent/']").attr("href") || "";
  const sourceUrl = detailLink ? resolveUrl(detailLink, baseUrl) : baseUrl;

  if (!mansionName || rent <= 0) return null;

  return {
    mansion_name: mansionName,
    address,
    nearest_station: stationInfo.station,
    walking_minutes: stationInfo.minutes,
    layout_type: layoutType,
    size_sqm: sizeSqm,
    floor,
    rent,
    management_fee: managementFee || null,
    deposit: deposit || null,
    key_money: keyMoney || null,
    images: [...images],
    move_in_date: moveInDate,
    interior_features: interiorFeatures,
    building_features: buildingFeatures,
    floorplan_image_url: floorplanImageUrl,
    exterior_image_url: exteriorImageUrl,
    source_site: "lifull",
    source_url: sourceUrl,
  };
}

/**
 * LIFULL HOME'Sの駅情報テキストから駅名と徒歩分を抽出
 * 例: "東京メトロ丸ノ内線 本郷三丁目駅 徒歩5分"
 */
function parseLIFULLStation(text: string): {
  station: string;
  minutes: number;
} {
  if (!text) return { station: "", minutes: 0 };

  // "○○線 △△駅" の形式
  const stationMatch = text.match(/\s(.+?駅)/);
  const station = stationMatch ? stationMatch[1] : text.split(" ")[0] || "";

  // "徒歩○分" の形式
  const minutesMatch = text.match(/徒歩(\d+)分/);
  const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;

  return { station, minutes };
}

/**
 * 画像のalt/captionからタイプを判別
 */
function classifyImageType(
  text: string
): ScrapedImage["type"] {
  if (!text) return "other";
  if (/外観|エントランス外/.test(text)) return "exterior";
  if (/間取り|フロア/.test(text)) return "floorplan";
  if (/エントランス|玄関/.test(text)) return "entrance";
  if (/キッチン|台所/.test(text)) return "kitchen";
  if (/バス|浴室|風呂/.test(text)) return "bathroom";
  if (/眺望|景色|バルコニー/.test(text)) return "view";
  if (/室内|リビング|居室|洋室|和室/.test(text)) return "interior";
  return "other";
}

/**
 * 相対URLを絶対URLに変換
 */
function resolveUrl(url: string, baseUrl: string): string {
  if (url.startsWith("http")) return url;
  if (url.startsWith("//")) return "https:" + url;
  return new URL(url, baseUrl).toString();
}
