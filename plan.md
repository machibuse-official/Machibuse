# Machibuse（待ち伏せ） - 開発計画

## Tech Stack（技術スタック）

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router) + TypeScript |
| Styling | Tailwind CSS v4 |
| Backend/API | Next.js API Routes (Route Handlers) |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Notifications | Supabase Realtime + Email (Resend) |
| Scraping (後日) | Python scripts (V1以降) |
| Deployment | Vercel |

---

# V0（MVP - 価値検証版）

> 目的：「狙った住戸が出たら知れる」価値を最速で検証する

---

## Phase 0: プロジェクト初期セットアップ ✅

### Frontend
- [x] Next.js プロジェクト作成（TypeScript, App Router, Tailwind CSS）
- [x] 日本語フォント設定（Noto Sans JP）
- [x] プロジェクトのフォルダ構造を作成
- [x] 基本レイアウト（ヘッダー、ナビゲーション、フッター）
- [x] 共通UIコンポーネント（ボタン、カード、タグ/ラベル、モーダル、スケルトン）
- [x] ステータスラベルコンポーネント統一定義

### Backend
- [x] Supabase プロジェクト作成 & 環境変数設定
- [x] Supabase Client セットアップ（`lib/supabase.ts`）
- [x] Supabase Server Client（`lib/supabase-server.ts`）
- [x] Supabase Middleware Client（`lib/supabase-middleware.ts`）

---

## Phase 1: データベース構築 ✅

### Backend
- [x] `mansions`（建物マスター）テーブル作成
- [x] `units`（間取り/住戸タイプマスター）テーブル作成
- [x] `listings`（募集情報 - 現在 & 過去）テーブル作成
- [x] `user_watchlists`（監視リスト）テーブル作成
- [x] `notifications`（通知履歴）テーブル作成
- [x] Supabase Row Level Security (RLS) ポリシー設定
- [x] シードデータ投入（テスト用の建物・間取り・募集データ）
- [ ] シードデータをSupabase SQLエディタで実行 ← **要手動作業**（chrome-agent-seed.md 参照）

---

## Phase 2: 認証（Auth） ✅

### Frontend
- [x] サインアップページ（`/signup`）
- [x] ログインページ（`/login`）

### Backend
- [x] Supabase Auth 設定（メール/パスワード認証）
- [x] 認証ミドルウェア（全ページ公開設定済み）
- [x] ユーザーセッション管理

---

## Phase 3: コア画面の実装（MVP） ✅

### 3-1: 建物一覧（`/mansions`）
- [x] 建物カードコンポーネント
- [x] 建物一覧ページ（カード形式）
- [x] 並び替え（更新日順 / 名前順 / 募集数順 / 駅近順）
- [x] フィルター（すべて / 監視中のみ / 募集中あり）
- [x] ページネーション
- [x] 建物登録モーダル
- [x] ローディングスケルトン
- [x] 建物一覧取得 API
- [x] 建物登録 API
- [x] 建物更新 API
- [x] 建物削除 API

### 3-2: 建物詳細（`/mansions/[id]`）
- [x] 建物ヘッダー（建物名 + 監視トグル）
- [x] 建物基本情報ブロック
- [x] 状況サマリ（4分割カード）
- [x] アクションバー
- [x] 間取りタイプ一覧
- [x] 現在募集中住戸セクション
- [x] 備考/メモセクション
- [x] 間取りタイプ登録モーダル
- [x] ローディングスケルトン
- [x] 建物詳細取得 API
- [x] 間取りタイプ登録 API
- [x] 間取りタイプ更新 API

### 3-3: 間取りタイプ詳細（`/units/[id]`）
- [x] タイプ要約ヘッダー
- [x] 間取り図表示プレースホルダー
- [x] 現在の状態表示
- [x] 過去募集履歴リスト
- [x] 類似住戸セクション
- [x] 関連する現在募集一覧
- [x] 建物詳細への戻り導線
- [x] ローディングスケルトン
- [x] 間取りタイプ詳細取得 API
- [x] 類似住戸取得 API

### 3-4: 募集詳細（`/listings/[id]`）
- [x] 募集情報表示
- [x] 掲載元サイトへの外部リンク
- [x] 同建物の他の募集中住戸セクション
- [x] このタイプの過去掲載履歴セクション
- [x] 建物詳細 / 間取りタイプ詳細への戻り導線
- [x] ローディングスケルトン
- [x] 募集詳細取得 API
- [x] 募集ステータス更新 API

### 3-5: 通知一覧（`/notifications`）
- [x] 通知カードコンポーネント
- [x] 通知一覧ページ
- [x] フィルター（すべて / 未読のみ）
- [x] 通知から募集詳細への遷移
- [x] 一括既読ボタン
- [x] ローディングスケルトン
- [x] 通知一覧取得 API
- [x] 通知既読更新 API

### 3-6: ダッシュボード（`/dashboard`）
- [x] 監視中の建物一覧
- [x] 未読通知件数バッジ
- [x] 最近検知した募集
- [x] 新着通知サマリ
- [x] 各ページへのクイックナビゲーション
- [x] ローディングスケルトン
- [x] ダッシュボード用集約データ取得 API

---

## Phase 4: 監視（ウォッチ）機能 ✅

### Frontend
- [x] ウォッチリスト一覧ページ（`/watchlist`）
  - 建物ウォッチ一覧
  - 監視ON/OFF切替
  - 監視候補（未監視建物）表示
- [ ] ウォッチ条件設定UI（賃料上限、面積下限など）← V1で実装

### Backend
- [x] ウォッチリスト API（CRUD）
- [ ] マッチングエンジン ← V1で実装
- [ ] マッチ検知時の通知自動生成ロジック ← V1で実装

---

## Phase 5: 通知システム ✅

### Frontend
- [x] 通知設定ページ（`/settings/notifications`）
  - メール通知 ON/OFF
  - 通知先メールアドレス設定
  - 通知種別ごとのON/OFF
- [x] ヘッダーの通知ベルアイコン + 未読バッジ
- [x] Supabase Realtime によるリアルタイム通知更新

### Backend
- [x] Supabase Realtime 通知配信（リアルタイム未読カウント更新）
- [ ] メール通知送信（Resend 連携） ← V1で実装
- [ ] 差分検知ロジック ← V1で実装

---

## Phase 6: UI/UX ポリッシュ ✅

### Frontend
- [x] レスポンシブデザイン（モバイルサイドバー開閉）
- [x] ローディング状態 & スケルトン表示（全画面）
- [x] エラーハンドリング UI（error.tsx）
- [x] 404 Not Found ページ（not-found.tsx）
- [x] ステータスラベルのカラーリング統一
- [x] 画面間の文脈維持（パンくず、戻り導線）
- [x] PWA対応（manifest.json, service worker）

---

## Phase 7: デプロイ & 管理機能 ✅

### Frontend
- [x] Vercel へのデプロイ（https://machibuse.vercel.app）
- [x] 管理者用データ投入画面（`/admin`）
  - 建物・間取り・募集の登録フォーム
  - タブ切替UI
  - 2段階ドロップダウン（建物→間取り）

### Backend
- [x] 環境変数の本番設定（Vercel）
- [x] 募集登録 API（POST /api/listings）
- [ ] 基本的な E2E テスト ← V1で実装

---

# 残タスク

1. シードデータをSupabase SQLエディタで実行（chrome-agent-seed.md 参照）
2. Supabase Realtime を有効化（Supabaseダッシュボード → Database → Replication で notifications テーブルを有効化）

---

# V1（実用化版 - 今回のスコープ外）

> 目的：「ちゃんと使えるアプリ」にする

- 建物検索機能（建物名、エリア、駅、路線）
- 条件検索機能
- ウォッチ条件設定UI（賃料上限、面積下限）
- マッチングエンジン & 通知自動生成
- 条件セット保存 & 監視機能
- お気に入り機能
- 過去募集履歴の詳細可視化（時系列グラフ）
- 比較機能
- スクレイピングパイプライン（SUUMO, KENCORP）
- メール通知送信（Resend 連携）
- E2Eテスト

---

# 注意事項

- **全ての出力・会話・コメント・UIテキスト・データは日本語で行うこと**
- データベース設計は「物件（アセット）」中心
- ステータスラベルは全画面で一貫して表示すること
- 閲覧設計の原則: 建物と間取りタイプの「在庫理解」をさせる
- 各画面は「情報表示」ではなく「意思決定」ページとして設計する
- 賃料より先に「文脈」を見せる
- 初期はエリアを絞る（港区・渋谷区・千代田区の高級賃貸/タワマン）
- 写真サイトではなくデータサイトとして設計
