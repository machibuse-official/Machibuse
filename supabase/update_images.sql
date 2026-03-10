-- 建物の外観画像URLを設定する
-- Unsplash の高品質な建物写真を使用（商用利用可）

UPDATE mansions SET exterior_image_url = 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&h=400&fit=crop' WHERE name LIKE '%パークコート%' AND exterior_image_url IS NULL;
UPDATE mansions SET exterior_image_url = 'https://images.unsplash.com/photo-1486325212027-8081e485255e?w=800&h=400&fit=crop' WHERE name LIKE '%ブリリア%' AND exterior_image_url IS NULL;
UPDATE mansions SET exterior_image_url = 'https://images.unsplash.com/photo-1515263487990-61b07816b324?w=800&h=400&fit=crop' WHERE name LIKE '%ラ・トゥール%' AND exterior_image_url IS NULL;
UPDATE mansions SET exterior_image_url = 'https://images.unsplash.com/photo-1460317442991-0ec209397118?w=800&h=400&fit=crop' WHERE name LIKE '%プラウド%' AND exterior_image_url IS NULL;
UPDATE mansions SET exterior_image_url = 'https://images.unsplash.com/photo-1567496898669-ee935f5f647a?w=800&h=400&fit=crop' WHERE name LIKE '%グランドメゾン%' AND exterior_image_url IS NULL;
UPDATE mansions SET exterior_image_url = 'https://images.unsplash.com/photo-1574362848149-11496d93a7c7?w=800&h=400&fit=crop' WHERE name LIKE '%シティタワー%' AND exterior_image_url IS NULL;
UPDATE mansions SET exterior_image_url = 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&h=400&fit=crop' WHERE name LIKE '%ザ・パークハウス%' AND exterior_image_url IS NULL;

-- 残りのexterior_image_urlがNULLの建物にも画像を設定
UPDATE mansions SET exterior_image_url = 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&h=400&fit=crop' WHERE exterior_image_url IS NULL AND id IN (SELECT id FROM mansions WHERE exterior_image_url IS NULL ORDER BY created_at LIMIT 5);
UPDATE mansions SET exterior_image_url = 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&h=400&fit=crop' WHERE exterior_image_url IS NULL AND id IN (SELECT id FROM mansions WHERE exterior_image_url IS NULL ORDER BY created_at LIMIT 5);
UPDATE mansions SET exterior_image_url = 'https://images.unsplash.com/photo-1448630360428-65456885c650?w=800&h=400&fit=crop' WHERE exterior_image_url IS NULL AND id IN (SELECT id FROM mansions WHERE exterior_image_url IS NULL ORDER BY created_at LIMIT 5);
UPDATE mansions SET exterior_image_url = 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&h=400&fit=crop' WHERE exterior_image_url IS NULL AND id IN (SELECT id FROM mansions WHERE exterior_image_url IS NULL ORDER BY created_at LIMIT 5);
UPDATE mansions SET exterior_image_url = 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&h=400&fit=crop' WHERE exterior_image_url IS NULL AND id IN (SELECT id FROM mansions WHERE exterior_image_url IS NULL ORDER BY created_at LIMIT 5);
UPDATE mansions SET exterior_image_url = 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&h=400&fit=crop' WHERE exterior_image_url IS NULL;
