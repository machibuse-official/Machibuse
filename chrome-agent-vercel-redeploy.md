# Chrome Agent: Vercel再デプロイ手順

## 目的
Machibuseプロジェクトの最新コードがVercelにデプロイされていない。
GitHubリポジトリ移動（22kyasue → machibuse-official）でwebhook接続が切れた可能性がある。
デプロイ状況を確認し、必要に応じて再デプロイ・Git接続を修正する。

---

## Step 1: Vercelダッシュボードにアクセス

1. https://vercel.com にアクセス
2. ログインする（まだの場合）
3. プロジェクト一覧から **Machibuse** を選択

---

## Step 2: デプロイ状況の確認

1. **Deployments** タブをクリック
2. 最新のデプロイを確認:
   - **いつのデプロイか？** → コミットメッセージとハッシュを確認
   - **Status は？** → Ready / Error / Building / Queued
   - もし最新コミット `514a9cb` (chore: disable X-Powered-By header) や `160db70` が無ければ、webhookが切れている

3. もしデプロイが **Error** の場合:
   - そのデプロイをクリックしてビルドログを確認
   - エラーメッセージをコピー

---

## Step 3: Git接続の確認・修正

1. プロジェクトの **Settings** タブをクリック
2. 左メニューから **Git** を選択
3. **Connected Git Repository** セクションを確認:
   - 接続先が `machibuse-official/Machibuse` になっているか？
   - もし `22kyasue/Machibuse` のままなら **Disconnect** して再接続が必要
   - もし「Repository not found」等のエラーが出ていたら接続が切れている

4. **接続が切れている場合**:
   - 「Connect Git Repository」をクリック
   - GitHubを選択
   - `machibuse-official/Machibuse` を検索して選択
   - ブランチ: `main`
   - 「Connect」をクリック

---

## Step 4: 手動再デプロイ（Git接続が正常な場合）

1. **Deployments** タブに戻る
2. 最後に成功したデプロイ（Ready状態のもの）の右側 **⋮** メニューをクリック
3. **Redeploy** を選択
4. 「Use existing Build Cache」のチェックを **外す**（クリーンビルド）
5. 「Redeploy」ボタンをクリック

**または**、最新コミットのデプロイが失敗している場合:
1. その失敗デプロイをクリック
2. 右上の **Redeploy** ボタンをクリック
3. キャッシュなしで再デプロイ

---

## Step 5: 環境変数の確認

1. **Settings** → **Environment Variables** を開く
2. 以下の環境変数が設定されているか確認:
   - `NEXT_PUBLIC_SUPABASE_URL` → Supabase URLが入っている
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Supabase Anon Keyが入っている
   - `SUPABASE_SERVICE_ROLE_KEY` → Service Role Keyが入っている（APIルート用）
   - `CRON_SECRET` → Cronジョブ認証用（任意の文字列）

もし足りない変数があれば、Supabaseダッシュボード（https://supabase.com）の
Project Settings → API から値をコピーして設定する。

---

## Step 6: デプロイ完了確認

デプロイが完了（Ready状態）したら、以下を確認:

1. https://machibuse.vercel.app を開く → ダッシュボードが表示される
2. https://machibuse.vercel.app/mansions を開く → nifty不動産風の検索画面が表示される
3. https://machibuse.vercel.app/api/mansions を開く → JSONに `"images"` フィールドが含まれている

---

## トラブルシューティング

### ビルドが「Type error」で失敗する場合
- ビルドログのエラーメッセージを確認
- Node.jsバージョンの問題の可能性 → Settings → General → Node.js Version を **20.x** に設定

### 「Module not found」エラーの場合
- `npm install` が正しく実行されていない可能性
- Settings → General → Install Command が `npm install` になっているか確認

### 接続後もデプロイが走らない場合
- GitHubのWebhook設定を確認: GitHub → Repository Settings → Webhooks
- Vercelのwebhookが登録されているか確認
- 手動で「Redeploy from latest commit」を実行
