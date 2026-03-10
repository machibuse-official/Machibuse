import * as cheerio from "cheerio";
import { ScrapedListing, ScrapedImage } from "./types";
import { parsePrice, parseSize, parseFloor } from "./suumo";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * at homeの賃貸物件一覧ページをスクレイプして物件情報を抽出する
 */
export async function scrapeAtHomePage(
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
      `at homeページの取得に失敗しました: ${response.status} ${response.statusText}`
    );
  }

  const html = await response.text();
  return parseAtHomeHtml(html, url);
}

/**
 * at homeのHTMLをパースして物件情報を抽出する
 */
export function parseAtHomeHtml(
  html: string,
  baseUrl: string
): ScrapedListing[] {
  const $ = cheerio.load(html);
  const listings: ScrapedListing[] = [];

  // at homeの物件カード（テーブル形式・カード形式両対応）
  $(".property-list-item, .propertyBlock, .p-property, [data-property-id]").each(
    (_index, element) => {
      const $item = $(element);

      // 建物名
      const mansionName =
        $item
          .find(
            ".property-name a, .p-property__title a, .propertyBlock-title a, h2 a"
          )
          .first()
          .text()
          .trim() || "";

      // 住所
      const address =
        $item
          .find(
            ".property-address, .p-property__address, .propertyBlock-address"
          )
          .text()
          .trim() || "";

      // 最寄り駅
      const stationText =
        $item
          .find(
            ".property-station, .p-property__access, .propertyBlock-access"
          )
          .first()
          .text()
          .trim() || "";
      const stationInfo = parseAtHomeStation(stationText);

      // 画像取得
      const images: ScrapedImage[] = [];
      let exteriorImageUrl: string | null = null;
      let floorplanImageUrl: string | null = null;

      // メイン画像
      const mainImg =
        $item
          .find(
            ".property-img img, .p-property__image img, .propertyBlock-img img"
          )
          .attr("data-src") ||
        $item
          .find(
            ".property-img img, .p-property__image img, .propertyBlock-img img"
          )
          .attr("src");
      if (mainImg && !mainImg.includes("noimage") && !mainImg.includes("spacer")) {
        const fullUrl = resolveUrl(mainImg, baseUrl);
        exteriorImageUrl = fullUrl;
        images.push({ url: fullUrl, type: "exterior", caption: "外観" });
      }

      // 間取り図
      const floorplanImg =
        $item
          .find(
            ".property-madori img, .p-property__floorplan img, .propertyBlock-madori img"
          )
          .attr("data-src") ||
        $item
          .find(
            ".property-madori img, .p-property__floorplan img, .propertyBlock-madori img"
          )
          .attr("src");
      if (
        floorplanImg &&
        !floorplanImg.includes("noimage") &&
        !floorplanImg.includes("spacer")
      ) {
        floorplanImageUrl = resolveUrl(floorplanImg, baseUrl);
        images.push({
          url: floorplanImageUrl,
          type: "floorplan",
          caption: "間取り図",
        });
      }

      // 室内写真
      $item
        .find(
          ".property-photo img, .p-property__photo img, .propertyBlock-photo img"
        )
        .each((_i, img) => {
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

      // 建物特徴
      const buildingFeatures: string[] = [];
      $item
        .find(
          ".property-tag li, .p-property__tag span, .propertyBlock-tag span"
        )
        .each((_i, el) => {
          const text = $(el).text().trim();
          if (text) buildingFeatures.push(text);
        });

      // 賃料
      const rentText =
        $item
          .find(
            ".property-price, .p-property__price, .propertyBlock-price-main"
          )
          .text()
          .trim();
      const rent = parsePrice(rentText);

      // 管理費
      const feeText =
        $item
          .find(
            ".property-fee, .p-property__management, .propertyBlock-price-sub"
          )
          .text()
          .trim();
      const managementFee = parsePrice(feeText);

      // 敷金・礼金
      const depositKeyMoneyText =
        $item
          .find(
            ".property-deposit, .p-property__deposit, .propertyBlock-deposit"
          )
          .text()
          .trim();
      const { deposit, keyMoney } = parseAtHomeDepositKeyMoney(depositKeyMoneyText);

      // 間取り
      const layoutType =
        $item
          .find(
            ".property-layout, .p-property__layout, .propertyBlock-madori-text"
          )
          .text()
          .trim() || "不明";

      // 面積
      const sizeText =
        $item
          .find(
            ".property-area, .p-property__area, .propertyBlock-menseki"
          )
          .text()
          .trim();
      const sizeSqm = parseSize(sizeText);

      // 階数
      const floorText =
        $item
          .find(".property-floor, .p-property__floor, .propertyBlock-floor")
          .text()
          .trim();
      const floor = parseFloor(floorText);

      // 入居日
      const moveInDate =
        $item
          .find(
            ".property-movein, .p-property__movein, .propertyBlock-movein"
          )
          .text()
          .trim() || null;

      // 室内設備
      const interiorFeatures: string[] = [];
      $item
        .find(
          ".property-feature li, .p-property__feature span, .propertyBlock-feature span"
        )
        .each((_i, el) => {
          const text = $(el).text().trim();
          if (text) interiorFeatures.push(text);
        });

      // 物件URL
      const detailLink =
        $item
          .find(
            ".property-name a, .p-property__title a, .propertyBlock-title a, h2 a"
          )
          .first()
          .attr("href") || "";
      const sourceUrl = detailLink ? resolveUrl(detailLink, baseUrl) : baseUrl;

      if (mansionName && rent > 0) {
        listings.push({
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
          source_site: "athome",
          source_url: sourceUrl,
        });
      }
    }
  );

  return listings;
}

/**
 * at homeの駅情報テキストから駅名と徒歩分を抽出
 * 例: "東京メトロ丸ノ内線/本郷三丁目駅 徒歩5分"
 */
function parseAtHomeStation(text: string): {
  station: string;
  minutes: number;
} {
  if (!text) return { station: "", minutes: 0 };

  // "○○線/△△駅" or "○○線 △△駅" の形式
  const stationMatch = text.match(/[/／\s](.+?駅)/);
  const station = stationMatch ? stationMatch[1] : text.split(/[\s/]/)[0] || "";

  const minutesMatch = text.match(/徒歩(\d+)分/) || text.match(/歩(\d+)分/);
  const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;

  return { station, minutes };
}

/**
 * at homeの敷金・礼金テキストを分離してパース
 * 例: "敷金1ヶ月/礼金1ヶ月", "敷5万円/礼5万円", "敷金なし/礼金なし"
 */
function parseAtHomeDepositKeyMoney(text: string): {
  deposit: number;
  keyMoney: number;
} {
  if (!text) return { deposit: 0, keyMoney: 0 };

  let deposit = 0;
  let keyMoney = 0;

  // 敷金部分の抽出
  const depositMatch = text.match(/敷[金]?\s*([\d.]+\s*万|[\d,]+\s*円|なし|-)/);
  if (depositMatch && depositMatch[1] !== "なし" && depositMatch[1] !== "-") {
    deposit = parsePrice(depositMatch[1]);
  }

  // 礼金部分の抽出
  const keyMoneyMatch = text.match(/礼[金]?\s*([\d.]+\s*万|[\d,]+\s*円|なし|-)/);
  if (keyMoneyMatch && keyMoneyMatch[1] !== "なし" && keyMoneyMatch[1] !== "-") {
    keyMoney = parsePrice(keyMoneyMatch[1]);
  }

  return { deposit, keyMoney };
}

/**
 * 画像のalt/captionからタイプを判別
 */
function classifyImageType(text: string): ScrapedImage["type"] {
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
