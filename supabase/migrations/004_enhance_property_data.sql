-- 004: 物件情報の充実化
-- mansions, units, listings テーブルへのカラム追加 & property_images テーブル新規作成

-- ============================================================
-- mansions テーブル拡張
-- ============================================================
ALTER TABLE mansions ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE mansions ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE mansions ADD COLUMN IF NOT EXISTS structure TEXT; -- RC造、SRC造等
ALTER TABLE mansions ADD COLUMN IF NOT EXISTS exterior_image_url TEXT; -- 外観写真URL
ALTER TABLE mansions ADD COLUMN IF NOT EXISTS second_nearest_station TEXT; -- 2番目の最寄り駅
ALTER TABLE mansions ADD COLUMN IF NOT EXISTS second_walking_minutes INTEGER;
ALTER TABLE mansions ADD COLUMN IF NOT EXISTS management_company TEXT; -- 管理会社
ALTER TABLE mansions ADD COLUMN IF NOT EXISTS pet_allowed BOOLEAN DEFAULT false;
ALTER TABLE mansions ADD COLUMN IF NOT EXISTS parking_available BOOLEAN DEFAULT false;

-- ============================================================
-- units テーブル拡張
-- ============================================================
ALTER TABLE units ADD COLUMN IF NOT EXISTS floorplan_image_url TEXT; -- 間取り図画像URL
ALTER TABLE units ADD COLUMN IF NOT EXISTS balcony_sqm NUMERIC(6,2); -- バルコニー面積
ALTER TABLE units ADD COLUMN IF NOT EXISTS bath_toilet_separate BOOLEAN; -- バストイレ別
ALTER TABLE units ADD COLUMN IF NOT EXISTS storage TEXT; -- 収納（WIC、クローゼット等）

-- ============================================================
-- listings テーブル拡張
-- ============================================================
ALTER TABLE listings ADD COLUMN IF NOT EXISTS deposit INTEGER; -- 敷金（円）
ALTER TABLE listings ADD COLUMN IF NOT EXISTS key_money INTEGER; -- 礼金（円）
ALTER TABLE listings ADD COLUMN IF NOT EXISTS guarantee_deposit INTEGER; -- 保証金（円）
ALTER TABLE listings ADD COLUMN IF NOT EXISTS renewal_fee TEXT; -- 更新料
ALTER TABLE listings ADD COLUMN IF NOT EXISTS contract_period TEXT; -- 契約期間
ALTER TABLE listings ADD COLUMN IF NOT EXISTS move_in_date TEXT; -- 入居可能日
ALTER TABLE listings ADD COLUMN IF NOT EXISTS conditions TEXT; -- 条件（ペット可、楽器可等）
ALTER TABLE listings ADD COLUMN IF NOT EXISTS interior_features TEXT[]; -- 室内設備（配列）
ALTER TABLE listings ADD COLUMN IF NOT EXISTS building_features TEXT[]; -- 共用設備（配列）

-- ============================================================
-- property_images テーブル新規作成
-- ============================================================
CREATE TABLE IF NOT EXISTS property_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID REFERENCES listings(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES units(id) ON DELETE CASCADE,
  mansion_id UUID REFERENCES mansions(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_type TEXT NOT NULL, -- 'exterior', 'interior', 'floorplan', 'entrance', 'kitchen', 'bathroom', 'view', 'other'
  caption TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_property_images_listing ON property_images(listing_id);
CREATE INDEX idx_property_images_unit ON property_images(unit_id);
CREATE INDEX idx_property_images_mansion ON property_images(mansion_id);

-- RLSポリシー
ALTER TABLE property_images ENABLE ROW LEVEL SECURITY;
CREATE POLICY "画像は全員閲覧可能" ON property_images FOR SELECT USING (true);
CREATE POLICY "認証済みユーザーは画像を追加可能" ON property_images FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
