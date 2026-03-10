# Chrome Agent: Supabase データベースセットアップ

以下の手順を順番に実行してください。

---

## ステップ1: Supabaseダッシュボードを開く

1. ブラウザで https://supabase.com/dashboard にアクセス
2. ログイン済みでなければログインする
3. プロジェクト一覧から **jncdladjskuwwzgvqfph** のプロジェクトを開く（URLが `https://supabase.com/dashboard/project/jncdladjskuwwzgvqfph` になるはず）

---

## ステップ2: SQLエディタを開く

1. 左サイドバーの **「SQL Editor」** をクリック
2. 「New query」をクリックして新しいクエリエディタを開く

---

## ステップ3: テーブル存在確認

まず既存テーブルの状態を確認するため、以下のSQLを実行：

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**「Run」ボタンを押して実行。**

結果を確認：
- `mansions`, `units`, `listings`, `user_watchlists`, `notifications` が表示されれば **001 と 002 は適用済み** → ステップ4aへ
- 何もテーブルがなければ **001 から実行が必要** → ステップ4bへ

---

## ステップ4a: 001/002 が適用済みの場合

003 の実行に進む（ステップ5へスキップ）

## ステップ4b: テーブルがない場合 — 001 を実行

「New query」で新しいクエリを開き、以下を貼り付けて **Run**：

```sql
-- 建物マスター
CREATE TABLE mansions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  nearest_station TEXT,
  walking_minutes INTEGER,
  brand_type TEXT,
  total_units INTEGER,
  floors INTEGER,
  construction_date TEXT,
  features TEXT,
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 間取り/住戸タイプマスター
CREATE TABLE units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mansion_id UUID NOT NULL REFERENCES mansions(id) ON DELETE CASCADE,
  room_number TEXT,
  floor_range TEXT,
  size_sqm NUMERIC(6,2) NOT NULL,
  layout_type TEXT NOT NULL,
  direction TEXT,
  balcony TEXT,
  floorplan_url TEXT,
  last_rent INTEGER,
  memo TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 募集情報（現在 & 過去）
CREATE TABLE listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id UUID NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'past', 'ended')),
  current_rent INTEGER NOT NULL,
  management_fee INTEGER,
  floor INTEGER,
  source_site TEXT,
  source_url TEXT,
  detected_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  scraped_at TIMESTAMPTZ
);

-- 監視リスト
CREATE TABLE user_watchlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  target_unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  target_mansion_id UUID REFERENCES mansions(id) ON DELETE CASCADE,
  conditions JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT watchlist_target_check CHECK (
    target_unit_id IS NOT NULL OR target_mansion_id IS NOT NULL
  )
);

-- 通知履歴
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  watch_id UUID REFERENCES user_watchlists(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('new_listing', 'price_change', 'ended', 'relisted')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- インデックス
CREATE INDEX idx_units_mansion_id ON units(mansion_id);
CREATE INDEX idx_listings_unit_id ON listings(unit_id);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_detected_at ON listings(detected_at DESC);
CREATE INDEX idx_user_watchlists_user_id ON user_watchlists(user_id);
CREATE INDEX idx_user_watchlists_mansion_id ON user_watchlists(target_mansion_id);
CREATE INDEX idx_user_watchlists_unit_id ON user_watchlists(target_unit_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- updated_at 自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mansions_updated_at
  BEFORE UPDATE ON mansions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER units_updated_at
  BEFORE UPDATE ON units
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

**「Run」ボタンを押して実行。**

成功したら、次に **002 RLS** を実行する。「New query」で：

```sql
-- RLS有効化
ALTER TABLE mansions ENABLE ROW LEVEL SECURITY;
ALTER TABLE units ENABLE ROW LEVEL SECURITY;
ALTER TABLE listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_watchlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- mansions: 全員読み取り可、認証ユーザーのみ書き込み可
CREATE POLICY "mansions_select" ON mansions FOR SELECT USING (true);
CREATE POLICY "mansions_insert" ON mansions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "mansions_update" ON mansions FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "mansions_delete" ON mansions FOR DELETE USING (auth.uid() IS NOT NULL);

-- units: 全員読み取り可、認証ユーザーのみ書き込み可
CREATE POLICY "units_select" ON units FOR SELECT USING (true);
CREATE POLICY "units_insert" ON units FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "units_update" ON units FOR UPDATE USING (auth.uid() IS NOT NULL);
CREATE POLICY "units_delete" ON units FOR DELETE USING (auth.uid() IS NOT NULL);

-- listings: 全員読み取り可、認証ユーザーのみ書き込み可
CREATE POLICY "listings_select" ON listings FOR SELECT USING (true);
CREATE POLICY "listings_insert" ON listings FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "listings_update" ON listings FOR UPDATE USING (auth.uid() IS NOT NULL);

-- user_watchlists: 自分のデータのみ
CREATE POLICY "watchlists_select" ON user_watchlists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "watchlists_insert" ON user_watchlists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "watchlists_update" ON user_watchlists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "watchlists_delete" ON user_watchlists FOR DELETE USING (auth.uid() = user_id);

-- notifications: 自分のデータのみ
CREATE POLICY "notifications_select" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (auth.uid() = user_id);
```

**「Run」ボタンを押して実行。**

---

## ステップ5: 003 通知設定テーブルの作成

「New query」で新しいクエリを開き、以下を貼り付けて **Run**：

```sql
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email_enabled BOOLEAN DEFAULT false,
  email_address TEXT,
  notify_new_listing BOOLEAN DEFAULT true,
  notify_price_change BOOLEAN DEFAULT true,
  notify_ended BOOLEAN DEFAULT false,
  notify_relisted BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ユーザーは自分の設定のみ閲覧可能"
  ON notification_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "ユーザーは自分の設定のみ更新可能"
  ON notification_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_notification_settings_updated_at
  BEFORE UPDATE ON notification_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

**「Run」ボタンを押して実行。** 成功メッセージを確認。

---

## ステップ6: 004 物件情報拡張（カラム追加 + 画像テーブル）

「New query」で新しいクエリを開き、以下を貼り付けて **Run**：

```sql
-- mansions テーブル拡張
ALTER TABLE mansions ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE mansions ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE mansions ADD COLUMN IF NOT EXISTS structure TEXT;
ALTER TABLE mansions ADD COLUMN IF NOT EXISTS exterior_image_url TEXT;
ALTER TABLE mansions ADD COLUMN IF NOT EXISTS second_nearest_station TEXT;
ALTER TABLE mansions ADD COLUMN IF NOT EXISTS second_walking_minutes INTEGER;
ALTER TABLE mansions ADD COLUMN IF NOT EXISTS management_company TEXT;
ALTER TABLE mansions ADD COLUMN IF NOT EXISTS pet_allowed BOOLEAN DEFAULT false;
ALTER TABLE mansions ADD COLUMN IF NOT EXISTS parking_available BOOLEAN DEFAULT false;

-- units テーブル拡張
ALTER TABLE units ADD COLUMN IF NOT EXISTS floorplan_image_url TEXT;
ALTER TABLE units ADD COLUMN IF NOT EXISTS balcony_sqm NUMERIC(6,2);
ALTER TABLE units ADD COLUMN IF NOT EXISTS bath_toilet_separate BOOLEAN;
ALTER TABLE units ADD COLUMN IF NOT EXISTS storage TEXT;

-- listings テーブル拡張
ALTER TABLE listings ADD COLUMN IF NOT EXISTS deposit INTEGER;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS key_money INTEGER;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS guarantee_deposit INTEGER;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS renewal_fee TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS contract_period TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS move_in_date TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS conditions TEXT;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS interior_features TEXT[];
ALTER TABLE listings ADD COLUMN IF NOT EXISTS building_features TEXT[];

-- property_images テーブル新規作成
CREATE TABLE IF NOT EXISTS property_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  mansion_id UUID REFERENCES mansions(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_type TEXT NOT NULL,
  caption TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_property_images_listing ON property_images(listing_id);
CREATE INDEX IF NOT EXISTS idx_property_images_unit ON property_images(unit_id);
CREATE INDEX IF NOT EXISTS idx_property_images_mansion ON property_images(mansion_id);

ALTER TABLE property_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "画像は全員閲覧可能" ON property_images FOR SELECT USING (true);
CREATE POLICY "認証済みユーザーは画像を追加可能" ON property_images FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
```

**「Run」ボタンを押して実行。** 成功メッセージを確認。

---

## ステップ7: 基本シードデータの投入

「New query」で新しいクエリを開き、以下を貼り付けて **Run**：

```sql
-- 建物データ
INSERT INTO mansions (id, name, address, nearest_station, walking_minutes, brand_type, total_units, floors, construction_date, features, memo) VALUES
  ('a1000000-0000-0000-0000-000000000001', 'パークコート赤坂檜町ザ タワー', '東京都港区赤坂9丁目', '六本木駅', 6, '三井不動産', 319, 44, '2018年', 'タワーマンション、コンシェルジュ、フィットネス', '2LDKの掲載が比較的多い。南向きは高層階中心。'),
  ('a1000000-0000-0000-0000-000000000002', 'ラ・トゥール渋谷', '東京都渋谷区渋谷1丁目', '渋谷駅', 5, '住友不動産', 206, 36, '2014年', 'タワーマンション、コンシェルジュ、スカイラウンジ', 'KENCORP掲載が多い。'),
  ('a1000000-0000-0000-0000-000000000003', 'パークマンション南麻布', '東京都港区南麻布4丁目', '広尾駅', 3, '三井不動産', 48, 5, '2005年', '低層マンション、閑静な住宅街', '小規模で稀少。募集は年に1-2回程度。'),
  ('a1000000-0000-0000-0000-000000000004', 'ザ・パークハウス グラン 南青山', '東京都港区南青山7丁目', '表参道駅', 8, '三菱地所', 86, 7, '2019年', '低層、高級仕様、ペット可', NULL),
  ('a1000000-0000-0000-0000-000000000005', 'グランドヒルズ白金台', '東京都港区白金台3丁目', '白金台駅', 4, '住友不動産', 55, 5, '2016年', '低層マンション、専有面積広め', NULL),
  ('a1000000-0000-0000-0000-000000000006', 'ブリリアタワーズ目黒 サウスレジデンス', '東京都品川区上大崎3丁目', '目黒駅', 1, '東京建物', 497, 40, '2017年', 'タワーマンション、駅直結', NULL),
  ('a1000000-0000-0000-0000-000000000007', 'ザ・パークハウス西新宿タワー60', '東京都新宿区西新宿5丁目', '都庁前駅', 4, '三菱地所', 954, 60, '2017年', '超高層タワーマンション', NULL)
ON CONFLICT (id) DO NOTHING;

-- 間取りタイプデータ
INSERT INTO units (id, mansion_id, room_number, floor_range, size_sqm, layout_type, direction, last_rent, memo) VALUES
  ('b1000000-0000-0000-0000-000000000001', 'a1000000-0000-0000-0000-000000000001', NULL, '20-30F', 71.20, '2LDK', '南', 480000, NULL),
  ('b1000000-0000-0000-0000-000000000002', 'a1000000-0000-0000-0000-000000000001', NULL, '10-20F', 58.10, '1LDK', '東', 350000, NULL),
  ('b1000000-0000-0000-0000-000000000003', 'a1000000-0000-0000-0000-000000000001', NULL, '30-40F', 82.40, '3LDK', '南西', NULL, '掲載実績なし'),
  ('b1000000-0000-0000-0000-000000000004', 'a1000000-0000-0000-0000-000000000001', NULL, '5-15F', 45.30, '1LDK', '北', 280000, NULL),
  ('b1000000-0000-0000-0000-000000000005', 'a1000000-0000-0000-0000-000000000002', NULL, '15-25F', 65.80, '2LDK', '南', 420000, NULL),
  ('b1000000-0000-0000-0000-000000000006', 'a1000000-0000-0000-0000-000000000002', NULL, '25-36F', 85.20, '2LDK', '南西', 580000, NULL),
  ('b1000000-0000-0000-0000-000000000007', 'a1000000-0000-0000-0000-000000000002', NULL, '5-15F', 42.10, '1K', '東', 220000, NULL),
  ('b1000000-0000-0000-0000-000000000008', 'a1000000-0000-0000-0000-000000000003', NULL, '3-5F', 120.50, '3LDK', '南', 750000, NULL),
  ('b1000000-0000-0000-0000-000000000009', 'a1000000-0000-0000-0000-000000000003', NULL, '1-3F', 95.30, '2LDK', '南東', 580000, NULL),
  ('b1000000-0000-0000-0000-000000000010', 'a1000000-0000-0000-0000-000000000004', NULL, '3-7F', 78.50, '2LDK', '南', 520000, NULL),
  ('b1000000-0000-0000-0000-000000000011', 'a1000000-0000-0000-0000-000000000004', NULL, '1-3F', 55.20, '1LDK', '東', 350000, NULL),
  ('b1000000-0000-0000-0000-000000000012', 'a1000000-0000-0000-0000-000000000005', NULL, '3-5F', 105.80, '3LDK', '南', 680000, NULL)
ON CONFLICT (id) DO NOTHING;

-- 募集データ
INSERT INTO listings (id, unit_id, status, current_rent, management_fee, floor, source_site, source_url, detected_at, ended_at) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'b1000000-0000-0000-0000-000000000001', 'active', 480000, 20000, 24, 'KENCORP', 'https://example.com/listing/1', '2026-03-09 09:55:00+09', NULL),
  ('c1000000-0000-0000-0000-000000000002', 'b1000000-0000-0000-0000-000000000001', 'active', 465000, 20000, 19, 'SUUMO', 'https://example.com/listing/2', '2026-03-09 08:10:00+09', NULL),
  ('c1000000-0000-0000-0000-000000000003', 'b1000000-0000-0000-0000-000000000002', 'past', 350000, 15000, 14, 'SUUMO', 'https://example.com/listing/3', '2025-11-14 10:00:00+09', '2025-12-20 00:00:00+09'),
  ('c1000000-0000-0000-0000-000000000004', 'b1000000-0000-0000-0000-000000000004', 'past', 280000, 12000, 8, 'HOMES', 'https://example.com/listing/4', '2025-09-01 10:00:00+09', '2025-10-15 00:00:00+09'),
  ('c1000000-0000-0000-0000-000000000005', 'b1000000-0000-0000-0000-000000000005', 'active', 430000, 18000, 20, 'KENCORP', 'https://example.com/listing/5', '2026-03-07 14:30:00+09', NULL),
  ('c1000000-0000-0000-0000-000000000006', 'b1000000-0000-0000-0000-000000000006', 'past', 580000, 25000, 30, 'SUUMO', 'https://example.com/listing/6', '2025-08-20 10:00:00+09', '2025-09-30 00:00:00+09'),
  ('c1000000-0000-0000-0000-000000000007', 'b1000000-0000-0000-0000-000000000008', 'past', 750000, 30000, 4, 'KENCORP', 'https://example.com/listing/7', '2025-06-01 10:00:00+09', '2025-07-15 00:00:00+09'),
  ('c1000000-0000-0000-0000-000000000008', 'b1000000-0000-0000-0000-000000000010', 'active', 530000, 22000, 5, 'SUUMO', 'https://example.com/listing/8', '2026-03-05 11:00:00+09', NULL)
ON CONFLICT (id) DO NOTHING;
```

**「Run」ボタンを押して実行。**

---

## ステップ8: 拡張シードデータ（15棟追加）

「New query」で新しいクエリを開き、以下を **3つに分けて** 実行する（長いため）。

### パート1: 建物15棟

```sql
INSERT INTO mansions (id, name, address, nearest_station, walking_minutes, brand_type, total_units, floors, construction_date, features, memo) VALUES
  ('a2000000-0000-0000-0000-000000000001', '六本木ヒルズレジデンス', '東京都港区六本木6丁目', '六本木駅', 3, '森ビル', 793, 43, '2003年', 'タワーマンション、コンシェルジュ、スパ、ビューラウンジ', '六本木ヒルズ内。ホテルライクなサービスが特徴。'),
  ('a2000000-0000-0000-0000-000000000002', '東京ミッドタウンレジデンシィズ', '東京都港区赤坂9丁目', '六本木駅', 1, '三井不動産', 525, 45, '2007年', 'タワーマンション、コンシェルジュ、フィットネス、ミッドタウン直結', 'ミッドタウン直結の利便性。高層階はパークビュー。'),
  ('a2000000-0000-0000-0000-000000000003', 'ワールドシティタワーズ', '東京都港区港南4丁目', '品川駅', 12, '住友不動産', 2090, 42, '2005年', '大規模タワーマンション、プール、スパ、ゲストルーム', '3棟構成の大規模。共用施設が充実。'),
  ('a2000000-0000-0000-0000-000000000004', '芝浦アイランド ブルームタワー', '東京都港区芝浦4丁目', '田町駅', 10, '三井不動産レジデンシャル', 487, 48, '2008年', 'タワーマンション、ウォーターフロント、キッズルーム', '運河沿いのロケーション。ファミリー向け。'),
  ('a2000000-0000-0000-0000-000000000005', 'プラウドタワー東雲キャナルコート', '東京都江東区東雲1丁目', '辰巳駅', 5, '野村不動産', 600, 52, '2012年', 'タワーマンション、スカイラウンジ、ペット可', '湾岸エリアの大規模タワー。眺望良好。'),
  ('a2000000-0000-0000-0000-000000000006', 'ザ・パークハウス晴海タワーズ ティアロレジデンス', '東京都中央区晴海2丁目', '勝どき駅', 12, '三菱地所レジデンス', 861, 49, '2016年', 'タワーマンション、スカイラウンジ、フィットネス', '晴海エリア。2棟構成。'),
  ('a2000000-0000-0000-0000-000000000007', 'パークシティ武蔵小杉 ザ ガーデン', '神奈川県川崎市中原区小杉町2丁目', '武蔵小杉駅', 4, '三井不動産レジデンシャル', 884, 53, '2017年', '超高層タワーマンション、商業施設併設', '武蔵小杉のランドマーク。駅近。'),
  ('a2000000-0000-0000-0000-000000000008', '勝どきザ・タワー', '東京都中央区勝どき5丁目', '勝どき駅', 1, '鹿島建設', 712, 53, '2016年', 'タワーマンション、駅直結、商業施設', '駅直結の利便性。大規模商業施設併設。'),
  ('a2000000-0000-0000-0000-000000000009', 'コンシェリア西新宿 TOWER''S WEST', '東京都新宿区西新宿6丁目', '西新宿五丁目駅', 3, 'クレアスライフ', 251, 44, '2012年', 'タワーマンション、コンシェルジュ、新宿至近', '西新宿のビジネスエリア。シングル〜DINKS向け。'),
  ('a2000000-0000-0000-0000-000000000010', 'ザ・タワー横浜北仲', '神奈川県横浜市中区北仲通5丁目', '馬車道駅', 1, '三井不動産レジデンシャル', 1176, 58, '2020年', '超高層タワーマンション、横浜ランドマーク、駅直結', '横浜エリア最大級。みなとみらいビュー。'),
  ('a2000000-0000-0000-0000-000000000011', 'パークコート渋谷 ザ タワー', '東京都渋谷区宇田川町', '渋谷駅', 6, '三井不動産レジデンシャル', 505, 39, '2020年', 'タワーマンション、コンシェルジュ、渋谷アドレス', '渋谷再開発エリア。希少な渋谷アドレス。'),
  ('a2000000-0000-0000-0000-000000000012', '虎ノ門ヒルズレジデンシャルタワー', '東京都港区虎ノ門1丁目', '虎ノ門ヒルズ駅', 1, '森ビル', 547, 54, '2022年', 'タワーマンション、ホテルライクサービス、駅直結', '虎ノ門ヒルズ直結。最新設備。'),
  ('a2000000-0000-0000-0000-000000000013', 'ブランズタワー豊洲', '東京都江東区豊洲5丁目', '豊洲駅', 4, '東急不動産', 1152, 48, '2021年', 'タワーマンション、大規模、ペット可、キッズルーム', '豊洲エリアの大規模タワー。ファミリー層に人気。'),
  ('a2000000-0000-0000-0000-000000000014', 'ザ・パークハウス三田タワー', '東京都港区芝5丁目', '三田駅', 3, '三菱地所レジデンス', 302, 42, '2019年', 'タワーマンション、コンシェルジュ、東京タワービュー', '三田エリア。東京タワーを望む眺望。'),
  ('a2000000-0000-0000-0000-000000000015', 'パークタワー晴海', '東京都中央区晴海2丁目', '勝どき駅', 13, '三井不動産レジデンシャル', 1076, 48, '2019年', 'タワーマンション、大規模、パーティールーム', 'HARUMI FLAGに隣接。湾岸エリア。')
ON CONFLICT (id) DO NOTHING;
```

**「Run」ボタンを押して実行。**

### パート2: ユニット59件

```sql
INSERT INTO units (id, mansion_id, room_number, floor_range, size_sqm, layout_type, direction, last_rent, memo) VALUES
  ('b2000000-0000-0000-0000-000000000001', 'a2000000-0000-0000-0000-000000000001', NULL, '30-40F', 80.50, '2LDK', '南', 550000, '高層階パークビュー'),
  ('b2000000-0000-0000-0000-000000000002', 'a2000000-0000-0000-0000-000000000001', NULL, '10-20F', 55.30, '1LDK', '東', 350000, NULL),
  ('b2000000-0000-0000-0000-000000000003', 'a2000000-0000-0000-0000-000000000001', NULL, '35-43F', 110.20, '3LDK', '南西', 900000, 'プレミアムフロア'),
  ('b2000000-0000-0000-0000-000000000004', 'a2000000-0000-0000-0000-000000000001', NULL, '5-15F', 42.80, '1LDK', '北', 280000, 'コンパクトタイプ'),
  ('b2000000-0000-0000-0000-000000000005', 'a2000000-0000-0000-0000-000000000002', NULL, '25-35F', 72.10, '2LDK', '南', 520000, 'パークビュー'),
  ('b2000000-0000-0000-0000-000000000006', 'a2000000-0000-0000-0000-000000000002', NULL, '35-45F', 95.80, '3LDK', '南西', 780000, '高層階'),
  ('b2000000-0000-0000-0000-000000000007', 'a2000000-0000-0000-0000-000000000002', NULL, '10-20F', 48.50, '1LDK', '東', 320000, NULL),
  ('b2000000-0000-0000-0000-000000000008', 'a2000000-0000-0000-0000-000000000002', NULL, '20-30F', 60.30, '1LDK', '南東', 400000, NULL),
  ('b2000000-0000-0000-0000-000000000009', 'a2000000-0000-0000-0000-000000000003', NULL, '20-30F', 68.40, '2LDK', '南', 300000, 'キャピタルタワー'),
  ('b2000000-0000-0000-0000-000000000010', 'a2000000-0000-0000-0000-000000000003', NULL, '30-42F', 85.60, '3LDK', '南西', 400000, 'アクアタワー高層'),
  ('b2000000-0000-0000-0000-000000000011', 'a2000000-0000-0000-0000-000000000003', NULL, '5-15F', 45.20, '1LDK', '東', 180000, NULL),
  ('b2000000-0000-0000-0000-000000000012', 'a2000000-0000-0000-0000-000000000003', NULL, '15-25F', 55.80, '2LDK', '北', 250000, NULL),
  ('b2000000-0000-0000-0000-000000000013', 'a2000000-0000-0000-0000-000000000004', NULL, '25-35F', 72.30, '2LDK', '南', 320000, 'レインボーブリッジビュー'),
  ('b2000000-0000-0000-0000-000000000014', 'a2000000-0000-0000-0000-000000000004', NULL, '35-48F', 90.50, '3LDK', '南東', 430000, '高層階'),
  ('b2000000-0000-0000-0000-000000000015', 'a2000000-0000-0000-0000-000000000004', NULL, '5-15F', 50.10, '1LDK', '西', 210000, NULL),
  ('b2000000-0000-0000-0000-000000000016', 'a2000000-0000-0000-0000-000000000005', NULL, '30-40F', 75.20, '3LDK', '南', 280000, 'スカイラウンジ近く'),
  ('b2000000-0000-0000-0000-000000000017', 'a2000000-0000-0000-0000-000000000005', NULL, '10-20F', 58.60, '2LDK', '東', 220000, NULL),
  ('b2000000-0000-0000-0000-000000000018', 'a2000000-0000-0000-0000-000000000005', NULL, '40-52F', 65.40, '2LDK', '南西', 260000, '高層階眺望良好'),
  ('b2000000-0000-0000-0000-000000000019', 'a2000000-0000-0000-0000-000000000006', NULL, '20-35F', 70.80, '3LDK', '南', 320000, NULL),
  ('b2000000-0000-0000-0000-000000000020', 'a2000000-0000-0000-0000-000000000006', NULL, '35-49F', 82.10, '3LDK', '南西', 380000, '高層階'),
  ('b2000000-0000-0000-0000-000000000021', 'a2000000-0000-0000-0000-000000000006', NULL, '5-15F', 55.30, '2LDK', '東', 240000, NULL),
  ('b2000000-0000-0000-0000-000000000022', 'a2000000-0000-0000-0000-000000000007', NULL, '30-40F', 72.50, '3LDK', '南', 260000, NULL),
  ('b2000000-0000-0000-0000-000000000023', 'a2000000-0000-0000-0000-000000000007', NULL, '40-53F', 85.30, '3LDK', '南東', 300000, 'プレミアムフロア'),
  ('b2000000-0000-0000-0000-000000000024', 'a2000000-0000-0000-0000-000000000007', NULL, '10-20F', 55.80, '2LDK', '西', 200000, NULL),
  ('b2000000-0000-0000-0000-000000000025', 'a2000000-0000-0000-0000-000000000007', NULL, '5-15F', 42.30, '1LDK', '北', 155000, 'コンパクトタイプ'),
  ('b2000000-0000-0000-0000-000000000026', 'a2000000-0000-0000-0000-000000000008', NULL, '25-40F', 68.20, '2LDK', '南', 310000, '駅直結'),
  ('b2000000-0000-0000-0000-000000000027', 'a2000000-0000-0000-0000-000000000008', NULL, '40-53F', 80.10, '3LDK', '南西', 380000, '高層階'),
  ('b2000000-0000-0000-0000-000000000028', 'a2000000-0000-0000-0000-000000000008', NULL, '5-15F', 45.60, '1LDK', '東', 195000, NULL),
  ('b2000000-0000-0000-0000-000000000029', 'a2000000-0000-0000-0000-000000000009', NULL, '20-30F', 55.40, '1LDK', '南', 230000, NULL),
  ('b2000000-0000-0000-0000-000000000030', 'a2000000-0000-0000-0000-000000000009', NULL, '30-44F', 68.50, '2LDK', '南西', 300000, '新宿ビュー'),
  ('b2000000-0000-0000-0000-000000000031', 'a2000000-0000-0000-0000-000000000009', NULL, '5-15F', 40.20, '1K', '東', 160000, 'コンパクトタイプ'),
  ('b2000000-0000-0000-0000-000000000032', 'a2000000-0000-0000-0000-000000000010', NULL, '30-45F', 75.30, '2LDK', '南', 280000, 'みなとみらいビュー'),
  ('b2000000-0000-0000-0000-000000000033', 'a2000000-0000-0000-0000-000000000010', NULL, '45-58F', 95.60, '3LDK', '南西', 380000, 'プレミアムフロア'),
  ('b2000000-0000-0000-0000-000000000034', 'a2000000-0000-0000-0000-000000000010', NULL, '10-20F', 52.40, '1LDK', '東', 180000, NULL),
  ('b2000000-0000-0000-0000-000000000035', 'a2000000-0000-0000-0000-000000000010', NULL, '20-30F', 62.80, '2LDK', '北', 230000, NULL),
  ('b2000000-0000-0000-0000-000000000036', 'a2000000-0000-0000-0000-000000000011', NULL, '25-39F', 78.40, '2LDK', '南', 520000, '渋谷ビュー'),
  ('b2000000-0000-0000-0000-000000000037', 'a2000000-0000-0000-0000-000000000011', NULL, '15-25F', 55.60, '1LDK', '東', 340000, NULL),
  ('b2000000-0000-0000-0000-000000000038', 'a2000000-0000-0000-0000-000000000011', NULL, '30-39F', 100.50, '3LDK', '南西', 800000, '高層階プレミアム'),
  ('b2000000-0000-0000-0000-000000000039', 'a2000000-0000-0000-0000-000000000012', NULL, '30-45F', 82.30, '2LDK', '南', 600000, '東京タワービュー'),
  ('b2000000-0000-0000-0000-000000000040', 'a2000000-0000-0000-0000-000000000012', NULL, '45-54F', 115.80, '3LDK', '南西', 950000, 'プレミアムフロア'),
  ('b2000000-0000-0000-0000-000000000041', 'a2000000-0000-0000-0000-000000000012', NULL, '10-20F', 50.20, '1LDK', '東', 350000, NULL),
  ('b2000000-0000-0000-0000-000000000042', 'a2000000-0000-0000-0000-000000000012', NULL, '20-30F', 65.40, '2LDK', '北', 450000, NULL),
  ('b2000000-0000-0000-0000-000000000043', 'a2000000-0000-0000-0000-000000000013', NULL, '20-35F', 70.80, '3LDK', '南', 280000, NULL),
  ('b2000000-0000-0000-0000-000000000044', 'a2000000-0000-0000-0000-000000000013', NULL, '35-48F', 82.50, '3LDK', '南東', 320000, '高層階'),
  ('b2000000-0000-0000-0000-000000000045', 'a2000000-0000-0000-0000-000000000013', NULL, '5-15F', 55.30, '2LDK', '西', 210000, NULL),
  ('b2000000-0000-0000-0000-000000000046', 'a2000000-0000-0000-0000-000000000013', NULL, '10-20F', 45.10, '1LDK', '北', 170000, 'コンパクトタイプ'),
  ('b2000000-0000-0000-0000-000000000047', 'a2000000-0000-0000-0000-000000000014', NULL, '25-35F', 68.90, '2LDK', '南', 380000, '東京タワービュー'),
  ('b2000000-0000-0000-0000-000000000048', 'a2000000-0000-0000-0000-000000000014', NULL, '35-42F', 88.40, '3LDK', '南西', 520000, '高層階'),
  ('b2000000-0000-0000-0000-000000000049', 'a2000000-0000-0000-0000-000000000014', NULL, '5-15F', 48.20, '1LDK', '東', 250000, NULL),
  ('b2000000-0000-0000-0000-000000000050', 'a2000000-0000-0000-0000-000000000015', NULL, '25-35F', 72.60, '3LDK', '南', 300000, NULL),
  ('b2000000-0000-0000-0000-000000000051', 'a2000000-0000-0000-0000-000000000015', NULL, '35-48F', 85.20, '3LDK', '南西', 350000, '高層階レインボーブリッジビュー'),
  ('b2000000-0000-0000-0000-000000000052', 'a2000000-0000-0000-0000-000000000015', NULL, '10-20F', 58.40, '2LDK', '東', 230000, NULL),
  ('b2000000-0000-0000-0000-000000000053', 'a2000000-0000-0000-0000-000000000015', NULL, '5-10F', 44.80, '1LDK', '北', 175000, 'コンパクトタイプ'),
  ('b2000000-0000-0000-0000-000000000054', 'a1000000-0000-0000-0000-000000000006', NULL, '20-30F', 62.50, '2LDK', '南', 350000, '駅直結'),
  ('b2000000-0000-0000-0000-000000000055', 'a1000000-0000-0000-0000-000000000006', NULL, '30-40F', 78.30, '3LDK', '南西', 450000, '高層階'),
  ('b2000000-0000-0000-0000-000000000056', 'a1000000-0000-0000-0000-000000000006', NULL, '5-15F', 44.80, '1LDK', '東', 240000, NULL),
  ('b2000000-0000-0000-0000-000000000057', 'a1000000-0000-0000-0000-000000000007', NULL, '30-45F', 68.40, '2LDK', '南', 300000, NULL),
  ('b2000000-0000-0000-0000-000000000058', 'a1000000-0000-0000-0000-000000000007', NULL, '45-60F', 85.20, '3LDK', '南西', 420000, '超高層階'),
  ('b2000000-0000-0000-0000-000000000059', 'a1000000-0000-0000-0000-000000000007', NULL, '10-20F', 48.60, '1LDK', '東', 210000, NULL)
ON CONFLICT (id) DO NOTHING;
```

**「Run」ボタンを押して実行。**

### パート3: 募集93件

これは長いので2回に分けます。

**パート3a（前半）:**

```sql
INSERT INTO listings (id, unit_id, status, current_rent, management_fee, floor, source_site, source_url, detected_at, ended_at) VALUES
  ('c2000000-0000-0000-0000-000000000001', 'b2000000-0000-0000-0000-000000000001', 'active', 560000, 25000, 35, 'SUUMO', 'https://suumo.jp/chintai/bc_000001', '2026-03-08 10:30:00+09', NULL),
  ('c2000000-0000-0000-0000-000000000002', 'b2000000-0000-0000-0000-000000000001', 'past', 540000, 25000, 32, 'LIFULL HOME''S', 'https://homes.co.jp/chintai/000001', '2025-10-15 09:00:00+09', '2025-11-30 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000003', 'b2000000-0000-0000-0000-000000000001', 'ended', 530000, 25000, 38, 'CHINTAI', 'https://www.chintai.net/000001', '2025-06-01 10:00:00+09', '2025-07-20 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000004', 'b2000000-0000-0000-0000-000000000002', 'active', 360000, 18000, 15, 'at home', 'https://athome.co.jp/chintai/000001', '2026-03-05 14:00:00+09', NULL),
  ('c2000000-0000-0000-0000-000000000005', 'b2000000-0000-0000-0000-000000000002', 'past', 345000, 18000, 12, 'SUUMO', 'https://suumo.jp/chintai/bc_000002', '2025-08-10 09:00:00+09', '2025-09-25 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000006', 'b2000000-0000-0000-0000-000000000003', 'past', 920000, 35000, 40, 'SUUMO', 'https://suumo.jp/chintai/bc_000003', '2025-12-01 10:00:00+09', '2026-01-15 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000007', 'b2000000-0000-0000-0000-000000000004', 'active', 285000, 15000, 8, 'LIFULL HOME''S', 'https://homes.co.jp/chintai/000002', '2026-02-20 11:00:00+09', NULL),
  ('c2000000-0000-0000-0000-000000000008', 'b2000000-0000-0000-0000-000000000005', 'active', 530000, 22000, 30, 'SUUMO', 'https://suumo.jp/chintai/bc_000004', '2026-03-07 08:30:00+09', NULL),
  ('c2000000-0000-0000-0000-000000000009', 'b2000000-0000-0000-0000-000000000005', 'past', 510000, 22000, 28, 'CHINTAI', 'https://www.chintai.net/000002', '2025-07-15 10:00:00+09', '2025-08-28 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000010', 'b2000000-0000-0000-0000-000000000006', 'active', 800000, 30000, 38, 'at home', 'https://athome.co.jp/chintai/000002', '2026-03-01 09:00:00+09', NULL),
  ('c2000000-0000-0000-0000-000000000011', 'b2000000-0000-0000-0000-000000000006', 'ended', 760000, 30000, 42, 'SUUMO', 'https://suumo.jp/chintai/bc_000005', '2025-04-20 10:00:00+09', '2025-06-10 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000012', 'b2000000-0000-0000-0000-000000000007', 'past', 330000, 15000, 18, 'LIFULL HOME''S', 'https://homes.co.jp/chintai/000003', '2025-11-01 10:00:00+09', '2025-12-15 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000013', 'b2000000-0000-0000-0000-000000000009', 'active', 310000, 18000, 25, 'SUUMO', 'https://suumo.jp/chintai/bc_000006', '2026-03-09 11:00:00+09', NULL),
  ('c2000000-0000-0000-0000-000000000014', 'b2000000-0000-0000-0000-000000000009', 'past', 295000, 18000, 22, 'at home', 'https://athome.co.jp/chintai/000003', '2025-09-05 10:00:00+09', '2025-10-20 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000015', 'b2000000-0000-0000-0000-000000000010', 'active', 410000, 22000, 36, 'CHINTAI', 'https://www.chintai.net/000003', '2026-02-28 09:00:00+09', NULL),
  ('c2000000-0000-0000-0000-000000000016', 'b2000000-0000-0000-0000-000000000011', 'past', 185000, 12000, 10, 'SUUMO', 'https://suumo.jp/chintai/bc_000007', '2025-05-10 10:00:00+09', '2025-06-25 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000017', 'b2000000-0000-0000-0000-000000000011', 'ended', 180000, 12000, 8, 'LIFULL HOME''S', 'https://homes.co.jp/chintai/000004', '2025-08-20 10:00:00+09', '2025-10-05 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000018', 'b2000000-0000-0000-0000-000000000012', 'active', 255000, 15000, 20, 'at home', 'https://athome.co.jp/chintai/000004', '2026-03-02 14:30:00+09', NULL),
  ('c2000000-0000-0000-0000-000000000019', 'b2000000-0000-0000-0000-000000000013', 'active', 330000, 18000, 28, 'SUUMO', 'https://suumo.jp/chintai/bc_000008', '2026-03-06 10:00:00+09', NULL),
  ('c2000000-0000-0000-0000-000000000020', 'b2000000-0000-0000-0000-000000000013', 'past', 315000, 18000, 30, 'CHINTAI', 'https://www.chintai.net/000004', '2025-06-15 10:00:00+09', '2025-07-30 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000021', 'b2000000-0000-0000-0000-000000000014', 'ended', 440000, 22000, 40, 'LIFULL HOME''S', 'https://homes.co.jp/chintai/000005', '2025-10-01 10:00:00+09', '2025-11-15 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000022', 'b2000000-0000-0000-0000-000000000015', 'past', 215000, 12000, 10, 'SUUMO', 'https://suumo.jp/chintai/bc_000009', '2025-12-10 10:00:00+09', '2026-01-25 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000023', 'b2000000-0000-0000-0000-000000000016', 'active', 290000, 18000, 35, 'at home', 'https://athome.co.jp/chintai/000005', '2026-03-04 09:30:00+09', NULL),
  ('c2000000-0000-0000-0000-000000000024', 'b2000000-0000-0000-0000-000000000016', 'past', 275000, 18000, 32, 'SUUMO', 'https://suumo.jp/chintai/bc_000010', '2025-07-01 10:00:00+09', '2025-08-15 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000025', 'b2000000-0000-0000-0000-000000000017', 'active', 225000, 15000, 15, 'LIFULL HOME''S', 'https://homes.co.jp/chintai/000006', '2026-02-15 10:00:00+09', NULL),
  ('c2000000-0000-0000-0000-000000000026', 'b2000000-0000-0000-0000-000000000018', 'past', 265000, 15000, 45, 'CHINTAI', 'https://www.chintai.net/000005', '2025-09-20 10:00:00+09', '2025-11-05 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000027', 'b2000000-0000-0000-0000-000000000019', 'active', 325000, 18000, 28, 'SUUMO', 'https://suumo.jp/chintai/bc_000011', '2026-03-03 11:30:00+09', NULL),
  ('c2000000-0000-0000-0000-000000000028', 'b2000000-0000-0000-0000-000000000019', 'ended', 310000, 18000, 25, 'at home', 'https://athome.co.jp/chintai/000006', '2025-05-15 10:00:00+09', '2025-06-30 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000029', 'b2000000-0000-0000-0000-000000000020', 'past', 390000, 22000, 40, 'LIFULL HOME''S', 'https://homes.co.jp/chintai/000007', '2025-11-10 10:00:00+09', '2025-12-28 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000030', 'b2000000-0000-0000-0000-000000000021', 'active', 245000, 15000, 12, 'SUUMO', 'https://suumo.jp/chintai/bc_000012', '2026-02-25 09:00:00+09', NULL),
  ('c2000000-0000-0000-0000-000000000031', 'b2000000-0000-0000-0000-000000000022', 'active', 265000, 15000, 35, 'CHINTAI', 'https://www.chintai.net/000006', '2026-03-08 08:00:00+09', NULL),
  ('c2000000-0000-0000-0000-000000000032', 'b2000000-0000-0000-0000-000000000022', 'past', 255000, 15000, 32, 'SUUMO', 'https://suumo.jp/chintai/bc_000013', '2025-08-01 10:00:00+09', '2025-09-15 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000033', 'b2000000-0000-0000-0000-000000000023', 'ended', 310000, 18000, 48, 'at home', 'https://athome.co.jp/chintai/000007', '2025-10-20 10:00:00+09', '2025-12-05 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000034', 'b2000000-0000-0000-0000-000000000024', 'active', 205000, 12000, 18, 'LIFULL HOME''S', 'https://homes.co.jp/chintai/000008', '2026-02-10 10:00:00+09', NULL),
  ('c2000000-0000-0000-0000-000000000035', 'b2000000-0000-0000-0000-000000000025', 'past', 155000, 10000, 10, 'SUUMO', 'https://suumo.jp/chintai/bc_000014', '2025-06-20 10:00:00+09', '2025-07-30 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000036', 'b2000000-0000-0000-0000-000000000026', 'active', 315000, 18000, 30, 'SUUMO', 'https://suumo.jp/chintai/bc_000015', '2026-03-09 09:00:00+09', NULL),
  ('c2000000-0000-0000-0000-000000000037', 'b2000000-0000-0000-0000-000000000026', 'past', 300000, 18000, 28, 'CHINTAI', 'https://www.chintai.net/000007', '2025-04-10 10:00:00+09', '2025-05-25 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000038', 'b2000000-0000-0000-0000-000000000026', 'ended', 305000, 18000, 35, 'LIFULL HOME''S', 'https://homes.co.jp/chintai/000009', '2025-08-15 10:00:00+09', '2025-09-30 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000039', 'b2000000-0000-0000-0000-000000000027', 'active', 385000, 22000, 45, 'at home', 'https://athome.co.jp/chintai/000008', '2026-03-01 14:00:00+09', NULL),
  ('c2000000-0000-0000-0000-000000000040', 'b2000000-0000-0000-0000-000000000028', 'past', 200000, 12000, 12, 'SUUMO', 'https://suumo.jp/chintai/bc_000016', '2025-11-20 10:00:00+09', '2026-01-05 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000041', 'b2000000-0000-0000-0000-000000000029', 'active', 235000, 15000, 25, 'LIFULL HOME''S', 'https://homes.co.jp/chintai/000010', '2026-03-07 10:00:00+09', NULL),
  ('c2000000-0000-0000-0000-000000000042', 'b2000000-0000-0000-0000-000000000029', 'past', 225000, 15000, 22, 'SUUMO', 'https://suumo.jp/chintai/bc_000017', '2025-06-10 10:00:00+09', '2025-07-25 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000043', 'b2000000-0000-0000-0000-000000000030', 'active', 305000, 18000, 35, 'CHINTAI', 'https://www.chintai.net/000008', '2026-02-18 09:30:00+09', NULL),
  ('c2000000-0000-0000-0000-000000000044', 'b2000000-0000-0000-0000-000000000031', 'past', 165000, 10000, 8, 'at home', 'https://athome.co.jp/chintai/000009', '2025-10-05 10:00:00+09', '2025-11-20 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000045', 'b2000000-0000-0000-0000-000000000031', 'ended', 158000, 10000, 12, 'SUUMO', 'https://suumo.jp/chintai/bc_000018', '2025-04-01 10:00:00+09', '2025-05-15 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000046', 'b2000000-0000-0000-0000-000000000032', 'active', 285000, 18000, 38, 'SUUMO', 'https://suumo.jp/chintai/bc_000019', '2026-03-05 11:00:00+09', NULL),
  ('c2000000-0000-0000-0000-000000000047', 'b2000000-0000-0000-0000-000000000032', 'past', 275000, 18000, 35, 'LIFULL HOME''S', 'https://homes.co.jp/chintai/000011', '2025-07-20 10:00:00+09', '2025-08-30 00:00:00+09')
ON CONFLICT (id) DO NOTHING;
```

**「Run」ボタンを押して実行。**

**パート3b（後半）:**

```sql
INSERT INTO listings (id, unit_id, status, current_rent, management_fee, floor, source_site, source_url, detected_at, ended_at) VALUES
  ('c2000000-0000-0000-0000-000000000048', 'b2000000-0000-0000-0000-000000000033', 'ended', 390000, 25000, 50, 'CHINTAI', 'https://www.chintai.net/000009', '2025-09-10 10:00:00+09', '2025-10-25 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000049', 'b2000000-0000-0000-0000-000000000034', 'active', 185000, 12000, 15, 'at home', 'https://athome.co.jp/chintai/000010', '2026-02-28 10:00:00+09', NULL),
  ('c2000000-0000-0000-0000-000000000050', 'b2000000-0000-0000-0000-000000000035', 'past', 235000, 15000, 25, 'SUUMO', 'https://suumo.jp/chintai/bc_000020', '2025-05-20 10:00:00+09', '2025-07-05 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000051', 'b2000000-0000-0000-0000-000000000036', 'active', 530000, 25000, 32, 'SUUMO', 'https://suumo.jp/chintai/bc_000021', '2026-03-08 13:00:00+09', NULL),
  ('c2000000-0000-0000-0000-000000000052', 'b2000000-0000-0000-0000-000000000036', 'past', 515000, 25000, 28, 'LIFULL HOME''S', 'https://homes.co.jp/chintai/000012', '2025-10-10 10:00:00+09', '2025-11-25 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000053', 'b2000000-0000-0000-0000-000000000036', 'ended', 500000, 25000, 35, 'CHINTAI', 'https://www.chintai.net/000010', '2025-05-01 10:00:00+09', '2025-06-15 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000054', 'b2000000-0000-0000-0000-000000000037', 'active', 345000, 18000, 20, 'at home', 'https://athome.co.jp/chintai/000011', '2026-02-22 10:00:00+09', NULL),
  ('c2000000-0000-0000-0000-000000000055', 'b2000000-0000-0000-0000-000000000038', 'past', 820000, 35000, 36, 'SUUMO', 'https://suumo.jp/chintai/bc_000022', '2025-08-05 10:00:00+09', '2025-09-20 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000056', 'b2000000-0000-0000-0000-000000000039', 'active', 610000, 28000, 38, 'SUUMO', 'https://suumo.jp/chintai/bc_000023', '2026-03-09 10:00:00+09', NULL),
  ('c2000000-0000-0000-0000-000000000057', 'b2000000-0000-0000-0000-000000000039', 'past', 590000, 28000, 35, 'LIFULL HOME''S', 'https://homes.co.jp/chintai/000013', '2025-11-05 10:00:00+09', '2025-12-20 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000058', 'b2000000-0000-0000-0000-000000000040', 'active', 960000, 38000, 50, 'CHINTAI', 'https://www.chintai.net/000011', '2026-03-02 09:00:00+09', NULL),
  ('c2000000-0000-0000-0000-000000000059', 'b2000000-0000-0000-0000-000000000040', 'ended', 930000, 38000, 48, 'at home', 'https://athome.co.jp/chintai/000012', '2025-06-20 10:00:00+09', '2025-08-05 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000060', 'b2000000-0000-0000-0000-000000000041', 'past', 355000, 18000, 15, 'SUUMO', 'https://suumo.jp/chintai/bc_000024', '2025-09-15 10:00:00+09', '2025-10-30 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000061', 'b2000000-0000-0000-0000-000000000042', 'active', 455000, 22000, 25, 'LIFULL HOME''S', 'https://homes.co.jp/chintai/000014', '2026-02-12 10:00:00+09', NULL),
  ('c2000000-0000-0000-0000-000000000062', 'b2000000-0000-0000-0000-000000000043', 'active', 285000, 18000, 28, 'SUUMO', 'https://suumo.jp/chintai/bc_000025', '2026-03-06 09:00:00+09', NULL),
  ('c2000000-0000-0000-0000-000000000063', 'b2000000-0000-0000-0000-000000000043', 'past', 270000, 18000, 25, 'CHINTAI', 'https://www.chintai.net/000012', '2025-07-10 10:00:00+09', '2025-08-22 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000064', 'b2000000-0000-0000-0000-000000000043', 'ended', 265000, 18000, 30, 'at home', 'https://athome.co.jp/chintai/000013', '2025-04-15 10:00:00+09', '2025-05-30 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000065', 'b2000000-0000-0000-0000-000000000044', 'active', 325000, 20000, 40, 'LIFULL HOME''S', 'https://homes.co.jp/chintai/000015', '2026-03-04 10:00:00+09', NULL),
  ('c2000000-0000-0000-0000-000000000066', 'b2000000-0000-0000-0000-000000000045', 'past', 215000, 12000, 10, 'SUUMO', 'https://suumo.jp/chintai/bc_000026', '2025-12-05 10:00:00+09', '2026-01-20 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000067', 'b2000000-0000-0000-0000-000000000046', 'active', 175000, 10000, 15, 'CHINTAI', 'https://www.chintai.net/000013', '2026-02-20 11:00:00+09', NULL),
  ('c2000000-0000-0000-0000-000000000068', 'b2000000-0000-0000-0000-000000000047', 'active', 385000, 20000, 30, 'SUUMO', 'https://suumo.jp/chintai/bc_000027', '2026-03-07 09:30:00+09', NULL),
  ('c2000000-0000-0000-0000-000000000069', 'b2000000-0000-0000-0000-000000000047', 'past', 370000, 20000, 28, 'at home', 'https://athome.co.jp/chintai/000014', '2025-08-25 10:00:00+09', '2025-10-10 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000070', 'b2000000-0000-0000-0000-000000000047', 'ended', 365000, 20000, 32, 'LIFULL HOME''S', 'https://homes.co.jp/chintai/000016', '2025-04-05 10:00:00+09', '2025-05-20 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000071', 'b2000000-0000-0000-0000-000000000048', 'past', 530000, 25000, 38, 'CHINTAI', 'https://www.chintai.net/000014', '2025-10-15 10:00:00+09', '2025-11-30 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000072', 'b2000000-0000-0000-0000-000000000049', 'active', 255000, 15000, 10, 'SUUMO', 'https://suumo.jp/chintai/bc_000028', '2026-02-05 10:00:00+09', NULL),
  ('c2000000-0000-0000-0000-000000000073', 'b2000000-0000-0000-0000-000000000050', 'active', 305000, 18000, 30, 'LIFULL HOME''S', 'https://homes.co.jp/chintai/000017', '2026-03-08 10:00:00+09', NULL),
  ('c2000000-0000-0000-0000-000000000074', 'b2000000-0000-0000-0000-000000000050', 'past', 290000, 18000, 28, 'SUUMO', 'https://suumo.jp/chintai/bc_000029', '2025-09-01 10:00:00+09', '2025-10-15 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000075', 'b2000000-0000-0000-0000-000000000050', 'ended', 285000, 18000, 32, 'CHINTAI', 'https://www.chintai.net/000015', '2025-05-10 10:00:00+09', '2025-06-25 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000076', 'b2000000-0000-0000-0000-000000000051', 'active', 355000, 22000, 42, 'at home', 'https://athome.co.jp/chintai/000015', '2026-03-01 09:00:00+09', NULL),
  ('c2000000-0000-0000-0000-000000000077', 'b2000000-0000-0000-0000-000000000051', 'past', 340000, 22000, 38, 'SUUMO', 'https://suumo.jp/chintai/bc_000030', '2025-06-15 10:00:00+09', '2025-07-30 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000078', 'b2000000-0000-0000-0000-000000000052', 'active', 235000, 15000, 18, 'LIFULL HOME''S', 'https://homes.co.jp/chintai/000018', '2026-02-08 10:00:00+09', NULL),
  ('c2000000-0000-0000-0000-000000000079', 'b2000000-0000-0000-0000-000000000053', 'past', 178000, 10000, 8, 'CHINTAI', 'https://www.chintai.net/000016', '2025-11-25 10:00:00+09', '2026-01-10 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000080', 'b1000000-0000-0000-0000-000000000003', 'past', 850000, 30000, 35, 'SUUMO', 'https://suumo.jp/chintai/bc_000031', '2025-04-01 10:00:00+09', '2025-05-15 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000081', 'b1000000-0000-0000-0000-000000000012', 'active', 700000, 28000, 4, 'LIFULL HOME''S', 'https://homes.co.jp/chintai/000019', '2026-03-09 10:30:00+09', NULL),
  ('c2000000-0000-0000-0000-000000000082', 'b1000000-0000-0000-0000-000000000012', 'past', 680000, 28000, 3, 'at home', 'https://athome.co.jp/chintai/000016', '2025-07-05 10:00:00+09', '2025-08-20 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000083', 'b1000000-0000-0000-0000-000000000007', 'active', 225000, 12000, 10, 'CHINTAI', 'https://www.chintai.net/000017', '2026-03-06 14:00:00+09', NULL),
  ('c2000000-0000-0000-0000-000000000084', 'b1000000-0000-0000-0000-000000000009', 'active', 590000, 25000, 2, 'SUUMO', 'https://suumo.jp/chintai/bc_000032', '2026-03-04 11:00:00+09', NULL),
  ('c2000000-0000-0000-0000-000000000085', 'b1000000-0000-0000-0000-000000000011', 'past', 340000, 15000, 2, 'LIFULL HOME''S', 'https://homes.co.jp/chintai/000020', '2025-10-20 10:00:00+09', '2025-12-05 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000086', 'b2000000-0000-0000-0000-000000000054', 'active', 355000, 18000, 25, 'SUUMO', 'https://suumo.jp/chintai/bc_000033', '2026-03-07 10:00:00+09', NULL),
  ('c2000000-0000-0000-0000-000000000087', 'b2000000-0000-0000-0000-000000000054', 'past', 340000, 18000, 22, 'at home', 'https://athome.co.jp/chintai/000017', '2025-08-10 10:00:00+09', '2025-09-25 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000088', 'b2000000-0000-0000-0000-000000000055', 'ended', 460000, 22000, 35, 'LIFULL HOME''S', 'https://homes.co.jp/chintai/000021', '2025-10-01 10:00:00+09', '2025-11-15 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000089', 'b2000000-0000-0000-0000-000000000056', 'active', 245000, 12000, 12, 'CHINTAI', 'https://www.chintai.net/000018', '2026-02-25 10:00:00+09', NULL),
  ('c2000000-0000-0000-0000-000000000090', 'b2000000-0000-0000-0000-000000000057', 'active', 305000, 18000, 38, 'SUUMO', 'https://suumo.jp/chintai/bc_000034', '2026-03-08 09:00:00+09', NULL),
  ('c2000000-0000-0000-0000-000000000091', 'b2000000-0000-0000-0000-000000000057', 'past', 290000, 18000, 35, 'LIFULL HOME''S', 'https://homes.co.jp/chintai/000022', '2025-06-05 10:00:00+09', '2025-07-20 00:00:00+09'),
  ('c2000000-0000-0000-0000-000000000092', 'b2000000-0000-0000-0000-000000000058', 'active', 430000, 25000, 52, 'CHINTAI', 'https://www.chintai.net/000019', '2026-03-05 10:00:00+09', NULL),
  ('c2000000-0000-0000-0000-000000000093', 'b2000000-0000-0000-0000-000000000059', 'past', 215000, 12000, 15, 'at home', 'https://athome.co.jp/chintai/000018', '2025-11-10 10:00:00+09', '2025-12-25 00:00:00+09')
ON CONFLICT (id) DO NOTHING;
```

**「Run」ボタンを押して実行。**

---

## ステップ9: 追加シードデータ（23棟追加）

このデータは `/Users/soshitakeyama/githubproject/Machibuse/supabase/seed_additional.sql` の内容です。
**非常に長いため、4回に分けて実行してください。**

### パート1: 建物23棟

```sql
INSERT INTO mansions (id, name, address, nearest_station, walking_minutes, brand_type, total_units, floors, construction_date, features, memo) VALUES
  ('a3000000-0000-0000-0000-000000000001', 'パークコート麻布十番ザ タワー', '東京都港区三田1丁目', '麻布十番駅', 2, '三井不動産', 330, 30, '2020年', 'タワーマンション、コンシェルジュ、フィットネス、ラウンジ', '麻布十番駅至近。高層階は東京タワービュー。2LDK・3LDKが中心。'),
  ('a3000000-0000-0000-0000-000000000002', '赤坂タワーレジデンス Top of the Hill', '東京都港区赤坂2丁目', '赤坂駅', 4, NULL, 524, 36, '2006年', 'タワーマンション、コンシェルジュ、スカイラウンジ、ゲストルーム', '赤坂の高台に位置。眺望良好。KENCORP掲載多め。'),
  ('a3000000-0000-0000-0000-000000000003', '六本木ヒルズレジデンス', '東京都港区六本木6丁目', '六本木駅', 3, '森ビル', 793, 43, '2003年', 'タワーマンション、コンシェルジュ、スパ、ビューラウンジ、ホテルライクサービス', '六本木ヒルズ内。ホテルライクサービスが特徴。プレミアムフロアは100万超。'),
  ('a3000000-0000-0000-0000-000000000004', '虎ノ門ヒルズレジデンシャルタワー', '東京都港区虎ノ門1丁目', '虎ノ門駅', 2, '森ビル', 547, 54, '2022年', 'タワーマンション、ホテルライクサービス、駅直結、フィットネス', '虎ノ門ヒルズ直結。最新設備。森ビルのフラッグシップ。'),
  ('a3000000-0000-0000-0000-000000000005', 'ザ・レジデンス三田', '東京都港区三田2丁目', '三田駅', 5, '住友不動産', 120, 15, '2015年', '中層マンション、コンシェルジュ、宅配ボックス', '三田エリアの落ち着いた住環境。ビジネスマンに人気。'),
  ('a3000000-0000-0000-0000-000000000006', 'コンフォリア南青山', '東京都港区南青山5丁目', '表参道駅', 6, '東急不動産', 64, 10, '2018年', '低層マンション、デザイナーズ、ペット可', '南青山の閑静なエリア。おしゃれな外観。単身〜DINKS向け。'),
  ('a3000000-0000-0000-0000-000000000007', 'パークハビオ赤坂タワー', '東京都港区赤坂4丁目', '赤坂見附駅', 3, '三菱地所', 182, 25, '2016年', 'タワーマンション、コンシェルジュ、フィットネス', '赤坂見附駅近。利便性抜群。1LDK・2LDKが中心。'),
  ('a3000000-0000-0000-0000-000000000008', '広尾ガーデンフォレスト', '東京都渋谷区広尾4丁目', '広尾駅', 9, '三井不動産', 674, 18, '2009年', '大規模マンション、ガーデン、キッズルーム、フィットネス', '広尾の緑豊かな環境。旧日赤病院跡地。ファミリーに人気。'),
  ('a3000000-0000-0000-0000-000000000009', 'パークコート渋谷ザ タワー', '東京都渋谷区宇田川町', '渋谷駅', 6, '三井不動産', 505, 39, '2020年', 'タワーマンション、コンシェルジュ、渋谷アドレス、スカイラウンジ', '渋谷再開発エリア。希少な渋谷アドレスのタワーマンション。'),
  ('a3000000-0000-0000-0000-000000000010', 'セルリアンタワー東急レジデンス', '東京都渋谷区桜丘町', '渋谷駅', 5, '東急不動産', 103, 14, '2001年', 'ホテル併設、コンシェルジュ、ルームサービス対応', 'セルリアンタワー高層階。ホテルサービス利用可。VIP向け。'),
  ('a3000000-0000-0000-0000-000000000011', 'ザ・パークハウス代官山', '東京都渋谷区猿楽町', '代官山駅', 3, '三菱地所', 35, 5, '2017年', '低層マンション、閑静な住宅街、ペット可', '代官山の閑静なエリア。小規模・低層で希少。募集は少ない。'),
  ('a3000000-0000-0000-0000-000000000012', 'ザ・パークハウス千代田麹町', '東京都千代田区麹町3丁目', '麹町駅', 2, '三菱地所', 98, 14, '2019年', '中層マンション、コンシェルジュ、番町エリア', '皇居至近の番町エリア。静かで品格ある環境。'),
  ('a3000000-0000-0000-0000-000000000013', 'パークコート千代田四番町', '東京都千代田区四番町', '市ヶ谷駅', 5, '三井不動産', 42, 7, '2016年', '低層マンション、閑静な番町エリア、大使館近く', '四番町の希少な低層物件。住環境良好。掲載はまれ。'),
  ('a3000000-0000-0000-0000-000000000014', 'ザ・千代田麹町タワーレジデンス', '東京都千代田区麹町1丁目', '半蔵門駅', 3, NULL, 165, 20, '2010年', 'タワーマンション、皇居近く、コンシェルジュ', '半蔵門エリア。皇居ランナーに人気。SUUMO掲載が多い。'),
  ('a3000000-0000-0000-0000-000000000015', 'ザ・パークハウス新宿御苑', '東京都新宿区新宿1丁目', '新宿御苑前駅', 3, '三菱地所', 78, 12, '2018年', '中層マンション、新宿御苑ビュー、ペット可', '新宿御苑至近。都心でありながら緑豊か。'),
  ('a3000000-0000-0000-0000-000000000016', 'ラ・トゥール新宿ガーデン', '東京都新宿区大久保3丁目', '東新宿駅', 5, '住友不動産', 640, 40, '2011年', 'タワーマンション、コンシェルジュ、フィットネス、スカイラウンジ', '住友不動産の高級タワーシリーズ。共用施設が充実。外国人入居者多め。'),
  ('a3000000-0000-0000-0000-000000000017', 'コンシェリア西新宿タワーズウエスト', '東京都新宿区西新宿6丁目', '都庁前駅', 3, NULL, 251, 30, '2012年', 'タワーマンション、コンシェルジュ、新宿至近', '西新宿のビジネスエリア。シングル〜DINKS向け。'),
  ('a3000000-0000-0000-0000-000000000018', 'パークシティ大崎ザ タワー', '東京都品川区北品川5丁目', '大崎駅', 6, '三井不動産', 734, 40, '2015年', 'タワーマンション、大規模、フィットネス、キッズルーム', '大崎再開発エリア。大規模タワー。ファミリー向け設備充実。'),
  ('a3000000-0000-0000-0000-000000000019', 'ワールドシティタワーズ', '東京都港区港南4丁目', '品川駅', 13, '住友不動産', 2090, 42, '2005年', '大規模タワーマンション、プール、スパ、ゲストルーム', '3棟構成の超大規模。共用施設充実。品川駅利用可だが距離あり。'),
  ('a3000000-0000-0000-0000-000000000020', 'ブリリアタワー目黒', '東京都品川区上大崎2丁目', '目黒駅', 3, '東京建物', 210, 36, '2017年', 'タワーマンション、駅近、コンシェルジュ、スカイラウンジ', '目黒駅至近のタワーマンション。1LDK〜3LDKまで幅広い。'),
  ('a3000000-0000-0000-0000-000000000021', 'パークタワー目黒', '東京都品川区上大崎3丁目', '目黒駅', 8, '三井不動産', 172, 27, '2004年', 'タワーマンション、閑静な住宅街、ペット可', '目黒駅徒歩圏の閑静なエリア。築年数あるがメンテナンス良好。'),
  ('a3000000-0000-0000-0000-000000000022', 'パークコート文京小石川ザ タワー', '東京都文京区小石川1丁目', '春日駅', 1, '三井不動産', 571, 40, '2021年', 'タワーマンション、駅直結、コンシェルジュ、フィットネス、スカイラウンジ', '春日駅直結。文京区のランドマークタワー。教育環境良好。'),
  ('a3000000-0000-0000-0000-000000000023', 'ブリリアタワー上野池之端', '東京都台東区池之端2丁目', '湯島駅', 3, '東京建物', 361, 36, '2019年', 'タワーマンション、不忍池ビュー、コンシェルジュ', '不忍池を望む好立地。上野恩賜公園至近。文教エリア。')
ON CONFLICT (id) DO NOTHING;
```

**「Run」ボタンを押して実行。**

### パート2: ユニット69件

seed_additional.sql のユニット部分をそのままコピーして「New query」に貼り付けて実行。ファイルパス: `/Users/soshitakeyama/githubproject/Machibuse/supabase/seed_additional.sql` の52行目〜167行目のINSERT文。

（長いため、ファイルの内容をそのままコピーして貼り付けてください）

### パート3: 募集72件

seed_additional.sql の募集部分をそのままコピーして「New query」に貼り付けて実行。ファイルパス: `/Users/soshitakeyama/githubproject/Machibuse/supabase/seed_additional.sql` の174行目〜364行目のINSERT文。

（長いため、ファイルの内容をそのままコピーして貼り付けてください）

---

## ステップ10: データ確認

最後に以下のSQLで全テーブルのレコード数を確認：

```sql
SELECT 'mansions' AS tbl, COUNT(*) FROM mansions
UNION ALL SELECT 'units', COUNT(*) FROM units
UNION ALL SELECT 'listings', COUNT(*) FROM listings
UNION ALL SELECT 'notification_settings', COUNT(*) FROM notification_settings
UNION ALL SELECT 'property_images', COUNT(*) FROM property_images;
```

**「Run」ボタンを押して実行。**

**期待される結果:**
| tbl | count |
|-----|-------|
| mansions | 45 (7+15+23) |
| units | 140 (12+59+69) |
| listings | 173 (8+93+72) |
| notification_settings | 0 |
| property_images | 0 |

数が一致していれば成功です！

---

## 完了

全てのマイグレーションとシードデータの投入が完了しました。
アプリ（ https://localhost:3000 または Vercel のデプロイ先）をリロードすると、45棟の建物と173件の募集情報が表示されるはずです。
