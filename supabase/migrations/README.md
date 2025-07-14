# Supabase Migrations - Family Budget App

Ez a mappa tartalmazza az összes adatbázis migrációt a Family Budget alkalmazáshoz.

## Migrations listája

### 003_create_budget_plans.sql
**Költségvetési tervek táblája**
- Költségvetési elemek tárolása JSONB formátumban
- Felhasználónkénti elkülönítés RLS-sel
- Metadata (név, leírás, összeg)
- Automatikus updated_at trigger

```sql
-- Futtatás:
-- Másold ki a fájl tartalmát és futtasd le a Supabase SQL Editor-ban
```

### 004_create_income_plans.sql
**Bevételi tervek táblája**
- Havi alapbevétel tárolása
- Egyéb jövedelmek JSONB tömbben
- Számított összbevétel
- Felhasználónkénti elkülönítés

```sql
-- Futtatás:
-- Másold ki a fájl tartalmát és futtasd le a Supabase SQL Editor-ban
```

### 005_create_shopping_lists.sql
**Bevásárlólisták táblája**
- Bevásárlólista elemek JSONB formátumban
- Dátum és állapot követés
- Összegszámítás
- Felhasználónkénti elkülönítés

```sql
-- Futtatás:
-- Másold ki a fájl tartalmát és futtasd le a Supabase SQL Editor-ban
```

### 006_create_products.sql
**Termékadatbázis táblája**
- Termékek vonalkóddal és SKU-val
- Kategorizálás és bolt információk
- Árak és egységek
- Képek és leírások támogatása
- Elérhetőség követés

### 007_create_recipes.sql  
**Recept kezelő rendszer táblái**
- `recipes` tábla: Receptek alapadataival (név, leírás, elkészítési idő, adagok)
- `recipe_ingredients` tábla: Recept hozzávalók (mennyiség, egység)
- Bevásárló lista integráció
- Felhasználónkénti elkülönítés RLS-sel
- Automatikus timestampek

```sql
-- Futtatás:
-- Másold ki a fájl tartalmát és futtasd le a Supabase SQL Editor-ban
```

### 008_create_savings_goals.sql  
**Megtakarítási tervek és befektetési portfólió rendszer**
- `savings_goals` tábla: Megtakarítási célok (név, célösszeg, céldátum, kategória)
- `savings_transactions` tábla: Megtakarítási tranzakciók (befizetés/kivét)
- `investment_portfolio` tábla: Befektetési portfólió (részvények, állampapírok, ETF-ek)
- `investment_price_history` tábla: Árfolyam előzmények
- Automatikus havi kalkuláció és progress tracking
- Felhasználónkénti elkülönítés RLS-sel

```sql
-- Futtatás:
-- Másold ki a fájl tartalmát és futtasd le a Supabase SQL Editor-ban
```

## Migration futtatási sorrend

**FONTOS:** A migrációkat a következő sorrendben kell futtatni:

1. `003_create_budget_plans.sql` - Költségvetési tervek
2. `004_create_income_plans.sql` - Bevételi tervek  
3. `005_create_shopping_lists.sql` - Bevásárlólisták
4. `006_create_products.sql` - Termékadatbázis
5. `007_create_recipes.sql` - Receptek
6. `008_create_savings_goals.sql` - Megtakarítási tervek

## Hogyan futtasd a migrációkat

1. Jelentkezz be a [Supabase Dashboard](https://supabase.com/dashboard)-ba
2. Válaszd ki a projektedet
3. Menj a **SQL Editor** tab-ra
4. Másold ki az egész migration fájl tartalmát
5. Illeszd be a SQL Editor-ba
6. Kattints a **Run** gombra
7. Ellenőrizd, hogy a válasz "sikeresen létrehozva!" üzenetet tartalmazza

## RLS (Row Level Security) Policies

Minden tábla RLS-sel van védve, ami biztosítja hogy:
- Felhasználók csak a saját adataikat látják
- Automatikus szűrés `auth.uid() = user_id` alapján
- Biztonságos többfelhasználós működés

## Indexek

Minden táblán optimális indexek vannak:
- `user_id` - gyors felhasználó szerinti szűrés
- `created_at` - időrendi rendezés
- `total_*` mezők - összegek szerinti rendezés
- Kategória és státusz mezők - szűréshez

## Triggerek

Minden táblán `updated_at` trigger:
- Automatikusan frissíti az `updated_at` mezőt módosításkor
- `update_updated_at_column()` funkció használatával

## Hibaelhárítás

Ha hibát kapsz migration futtatáskor:

1. **Policy már létezik**: Normal, a `DROP POLICY IF EXISTS` utasítások kezelik
2. **Tábla már létezik**: A `CREATE TABLE IF NOT EXISTS` biztonságos
3. **Trigger már létezik**: A `DROP TRIGGER IF EXISTS` utasítások kezelik
4. **Funkció hiányzik**: Az `update_updated_at_column()` funkció a 003-as migrationben van létrehozva

## Adatbázis séma áttekintés

```
auth.users (Supabase beépített)
├── budget_plans (költségvetések)
├── income_plans (bevételi tervek)  
├── shopping_lists (bevásárlólisták)
├── products (termékadatbázis)
├── recipes (receptek)
└── savings_goals (megtakarítási tervek)
```

## Következő lépések

A migrációk futtatása után az alkalmazás teljes funkcionalitással használható:
- ✅ Költségvetés készítés és mentés
- ✅ Bevételi tervek kezelése
- ✅ Bevásárlólisták készítése
- ✅ Termékadatbázis kezelés vonalkóddal
- ✅ Receptek kezelése és bevásárlólistára vétele
- ✅ Megtakarítási célok és befektetési portfólió kezelés
