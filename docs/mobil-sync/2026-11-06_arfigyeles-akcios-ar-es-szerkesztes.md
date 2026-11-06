# Árfigyelés: akciós ár jelölése, ártörténet szerkesztése és grafikonja

- **Dátum:** 2026-11-06
- **Érintett terület:** adatbázis / üzleti logika / típusok
- **Mobil teendő szükséges:** igen

## Mi változott

Az Árfigyelés oldalon (`/arfigyeles`) a termék ártörténete szerkeszthető lett, és egy árat akciósnak lehet jelölni.

- **Szerkesztés:** egy bejegyzés egységára, dátuma és boltja javítható (pl. hibás OCR beolvasás). Az egységár változásakor a `total_price` újraszámolódik (`unit_price × quantity`). Egy bejegyzés törölhető is.
- **Akciós jelölés:** az új `akcios` mezővel. Az akciós ár **nem valódi árváltozás**, ezért kimarad:
  - az árváltozások számításából (`getPriceChanges`). Az akciós rekord sem régi, sem új árként nem szerepel, az összehasonlítás a legutóbbi két *rendes* ár között történik.
  - a havi inflációszámításból (`getInflationData`).
  - a termék-statisztikából (`getPriceStatistics`: min/max/átlag/trend). Ha a terméknek csak akciós ára van, a statisztika azokból készül.
- **Grafikon:** a történet-dialógus vonaldiagramon mutatja a rendes árakat, az akciós árakat narancssárga pontként, és szaggatott vonallal a rendes árak átlagát.
- **Termékkereső:** bármely termék ártörténete megnyitható, nem csak azoké, amelyek az árváltozás-listában szerepelnek.

Érintett fájlok:
- `lib/priceHistory.ts`: új `isRegularPrice()`, `updatePriceHistory()`, `deletePriceHistory()`; az akciós rekordokat kiszűri a `getPriceChanges`, a `getInflationData` és a `getPriceStatistics`.
- `types/enhanced.ts`: `ProductPriceHistory.akcios?: boolean`
- `src/components/arfigyeles/ar-tortenet-dialog.tsx`: új dialógus grafikonnal és szerkesztéssel.
- `app/arfigyeles/page.tsx`
- `mcp/src/tools/price-history.ts`, `mcp/src/tools/inflation.ts`: ugyanaz a kiszűrés az MCP szerverben.

## Adatbázis / API változás

- Migráció: `supabase/migrations/20261106_002_add_akcios_to_product_price_history.sql`
- `product_price_history.akcios BOOLEAN NOT NULL DEFAULT false` (új oszlop)
- RLS: nem változott. A meglévő UPDATE/DELETE policy (`auth.uid() = user_id`) lefedi a szerkesztést és a törlést.
- Edge Function: nincs változás.

## Teendő a mobil appban

1. **Típus:** a mobil `ProductPriceHistory` típusába vedd fel az `akcios: boolean` mezőt (opcionális, alapértéke `false`).
2. **Számítások:** ahol a mobil árváltozást, inflációt vagy árstatisztikát számol a `product_price_history` alapján, ott az `akcios = true` sorokat hagyd ki, ugyanúgy, mint a webes `isRegularPrice()`. Különben eltér az eredmény a webtől.
3. **Beszúrás (pl. bevásárlás / OCR mentés):** új mezőt nem kell küldeni, a DB alapértéke `false`. Ha a mobilon a blokk alapján felismerhető az akció (pl. „AKCIÓ” sor), beküldhető `akcios: true`.
4. **Opcionális UI:** az ártörténet-nézetben akciós címke, akciós jelölés be/ki kapcsolása, valamint az ár, a dátum és a bolt szerkesztése (`total_price` = `unit_price × quantity` újraszámolással) és törlése.
5. **Visszafelé kompatibilitás:** a migráció előtti sorok `akcios = false` értéket kapnak, tehát rendes árnak számítanak, és a régi viselkedés nem változik.
