-- Termék duplikációk megszüntetése és egyediség kényszer hozzáadása
--
-- Stratégia:
--   1. Azonos (user_id + name + brand) csoportokban a legrégebbit megtartjuk
--   2. product_price_history.product_id referenciákat az életben maradó ID-ra frissítjük
--   3. Duplikátumokat töröljük
--   4. UNIQUE INDEX-et adunk hozzá, hogy a jövőben ne keletkezhessen duplikáció
--
-- Futtatás: Supabase SQL Editor → egyszer kell lefuttatni

BEGIN;

-- 1. lépés: price_history referenciák frissítése
-- A törlendő sorok product_id-ját átírjuk a megtartandó termékre
WITH keep_ids AS (
  SELECT DISTINCT ON (user_id, LOWER(TRIM(name)), LOWER(TRIM(COALESCE(brand, ''))))
    id AS keep_id,
    user_id,
    LOWER(TRIM(name))                    AS name_lower,
    LOWER(TRIM(COALESCE(brand, '')))     AS brand_lower
  FROM products
  ORDER BY
    user_id,
    LOWER(TRIM(name)),
    LOWER(TRIM(COALESCE(brand, ''))),
    created_at ASC   -- a legrégebbi marad
),
delete_ids AS (
  SELECT p.id AS delete_id, k.keep_id
  FROM products p
  JOIN keep_ids k
    ON  p.user_id = k.user_id
    AND LOWER(TRIM(p.name))                = k.name_lower
    AND LOWER(TRIM(COALESCE(p.brand, ''))) = k.brand_lower
    AND p.id != k.keep_id
)
UPDATE product_price_history
SET product_id = d.keep_id
FROM delete_ids d
WHERE product_price_history.product_id = d.delete_id;

-- 2. lépés: duplikált termékek törlése
DELETE FROM products
WHERE id IN (
  SELECT p.id
  FROM products p
  JOIN (
    SELECT DISTINCT ON (user_id, LOWER(TRIM(name)), LOWER(TRIM(COALESCE(brand, ''))))
      id AS keep_id,
      user_id,
      LOWER(TRIM(name))                    AS name_lower,
      LOWER(TRIM(COALESCE(brand, '')))     AS brand_lower
    FROM products
    ORDER BY
      user_id,
      LOWER(TRIM(name)),
      LOWER(TRIM(COALESCE(brand, ''))),
      created_at ASC
  ) k
    ON  p.user_id = k.user_id
    AND LOWER(TRIM(p.name))                = k.name_lower
    AND LOWER(TRIM(COALESCE(p.brand, ''))) = k.brand_lower
    AND p.id != k.keep_id
);

-- 3. lépés: UNIQUE INDEX - megakadályozza a jövőbeli duplikációkat
-- Kis-nagybetű érzéketlen, szóköz-trimmelt egyediség user szinten
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_unique_name_brand
  ON products (user_id, LOWER(TRIM(name)), LOWER(TRIM(COALESCE(brand, ''))));

-- Vonalkód egyediség (csak ha nem NULL és nem üres)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_unique_barcode
  ON products (user_id, barcode)
  WHERE barcode IS NOT NULL AND TRIM(barcode) != '';

COMMIT;
