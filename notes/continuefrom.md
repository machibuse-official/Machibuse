# 続きから（最終更新: v1.0.0）

## 現在の状態

### 完了済み
- Phase 0: プロジェクト初期セットアップ（フロントエンド全て完了）
- Phase 1: DBマイグレーションSQL作成済み（Supabase未接続）
- Phase 3: MVP 6画面のフロントエンド実装済み（モックデータで動作）
  - ダッシュボード (`/dashboard`)
  - 建物一覧 (`/mansions`)
  - 建物詳細 (`/mansions/[id]`)
  - 間取りタイプ詳細 (`/units/[id]`)
  - 募集詳細 (`/listings/[id]`)
  - 通知一覧 (`/notifications`)

### 次にやるべきこと
1. **Supabase プロジェクトを作成する**（ユーザー側の作業）
   - Supabase でプロジェクトを作成
   - `.env.local` に `NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` を設定
   - `supabase/migrations/001_create_tables.sql` を Supabase SQL エディタで実行
   - `supabase/migrations/002_rls_policies.sql` を実行
   - `supabase/seed.sql` を実行（テストデータ投入）

2. **バックエンド API 実装**（Supabase接続後）
   - 建物 CRUD API
   - 間取りタイプ CRUD API
   - 募集情報 CRUD API
   - 通知 API
   - ダッシュボード集約 API

3. **フロントエンドをモックデータから Supabase に切り替え**

4. **Phase 2: 認証（Auth）**
   - サインアップ / ログインページ
   - 認証ミドルウェア

5. **Phase 3 残りのフロントエンド**
   - 建物登録モーダル
   - 間取りタイプ登録モーダル
   - 並び替え・ページネーション

6. **Phase 4: 監視（ウォッチ）機能**

7. **Phase 5: 通知システム**

## 未解決の問題
- Supabase 未接続（`.env.local` 未設定）
- 認証未実装（全ページが公開状態）
- 全データがモックデータ（`src/lib/mock-data.ts`）
