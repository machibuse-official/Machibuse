import { NextRequest, NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";
import {
  scrapeSuumoPage,
  scrapeLIFULLPage,
  scrapeAtHomePage,
  scrapeChintaiPage,
  processScrapedListings,
} from "@/lib/scraper";
import { ScrapedListing } from "@/lib/scraper/types";

const SUPPORTED_SOURCES = ["suumo", "lifull", "athome", "chintai"] as const;
type Source = (typeof SUPPORTED_SOURCES)[number];

/**
 * POST /api/scrape
 * 指定URLをスクレイプしてDBに保存する
 * body: { url: string, source: "suumo" }
 */
export async function POST(request: NextRequest) {
  // 認証チェック
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  // リクエストボディの検証
  let body: { url: string; source: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "不正なリクエストボディです" },
      { status: 400 }
    );
  }

  if (!body.url || typeof body.url !== "string") {
    return NextResponse.json(
      { error: "URLが指定されていません" },
      { status: 400 }
    );
  }

  if (!body.source || !SUPPORTED_SOURCES.includes(body.source as Source)) {
    return NextResponse.json(
      { error: `対応しているソースは ${SUPPORTED_SOURCES.join(", ")} です` },
      { status: 400 }
    );
  }

  try {
    // ソースに応じたスクレイパーを選択して実行
    let listings: ScrapedListing[];
    switch (body.source as Source) {
      case "suumo":
        listings = await scrapeSuumoPage(body.url);
        break;
      case "lifull":
        listings = await scrapeLIFULLPage(body.url);
        break;
      case "athome":
        listings = await scrapeAtHomePage(body.url);
        break;
      case "chintai":
        listings = await scrapeChintaiPage(body.url);
        break;
    }

    if (listings.length === 0) {
      return NextResponse.json(
        { message: "物件情報が見つかりませんでした", created: 0, updated: 0, skipped: 0 },
        { status: 200 }
      );
    }

    // DB保存
    const result = await processScrapedListings(listings);

    return NextResponse.json({
      message: `${listings.length}件の物件情報を処理しました`,
      ...result,
    });
  } catch (error) {
    console.error("[scrape] スクレイプエラー:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "スクレイプ中にエラーが発生しました",
      },
      { status: 500 }
    );
  }
}
