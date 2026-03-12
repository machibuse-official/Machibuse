# Machibuse 引き継ぎ資料

## プロジェクト概要

高級賃貸マンションの空室監視・通知アプリ。指定した建物の募集情報をSUUMOからスクレイピングし、新着があれば通知する。

- **本番URL**: https://machibuse.vercel.app
- **GitHub**: https://github.com/machibuse-official/Machibuse.git
- **ブランチ**: main

## 技術スタック

- Next.js 16 (App Router) / TypeScript / Tailwind CSS v4
- Supabase (PostgreSQL + Auth + Realtime)
- Vercel (ホスティング + Cron)
- Cheerio (HTMLスクレイピング)
- Recharts (グラフ)
- Playwright (E2Eテスト)

## `.env.local` 設定

プロジェクトルートに `.env.local` を作成し、以下を設定:

```env
# --- 必須（設定済み） ---
NEXT_PUBLIC_SUPABASE_URL=https://jncdladjskuwwzgvqfph.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpuY2RsYWRqc2t1d3d6Z3ZxZnBoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwNjI3NDgsImV4cCI6MjA4ODYzODc0OH0.p4tI8EnXQQMq9WQsBp7Utlg5W8VrH3NaGteocmDQxH0

# --- 任意（未設定・将来用） ---
# CRON_SECRET=任意の文字列
# RESEND_API_KEY=Resendで取得
# SUPABASE_SERVICE_ROLE_KEY=Supabase Dashboardで取得
```

### 各キーの説明

| 環境変数 | 用途 | 取得場所 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase接続URL | Supabase Dashboard → Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 公開匿名キー（RLSで保護） | Supabase Dashboard → Settings → API → anon public |
| `CRON_SECRET` | Cronジョブ認証トークン | 任意の文字列を設定。`/api/scrape/cron` の Bearer 認証用 |
| `RESEND_API_KEY` | メール通知送信 | https://resend.com でAPI key取得 |
| `SUPABASE_SERVICE_ROLE_KEY` | サーバーサイドRLSバイパス | Supabase Dashboard → Settings → API → service_role secret |

## Supabaseプロジェクト情報

- **プロジェクトRef**: `jncdladjskuwwzgvqfph`
- **ダッシュボード**: https://supabase.com/dashboard/project/jncdladjskuwwzgvqfph

### 主要テーブル

| テーブル | 内容 |
|---|---|
| `mansions` | 建物マスター（名前、住所、最寄り駅など） |
| `units` | 間取り（建物に紐づく部屋タイプ） |
| `listings` | 募集情報（賃料、ステータス、掲載元URL） |
| `property_images` | 建物画像（外観・エントランス・室内など） |
| `notifications` | 通知（新着・値下げ・終了） |
| `user_watchlists` | ユーザー監視リスト |
| `notification_settings` | 通知設定（メール有無、頻度） |

## Vercel設定

- 環境変数は Vercel Dashboard → Settings → Environment Variables に同じものを設定済み
- Cron設定: `vercel.json` に定義（`/api/scrape/cron` を定期実行）

## セットアップ手順（新しい開発者向け）

```bash
# 1. クローン
git clone https://github.com/machibuse-official/Machibuse.git
cd Machibuse

# 2. 依存インストール
npm install

# 3. .env.local を作成（上記の値を設定）

# 4. 開発サーバー起動
npm run dev

# 5. http://localhost:3000 でアクセス
```

## 主要APIエンドポイント

| エンドポイント | メソッド | 内容 |
|---|---|---|
| `/api/mansions` | GET/POST | 建物一覧取得・登録 |
| `/api/units` | GET/POST | 間取り一覧取得・登録 |
| `/api/listings` | GET/POST | 募集一覧取得・登録 |
| `/api/mansions/[id]/images` | GET/POST/DELETE | 建物画像管理 |
| `/api/scrape/manual` | POST | 手動スクレイプ実行 |
| `/api/scrape/cron` | GET | 定期スクレイプ（Cron用） |
| `/api/images/auto-track` | POST | 画像自動取得 |
| `/api/images/seed-static` | POST | 静的画像データをDBに投入 |
| `/api/notifications` | GET | 通知一覧取得 |

## 主要ページ

| パス | 内容 |
|---|---|
| `/dashboard` | ダッシュボード |
| `/mansions` | 建物一覧（nifty不動産風UI） |
| `/mansions/[id]` | 建物詳細 |
| `/watchlist` | ウォッチリスト |
| `/favorites` | お気に入り |
| `/compare` | 物件比較 |
| `/notifications` | 通知一覧 |
| `/admin` | 管理画面（建物/間取り/募集登録、スクレイプ実行） |

## 画像データについて

- 静的画像データ: `src/data/mansion-images.ts`（axel-home.comから取得済み）
- DBの `property_images` テーブルが空でも、APIが静的データをフォールバック表示する
- 管理画面 → 画像タブ → 「静的画像をDBに移行」でDBに投入可能

## スクレイピング

- SUUMOのみ対応（LIFULL/athome/chintai.netは403/404でブロック）
- 管理画面 → スクレイプタブから手動実行可能
- Cronで自動実行する場合は `CRON_SECRET` の設定が必要

## 注意事項

- 認証は現在無効化済み（全ページ公開）
- ウォッチリスト・お気に入り・比較機能はlocalStorageベース
- Supabase Realtimeを使う場合は `notifications` テーブルのReplicationをONにする必要あり
