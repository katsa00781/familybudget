# Családi Költségvetés

## Overview

Családi Költségvetés egy magyar nyelvű webalkalmazás, amelyet
háztartások pénzügyi tervezésére és követésére terveztek. A
felhasználók bevételeiket (beleértve a 2026-os MVM Paks
bérszabályok szerinti bruttó/nettó kalkulációt), havi és éves
kiadásterveiket, bevásárlólistáikat, termékáraikat és a
személyes inflációjukat kezelhetik egyetlen alkalmazásban.
Az app családi módban is működik: egy household több tagot
vonhat be, akik közös adatokat látnak.

## Goals

1. Egy bejelentkezett felhasználó percek alatt átlátja
   aktuális havi pénzügyi állapotát (bevétel vs. tervezett
   vs. tényleges kiadás)
2. A bérkalkulátor pontosan számítja a 2026-os MVM Paks
   műszakos munkarend szerinti nettó bért: TB (18,5%), SZJA
   (15%), műszakpótlék (45%), túlóra-pótlék és ünnepnapi
   pótlék tételekre bontva
3. A bevásárlás során rögzített árak automatikusan
   feltöltik a termék árhistóriát és az inflációs
   kimutatást, így a felhasználó látja, mennyivel drágultak
   a mindennapokban vásárolt termékek

## Core User Flow

1. Felhasználó regisztrál vagy bejelentkezik (`/login`,
   `/register`) — Supabase Auth kezeli
2. Az `/attekintes` dashboardon látja az aktív havi bevétel-
   és költségvetési tervet, a tervezett és tényleges
   egyenleget, grafikon és kártyák formájában
3. A `/berkalkulator` oldalon megadja a havi munkarendet
   (ledolgozott napok, túlóra, ünnepnapi munkavégzés,
   szabadság), az app kiszámolja a nettó bért, és opcionálisan
   menti az adatbázisba
4. A `/bevetelek` oldalon létrehozza az adott havi
   bevételi tervet, beállítja aktívként
5. A `/koltsegvetes` oldalon beállítja a kategóriánkénti
   tervezett kiadásokat (50/30/20 modell alapján), majd
   ténylegesen rögzíti a Wallet CSV-ből importált vagy
   kézileg bevitt kiadásokat
6. Bevásárlás előtt a `/bevasarlas` oldalon listát állít
   össze, boltnál a `/bevasarlas-quick` gyors checklistet
   használja, az árak mentésekor az árhistória automatikusan
   frissül
7. A `/statisztika`, `/arfigyeles`, `/inflacio` oldalakon
   elemzi a korábbi vásárlásokat és az árak alakulását

## Features

### Bérkalkulátor (MVM Paks 2026)

- Alapbér, jutalom, munkarend szerinti napok megadása
- Szabadság, betegszabadság, kiküldetés, GYED-melletti
  munkavégzés, ruhapénz kezelése
- Túlóra: szabadnapon (+100%) és pihenőnapon (+125%, MVM KSz)
- Ünnepnapi munkavégzés: +100% pótlék + +45% műszakpótlék
- Távolléti díj: előző max. 3 hónap Σ(bruttó)/Σ(munkarend óra)
- Kalkuláció mentése adatbázisba, korábbiak betöltése

### Havi Pénzügyi Tervezés

- Bevételi terv létrehozása és aktív tervként jelölése
- Havi költségvetés kategóriánként (Szükséglet / Vágyak /
  Megtakarítás)
- Wallet CSV import: automatikus kategória-hozzárendelés
- Éves nagy kiadások (éves terv) és havi allokáció vetítése
  a havi tervbe (`annualBudgetIntegration.ts`)

### Bevásárlás és Árkövetés

- Bevásárlólista szerkesztő (termékadatbázisból autocomplete)
- Gyors checklistmód pénztárnál
- Árhistória automatikus mentése minden befejezett listánál
  (`lib/priceHistory.ts` → `product_price_history` tábla)
- Árfigyelés: termékenkénti ár-trend és változás %
- Infláció: hónapról hónapra összehasonlítás kategóriánként

### Család és Profil

- Profilkezelés (név, email, születési dátum, cím)
- Familygroup létrehozása és meghívó link generálása
- Képernyőn látható: a bejelentkezett felhasználó neve és
  a családnév (sidebar fejléc, `useUserProfile` hook)

### Placeholder Oldalak (jövőbeni fejlesztés)

- `/receptek` — Receptek és hozzávalók tervezés
- `/szamlak` — Számlák és fizetési határidők
- `/befektetesek` — Befektetési portfólió
- `/jelentesek` — Összesített éves riportok

## Scope

### In Scope

- Bérkalkulátor 2026-os MVM Paks szabályokkal
- Havi bevétel- és költségvetési tervek (Supabase-ben tárolva)
- Éves nagy kiadások terve és havi vetítés
- Bevásárlólista szerkesztő és gyors checklistmód
- Termék-árhistória automatikus mentése
- Áremelkedés/csökkenés kimutatás és inflációs trend
- Wallet CSV import és kategória-szinkron
- Statisztikák: időszakos kiadás, kategória, bolt elemzés
- Profilszerkesztés és família kezelés
- Minden felhasználói felület magyar nyelven

### Out of Scope

- Valódi OCR blokkolvasás beépített UI-jal (a `receiptOCR.ts`
  megvan, de nincs aktív UI beépítve)
- Push értesítések és mobilapp (Expo skeleton létezik, de
  nem aktív)
- Banki API integráció (OTP, Revolut stb.)
- Befektetési portfólió valós adat (placeholder oldal)
- Számlák automatikus befizetése

## Success Criteria

1. Bejelentkezett felhasználó az `/attekintes` oldalon látja
   az aktuális havi bevétel, tervezett kiadás és egyenleg
   összesítőjét
2. A bérkalkulátor a 2026-os KULCSOK konstansokkal
   (TB: 18,5%, SZJA: 15%, műszakpótlék: 45%, túlóra osztó:
   157 h, TÓ pihenőnapon: 125%) helyesen számolja a nettó bért
3. Egy befejezett bevásárlólista mentésekor az árak
   megjelennek a `product_price_history` táblában és az
   `/arfigyeles` oldalon
4. `npm run build` hiba nélkül lefut
