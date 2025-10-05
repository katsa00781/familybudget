# Aktív Bevételi Terv Workflow - Tesztelési Útmutató

## Előkészület
✅ `user_preferences` tábla létrehozva az adatbázisban (migráció futtatása)

## Tesztelési Lépések

### 1. Migráció futtatása
- [ ] Supabase Dashboard → SQL Editor
- [ ] Migráció futtatása (`20250105_003_active_income_plan.sql`)
- [ ] Ellenőrzés: `SELECT * FROM user_preferences;` (üres tábla, OK)

### 2. Bérkalkulátor teszt
- [ ] Nyisd meg: `/berkalkulator`
- [ ] Töltsd ki a fizetési adatokat
- [ ] Kattints **"Mentés bevételi tervként"**
- [ ] Eredmény: Bevételi terv mentve ÉS automatikusan aktívvá vált

### 3. Költségvetés oldal teszt
- [ ] Nyisd meg: `/koltsegvetes`
- [ ] Bevételi terv kiválasztó megnyitása
- [ ] Látnod kell: **"Aktív"** badge-et a nemrég mentett terven
- [ ] Válassz ki egy MÁSIK bevételi tervet
- [ ] Eredmény: Az új terv lesz aktív, badge átkerül rá

### 4. Dashboard teszt
- [ ] Nyisd meg: `/` (főoldal)
- [ ] Dashboard mutatja az aktív bevételi terv adatait
- [ ] NEM a legutolsót, hanem az AKTÍVAT mutatja
- [ ] Ha megváltoztatod a költségvetés oldalon → Dashboard frissül

## Elvárt Működés

### Workflow:
```
Bérkalkulátor (mentés) 
    ↓ automatikusan aktív
Bevételi Tervek
    ↓ kiválasztás
Költségvetés oldal (aktív terv megjelölve)
    ↓ megjelenítés
Dashboard (mindig az aktív tervet mutatja)
```

### Adatbázis változások:
1. **Első mentés után:**
   ```sql
   -- user_preferences tábla
   user_id: <user_uuid>
   active_income_plan_id: <plan_uuid>
   active_budget_plan_id: null
   ```

2. **Másik terv kiválasztása után:**
   ```sql
   -- active_income_plan_id frissül az új terv ID-jára
   ```

## Debugging

Ha valami nem működik:

### Ellenőrizd a konzolban:
```javascript
// Browser DevTools Console
// Költségvetés oldal betöltésekor:
"Active income plan loaded:" // látni kell az aktív terv adatait

// Dashboard betöltésekor:
"Dashboard data loaded:" // incomeData tartalmazza az aktív tervet
```

### Ellenőrizd az adatbázisban:
```sql
-- Van-e user_preferences rekord?
SELECT * FROM user_preferences WHERE user_id = '<your_user_id>';

-- Létezik-e az aktív terv?
SELECT * FROM income_plans WHERE id = '<active_plan_id>';
```

## Probléma Megoldások

### "Active income plan loaded: null"
→ Nincs beállítva aktív terv
→ Menj a bérkalkulátorba és mentsd el újra

### Dashboard üres vagy régi tervet mutat
→ F5 frissítés a böngészőben
→ Ellenőrizd a user_preferences táblát

### "Cannot find getActiveIncomePlan"
→ Ellenőrizd: `lib/userPreferences.ts` létezik
→ Import ellenőrzése a komponensekben

## Sikerkritériumok ✅

- ✅ Bérkalkulátor mentéskor aktívvá teszi a tervet
- ✅ Költségvetés oldalon látható az "Aktív" badge
- ✅ Dashboard az aktív tervet jeleníti meg (nem a legutolsót)
- ✅ Terv váltásakor minden frissül
- ✅ Nincs console error

