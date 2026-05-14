# Architecture Context

## Stack

| Layer     | Technology                              | Role                                        |
| --------- | --------------------------------------- | ------------------------------------------- |
| Framework | Next.js 16 App Router + TypeScript      | Routing, SSR/RSC, server actions            |
| UI        | Tailwind CSS v4 + shadcn/ui             | Styling és primitív komponensek             |
| State     | React 19 hooks (useState, useEffect)    | Lokális állapot; nincs globális store       |
| Auth      | Supabase Auth (`@supabase/ssr`)         | Email/jelszó, session cookie-ban tárolva   |
| Database  | Supabase PostgreSQL (RLS)               | Minden perzisztens adat                     |
| Forms     | react-hook-form + zod                   | Form állapot és séma validáció              |
| Charts    | recharts                                | Vonaldiagram, kördiagram a dashboardon      |
| Icons     | lucide-react                            | Stroke-alapú SVG ikonok az egész appban     |
| Toast     | sonner                                  | Felhasználói visszajelzések (siker/hiba)    |

## System Boundaries

- `app/` — Next.js App Router oldalak és server actions.
  28 route, mind magyar URL-szegmenssel. Server actions az
  `app/actions/` mappában (`auth.ts`).
- `src/components/` — Minden aktív React komponens.
  `ui/` = shadcn primitívek (csak olvasható).
  `layout/` = Sidebar + main-nav.
  `dashboard.tsx`, `family/` = feature komponensek.
- `src/lib/utils/supabase/` — Supabase kliens factory-k.
  `client.ts` (szinkron, böngészőben) és `server.ts`
  (aszinkron, szerver oldalon/actions-ben). Ez a két
  belépési pont minden Supabase hozzáféréshez.
- `src/services/` — Adatelérési réteg: `database.ts`,
  `auth.ts`, `budget.ts`, `salary.ts`, `shopping.ts`,
  `product.ts`, `income.ts`, `profile.ts`.
- `src/types/` — TypeScript interfészek domain szerint:
  `auth.ts`, `budget.ts`, `salary.ts`, `products.ts`,
  `common.ts` (SupabaseResponse, SalaryResult stb.).
- `src/hooks/` — Egyéni React hookok.
  `useUserProfile.ts`: profil + family betöltés
  Supabase-ből, display name helperek.
- `src/config/` — App-szintű konstansok: `constants.ts`
  (BUDGET_CATEGORIES, PRODUCT_UNITS, MAIN_ROUTES, COLORS).
- `lib/` — Root-szintű üzleti logika könyvtárak, melyeket
  az oldalak közvetlenül importálnak: `priceHistory.ts`,
  `shoppingStatistics.ts`, `userPreferences.ts`,
  `annualBudgetIntegration.ts`, `receiptOCR.ts`.
- `types/` — Root-szintű domain típusok a `lib/`-hez:
  `enhanced.ts` (ProductPriceHistory, ShoppingStatistic,
  FamilyMember, InflationData, ReceiptData),
  `annual-budget.ts`, `budget.ts`.
- `supabase/migrations/` — 24 rendezett SQL migráció.
  Az újak dátum-prefixszel (`YYYYMMDD_NNN_leiras.sql`).
- `components/` — LEGACY root-szintű komponensek.
  Ne importálj innen, ne hozz létre új importot.

## Storage Model

- **Supabase PostgreSQL**: Minden perzisztens adat.
  Táblák domain szerint csoportosítva:
  - Azonosítás: `profiles`, `families`, `family_members`
  - Pénzügyi tervek: `income_plans`, `budget_plans`,
    `annual_budget_plans`, `salary_calculations`
  - Bevásárlás: `shopping_lists`, `shopping_statistics`,
    `products`, `product_price_history`
  - Preferenciák: `user_preferences`
  - Kiegészítők: `recipes`, `savings_goals`
- **JSONB oszlopok**: `budget_plans.items` és
  `shopping_lists.items` strukturált tömböket JSONB-ként
  tárolja, hogy elkerülje a külön sortable táblákat kis
  volumenű listáknál. Az app réteg végzi a validálást.
- **Nincs blob storage**: Nincs S3 vagy Supabase Storage.
  Avatar URL sima szöveg mező; az OCR feldolgozás
  kliens oldalon fut, csak a végeredmény kerül mentésre.

## Auth and Access Model

- Minden felhasználó Supabase Auth-on keresztül
  jelentkezik be (email + jelszó). A `signup` server
  action kiegészítő metaadatokat (`full_name`,
  `birth_date`, `zip_code`) tárol az `auth.users`-ben;
  egy database trigger auto-létrehozza a `profiles` sort.
- A session `@supabase/ssr` cookie-n alapul. A middleware
  (`src/lib/utils/supabase/middleware.ts`) minden
  kérésnél frissíti a session-t.
- Minden oldalnak meg kell hívnia a
  `supabase.auth.getUser()` függvényt, és ha nincs
  session, `redirect('/login')` hívással kell reagálnia.
- Minden Supabase táblán engedélyezett a Row Level
  Security (RLS). Az alap policy: `user_id = auth.uid()`,
  ill. family membership alapú szűrés
  (`family_members` joinon keresztül).
- Családtagok `family_id` foreign key-en osztják meg az
  adatokat. A `family_members` tábla tartalmazza a
  szerepkört (`admin` | `member` | `viewer`) és a státuszt.

## Invariants

1. Soha ne importálj a root `components/` mappából —
   csak `src/components/` az aktív.
2. Client komponensekben `createClient()` a
   `@/lib/utils/supabase/client` importból (szinkron,
   nincs await). Server componentekben és server
   action-ökben `await createClient()` a
   `@/src/lib/utils/supabase/server` importból.
3. Minden oldal redirect-el `/login`-ra, ha a
   `supabase.auth.getUser()` nem ad vissza felhasználót.
4. Minden táblán van RLS — sosem írj lekérdezést
   `user_id` vagy family-alapú szűrés nélkül.
5. Az egész app 100% magyar — nincs angol az UI
   szövegekben, route slug-okban, toast üzenetekben
   vagy gombfeliratokon.
6. A `src/components/ui/` fájljait a shadcn CLI
   generálja — soha ne módosítsd őket kézzel.
