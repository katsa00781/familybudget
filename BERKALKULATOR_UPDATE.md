# Bérkalkulátor Funkció Frissítések

## 2025.12.29 - Korábbi kalkulációk betöltése és módosítása

### Probléma
A korábbi kalkulációk kártyán nem a megfelelő bérkalkulációk voltak elmentve. A felhasználó szerette volna:
- Megtalálni a mentett kalkulációkat
- Betölteni őket módosításhoz
- Újra menteni a módosított kalkulációkat

### Megoldás

#### 1. **Adatbázis módosítások**
Hozzáadtuk az alábbi mezőket a `salary_calculations` táblához:
- `name` (TEXT) - A kalkuláció neve/leírása a könnyebb azonosítás érdekében
- `munkarend_napok` (DECIMAL) - Munkarend szerinti napok száma
- `additional_incomes` (JSONB) - Egyéb jövedelmek JSON formátumban
- `jutalom` (INTEGER) - Eseti jutalom/prémium összege

**Migráció futtatása:**
```sql
-- Futtasd a Supabase SQL Editor-ban:
-- supabase/migrations/005_add_name_to_salary_calculations.sql
```

Vagy használd a már elkészített manuális frissítést:
```sql
-- manual_sql_update.sql
```

#### 2. **Kód módosítások**

**SavedCalculation interface frissítése:**
```typescript
interface SavedCalculation {
  id: string;
  family_member_id: string;
  name?: string;  // ÚJ
  alapber: number;
  munkarend_napok?: number;  // ÚJ
  // ... összes mező amit mentünk
  additional_incomes?: string;  // ÚJ
}
```

**Új funkció: Kalkuláció betöltése**
```typescript
const handleLoadCalculation = (calc: SavedCalculation) => {
  // Betölti az összes paramétert a mentett kalkulációból
  // Automatikusan újraszámítja az eredményt
  // Visszajelzést ad a felhasználónak
}
```

**Frissített mentés:**
- A mentéskor most már elmenti a `name` mezőt is
- Elmenti a `munkarend_napok` értéket
- Elmenti az `additional_incomes` adatokat JSON formátumban

#### 3. **UI változások**

**Korábbi kalkulációk kártya:**
- Megjeleníti a kalkuláció **nevét** (ha van), különben a korábbi formátumot
- Új **"Betöltés"** gomb minden kalkulációnál
  - Kék színű, könnyen felismerhető
  - Betölti a kalkulációt módosításhoz
- Meglévő **"Törlés"** gomb (piros)

**Használat:**
1. Adj nevet a kalkulációnak a "Kalkuláció neve" mezőben
2. Töltsd ki a paramétereket
3. Kattints a "Mentés" gombra
4. A mentett kalkulációk megjelennek a "Korábbi kalkulációk" kártyában
5. Kattints a "Betöltés" gombra egy korábbi kalkuláció módosításához
6. Módosítsd az értékeket
7. Mentsd el újra (új névvel vagy ugyanazzal)

### Fájlok módosítva

1. **Frontend:**
   - `app/berkalkulator/page.tsx`
     - SavedCalculation interface bővítése
     - handleLoadCalculation funkció hozzáadása
     - UI frissítés betöltés gombbal
     - Név megjelenítés a kártyákon

2. **Adatbázis:**
   - `supabase/migrations/001_create_salary_calculations_table.sql`
   - `supabase/migrations/005_add_name_to_salary_calculations.sql` (új)
   - `supabase/complete_setup.sql`
   - `supabase/init_database.sql`
   - `supabase/init_database_fixed.sql`

### Telepítési lépések

1. **Adatbázis frissítése:**
   ```bash
   # Futtasd a Supabase SQL Editor-ban:
   # supabase/migrations/005_add_name_to_salary_calculations.sql
   ```

2. **Alkalmazás indítása:**
   ```bash
   npm run dev
   ```

3. **Használat:**
   - Navigálj a Bérkalkulátor oldalra
   - Add meg a kalkuláció nevét
   - Töltsd ki a paramétereket
   - Mentsd el
   - A korábbi kalkulációk között megjelenik
   - Betölthető és módosítható

### Tesztelés

- ✅ Kalkuláció mentése névvel
- ✅ Név megjelenítése a korábbi kalkulációk között
- ✅ Betöltés gomb működése
- ✅ Paraméterek helyes betöltése
- ✅ Egyéb jövedelmek betöltése
- ✅ Automatikus újraszámítás betöltés után
- ✅ Módosított kalkuláció újra mentése
