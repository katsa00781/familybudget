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
| `/attekintes` | `app/attekintes/page.tsx` | `<Dashboard>` komponenst renderel |
| `/berkalkulator` | `app/berkalkulator/page.tsx` | 2025-ös magyar adókulcsok alapján számít |
| `/koltsegvetes` | `app/koltsegvetes/page.tsx` | Havi költségvetés tervezés |
| `/eves-koltsegvetes` | `app/eves-koltsegvetes/page.tsx` | Éves tervek nagy kiadásokhoz |
| `/bevetelek` | `app/bevetelek/page.tsx` | Bevételi tervek mentése |
| `/bevasarlas` | `app/bevasarlas/page.tsx` | Bevásárlólista szerkesztés |
| `/bevasarlas-quick` | `app/bevasarlas-quick/page.tsx` | Gyors checklist mód |
| `/termekek` | `app/termekek/page.tsx` | Termékadatbázis |
| `/statisztika` | `app/statisztika/page.tsx` | Wallet CSV import + elemzés |
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
- TB járulék: 18.5%
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
| **Pihenőnapi túlóra** | óra | +125% (nem sávos) |
| **Munkaszüneti túlóra** | óra | +225% |
| **Munkaszüneti munkavégzés** (rostán) | óra | +100% + 45% műszakpótlék |

A sávos kulcsokat a januári bérjegyzék *Üzemz.TÓ munkanapi 0-2óra / 3-4óra / 5.óra* sorai igazolják.

A kalkuláció a `salary_calculations` táblába mentődik (a túlóra-kategóriák a `tizenket_oras_muszak`,
`pihenonapi_tulora_orak`, `munkaszuneti_tulora_orak` oszlopokba — lásd migráció `012`), a `name`
mezővel azonosítható, és visszatölthető módosításhoz. A régi `tulora_orak` / `muszakpotlek_orak`
oszlopok legacy státuszúak (0-ra mentve).

## Statisztika oldal — Wallet CSV import

A `/statisztika` oldal importálja a **Wallet** (budgetbakers.com) app CSV exportját. A kategóriák leképezése a `WALLET_CATEGORIES` objektumban van definiálva a `/app/koltsegvetes/page.tsx`-ben és a `/app/statisztika/page.tsx`-ben. Az elemzés összehasonlítja a Wallet-ból importált tényleges kiadásokat a mentett `budget_plans` tervekkel.

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
