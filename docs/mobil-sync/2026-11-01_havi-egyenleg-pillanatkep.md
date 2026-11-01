# Havi számlaegyenleg-mentés (egyenleg pillanatkép)

- **Dátum:** 2026-11-01
- **Érintett terület:** adatbázis / edge function / üzleti logika / típusok
- **Mobil teendő szükséges:** nem kötelező (a mentés a szerveren fut); igen, ha a mobilon is meg kell jeleníteni

## Mi változott
Minden hónap 1-jén automatikusan mentődik a Wallet-számlák egyenlege, és az új `/egyenleg-valtozas` webes oldal ezt veti össze a későbbi egyenleggel.

- `supabase/functions/wallet-balance-snapshot/index.ts`: új Edge Function, a mentést végzi.
- `lib/egyenlegValtozas.ts`: `nettoEgyenleg()`, `szamolValtozas()`, hónap-segédfüggvények.
- `types/egyenleg-pillanatkep.ts`: típusok.
- `lib/walletApi.ts`: új `saveWalletBalanceSnapshot()`.
- `app/egyenleg-valtozas/page.tsx`: új oldal.

## Adatbázis / API változás
**Migrációk:** `20261101_001_create_egyenleg_pillanatkep.sql`, `20261101_002_egyenleg_pillanatkep_cron.sql`.

**Új tábla: `egyenleg_pillanatkep`**, hónaponként és felhasználónként egy sor (`UNIQUE (user_id, snapshot_month)`):

| Oszlop | Leírás |
|--------|--------|
| `snapshot_month` | `YYYY-MM`, a budapesti naptár szerint |
| `snapshot_at` | a mentés időpontja |
| `source` | `automatikus` vagy `kezi` |
| `accounts` | JSONB: `[{ id, name, accountType, currencyCode, balance, creditLimit }]` |

Az RLS csak SELECT-et enged (`auth.uid() = user_id`). A kliens nem tud írni, csak az Edge Function.

**Új Edge Function: `wallet-balance-snapshot`**
- Bemenet: POST üres body-val, a tulajdonos Supabase JWT-jével. A cron `x-cron-secret` fejlécet használ, ezt mobilról nem szabad hívni.
- Kimenet: `{ month, created, snapshot }`. `created: false`, ha a hónapnak már volt mentése.
- 403 minden más felhasználónak, mint a `WALLET_SNAPSHOT_USER_ID`.

**Előjel-szabály:** a `balance` előjeles, a hitelkártya-tartozás NEGATÍV. Hitelkártyánál `availableCredit - creditLimit`; ha nincs keret, akkor `-abs(creditBalance)`. A `wallet-accounts` válaszát ezért nem szabad közvetlenül a mentett `balance`-hoz hasonlítani.

## Teendő a mobil appban
Csak akkor, ha a mobilon is meg kell jeleníteni:

1. Olvasd az `egyenleg_pillanatkep` táblát, és ne próbálj bele írni (az RLS tiltja).
2. Az élő egyenleget a `wallet-accounts` függvényből kérd le, és alkalmazd a fenti előjel-szabályt (minta: `nettoEgyenleg()`).
3. Az összesítés pénznemenként készüljön, átváltás nélkül. Az új számla 0-ról indul, a megszűnt 0-ra zár (minta: `szamolValtozas()`).
4. Lezárt hónap különbsége: a következő havi mentés és az adott havi mentés eltérése.

Visszafelé kompatibilis: meglévő tábla és függvény nem változott.
