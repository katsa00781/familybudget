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
| S6 | DB táblák + RLS | ✅ Kész | 015 migrációig; profiles, families, salary_calculations, income_plans, budget_plans, annual_budget_plans, shopping_lists, products, product_price_history, user_preferences |
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
| F4 | Bevételi tervek (`/bevetelek`) | ✅ Kész | income_plans mentése, aktív terv kezelése (userPreferences) |
| F5 | Éves cashflow (`/eves-koltsegvetes`) | ✅ Kész | Havi nettó + göngyölített egyenleg, év végi egyensúly, cashflow oszlop (migráció 015) |
| F6 | Bevásárlólista szerkesztő (`/bevasarlas`) | ✅ Kész | Lista szerkesztés, items JSONB |
| F7 | Gyors checklist mód (`/bevasarlas-quick`) | ✅ Kész | Gyors kipipálás, shopping_lists |
| F8 | Termékadatbázis (`/termekek`) | ✅ Kész | products tábla, árkövetés (product_price_history) |
| F9 | Statisztika – Wallet CSV import (`/statisztika`) | ✅ Kész | CSV elemzés, tényleges vs. tervezett kiadások összehasonlítása |
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

- 2026-06-17 · F17 · Hosszú Távú Tervezés oldal megvalósítva (savings_goals + savings_transactions); éves cashflow auto-betöltés aktív tervekből; sidebar Tervezés link hozzáadva.
- 2026-06-17 · — · Backlog létrehozva az aktuális projekt-állapot alapján. Setup (S1–S11) és F1–F12 teljesnek jelölve a CLAUDE.md és a git-history alapján. F13–F14 folyamatban, F15–F20 placeholder/teendő.
