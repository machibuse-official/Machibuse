import * as cheerio from "cheerio";
import { ScrapedListing, ScrapedImage } from "./types";
import { parsePrice, parseSize, parseFloor } from "./suumo";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/**
 * CHINTAIの賃貸物件一覧ページをスクレイプして物件情報を抽出する
 */
export async function scrapeChintaiPage(
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
      `CHINTAIページの取得に失敗しました: ${response.status} ${response.statusText}`
    );
  }

  const html = await response.text();
  return parseChintaiHtml(html, url);
}

/**
 * CHINTAIのHTMLをパースして物件情報を抽出する
 */
export function parseChintaiHtml(
  html: string,
  baseUrl: string
): ScrapedListing[] {
  const $ = cheerio.load(html);
  const listings: ScrapedListing[] = [];

  // CHINTAIの物件カード
  $(
    ".cassetteitem, .building-card, .p-building, [data-building-id], .buildingList-item"
  ).each((_index, element) => {
    const $item = $(element);

    // 建物名
    const mansionName =
      $item
        .find(
          ".cassetteitem_content-title, .building-card__title, .p-building__name, .buildingList-item__name a"
        )
        .text()
        .trim() || "";

    // 住所
    const address =
      $item
        .find(
          ".cassetteitem_detail-col1, .building-card__address, .p-building__address, .buildingList-item__address"
        )
        .text()
        .trim() || "";

    // 最寄り駅
    const stationText =
      $item
        .find(
          ".cassetteitem_detail-col2, .building-card__access, .p-building__access, .buildingList-item__access"
        )
        .first()
        .text()
        .trim() || "";
    const stationInfo = parseChintaiStation(stationText);

    // 画像取得
    const images: ScrapedImage[] = [];
    let exteriorImageUrl: string | null = null;
    let floorplanImageUrl: string | null = null;

    // メイン外観画像
    const mainImg =
      $item
        .find(
          ".cassetteitem_object-item img, .building-card__img img, .p-building__image img, .buildingList-item__img img"
        )
        .attr("data-src") ||
      $item
        .find(
          ".cassetteitem_object-item img, .building-card__img img, .p-building__image img, .buildingList-item__img img"
        )
        .attr("src");
    if (mainImg && !mainImg.includes("noimage") && !mainImg.includes("spacer")) {
      const fullUrl = resolveUrl(mainImg, baseUrl);
      exteriorImageUrl = fullUrl;
      images.push({ url: fullUrl, type: "exterior", caption: "外観" });
    }

    // 建物特徴
    const buildingFeatures: string[] = [];
    $item
      .find(
        ".cassetteitem_detail-col3 div, .building-card__tag span, .p-building__tag span, .buildingList-item__tag span"
      )
      .each((_i, el) => {
        const text = $(el).text().trim();
        if (text) buildingFeatures.push(text);
      });

    // 各部屋行
    const $rooms = $item.find(
      ".cassetteitem_other tbody tr, .building-card__room, .p-room, .buildingList-room"
    );

    if ($rooms.length > 0) {
      $rooms.each((_i, room) => {
        const $room = $(room);

        // 賃料
        const rentText =
          $room
            .find(
              ".cassetteitem_other-emphasis, .room-price, .p-room__price, .buildingList-room__price"
            )
            .text()
            .trim();
        const rent = parsePrice(rentText);

        // 管理費
        const feeText =
          $room
            .find(
              ".cassetteitem_price--administration, .room-fee, .p-room__fee, .buildingList-room__fee"
            )
            .text()
            .trim();
        const managementFee = parsePrice(feeText);

        // 敷金
        const depositText =
          $room
            .find(
              ".cassetteitem_price--deposit, .room-deposit, .p-room__deposit, .buildingList-room__deposit"
            )
            .text()
            .trim();
        const deposit = parsePrice(depositText);

        // 礼金
        const keyMoneyText =
          $room
            .find(
              ".cassetteitem_price--gratuity, .room-key-money, .p-room__key-money, .buildingList-room__key-money"
            )
            .text()
            .trim();
        const keyMoney = parsePrice(keyMoneyText);

        // 間取り
        const layoutType =
          $room
            .find(
              ".cassetteitem_madori, .room-layout, .p-room__layout, .buildingList-room__madori"
            )
            .text()
            .trim() || "不明";

        // 面積
        const sizeText =
          $room
            .find(
              ".cassetteitem_menseki, .room-area, .p-room__area, .buildingList-room__menseki"
            )
            .text()
            .trim();
        const sizeSqm = parseSize(sizeText);

        // 階数
        const floorText =
          $room.find("td").eq(2).text().trim() ||
          $room
            .find(
              ".room-floor, .p-room__floor, .buildingList-room__floor"
            )
            .text()
            .trim();
        const floor = parseFloor(floorText);

        // 間取り図
        const floorplanImg =
          $room
            .find(
              ".cassetteitem_other-thumbnail img, .room-madori img, .p-room__floorplan img"
            )
            .attr("data-src") ||
          $room
            .find(
              ".cassetteitem_other-thumbnail img, .room-madori img, .p-room__floorplan img"
            )
            .attr("src");
        const roomImages = [...images];
        let roomFloorplanUrl: string | null = floorplanImageUrl;
        if (
          floorplanImg &&
          !floorplanImg.includes("noimage") &&
          !floorplanImg.includes("spacer")
        ) {
          roomFloorplanUrl = resolveUrl(floorplanImg, baseUrl);
          roomImages.push({
            url: roomFloorplanUrl,
            type: "floorplan",
            caption: "間取り図",
          });
        }

        // 入居日
        const moveInDate =
          $room
            .find(
              ".room-movein, .p-room__movein, .buildingList-room__movein"
            )
            .text()
            .trim() || null;

        // 室内設備
        const interiorFeatures: string[] = [];
        $room
          .find(
            ".room-feature li, .p-room__feature span, .buildingList-room__feature span"
          )
          .each((_j, el) => {
            const text = $(el).text().trim();
            if (text) interiorFeatures.push(text);
          });

        // 物件URL
        const detailLink =
          $room.find("a[href*='/detail/'], a[href*='/chintai/']").attr("href") || "";
        const sourceUrl = detailLink
          ? resolveUrl(detailLink, baseUrl)
          : baseUrl;

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
            images: roomImages,
            move_in_date: moveInDate,
            interior_features: interiorFeatures,
            building_features: buildingFeatures,
            floorplan_image_url: roomFloorplanUrl,
            exterior_image_url: exteriorImageUrl,
            source_site: "chintai",
            source_url: sourceUrl,
          });
        }
      });
    }
  });

  return listings;
}

/**
 * CHINTAIの駅情報テキストから駅名と徒歩分を抽出
 */
function parseChintaiStation(text: string): {
  station: string;
  minutes: number;
} {
  if (!text) return { station: "", minutes: 0 };

  // "○○線 △△駅 徒歩○分" or "○○線/△△駅 歩○分"
  const stationMatch = text.match(/[/／\s](.+?駅)/);
  const station = stationMatch ? stationMatch[1] : text.split(/[\s/]/)[0] || "";

  const minutesMatch = text.match(/徒歩(\d+)分/) || text.match(/歩(\d+)分/);
  const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;

  return { station, minutes };
}

/**
 * 相対URLを絶対URLに変換
 */
function resolveUrl(url: string, baseUrl: string): string {
  if (url.startsWith("http")) return url;
  if (url.startsWith("//")) return "https:" + url;
  return new URL(url, baseUrl).toString();
}
