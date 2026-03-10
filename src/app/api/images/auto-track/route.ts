import { NextRequest, NextResponse } from "next/server";
import {
  autoTrackMissingImages,
  autoTrackImagesForMansion,
} from "@/lib/image-tracker";

/**
 * POST /api/images/auto-track
 * 画像のない建物を自動検出して画像を取得する
 * body: { mansionId?: string, limit?: number }
 * - mansionId 指定時: 特定の建物のみ
 * - 省略時: 画像不足の建物を一括処理
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  if (body.mansionId) {
    // 特定建物の画像追跡
    const result = await autoTrackImagesForMansion(body.mansionId);
    return NextResponse.json({
      message: `${result.saved}枚の画像を取得しました`,
      ...result,
    });
  }

  // 一括処理
  const limit = body.limit ?? 10;
  const result = await autoTrackMissingImages(limit);

  return NextResponse.json({
    message: `${result.processed}件の建物を処理し、${result.totalFetched}枚の画像を取得しました`,
    ...result,
  });
}

/**
 * GET /api/images/auto-track
 * Cron から定期実行される（vercel.json の cron設定で使用）
 */
export async function GET(request: NextRequest) {
  // Cron認証
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "認証エラー" }, { status: 401 });
    }
  }

  const result = await autoTrackMissingImages(15);

  return NextResponse.json({
    message: `画像自動追跡完了: ${result.processed}件処理、${result.totalFetched}枚取得`,
    ...result,
  });
}
