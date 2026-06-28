# Családi Költségvetés – Backlog

> Ez a feladatok egyetlen forrása. Minden művelet után frissíteni kell.
>
> **Státuszok:** ⬜ Teendő · 🟡 Folyamatban · ✅ Kész · ❌ Blokkolt

---

## Setup (egyszeri)
| # | Feladat | Státusz | Megjegyzés |
|---|---|---|---|
| S1 | Next.js projekt (App Router, TS, Tailwind) | ✅ Kész | Next 16 + React 19 + Tailwind v4, Turbopack |
| S2 | Git init + első commit | ✅ Kész | |
| S3 | `.env.local` + `.env.example` + `.gitignore` | ✅ Kész | Supabase env kulcsok |
| S4 | shadcn/ui init | ✅ Kész | src/components/ui/ alatt |
| S5 | Supabase projekt + kliensek (client.ts, server.ts) | ✅ Kész | createBrowserClient / aszinkron szerver kliens |
| S6 | DB táblák + RLS | ✅ Kész | profiles, families, salary_calculations, income_plans, budget_plans (+`plan_month`, migráció 20260626_001), annual_budget_plans, shopping_lists, products, product_price_history, user_preferences |
| S7 | `@/*` kettős path alias (tsconfig) | ✅ Kész | `["./src/*", "./"]` — src/ és root/ egyaránt elérhető |
| S8 | Sidebar navigáció (desktop fix + mobil hamburger) | ✅ Kész | src/components/layout/sidebar.tsx, useUserProfile hook |
| S9 | Auth (login, signup, signout, middleware) | ✅ Kész | Server Actions (app/actions/auth.ts); oldalak saját user-ellenőrzéssel |
| S10 | MCP szerver (lokális) | ✅ Kész | mcp/ könyvtár; budget_comparison, save_price_history, get_price_changes, get_inflation_report |
| S11 | `lib/format.ts` + helper könyvtárak | ✅ Kész | priceHistory.ts, userPreferences.ts, annualBudgetIntegration.ts, shoppingStatistics.ts |

---

## Feature-ek (sorrendben)
| # | Feladat | Státusz | Megjegyzés |
|---|---|---|---|
| F1 | Áttekintés / Dashboard (`/attekintes`) | ✅ Kész | Valódi dashboard komponens, összesített adatok |
| F2 | Bérkalkulátor (`/berkalkulator`) | ✅ Kész | 2026-os MVM bérjegyzék alapján; TB-alap, SZJA, műszakpótlék, túlóra-kategóriák, betegszabadság; mentés + visszatöltés |
| F3 | Havi költségvetés (`/koltsegvetes`) | ✅ Kész | Tervezés, Wallet CSV import + kategória-leképezés, budget_plans mentése |
| F4 | Terv vs. Tény (`/bevetelek`) | ✅ Kész | **Élő** Wallet havi tényadat (kategória-UUID szerint, `wallet-monthly-spending` Edge Function) + azonos havi `budget_plans` (`plan_month`) összehasonlítás. CSV már nem kell. A régi bevételi terv szerkesztő UI megszűnt, funkcióját a bérkalkulátor vette át |
| F5 | Éves cashflow (`/eves-koltsegvetes`) | ✅ Kész | Havi nettó + göngyölített egyenleg, év végi egyensúly, cashflow oszlop (migráció 015) |
| F6 | Bevásárlólista szerkesztő (`/bevasarlas`) | ✅ Kész | Lista szerkesztés, items JSONB |
| F7 | Gyors checklist mód (`/bevasarlas-quick`) | ✅ Kész | Gyors kipipálás, shopping_lists |
| F8 | Termékadatbázis (`/termekek`) | ✅ Kész | products tábla, árkövetés (product_price_history) |
| F9 | Statisztika (`/statisztika`) | ✅ Kész | Bevásárlási statisztikák (idő/kategória/termék/bolt); a Wallet CSV terv-vs-tény összehasonlító átkerült a `/bevetelek` (Terv vs. Tény) oldalra |
| F10 | Árváltozás riasztások (`/arfigyeles`) | ✅ Kész | getPriceChanges() alapján |
| F11 | Inflációs trendek (`/inflacio`) | ✅ Kész | getInflationData() havi aggregáció |
| F12 | Profil oldal (`/profil`) | ✅ Kész | Felhasználói adatok, família kezelés |
| F13 | Receptek (`/receptek`) | 🟡 Folyamatban | Alap UI megvan (recipes tábla létezik), teljes funkció hiányzik |
| F14 | Jelentések (`/jelentesek`) | 🟡 Folyamatban | Alap UI megvan, export/riport logika hiányzik |
| F15 | Befektetések (`/befektetesek`) | ⬜ Teendő | Placeholder oldal — tervezés, portfólió-kezelés |
| F16 | Számlák (`/szamlak`) | ⬜ Teendő | Placeholder oldal — fizetendő számlák nyilvántartása |
| F17 | Hosszú Távú Tervezés (`/tervezes`) | ✅ Kész | savings_goals + savings_transactions alapján; célok CRUD, előrehaladás, idővonal, havi megtakarítás kalkuláció; tervezett bevételek (planned_incomes JSONB, migráció 016) |
| F18 | Beállítások (`/beallitasok`) | ⬜ Teendő | Jelenleg stub oldal — felhasználói preferenciák, értesítések |
| F19 | Bevásárlások előzmények (`/bevasarlasok`) | ⬜ Teendő | Lezárt listák archiválása, statisztika |
| F20 | Família meghívó (`/join-family`) | ⬜ Teendő | Meghívó link alapú csatlakozás — families tábla |
| F21 | Egyenleg Flow (`/egyenleg-flow`) | ✅ Kész | Nap alapú bankszámla-egyenleg előrejelző. Élő Wallet számlaegyenleg (`wallet-accounts` Edge Function) + tervezett bevétel/kiadás/átvezetés (ismétlődéssel); napi göngyölített egyenleg számlánként, főszámla mínusz + hitelkártya befizetési határidő jelzés. `egyenleg_flow` tábla (migráció `20260628_001`), `lib/egyenlegFlow.ts` motor |

---

## Minőség / Ship előtt
| # | Feladat | Státusz | Megjegyzés |
|---|---|---|---|
| P1 | Lint + typecheck tisztán | ⬜ Teendő | `npm run lint` + `tsc --noEmit` |
| P2 | Mobil reszponzivitás ellenőrzés | ⬜ Teendő | Sidebar mobil drawer, táblázatok kis képernyőn |
| P3 | Üres állapotok kezelése | ⬜ Teendő | Placeholder UI minden listás oldalnál |
| P4 | Auth guard konzisztencia | ⬜ Teendő | Minden oldal ellenőrzi-e a usert? (middleware nem véd automatikusan) |
| P5 | Dev utilities eltávolítása | ⬜ Teendő | console.log, test-supabase, design-demo, features-demo oldalak |
| P6 | Secrets ellenőrzés | ⬜ Teendő | Bundle + git history — env kulcsok ne kerüljenek be |
| P7 | Production build smoke test | ⬜ Teendő | `npm run build` tiszta, Vercel deploy |

---

## Napló
> Új bejegyzés legfelülre. Formátum: `YYYY-MM-DD · feladat # · mi történt`

- 2026-06-28 · F21 · **Egyenleg Flow — egyszeri kiadások tervből**: új „Tervből másolás" gomb (Receipt ikon) a „Tervezett tételek" kártyában. Megnyit egy violet-themed panelt: budget terv kiválasztás → kategóriák szerint csoportosított tételek checkbox-szal (Mind / Töröl gyorsgombok) → forrás számla + dátum → „N tétel hozzáadása" gomb egyszeri (`recurrence: 'egyszeri'`) FlowEvent-eket hoz létre a kijelölt tételekből, mindegyik a megadott dátummal. A panel megnyitásakor a napi átlag panel bezárul (és fordítva). A tételek az `extractBudgetItemsFlat()` segítségével a `budget_data` v2 struktúrából kerülnek ki (`subcategory` = tétel neve, `amount` > 0 szűrés).
- 2026-06-28 · F21 · **Egyenleg Flow — napi gördülő bevásárlás**: új `'napi'` ismétlődési típus a `FlowRecurrence`-ben és a motorban (`expandEvents`). A „Tervezett tételek" kártyában „Napi átlag" gomb megnyit egy panelt: budget terv kiválasztás → kategóriák checkbox-szal (étel csoport előre kipipálva) → napi átlag = havi összeg / hónapnapok száma → főszámlán napi kiadás létrehozása (`recurrence: 'napi'`, hó végéig). Az idővonal táblázat kizárja a csak-napi eseménynapokat (a grafikon viszont mutatja a napi csökkenést). Header badge mutatja az aktív napi tételeket.
- 2026-06-28 · F21 · **Egyenleg Flow — több mentett terv**: a „Mentett tervek" panel (FolderOpen gomb, tervek száma) listázza az összes elmentett flow-tervet módosítási idő szerint; soronként Betölt / Töröl (megerősítéssel); aktív terv kiemelve. Szerkeszthető terv-név mező a headerben (label + Input). „Új terv" gomb (FilePlus) üres állapotba állítja az oldalt (rowId = null, következő Mentés új sort szúr be). A Mentés és a törlés után a lista automatikusan frissül (`loadPlansList`).
- 2026-06-28 · P4 · **Sidebar elrejtése az auth-oldalakon**: a login/register képernyőn is megjelent a sidebar, mert a gyökér `app/layout.tsx` mindig renderelte, a beágyazott `app/login/layout.tsx` és `app/register/layout.tsx` pedig érvénytelen módon saját `<html>`/`<body>`-t renderelt (App Routerben csak a gyökér layout teheti), így nem érvényesült. Megoldás: új kliens `AppShell` wrapper (`src/components/layout/app-shell.tsx`) — `usePathname` alapján a `/login` és `/register` route-okon nem renderel sidebart, csak teljes szélességű `<main>`-t; a gyökér layout ezt használja `<Sidebar>` + `<main>` helyett. A login/register beágyazott layoutokból kivéve az illegális `<html>`/`<body>` (csak a `metadata` oldal-cím marad, `return children`).
- 2026-06-28 · F21 · **Egyenleg Flow** oldal (`/egyenleg-flow`) megvalósítva: nap alapú bankszámla-egyenleg előrejelző. Új `wallet-accounts` Edge Function a Wallet REST `/accounts` végpontból (élő számlaegyenleg, hitelkártya tartozás+keret) → `lib/walletApi.ts` `fetchWalletAccounts()`. Tiszta előrejelző motor `lib/egyenlegFlow.ts` (`expandEvents` ismétlődés-kibontás, `computeDailyBalances` göngyölítés, hitelkártya = tartozás szemantika). UI: számlák + tervezett tételek (bevétel/kiadás/átvezetés, egyszeri/heti/havi) szerkesztő, recharts egyenleg-grafikon, napi idővonal táblázat (főszámla mínusz pirossal, hitelkártya befizetési határidő badge). Tárolás: `egyenleg_flow` tábla (migráció `20260628_001`, accounts+events JSONB, RLS). Sidebar: „Egyenleg Flow” link (CalendarClock), az Éves Cashflow után.
- 2026-06-27 · F3/F2 · **Mentett tervek/kalkulációk kezelése**: a Költségvetés oldal (`/koltsegvetes`) alsó „Mentett Költségvetések” listája mostantól a terv **nevét** és **Aktív** badge-ét is mutatja, és minden sornál **törlés gomb** (Trash2) van (`deleteBudget` — `budget_plans` delete + a betöltött/aktív állapot visszaállítása, megerősítő dialógus); a lista már **az összes** tervet listázza (a korábbi `slice(0,5)` korlát törölve), így a nem megfelelő/teszt tervek listából kiválasztva törölhetők. Bérkalkulátor (`/berkalkulator`): a „Korábbi kalkulációk” lekérdezésből eltávolítva a `.limit(5)`, így **minden** mentett kalkuláció látszik (a távolléti átlagórabér továbbra is az utolsó ≤3 rekordból számol).
- 2026-06-27 · F3 · Költségvetés oldal (`/koltsegvetes`) UX: a kategóriák mostantól **összecsukhatók** (kattintható fejléc chevronnal; alapból minden csukva a kevesebb görgetésért; „Mind kinyit / Mind összecsuk” gombok). A fejléc csukott állapotban is mutatja a kategória összegét, a tételszámot és a hozzárendelt Wallet kategóriák számát (🔗 badge). Új **„Nem hozzárendelt Wallet kategóriák”** kártya: a vonatkozási hónap (`planMonth`) tényleges Wallet kiadásait (`fetchWalletMonthlySpending`) `resolveWalletCategory`-val feloldja, és kilistázza azokat, amelyek belső UUID-ja nincs egy költségvetési kategória `walletCategories`-ében sem (`allUsedWalletIds`). Mindegyikhez Select-tel egyből hozzárendelhető egy költségvetési kategória (`addWalletCategory`), ami után a tétel eltűnik a listából. Ezzel a Terv vs. Tény „nem párosított” kategóriái közvetlenül a Költségvetés oldalon rendezhetők. Hónapváltáskor auto-frissül a Wallet adat + „Frissítés a Wallet-ből” gomb.
- 2026-06-27 · F1 · Kezdőlap **havi trend** grafikon valós adatra állítva: a `wallet-monthly-spending` Edge Function (v2, deployolva) mostantól **napi bontást** is visszaad (`daily: [{ day, income, expense }]`, a `recordDate` napja szerint aggregálva); a dashboard ebből **göngyölített (kumulált)** napi bevétel/kiadás vonalat rajzol. Visszaesés a régi lineáris vetületre, ha a `daily` hiányzik. Kliens típus: `WalletDailySpending` + `WalletMonthlyResponse.daily?` (`lib/walletApi.ts`).
- 2026-06-27 · F1 · Kezdőlap (`/attekintes`, `src/components/dashboard.tsx`) fő mutatói az **aktív bevételi/költségvetési terv** helyett az **aktuális hónap tényleges Wallet adatát** mutatják (`fetchWalletMonthlySpending` az aktuális YYYY-MM-re). Havi bevétel / Havi kiadás / Egyenleg = Wallet tény; új „Havi tényleges (Wallet)” összevető kártya; a kategória-kördiagram a Wallet tényleges kiadási kategóriáiból épül (`resolveWalletCategory` magyar nevek). A terv-alapú „Aktuális Költségvetési/Bevételi Terv” és „50/30/20” kártyák + a kapcsolódó holt kód (getBudgetItems, isBudgetStorageV2) eltávolítva; a budget/income terv betöltése csak az üres-állapothoz marad meg.
- 2026-06-26 · F4 · Terv vs. Tény **élő Wallet** integrációra állítva (CSV megszüntetve): új `wallet-monthly-spending` Edge Function (egy hónap kiadás/bevétel kategória-UUID szerinti bontásban, BUDGETBAKERS_API_TOKEN, JWT-auth, belső átvezetések kihagyva) — deployolva. Kliens helper `lib/walletApi.ts` → `fetchWalletMonthlySpending(monthKey)`. Kategória-illesztés közvetlenül UUID ↔ terv `walletCategories` alapján (nincs név-alias). Új `budget_plans.plan_month` oszlop (migráció `20260626_001`) + a Költségvetés oldalon „Vonatkozási hónap” mező; a Terv vs. Tény hónapváltáskor automatikusan az azonos havi tervet tölti be és frissít a Wallet-ből. Mellékes: `tsconfig.json` kizárja a `supabase/functions`-t (Deno) a Next build típusellenőrzéséből.
- 2026-06-26 · F4/F9 · Wallet CSV terv-vs-tény összehasonlító átköltöztetve a `/statisztika`-ból a `/bevetelek` oldalra (új UI: **Terv vs. Tény**, Scale ikon a sidebaron). A régi bevételi terv (`income_plans`) szerkesztő UI megszűnt — funkcióját a bérkalkulátor vette át; az `income_plans` tábla/helper-ek érintetlenek. Új: a hónap kiválasztásakor automatikusan az azonos `created_at` hónapú `budget_plans` terv töltődik be. A statisztika oldal mostantól csak a bevásárlási statisztikákat tartalmazza. Nav-frissítés: sidebar/main-nav „Terv vs. Tény”, dashboard üres-állapot CTA a bérkalkulátorra mutat.
- 2026-06-26 · F5 · Éves cashflow terv-vs-tény eltérés oszlopok: a Wallet tényadatok táblázat 3 új oszloppal bővült — Elt. bev. (tény−terv), Elt. kiad. (tény−terv), Elt. nettó ((tény bev−kiad) − (terv bev−kiad)); havi + összesítő sor (csak tényadatos hónapokra), szín-kódolás (zöld=kedvező, piros=kedvezőtlen).
- 2026-06-26 · F5 · Éves cashflow Wallet tényadatok hibajavítás: a `wallet-annual-cashflow` Edge Function (v2) minden `paymentType === "transfer"` rekordot eldobott, de a bank-szinkronizált (Revolut) tételek mind „transfer” paymentType-pal érkeznek → minden hónap `hasData:false`, így a Wallet szekció sosem jelent meg. A belső átvezetés szűrése immár CSAK kategória szerint (Transfer/Debt/Shopping list — mint a `wallet-spending`), a paymentType-szűrés törölve. Edge Function forrás immár a repóban is (`supabase/functions/wallet-annual-cashflow/index.ts`).
- 2026-06-26 · F5 · Éves cashflow Wallet integráció ÉLŐ adatra állítva (CSV helyett): új `wallet-annual-cashflow` Supabase Edge Function (BUDGETBAKERS_API_TOKEN secret, JWT-auth, teljes év havi bevétel+kiadás aggregálás, convertTo=base, átvezetések kihagyva); kliens helper `lib/walletApi.ts` (`supabase.functions.invoke`); az éves oldal auto-frissít bejelentkezéskor/év váltáskor + „Frissítés a Wallet-ből” gomb. A `wallet-spending` (familyshopping, havi/kategória) kontraktusa érintetlen.
- 2026-06-26 · F5 · Éves cashflow terv vs. tény összefésülés: havi terv/tény összevető táblázat, „Cashflow alapja: Terv/Tény” kapcsoló (tény ahol van Wallet-adat, terv ahol nincs). Wallet CSV parser kiemelve közös `lib/walletCsv.ts`-be (statisztika oldal is innen importál).
- 2026-06-17 · F17 · Hosszú Távú Tervezés oldal megvalósítva (savings_goals + savings_transactions); éves cashflow auto-betöltés aktív tervekből; sidebar Tervezés link hozzáadva.
- 2026-06-17 · — · Backlog létrehozva az aktuális projekt-állapot alapján. Setup (S1–S11) és F1–F12 teljesnek jelölve a CLAUDE.md és a git-history alapján. F13–F14 folyamatban, F15–F20 placeholder/teendő.
