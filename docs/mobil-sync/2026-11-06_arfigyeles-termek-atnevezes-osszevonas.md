# Árfigyelés: termék átnevezése és összevonása

- **Dátum:** 2026-11-06
- **Érintett terület:** üzleti logika
- **Mobil teendő szükséges:** nem (csak tájékoztató, a funkció opcionálisan átvehető)

## Mi változott

Az Árfigyelés oldal (`/arfigyeles`) ártörténet-ablakában egy termék átnevezhető, és több, eltérő nevű termék összevonható. Erre akkor van szükség, ha az OCR más néven vitte be ugyanazt a terméket (pl. „Trappista sajt” és „Trapista sajt”).

- **Átnevezés:** a termék minden ártörténet-bejegyzése az új nevet kapja. Ha az új név, kis- és nagybetűtől függetlenül, egy másik meglévő termék neve, akkor a két termék története összevonódik, és a meglévő név marad.
- **Összevonás:** a kiválasztott termékek minden bejegyzése a megnyitott termék nevét kapja. A rendszer felajánlja a hasonló nevű termékeket a `nevHasonlosag()` alapján, amely a szó-átfedést, a közös előtagot és a karakter-bigramokat nézi, ékezet- és írásjel-függetlenül. A 0,5 feletti pontszámúak jelennek meg.
- **Mit módosít:** csak a `product_name` mező változik. Az ár, a dátum, a bolt, az `akcios` jelölés, a `product_id` és a kategória soronként változatlan marad.
- **„A bevásárlási statisztikában is”** (alapból bekapcsolva): a `shopping_statistics` tábla azonos nevű sorai is átnevezésre kerülnek, így a Statisztika oldal is egy termékként mutatja őket.
- A `products` tábla (Termékadatbázis) **nem** változik.

Érintett fájlok:
- `lib/priceHistory.ts`: új `getTermekNevek()`, `termekekOsszevonasa()`, `nevHasonlosag()`.
- `src/components/arfigyeles/ar-tortenet-dialog.tsx`: Átnevezés és Összevonás panel.
- `app/arfigyeles/page.tsx`

## Adatbázis / API változás

Nincs új oszlop vagy migráció. A művelet kliensoldali UPDATE a `product_price_history.product_name` és a `shopping_statistics.product_name` mezőn, `user_id` és `product_name IN (...)` szűréssel. Mindkét táblán élő UPDATE RLS policy van (`auth.uid() = user_id`), ezt 2026-11-06-án ellenőriztem.

Nem atomi: ha a statisztika átnevezése hibára fut, az ártörténet már át van nevezve. Ilyenkor a hibaüzenet ezt jelzi, és a művelet megismételhető.

## Teendő a mobil appban

1. **Kötelező teendő nincs.** A mobil név szerint olvassa az ártörténetet, így az átnevezett vagy összevont termékek automatikusan az új néven jelennek meg.
2. Ha a mobil gyorsítótárazza a termékneveket (pl. offline lista), frissítéskor a régi nevek eltűnnek.
3. **Opcionális:** ugyanez a funkció átvehető. A szabály: `UPDATE ... SET product_name = <cél> WHERE user_id = <user> AND product_name IN (<források>)` mindkét táblán. Ha a cél kis- és nagybetűtől függetlenül egyezik egy meglévő névvel, a meglévő név írásmódját kell használni.
