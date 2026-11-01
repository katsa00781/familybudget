# Wallet kategória-leképezés: angol rendszer-nevek és UUID-alapú egyeztetés

- **Dátum:** 2026-11-01
- **Érintett terület:** üzleti logika (Wallet kategória-leképezés)
- **Mobil teendő szükséges:** igen, ha a mobil app Wallet-rekordokat a kategória NEVE alapján rendel tervkategóriához

## Mi változott
A Wallet MCP / REST a rendszer-kategóriákat **angol névvel** és **valódi globális UUID-val** adja vissza
(pl. `Groceries`, `5c5c03e8-000a-8000-8000-000000000000`). A familyBudget MCP `budget_comparison`
eszköze eddig csak a belső magyar névre tudott egyeztetni, ezért 2026 októberében a 28 kategóriából 17
"unmapped" lett (pl. Élelmiszerek, Jelzáloghitel, Ajándékok), és a tény csak 299e Ft-ot mutatott 1 347e helyett.

- `lib/walletCategories.ts`:
  - új `WALLET_EN_NAME_TO_REAL_ID` (angol Wallet-név → valódi UUID, forrás: Wallet MCP `get_categories`)
  - új `toInternalWalletId(id)` (valódi UUID → belső UUID a meglévő `WALLET_SYSTEM_UUID_TO_INTERNAL` hídon)
  - új `resolveWalletCategoryId(name, categoryId?)` — sorrend: categoryId → magyar név → angol név
- `mcp/src/lib/wallet-categories.ts`: a fenti fájl pontos másolata lett (eddig elavult, 35 elemes lista volt).
- `mcp/src/tools/budget-comparison.ts`: az új feloldót használja; a terv `walletCategories` UUID-jait is
  belső UUID-ra normalizálja; a breakdown/unmapped listában a magyar nevet mutatja.
- `mcp/src/index.ts`: a `wallet_records` sémában új opcionális `categoryId` mező (eddig a zod eldobta).

## Adatbázis / API változás
Nincs. A `budget_plans.budget_data` szerkezete változatlan.

## Teendő a mobil appban
1. Ha a mobil Wallet-rekordot tervkategóriához rendel, elsődlegesen a `category.id`-t használja, és azt
   a `WALLET_SYSTEM_UUID_TO_INTERNAL` híddal fordítsa belső UUID-ra (lásd `toInternalWalletId`).
2. Ha csak név van, a magyar név mellett az angol rendszer-nevet is kezelje (`WALLET_EN_NAME_TO_REAL_ID`).
3. Az átnevezett rendszer-kategóriák (pl. „Mamci revolut” = `others__missing`, „Autópálya díjak” =
   `vehicle__rentals`) egyedi névvel jönnek — ezeket csak UUID alapján lehet megbízhatóan feloldani.
