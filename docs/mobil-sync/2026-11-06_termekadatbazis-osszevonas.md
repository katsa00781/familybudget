# Termékadatbázis: termékek összevonása (RPC)

- **Dátum:** 2026-11-06
- **Érintett terület:** adatbázis / üzleti logika
- **Mobil teendő szükséges:** igen (a megszűnő `product_id`-k kezelése; a funkció átvétele opcionális)

## Mi változott

A Termékadatbázis oldalon (`/termekek`) minden termék sorában van egy **Összevonás** gomb. Ezzel az OCR-ből eltérő néven bekerült, valójában azonos termékek beolvaszthatók a kiválasztott (megtartott) termékbe. A dialógus felajánlja a hasonló nevű termékeket (`nevHasonlosag()`), és előre megmutatja, mi történik az egyes termékekkel (`osszevonasElonezet()`).

A `products` tábla **boltonként** külön sort tart (egyedi index: `user_id + coalesce(store_name,'') + lower(name) + unit`). Ezért egy forrás termék két dolog egyikét kapja:

- **Beolvad:** van már sor ugyanazzal a bolttal és egységgel a cél nevén. Ilyenkor a forrás sor **törlődik**, a rá mutató hivatkozások a megmaradó sorra kerülnek, a megmaradó sor a frissebb (`last_seen_at`) árat kapja, és üres mezőit (vonalkód, cikkszám, márka, leírás, kép) a forrásból tölti ki.
- **Átneveződik:** más a bolt vagy az egység. A sor megmarad, és megkapja a cél nevét és kategóriáját; a márkáját csak akkor, ha a célnak van.

Opcionálisan, alapból bekapcsolva, a régi nevű ártörténet-bejegyzések (`product_price_history.product_name`) és a bevásárlási statisztika sorai (`shopping_statistics.product_name`) is az új nevet kapják.

Érintett fájlok:
- `supabase/migrations/20261106_003_termekek_osszevonasa.sql`: az adatbázis-függvény.
- `lib/termekOsszevonas.ts`: `termekekOsszevonasaAdatbazisban()` (RPC hívás), `osszevonasElonezet()`.
- `src/components/termekek/termek-osszevonas-dialog.tsx`
- `app/termekek/page.tsx`

## Adatbázis / API változás

Új RPC függvény: `public.termekek_osszevonasa(cel_id uuid, forras_ids uuid[], arelozmeny_atnevezes boolean DEFAULT true, statisztika_atnevezes boolean DEFAULT true) RETURNS json`.

- `SECURITY INVOKER`: a hívó RLS jogai érvényesek. Csak `authenticated` szerepkör hívhatja. Egy tranzakcióban fut.
- Visszatérési érték: `{ cel_nev, atnevezett, beolvasztott, arelozmeny, statisztika }` (darabszámok).
- Beolvasztáskor a következő hivatkozásokat irányítja át a megmaradó termékre:
  - `product_price_history.product_id`
  - `recipe_ingredients.product_id`
  - `meal_plan_entries.product_id`
  - `shopping_lists.items[].product_id` (JSONB, szövegként tárolt uuid)
- Új oszlop vagy tábla nincs.

## Teendő a mobil appban

1. **Megszűnő `product_id`-k:** beolvasztáskor a forrás termék sora törlődik. Ha a mobil helyben gyorsítótárazza a termékeket vagy a `product_id`-kat (pl. offline bevásárlólista, kedvencek, OCR-párosítás), frissítéskor kezelje, hogy egy id eltűnhet. A szerveren tárolt hivatkozásokat a függvény már átirányította.
2. **Bevásárlólisták:** a `shopping_lists.items[].product_id` értékek a szerveren átíródnak. Ha a mobil egy régebbi helyi lista-példányt ment vissza, felülírhatja a javítást. Mentés előtt érdemes a szerverről frissíteni.
3. **Opcionális:** a funkció a mobilon is elérhetővé tehető: `supabase.rpc('termekek_osszevonasa', { cel_id, forras_ids, arelozmeny_atnevezes, statisztika_atnevezes })`. Az előnézet szabálya a `lib/termekOsszevonas.ts` `osszevonasElonezet()` függvényében van.
4. **Migráció:** amíg a `20261106_003` nem fut le, az RPC hívás `PGRST202` hibát ad.
