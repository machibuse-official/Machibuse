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

// 各サイトの検索URLテンプレート（建物名をエンコードして末尾に付与）
const SEARCH_SITES = [
  {
    name: "suumo",
    baseUrl: "https://suumo.jp/jj/chintai/ichiran/FR301FC001/?ar=030&bs=040&fw=",
    scraper: scrapeSuumoPage,
  },
  {
    name: "lifull",
    baseUrl: "https://www.homes.co.jp/chintai/tokyo/list/?keyword=",
    scraper: scrapeLIFULLPage,
  },
  {
    name: "athome",
    baseUrl: "https://www.athome.co.jp/chintai/keyword/?keyword=",
    scraper: scrapeAtHomePage,
  },
  {
    name: "chintai",
    baseUrl: "https://www.chintai.net/list/?keyword=",
    scraper: scrapeChintaiPage,
  },
] as const;

/**
 * GET /api/scrape/cron
 * Vercel Cronから6時間ごとに呼ばれる想定
 * 監視中の建物名でSUUMO検索URLを生成してスクレイプ実行
 */
export async function GET(request: NextRequest) {
  // CRON_SECRET によるセキュリティチェック
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.error("[cron] CRON_SECRET が設定されていません");
    return NextResponse.json(
      { error: "サーバー設定エラー" },
      { status: 500 }
    );
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "認証に失敗しました" },
      { status: 401 }
    );
  }

  try {
    const supabase = await createServerSupabaseClient();

    // アクティブな監視リストから対象建物を取得
    const { data: watchlists, error: watchError } = await supabase
      .from("user_watchlists")
      .select("target_mansion_id, mansions(name)")
      .eq("is_active", true)
      .not("target_mansion_id", "is", null);

    if (watchError) {
      throw new Error(`監視リスト取得エラー: ${watchError.message}`);
    }

    if (!watchlists || watchlists.length === 0) {
      return NextResponse.json({
        message: "監視中の建物がありません",
        results: [],
      });
    }

    // 重複する建物名を除外
    const mansionNames = [
      ...new Set(
        watchlists
          .map((w: Record<string, unknown>) => {
            const mansions = w.mansions as { name: string } | null;
            return mansions?.name;
          })
          .filter(Boolean) as string[]
      ),
    ];

    const results: Array<{
      mansion_name: string;
      site: string;
      created: number;
      updated: number;
      skipped: number;
      error?: string;
    }> = [];

    for (const name of mansionNames) {
      for (const site of SEARCH_SITES) {
        try {
          // 建物名で検索URLを生成
          const searchUrl = site.baseUrl + encodeURIComponent(name);

          const listings: ScrapedListing[] = await site.scraper(searchUrl);
          const result = await processScrapedListings(listings);

          results.push({
            mansion_name: name,
            site: site.name,
            ...result,
          });
        } catch (error) {
          console.error(
            `[cron] ${name} (${site.name}) のスクレイプエラー:`,
            error
          );
          results.push({
            mansion_name: name,
            site: site.name,
            created: 0,
            updated: 0,
            skipped: 0,
            error:
              error instanceof Error ? error.message : "不明なエラー",
          });
        }

        // レートリミット対策: リクエスト間に1秒待機
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    const totalCreated = results.reduce((sum, r) => sum + r.created, 0);
    const totalUpdated = results.reduce((sum, r) => sum + r.updated, 0);

    return NextResponse.json({
      message: `${mansionNames.length}件の建物を${SEARCH_SITES.length}サイトからスクレイプしました`,
      total_created: totalCreated,
      total_updated: totalUpdated,
      results,
    });
  } catch (error) {
    console.error("[cron] Cronジョブエラー:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Cronジョブ中にエラーが発生しました",
      },
      { status: 500 }
    );
  }
}
