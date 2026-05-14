# Code Standards

## General

- Minden modul egyetlen felelősségi körhöz tartozzon —
  ne keverj bevásárlás logikát bérkalkulátor kóddal
  egy fájlban
- Hibát az okánál javíts, ne workaround réteggel
- Ne mixeld össze a komponens render logikát és az
  adatbázis hívásokat — az adatelérés a service réteg
  (`src/services/`) vagy a `lib/` segédfüggvények feladata
- Új komponens írása előtt ellenőrizd, hogy a
  shadcn/ui primitívek megoldják-e a feladatot

## TypeScript

- Strict mód kötelező (`"strict": true` a tsconfig.json-ban)
- Kerüld az `any` típust — használj explicit interface-t
  vagy narrowan scopolt union type-t
- Ismeretlen külső inputot (pl. Wallet CSV sor,
  Supabase JSONB mező) validáld a rendszerhatáron
  (zod schema vagy explicit type assertion) mielőtt
  megbízol benne
- Supabase lekérdezés eredménye mindig `{ data, error }` —
  mindig kezeld mindkét ágat; ne feltételezd, hogy `data`
  nem `null`

## Next.js

- Alapértelmezetten Server Component — csak akkor adj
  `'use client'` direktívát, ha böngésző interaktivitás
  (useState, useEffect, event handler) szükséges
- Server action-ök az `app/actions/` mappában laknak,
  `"use server"` direktívával
- Route handlers egyetlen felelősségi körhöz —
  ne kezelj egyszerre több egymástól független
  erőforrást egy `route.ts`-ben
- Auth check minden oldalon: `supabase.auth.getUser()`
  → ha nincs user, `redirect('/login')`
- `@/*` alias feloldása: `./src/*` és `./` párhuzamosan.
  Aktív import minták:
  - `@/src/components/ui/button` (shadcn primitívek)
  - `@/lib/utils/supabase/client` (böngésző kliens)
  - `@/src/lib/utils/supabase/server` (szerver kliens)
  - `@/lib/priceHistory` (root lib helper)
  - `@/src/hooks/useUserProfile` (custom hook)

## Styling

- Tailwind utility osztályok az elsődleges stíluseszköz
- Egyéni CSS osztályok a
  `src/styles/familybudget-custom.css` fájlba kerülnek —
  ne hozz létre új CSS fájlt
- Ne használj hardcoded hex értéket inline style-ként;
  Tailwind osztályoknál a `cyan` / `teal` / `emerald`
  skálát használd a brand akcentusokhoz
- Gradiens háttér oldalon:
  `from-cyan-50 via-teal-50 to-emerald-50`
- Glassmorphism kártya:
  `bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20`

## API Routes

- Request input validálása és parse-olása mielőtt
  bármilyen logika lefut
- Auth és ownership ellenőrzés minden mutáció előtt
- Konzisztens, kiszámítható response shape — a Supabase
  konvencióval összhangban `{ data, error }` mintát
  kövesd

## Data and Storage

- Minden perzisztens adat Supabase PostgreSQL-ben tárolódik
- JSONB oszlopok (`budget_plans.items`,
  `shopping_lists.items`) kis volumenű listatételeknél
  elkerülik a felesleges jointáblákat — az app réteg
  végzi a validálást (zod schema-val)
- Nagy generált tartalmak (pl. OCR output) ne kerüljenek
  közvetlenül az adatbázisba — a `receiptOCR.ts`
  kliens oldalon dolgozza fel és csak a végeredményt menti
- `user_id`-t mindig explicit add meg az INSERT-eknél;
  az RLS nem helyettesíti az alkalmazás-szintű szűrést

## File Organization

- `src/components/ui/` — shadcn/ui primitívek, CLI által
  generáltak; soha ne módosítsd kézzel
- `src/components/layout/` — Sidebar, main-nav és
  egyéb shell komponensek
- `src/components/` (aldirektóriák) — feature komponensek
  domain szerint (`family/`); ne rakj feature komponenst
  egyenesen a `src/components/` gyökérbe
- `src/services/` — Supabase CRUD wrapperek domain szerint
- `src/hooks/` — Egyéni React hookok (useUserProfile, stb.)
- `src/config/` — App-szintű konstansok és szótárak
- `src/types/` — TypeScript interface és type definíciók
  (`auth.ts`, `budget.ts`, `salary.ts`, `products.ts`,
  `common.ts`)
- `lib/` — Komplex üzleti logika helperek (árhistória,
  statisztika, felhasználói preferenciák, éves integráció,
  OCR)
- `types/` — Root-szintű domain típusok a `lib/`-hez
  (`enhanced.ts`, `annual-budget.ts`, `budget.ts`)
- `app/actions/` — Server action-ök (auth és jövőbeni
  form feldolgozások)
- `supabase/migrations/` — SQL migráció fájlok; az újakat
  dátum-prefixszel (`YYYYMMDD_NNN_leíró_név.sql`) nevezd el;
  a meglévőket soha ne szerkeszd
