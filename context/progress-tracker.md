# Progress Tracker

Update this file after every meaningful implementation
change.

## Current Phase

- In progress — core feature set megépítve, finomítások
  és placeholder oldalak kitöltése folyamatban

## Current Goal

- Bérkalkulátor távolléti díj pontosítás (előző 3 hónap
  bruttó alapján), kisebb javítások

## Completed

- Supabase Auth: regisztráció, bejelentkezés, kijelentkezés
  (`app/actions/auth.ts`, server actions)
- Adatbázis séma: 24 migráció, minden tábla RLS-sel védett
- App shell: Sidebar (desktop w-64 + mobil Sheet),
  Toaster, root layout (`app/layout.tsx`)
- Dashboard (`/attekintes`): aktív bevétel/budget terv
  betöltése, egyenleg és kategória-kártyák, recharts
  vonaldiagram és kördiagram
- Bérkalkulátor (`/berkalkulator`): 2026-os MVM Paks
  KULCSOK konstansokkal (TB 18,5%, SZJA 15%, műszakpótlék
  45%, túlóra osztó 157 h, TÓ szabadnapon 100%, TÓ
  pihenőnapon 125% MVM KSz, munkaszüneti 100%+45%), mentés
  és betöltés; távolléti díj auto-számítás Σbruttó/Σóra
  alapján
- Havi bevételek (`/bevetelek`): IncomePlan CRUD,
  aktív tervként jelölés
- Havi költségvetés (`/koltsegvetes`): BudgetPlan CRUD,
  Wallet CSV import + kategória-hozzárendelés,
  éves terv integráció (`annualBudgetIntegration.ts`)
- Éves költségvetés (`/eves-koltsegvetes`): AnnualBudgetPlan
  CRUD, havi allokáció számítás
- Bevásárlólista szerkesztő (`/bevasarlas`): CRUD, termék
  autocomplete, ármentés (`savePriceHistory`)
- Gyors checklistmód (`/bevasarlas-quick`): checkbox alapú
  gyors bevásárlás, ármentés befejezéskor
- Bevásárlástörténet (`/bevasarlasok`): korábbi listák
  listázása
- Termékadatbázis (`/termekek`): Product CRUD
- Statisztika (`/statisztika`): SpendingStatistics,
  Wallet CSV import
- Árfigyelés (`/arfigyeles`): PriceChange lista, filter,
  dialógos részletező
- Infláció (`/inflacio`): InflationData hónapok szerint,
  kategória bontás
- Profil (`/profil`): profiladatok szerkesztése,
  FamilyMembers komponens
- Beállítások (`/beallitasok`): alapvető preferenciák
- Segítség (`/segitseg`): statikus help oldal
- Family join (`/join-family`): meghívó link feldolgozás
- Sidebar accessibility fix: `SheetTitle` + `VisuallyHidden`
  (`@radix-ui/react-visually-hidden`)
- `useUserProfile` hook: profil + family betöltés,
  display name helperek
- `userPreferences.ts`: aktív income/budget plan upsert
- `priceHistory.ts`: savePriceHistory, getPriceChanges,
  getInflationData
- `shoppingStatistics.ts`: SpendingStatistics lekérdezések
- `annualBudgetIntegration.ts`: havi budget előkészítés
  éves tervből
- `receiptOCR.ts`: GPT-4 Vision alapú nyugtaolvasó
  (implementálva, UI-ba még nem beépítve)
- Context fájlok feltöltése valós projekt-tartalommal

## In Progress

- Placeholder oldalak tartalmának megépítése

## Next Up

- `/receptek` — receptek és hozzávalók kezelése
- `/szamlak` — számlák és fizetési határidők
- `/befektetesek` — befektetési portfólió
- `/jelentesek` — összesített éves riportok
- OCR Scanner beépítése a `/bevasarlas` UI-ba
  (`receiptOCR.ts` → ShoppingList form)
- `npm run build` teljes ellenőrzés, TypeScript strict
  figyelmeztetések kijavítása

## Open Questions

- A távolléti díj számításhoz szükséges az előző 3 hónap
  `salary_calculations` rekordja — szükséges-e dedikált
  endpoint, vagy elég a bérkalkulátor oldali betöltés?
- Az `/eves-koltsegvetes` allokáció hogyan kerüljön a
  havi tervbe: automatikus merge vagy manuális
  "importálás" gomb?
- A `/statisztika` Wallet CSV import és a
  `shopping_statistics` tábla között van-e duplikáció
  kockázat, ha ugyanazt a fájlt többször importálják?

## Architecture Decisions

- **Dual path alias (`@/*`)**: A tsconfig.json `@/*`
  aliasa egyszerre oldja fel `./src/*` és `./` útvonalankat.
  Az aktív kód `@/lib/utils/supabase/client`-et használ
  (nem `@/src/lib/...`) — mindkettő ugyanarra a fájlra
  mutat, de a `@/lib/...` forma az elterjedt.
- **JSONB list items**: `budget_plans.items` és
  `shopping_lists.items` JSONB-ként tárolódnak. Tudatos
  döntés: elkerüli a joinokat kis volumenű listáknál;
  az app réteg végzi a zod validálást.
- **Nincs globális state store**: React 19 hooks
  elegendők. Redux / Zustand / Context Provider nem
  szükséges, amíg valódi cross-component state sharing
  igény nem merül fel.
- **KULCSOK konstans nem megosztott**: A bérkalkulátor
  `KULCSOK` konstans csak az `app/berkalkulator/page.tsx`-
  ben van definiálva. Ha más oldal is igényli, ki kell
  emelni `src/config/constants.ts`-be.
- **Örökölt `components/` mappa**: A root `components/`
  FamilyManagement, OCRReceiptScanner és hasonló
  komponenseket tartalmaz. Nem aktív importok — ne
  töröld addig, amíg az OCR beépítése nincs eldöntve.
- **Munkaszüneti pótlék két sorban**: Az ünnepnapi
  munkavégzés pótlékát (+100%) és műszakpótlékát (+45%)
  a bérkalkulátor külön soron számítja és jeleníti meg,
  annak ellenére, hogy a bérpapíron egyetlen sorban
  szerepelhet. Az összeg azonos (145%), a részletezés
  transzparensebb.

## Session Notes

- A `src/lib/utils/supabase/client.ts` és a
  `lib/utils/supabase/client` ugyanaz a fájl a dual alias
  miatt — nem két különböző implementáció
- A `/attekintes` route-ot `app/attekintes/page.tsx`
  valósítja meg, amely importálja a
  `src/components/dashboard.tsx` komponenst (flat fájl,
  nem könyvtár)
- A bérkalkulátor alapbér default értéke 1.055.600 Ft
  (MVM Paks 2026-os besorolási bér, hardcoded default,
  de a felhasználó felülírhatja)
- A sidebar valódi Tailwind osztálya `w-64` (256px),
  nem 264px
