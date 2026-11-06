-- Migráció: termékek összevonása a Termékadatbázisban (RPC)
-- Dátum: 2026-11-06
-- Cél: az OCR-ből eltérő néven bekerült, valójában azonos termékek egyesítése.
--
-- Működés (egy tranzakcióban):
--   A kiválasztott FORRÁS termékek felveszik a CÉL termék nevét (és kategóriáját; a márkát
--   csak akkor, ha a célnak van). Mivel a products tábla boltonként külön sort tart
--   (egyedi kulcs: user_id + bolt + lower(név) + egység), az átnevezés ütközhet egy már
--   meglévő sorral. Ilyenkor a forrás sor beleolvad abba:
--     - a rá mutató hivatkozások (product_price_history, recipe_ingredients,
--       meal_plan_entries, shopping_lists.items[].product_id) átkerülnek a megmaradó sorra,
--     - a megmaradó sor a frissebb (last_seen_at) árat kapja, az üres mezőit
--       (vonalkód, cikkszám, márka, leírás, kép) a forrásból tölti ki,
--     - a forrás sor törlődik.
--   Ütközés nélkül a forrás sor csak átneveződik (pl. más boltban lévő ugyanaz a termék).
--
--   Opcionálisan (alapból igen) az ártörténet (product_price_history.product_name) és a
--   bevásárlási statisztika (shopping_statistics.product_name) régi nevű sorai is az új
--   nevet kapják — így az Árfigyelés és a Statisztika is egyben látja a terméket.
--
-- SECURITY INVOKER: a hívó RLS jogosultságai érvényesek, csak a saját termékei módosulnak.

CREATE OR REPLACE FUNCTION public.termekek_osszevonasa(
  cel_id uuid,
  forras_ids uuid[],
  arelozmeny_atnevezes boolean DEFAULT true,
  statisztika_atnevezes boolean DEFAULT true
)
RETURNS json
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  cel products%ROWTYPE;
  forras products%ROWTYPE;
  megmarado products%ROWTYPE;
  regi_nevek text[] := ARRAY[]::text[];
  atnevezett_db int := 0;
  beolvasztott_db int := 0;
  arelozmeny_db int := 0;
  statisztika_db int := 0;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Nincs bejelentkezett felhasználó';
  END IF;

  SELECT * INTO cel FROM products WHERE id = cel_id AND user_id = uid FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'A cél termék nem található';
  END IF;

  IF (SELECT count(*) FROM products
      WHERE id = ANY(forras_ids) AND id <> cel_id AND user_id = uid)
     <> (SELECT count(DISTINCT f) FROM unnest(forras_ids) f WHERE f <> cel_id) THEN
    RAISE EXCEPTION 'Egy vagy több forrás termék nem található';
  END IF;

  -- Régi nevek (az ártörténet/statisztika átnevezéséhez)
  SELECT coalesce(array_agg(DISTINCT name::text), ARRAY[]::text[]) INTO regi_nevek
  FROM products
  WHERE id = ANY(forras_ids) AND id <> cel_id AND user_id = uid AND name <> cel.name;

  -- A frissebb források előbb: ütközésnél így a legutóbbi ár kerül a megmaradó sorba
  FOR forras IN
    SELECT * FROM products
    WHERE id = ANY(forras_ids) AND id <> cel_id AND user_id = uid
    ORDER BY last_seen_at DESC NULLS LAST, created_at DESC
    FOR UPDATE
  LOOP
    -- Van-e már sor ugyanazzal a (bolt, új név, egység) kulccsal? A cél élvez elsőbbséget.
    SELECT * INTO megmarado FROM products
    WHERE user_id = uid
      AND id <> forras.id
      AND coalesce(store_name, '') = coalesce(forras.store_name, '')
      AND lower(name) = lower(cel.name)
      AND unit = forras.unit
    ORDER BY (id = cel_id) DESC, last_seen_at DESC NULLS LAST
    LIMIT 1;

    IF FOUND THEN
      -- Hivatkozások átirányítása a megmaradó sorra
      UPDATE product_price_history SET product_id = megmarado.id WHERE product_id = forras.id;
      UPDATE recipe_ingredients   SET product_id = megmarado.id WHERE product_id = forras.id;
      UPDATE meal_plan_entries    SET product_id = megmarado.id WHERE product_id = forras.id;
      UPDATE shopping_lists sl
      SET items = (
        SELECT jsonb_agg(
                 CASE WHEN e->>'product_id' = forras.id::text
                      THEN jsonb_set(e, '{product_id}', to_jsonb(megmarado.id::text))
                      ELSE e END
                 ORDER BY ord)
        FROM jsonb_array_elements(sl.items) WITH ORDINALITY AS t(e, ord)
      )
      WHERE jsonb_typeof(sl.items) = 'array'
        AND sl.items @> jsonb_build_array(jsonb_build_object('product_id', forras.id::text));

      -- A megmaradó sor kiegészítése a forrás adataival
      UPDATE products SET
        price        = CASE WHEN forras.last_seen_at > megmarado.last_seen_at OR megmarado.price IS NULL
                            THEN coalesce(forras.price, megmarado.price) ELSE megmarado.price END,
        last_seen_at = GREATEST(megmarado.last_seen_at, forras.last_seen_at),
        barcode      = coalesce(megmarado.barcode, forras.barcode),
        sku          = coalesce(megmarado.sku, forras.sku),
        brand        = coalesce(megmarado.brand, forras.brand),
        description  = coalesce(megmarado.description, forras.description),
        image_url    = coalesce(megmarado.image_url, forras.image_url),
        available    = megmarado.available OR forras.available
      WHERE id = megmarado.id;

      DELETE FROM products WHERE id = forras.id;
      beolvasztott_db := beolvasztott_db + 1;
    ELSE
      UPDATE products SET
        name     = cel.name,
        category = cel.category,
        brand    = coalesce(cel.brand, forras.brand)
      WHERE id = forras.id;
      atnevezett_db := atnevezett_db + 1;
    END IF;
  END LOOP;

  IF arelozmeny_atnevezes AND array_length(regi_nevek, 1) > 0 THEN
    UPDATE product_price_history
    SET product_name = cel.name, updated_at = now()
    WHERE user_id = uid AND product_name = ANY(regi_nevek);
    GET DIAGNOSTICS arelozmeny_db = ROW_COUNT;
  END IF;

  IF statisztika_atnevezes AND array_length(regi_nevek, 1) > 0 THEN
    UPDATE shopping_statistics
    SET product_name = cel.name
    WHERE user_id = uid AND product_name = ANY(regi_nevek);
    GET DIAGNOSTICS statisztika_db = ROW_COUNT;
  END IF;

  RETURN json_build_object(
    'cel_nev', cel.name,
    'atnevezett', atnevezett_db,
    'beolvasztott', beolvasztott_db,
    'arelozmeny', arelozmeny_db,
    'statisztika', statisztika_db
  );
END;
$$;

REVOKE ALL ON FUNCTION public.termekek_osszevonasa(uuid, uuid[], boolean, boolean) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.termekek_osszevonasa(uuid, uuid[], boolean, boolean) TO authenticated;
