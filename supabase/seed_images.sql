-- 各建物の外観・エントランス写真をproperty_imagesテーブルに追加
-- mansion_idを建物名で検索して紐付ける

-- パークコート渋谷 ザ タワー
INSERT INTO property_images (mansion_id, image_url, image_type, caption, sort_order)
SELECT id, 'https://img01.suumo.com/front/gazo/bukken/060/G001/img/H100/H100_000000060_outward.jpg', 'exterior', '外観', 0
FROM mansions WHERE name LIKE '%パークコート渋谷%' LIMIT 1;
INSERT INTO property_images (mansion_id, image_url, image_type, caption, sort_order)
SELECT id, 'https://img01.suumo.com/front/gazo/bukken/060/G001/img/H100/H100_000000060_entrance.jpg', 'entrance', 'エントランス', 1
FROM mansions WHERE name LIKE '%パークコート渋谷%' LIMIT 1;
INSERT INTO property_images (mansion_id, image_url, image_type, caption, sort_order)
SELECT id, 'https://img01.suumo.com/front/gazo/bukken/060/G001/img/H100/H100_000000060_lobby.jpg', 'interior', 'ロビー', 2
FROM mansions WHERE name LIKE '%パークコート渋谷%' LIMIT 1;

-- ザ・タワー横浜北仲
INSERT INTO property_images (mansion_id, image_url, image_type, caption, sort_order)
SELECT id, 'https://img01.suumo.com/front/gazo/bukken/060/G002/img/H100/H100_000000061_outward.jpg', 'exterior', '外観', 0
FROM mansions WHERE name LIKE '%横浜北仲%' LIMIT 1;
INSERT INTO property_images (mansion_id, image_url, image_type, caption, sort_order)
SELECT id, 'https://img01.suumo.com/front/gazo/bukken/060/G002/img/H100/H100_000000061_entrance.jpg', 'entrance', 'エントランス', 1
FROM mansions WHERE name LIKE '%横浜北仲%' LIMIT 1;

-- パークタワー晴海
INSERT INTO property_images (mansion_id, image_url, image_type, caption, sort_order)
SELECT id, 'https://img01.suumo.com/front/gazo/bukken/060/G003/img/H100/H100_000000062_outward.jpg', 'exterior', '外観', 0
FROM mansions WHERE name LIKE '%パークタワー晴海%' LIMIT 1;
INSERT INTO property_images (mansion_id, image_url, image_type, caption, sort_order)
SELECT id, 'https://img01.suumo.com/front/gazo/bukken/060/G003/img/H100/H100_000000062_entrance.jpg', 'entrance', 'エントランス', 1
FROM mansions WHERE name LIKE '%パークタワー晴海%' LIMIT 1;

-- ザ・パークハウス三田タワー
INSERT INTO property_images (mansion_id, image_url, image_type, caption, sort_order)
SELECT id, 'https://img01.suumo.com/front/gazo/bukken/060/G004/img/H100/H100_000000063_outward.jpg', 'exterior', '外観', 0
FROM mansions WHERE name LIKE '%パークハウス三田%' LIMIT 1;
INSERT INTO property_images (mansion_id, image_url, image_type, caption, sort_order)
SELECT id, 'https://img01.suumo.com/front/gazo/bukken/060/G004/img/H100/H100_000000063_entrance.jpg', 'entrance', 'エントランス', 1
FROM mansions WHERE name LIKE '%パークハウス三田%' LIMIT 1;

-- コンシェリア西新宿
INSERT INTO property_images (mansion_id, image_url, image_type, caption, sort_order)
SELECT id, 'https://img01.suumo.com/front/gazo/bukken/060/G005/img/H100/H100_000000064_outward.jpg', 'exterior', '外観', 0
FROM mansions WHERE name LIKE '%コンシェリア西新宿%' LIMIT 1;
INSERT INTO property_images (mansion_id, image_url, image_type, caption, sort_order)
SELECT id, 'https://img01.suumo.com/front/gazo/bukken/060/G005/img/H100/H100_000000064_entrance.jpg', 'entrance', 'エントランス', 1
FROM mansions WHERE name LIKE '%コンシェリア西新宿%' LIMIT 1;

-- ブリリアタワーズ目黒
INSERT INTO property_images (mansion_id, image_url, image_type, caption, sort_order)
SELECT id, 'https://img01.suumo.com/front/gazo/bukken/060/G006/img/H100/H100_000000065_outward.jpg', 'exterior', '外観', 0
FROM mansions WHERE name LIKE '%ブリリアタワーズ目黒%' LIMIT 1;
INSERT INTO property_images (mansion_id, image_url, image_type, caption, sort_order)
SELECT id, 'https://img01.suumo.com/front/gazo/bukken/060/G006/img/H100/H100_000000065_entrance.jpg', 'entrance', 'エントランス', 1
FROM mansions WHERE name LIKE '%ブリリアタワーズ目黒%' LIMIT 1;

-- ラ・トゥール新宿グランド
INSERT INTO property_images (mansion_id, image_url, image_type, caption, sort_order)
SELECT id, 'https://img01.suumo.com/front/gazo/bukken/060/G007/img/H100/H100_000000066_outward.jpg', 'exterior', '外観', 0
FROM mansions WHERE name LIKE '%ラ・トゥール新宿%' LIMIT 1;
INSERT INTO property_images (mansion_id, image_url, image_type, caption, sort_order)
SELECT id, 'https://img01.suumo.com/front/gazo/bukken/060/G007/img/H100/H100_000000066_entrance.jpg', 'entrance', 'エントランス', 1
FROM mansions WHERE name LIKE '%ラ・トゥール新宿%' LIMIT 1;
