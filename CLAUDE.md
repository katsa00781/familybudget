# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Projekt áttekintés

**Családi Költségvetés** — Magyar nyelvű, teljes körű família-pénzügyi kezelő app. Next.js App Router + Supabase backend + shadcn/ui + Tailwind CSS v4.

Az app **teljes egészében magyarul** van: URL-szegmensek, változónevek, UI szövegek, kommentek.

## Parancsok

```bash
npm run dev       # Fejlesztői szerver (Turbopack)
npm run build     # Production build
npm run lint      # ESLint ellenőrzés
```

Nincs automatizált teszt. A Supabase migrációkat manuálisan kell futtatni a Supabase SQL Editor-ban.

## Könyvtárszerkezet és architektúra

```
app/              # Next.js App Router oldalak (Route-ok)
src/              # Megosztott forráskód
  components/     # UI és layout komponensek
    ui/           # shadcn/ui primitívek
    layout/       # sidebar.tsx, main-nav.tsx
    dashboard/    # Valódi dashboard komponens (→ /attekintes)
    family/       # Családtag-kezelés
  lib/utils/supabase/  # Supabase kliensek
  hooks/          # useUserProfile.ts
  types/          # TypeScript típusok (közös)
  services/       # database.ts (generikus CRUD)
lib/              # Root-szintű helper könyvtárak
  priceHistory.ts
  shoppingStatistics.ts
  userPreferences.ts
  annualBudgetIntegration.ts
types/            # Root-szintű típusok
  enhanced.ts     # Árkövetés, bevásárlás, családtag típusok
  annual-budget.ts
  budget.ts
components/       # Root-szintű (RÉGI) komponensek – NE módosítsd
supabase/         # Migrációs SQL fájlok
```

### Kritikus: `@/*` path alias kettős feloldása

A `tsconfig.json`-ban: `"@/*": ["./src/*", "./"]`

Ez azt jelenti:
- `@/src/components/ui/button` → `src/components/ui/button.tsx` ✓
- `@/lib/utils/supabase/client` → root `lib/utils/supabase/client.ts` ✓
- `@/components/ui/button` → `components/ui/button.tsx` (root, RÉGI dashboard) ⚠️

Az élő oldalak a `@/src/components/ui/` és `@/lib/utils/supabase/client` útvonalakat használják. A root `components/` mappa az elavult, statikus demó dashboard maradványa.

## Supabase kliens használata

**Client komponensekben** (minden `'use client'` oldal):
```ts
import { createClient } from '@/lib/utils/supabase/client'
// Szinkron, createBrowserClient-et használ
const supabase = createClient()
```

**Server Components / API Route-okban**:
```ts
import { createClient } from '@/src/lib/utils/supabase/server'
// Aszinkron!
const supabase = await createClient()
```

**Auth ellenőrzés** mindenhol:
```ts
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/login')
```

## Oldalak és funkcionalitás

| URL | Fájl | Státusz |
|-----|------|---------|
| `/attekintes` | `app/attekintes/page.tsx` | `<Dashboard>` komponenst renderel — a fő mutatók (havi bevétel/kiadás/egyenleg) az **aktuális hónap tényleges Wallet adatát** mutatják (`fetchWalletMonthlySpending`), nem a terveket |
| `/berkalkulator` | `app/berkalkulator/page.tsx` | 2025-ös magyar adókulcsok alapján számít |
| `/koltsegvetes` | `app/koltsegvetes/page.tsx` | Havi költségvetés tervezés |
| `/eves-koltsegvetes` | `app/eves-koltsegvetes/page.tsx` | Éves cashflow — havi nettó + göngyölített egyenleg, év végi egyensúly |
| `/egyenleg-flow` | `app/egyenleg-flow/page.tsx` | **Egyenleg Flow** — nap alapú bankszámla-egyenleg előrejelző. Élő Wallet számlaegyenlegekből indul (`fetchWalletAccounts`), tervezett bevétel/kiadás/átvezetés tételekből napi göngyölített egyenleget számol számlánként (`lib/egyenlegFlow.ts`); jelzi a főszámla mínuszos napjait és a hitelkártya befizetési határidőt |
| `/bevetelek` | `app/bevetelek/page.tsx` | **Terv vs. Tény** — Wallet CSV import + havi költségvetési terv összehasonlító (a régi bevételi terv UI megszűnt, funkcióját a bérkalkulátor vette át) |
| `/bevasarlas` | `app/bevasarlas/page.tsx` | Bevásárlólista szerkesztés |
| `/bevasarlas-quick` | `app/bevasarlas-quick/page.tsx` | Gyors checklist mód |
| `/termekek` | `app/termekek/page.tsx` | Termékadatbázis |
| `/statisztika` | `app/statisztika/page.tsx` | Bevásárlási statisztikák (idő/kategória/termék/bolt szerinti elemzés) |
| `/arfigyeles` | `app/arfigyeles/page.tsx` | Árváltozás riasztások |
| `/inflacio` | `app/inflacio/page.tsx` | Inflációs trendek |
| `/befektetesek`, `/szamlak`, `/receptek` | — | Placeholder oldalak |

## Adatbázis táblák

A Supabase minden táblán **Row Level Security (RLS)** van engedélyezve. A `auth.uid() = user_id` policy az alap minta.

| Tábla | Leírás |
|-------|--------|
| `profiles` | auth.users kiterjesztése — auto-létrehozva trigger-rel |
| `families` | Família csoportok |
| `salary_calculations` | Mentett bérkalkulációk |
| `income_plans` | Bevételi tervek |
| `budget_plans` | Havi költségvetési tervek (budget_data JSONB) |
| `annual_budget_plans` | Éves költségvetési tervek |
| `egyenleg_flow` | Napi egyenleg-előrejelző terv (accounts + events JSONB, migráció `20260628_001`) |
| `shopping_lists` | Bevásárlólisták (items JSONB) |
| `products` | Termékadatbázis |
| `product_price_history` | Árkövetési adatok |
| `user_preferences` | Aktív income/budget plan ID-k |

Migrációk helye: `supabase/migrations/`. Az összes tábla egybén is létrehozható: `supabase/complete_setup.sql`.

## Kulcs lib helper-ek (root `/lib/`)

### `lib/priceHistory.ts`
- `savePriceHistory()` — ár mentése a `product_price_history` táblába
- `getPriceChanges()` — árváltozások lekérése időtartomány szerint
- `getInflationData()` — havi inflációs adatok aggregálva
- A bevásárláskor és termék-mentéskor automatikusan hívódik.

### `lib/userPreferences.ts`
- `getUserPreferences()`, `setActiveIncomePlan()`, `setActiveBudgetPlan()`
- A bérkalkulátor és a költségvetés oldal ezzel szinkronizál.

### `lib/annualBudgetIntegration.ts`
- `prepareBudgetFromAnnualPlan()` — az éves terv ismétlődő kiadásait és megtakarítási tételeit beemeli a havi költségvetésbe.

### `lib/shoppingStatistics.ts`
- `getShoppingStatistics()` — bevásárlási statisztikák lekérése dátumtartomány szerint

## Bérkalkulátor specifikus info

A `KULCSOK` konstans az aktuális 2026-os bérpapír (MVM bérjegyzék) adatain alapul:
- TB járulék: 18.5% (a hivatalos kulcs), de **nem a bruttó bérre**, hanem a tágabb **TB járulékalapra** vetítve:
  - TB-alap = bruttó bér + formaruha kompenzáció + formaruha AK + vállalati önk. nyugdíj + vállalati önk. egészség
  - Vállalati önk. nyugdíj: **5,4%** a bruttó bérből (`ÖNK_NYUGDIJ_VALLALATI`)
  - Vállalati önk. egészség: **fix 20.600 Ft** (`ÖNK_EGESZSEG_VALLALATI_FIX`)
  - A SZÉP (béren kívüli juttatás) NEM része a TB-alapnak
  - A *Formaruha AK* külön beviteli mező (`formaruha_ak`, migráció `014`) — általában évente egyszer
- SZJA: 15%
- Műszakpótlék: 45% (minden ledolgozott + túlóra órára)
- Betegszabadság: 70%

### Túlóra-pótlékok (KSZ szerint)

A túlóra alap-órabére `alapbér / 157` (`TULORA_OSZTÓ` — műszakos éves átlag 1884 h/év = 157 h/hó).
Minden túlóra-órára jár a 100% alap (a *Túlóraalap* tételben) **és** +45% műszakpótlék. Ezen felül a
pótlékok:

| Kategória | Bemenet | Pótlék (alap fölött) |
|-----------|---------|----------------------|
| **12 órás műszak** (sávos napi túlóra) | db (műszak) | 1 műszak = 4 TÓ-óra: első 2 óra +50%, 3-4. óra +70% (4 óra felett +100%) |
| **Szabadnapi túlóra** (bérjegyzék *TÓ szabadnapon*) | óra | +100% (fix, **nem** sávos) |
| **Pihenőnapi túlóra** | óra | +125% (nem sávos) |
| **Munkaszüneti túlóra** | óra | +225% |
| **Munkaszüneti munkavégzés** (rostán) | óra | +100% + 45% műszakpótlék |

> A *szabadnapi* túlóra a januári/áprilisi bérjegyzéken fix +100% pótlékkal szerepel (8,31 óra × alap-órabér × 1,00), **nem** sávosan. Ezt a felhasználó a bérjegyzékkel egyeztetve erősítette meg.

A sávos kulcsokat a januári bérjegyzék *Üzemz.TÓ munkanapi 0-2óra / 3-4óra / 5.óra* sorai igazolják.

A kalkuláció a `salary_calculations` táblába mentődik (a túlóra-kategóriák a `tizenket_oras_muszak`,
`szabadnapi_tulora_orak` (migráció `013`), `pihenonapi_tulora_orak`, `munkaszuneti_tulora_orak` oszlopokba — lásd migráció `012`), a `name`
mezővel azonosítható, és visszatölthető módosításhoz. A régi `tulora_orak` / `muszakpotlek_orak`
oszlopok legacy státuszúak (0-ra mentve).

## Terv vs. Tény oldal (`/bevetelek`) — élő Wallet összehasonlító

A `/bevetelek` oldal (UI: **Terv vs. Tény**) a **Wallet** (budgetbakers.com) havi tényadatait **élőben** kéri le (nincs CSV-feltöltés), és az azonos havi `budget_plans` tervvel veti össze a tényleges kiadásokat.

- **Adatforrás:** a `wallet-monthly-spending` Supabase Edge Function (`supabase/functions/wallet-monthly-spending/index.ts`) — egy hónap kiadásait/bevételeit **kategória (UUID) szerinti bontásban** adja vissza a Wallet REST API-ból. A `BUDGETBAKERS_API_TOKEN` secret a szerveren marad, a hívót Supabase JWT azonosítja, a belső átvezetések (Transfer/Debt/Shopping list) kategória szerint kihagyva. Testvérfüggvény: `wallet-annual-cashflow` (teljes év, csak havi összesítés — érintetlen).
- **Kliens helper:** `lib/walletApi.ts` → `fetchWalletMonthlySpending(monthKey)` (`supabase.functions.invoke`).
- **Kategória-illesztés:** a Wallet REST API a **valódi, globális rendszer-kategória UUID-kat** adja vissza (pl. `5c5c03e8-...` = „Groceries”, angolul), a FamilyBudget viszont a saját **belső** UUID-jaival (`WALLET_CATEGORIES`, magyar nevek) hivatkozik, és a tervek `walletCategories` mezője is ezeket tárolja. A `WALLET_SYSTEM_UUID_TO_INTERNAL` híd + `resolveWalletCategory()` (`lib/walletCategories.ts`) fordítja a valódi UUID-t a belső UUID-ra és magyar névre — ez teszi egyeztethetővé és magyar nyelvűvé a megjelenítést. (Custom kategória, pl. Mamci `7bed4dc9`, valódi UUID-ja már egyezik a belsővel.) A `WALLET_CATEGORIES` lista két részből áll: a régi bejegyzések a belső (fake) UUID-kkal + híd-bejegyzéssel, az újabbak közvetlenül a **valódi Wallet rendszer-UUID-jukkal** (ezeknek nincs híd-bejegyzés — a `resolveWalletCategory` önmagát adja vissza). Új kategóriát ezért elég a valódi UUID-jával felvenni a `WALLET_CATEGORIES`-be (a valódi UUID-kat a Wallet MCP `get_categories` adja). A Költségvetés oldal kategória-választója a `group` mező szerint csoportosítja a listát.
- **Hónap ↔ terv párosítás:** a `budget_plans.plan_month` (`YYYY-MM`, migráció `20260626_001`) oszlop alapján — a Költségvetés oldalon állítható „Vonatkozási hónap” mező. Hónapváltáskor automatikusan az azonos havi terv töltődik be (visszaesésként a `created_at` hónapja). Hónapváltáskor a Wallet adat is automatikusan újratöltődik; „Frissítés a Wallet-ből” gomb is van.

> A `/bevetelek` route korábban a bevételi tervek (`income_plans`) szerkesztője volt; ezt a funkciót a bérkalkulátor vette át. Az `income_plans` tábla és a `lib/userPreferences.ts` / `src/services/income.ts` helper-ek továbbra is élnek (dashboard, költségvetés, éves cashflow használja), csak a régi szerkesztő UI szűnt meg. A `lib/walletCsv.ts` CSV parser-t már csak az éves cashflow oldal használja.

## Egyenleg Flow oldal (`/egyenleg-flow`) — napi bankszámla-egyenleg előrejelző

Nap alapú likviditás-tervező: az élő Wallet számlaegyenlegekből indulva, tervezett tételekből (fizetés, nagyobb kiadás, számlák közti átvezetés) **napról napra** göngyölíti minden számla egyenlegét, így előre látszik melyik napon megy mínuszba a főszámla és mikor esedékes a hitelkártya befizetése.

- **Élő egyenleg:** új `wallet-accounts` Supabase Edge Function (`supabase/functions/wallet-accounts/index.ts`) a Wallet REST `/accounts` végpontjából adja vissza a számlák aktuális egyenlegét (hitelkártyánál `creditBalance` = tartozás, `creditLimit` = keret). Kliens helper: `lib/walletApi.ts` → `fetchWalletAccounts()`. A token (`BUDGETBAKERS_API_TOKEN`) a szerveren marad, a hívót Supabase JWT azonosítja — ugyanaz a minta mint a `wallet-monthly-spending`.
- **Előrejelző motor:** `lib/egyenlegFlow.ts` — tiszta (UI-független) függvények. `expandEvents()` kibontja az ismétlődő tételeket (egyszeri/heti/havi) konkrét napokra, `computeDailyBalances()` göngyölíti a számlánkénti záró egyenleget. **Hitelkártya-szemantika:** az egyenleg a tartozást jelenti, ezért a számlára beáramló pénz CSÖKKENTi (lásd `applyDelta`). `buildForecast()` a kettőt egy lépésben hívja.
- **Adat:** egy `egyenleg_flow` tábla soronként (JSONB `accounts` + `events`), felhasználónként a legutóbb frissített sor töltődik be. Típusok: `types/egyenleg-flow.ts` (`FlowAccount`, `FlowEvent`, `DayRow`).

## Sidebar navigáció

A `src/components/layout/sidebar.tsx` rendereli a navigációt. Desktop-on fix oldalsáv (264px), mobilon hamburger menü (Sheet). A `useUserProfile` hook adja a felhasználói nevet, iniciálékat és família nevet.

## Autentikáció

- Server Actions a `app/actions/auth.ts`-ben: `login()`, `signup()`, `signout()`
- A middleware (`middleware.ts`) session refresh-t végez minden kérésnél, de **nem védi** automatikusan az útvonalakat
- Auth redirect nincs middleware-ben — az oldalak maguk ellenőrzik a user-t
- `protected-route.tsx` komponens létezik, de az oldalak közvetlenül ellenőrzik a Supabase-t

## Típusok

- `src/types/` — generikus típusok (SupabaseResponse, PaginationParams, SalaryResult, KULCSOK konstans)
- `types/enhanced.ts` — komplex domain típusok (ProductPriceHistory, FamilyMember, ShoppingStatistics stb.)
- `types/annual-budget.ts` — éves tervhez kapcsolódó típusok
- `types/budget.ts` — BudgetItem, BudgetCategory (megosztva statisztika és költségvetés között)
