# Árfigyelés: összehasonlítás boltonként és egységárban

- **Dátum:** 2026-11-06
- **Érintett terület:** üzleti logika / típusok (adatbázis-séma változás nincs)
- **Mobil teendő szükséges:** igen (ha a mobil app árváltozást vagy inflációt számol, vagy bevásárlólista-tételt ír)

## Mi változott

Az árváltozás- és inflációszámítás eddig csak terméknév szerint csoportosított. Így a különböző boltok árait (pl. Lidl 1199 Ft vs. Aldi 1979 Ft) és a különböző kiszereléseket (pl. „700 g” csomag 1899 Ft vs. mérlegelt „kg” 1979 Ft/kg) is árváltozásnak vette.

Mostantól két ár csak akkor hasonlítható össze, ha **azonos termék + azonos bolt + azonos mértékegység** (összehasonlítási csoport). A változást az **egységár** alapján számoljuk, nem a kiszerelés ára alapján.

### Egységár-szabály (`lib/egysegar.ts` → `egysegar()`)

A `product_price_history.unit` szabad szöveg. Ebből és a terméknévből a következő sorrendben számoljuk az egységárat:

1. Kifejezett kg- vagy literár a `unit` mezőben, pl. „0.967 kg × 2399 Ft/kg” → 2399 Ft/kg.
2. Tömeg vagy térfogat a `unit` mezőben, pl. „400 g”, „1,01 kg”, „6x1.5 l”, „2 × 1.5 l”, „1,5 l × 6 db” → `unit_price / mennyiség (kg vagy l)`.
3. Kifejezett darabár, pl. „2 × 50 Ft/db” → 50 Ft/db. Darabszámos csomag, pl. „10 db” → `unit_price / 10` Ft/db (csak ha N > 1).
4. A `unit` pontosan „kg”: mérlegelt áru, a `unit_price` már Ft/kg.
5. Tömeg vagy térfogat a **terméknévben**, pl. „Görög joghurt 400g” → Ft/kg.
6. A `unit` pontosan „l”: Ft/l.
7. Minden más (pl. „db”, „cs”, „csomag”, „1 db”, puszta „g”): ismeretlen méretű csomag, mértékegysége `csomag`, az egységár maga a `unit_price`.

Mértékegységek: `kg | l | db | csomag`. A tömeg alapegysége a kg, a térfogaté a liter (g, dkg, ml, cl, dl átváltva).

### Bolt-szabály

- `boltKulcs()`: a `store_name` trimelve, kisbetűsen. A `null` vagy üres érték egy külön csoport, a felületen „Ismeretlen bolt”.
- Összehasonlítási kulcs: `osszehasonlitasiKulcs()` = `product_name | boltKulcs | mertekegyseg`.

### Számítások

- `getPriceChanges()` (`lib/priceHistory.ts`): csoportonként az utolsó két rendes (nem akciós) bejegyzés egységárát veti össze. Ha egy csoportnak csak egy bejegyzése van az időablakban, az ablak előtti utolsó bejegyzést **ugyanabból a csoportból** veszi. Ugyanaz a termék így több sorban is megjelenhet, boltonként és mértékegységenként egyszer.
- `getInflationData()`: havonta csoportonként átlagos egységárat számol, és csak az előző hónap azonos csoportjával veti össze.
- Az MCP szerver (`mcp/src/tools/price-history.ts`, `mcp/src/tools/inflation.ts`) ugyanígy számol. A szabály másolata: `mcp/src/lib/egysegar.ts`.

### UI (webes)

- `/arfigyeles`: új „Bolt” oszlop. A régi és új ár egységárként jelenik meg (pl. „2 713 Ft/kg”), alatta a rögzített kiszerelés ára („1 899 Ft / 700 g”). A különbség is egységárban értendő.
- Az ártörténet-dialógusban (`src/components/arfigyeles/ar-tortenet-dialog.tsx`) bolt- és mértékegység-szűrő van. A grafikon egységárat mutat; „Összes bolt” nézetben boltonként külön vonallal. A változás-jelzés csak azonos boltban és mértékegységben számol.

### Bevásárlólista: a bolt bekerül a tételbe

A `/bevasarlas` oldalon a termékadatbázisból felvett tétel megkapja a termék boltját és azonosítóját. A lista mentésekor, illetve a `/bevasarlas-quick` lezárásakor ezek bekerülnek a `product_price_history` és a `shopping_statistics` sorába is. Eddig itt mindig `null` került a bolt helyére.

## Adatbázis / API változás

- Séma: **nincs** változás, migráció nincs.
- `shopping_lists.items[]` JSONB: két új, **opcionális** mező:
  - `store_name?: string | null`
  - `product_id?: string | null` (ezt a mobil oldal korábban is írhatta)

  A régi tételekben ezek hiányoznak; ezeket ismeretlen boltként kell kezelni.
- `PriceChange` típus (`types/enhanced.ts`), új mezők:
  - `old_egysegar`, `new_egysegar`: number
  - `mertekegyseg`: `'kg' | 'l' | 'db' | 'csomag'`
  - `old_unit`, `new_unit`: string, opcionális

  Jelentésváltozás: a `price_difference` és a `price_change_percent` mostantól egységárra vonatkozik. Az `old_price` és a `new_price` továbbra is a rögzített (kiszerelésenkénti) ár. A `store_name` mindkét árra érvényes.
- Az MCP `get_price_changes` tool kimenete ugyanezekkel a mezőkkel bővült.

## Teendő a mobil appban

1. Ha a mobil app saját maga számol árváltozást, inflációt vagy ártrendet: vegye át az `egysegar()` szabályt (a fenti 7 lépés, forrás: `lib/egysegar.ts`), és a terméknév helyett az `osszehasonlitasiKulcs()` szerint csoportosítson (termék + bolt + mértékegység).
2. Árváltozás megjelenítésekor mutassa a boltot és az egységárat (Ft/kg, Ft/l, Ft/db). A különbség egységárban értendő.
3. Bevásárlólista: termékből felvett tételnél írja a `store_name` és a `product_id` mezőt az `items[]` elembe. Lezáráskor adja tovább a `product_price_history.store_name` és a `shopping_statistics.store_name` mezőbe, ne `null`-t.
4. Visszafelé kompatibilitás: a `store_name` vagy `product_id` nélküli régi tételek továbbra is érvényesek, ismeretlen boltként számítanak.
