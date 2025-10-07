# JSON Import Source Type Hiba Javítás

## 🐛 Probléma

**Hiba üzenet**: "Termék importálva, de a statisztika mentése sikertelen"

**Ok**: A `shopping_statistics` tábla `source` mezőjének CHECK constraint-je nem engedélyezi az `'import'` értéket.

### Adatbázis állapot:

**product_price_history tábla** ✅:
```sql
CHECK (source IN ('ocr', 'manual', 'import', 'list'))
```

**shopping_statistics tábla** ❌:
```sql
CHECK (source IN ('ocr', 'manual', 'list'))  -- 'import' hiányzik!
```

---

## 🔧 Megoldások

### 1. Ideiglenes megoldás (ALKALMAZVA)

**Fájl**: `app/termekek/page.tsx`  
**Változás**: `source: 'manual'` használata `'import'` helyett

```typescript
const shoppingStatsToInsert = allItemsForStats.map(item => ({
  user_id: currentUser.id,
  shopping_date: currentDate,
  product_name: item.name,
  product_category: item.category,
  brand: item.brand,
  store_name: item.store_name,
  quantity: 1,
  unit: item.unit,
  unit_price: item.price,
  total_price: item.price,
  source: 'manual' // ← Ideiglenes megoldás
}))
```

**Előny**: Azonnal működik, nincs szükség adatbázis módosításra  
**Hátrány**: Nem tudjuk megkülönböztetni a manuális és import forrásokat a statisztikában

---

### 2. Végleges megoldás (AJÁNLOTT)

**Új migration**: `supabase/migrations/20250107_002_add_import_source_type.sql`

```sql
-- Drop existing CHECK constraint
ALTER TABLE shopping_statistics 
DROP CONSTRAINT IF EXISTS shopping_statistics_source_check;

-- Add new CHECK constraint with 'import'
ALTER TABLE shopping_statistics 
ADD CONSTRAINT shopping_statistics_source_check 
CHECK (source IN ('ocr', 'manual', 'import', 'list'));
```

**Telepítés**:
1. Nyisd meg a Supabase Dashboard-ot
2. SQL Editor → New Query
3. Másold be a migration tartalmát
4. Futtasd le (Run)

**Kód visszaállítása** (migration futtatása után):
```typescript
source: 'import' // Jelöljük, hogy JSON importból származik
```

---

## 📊 Forrás típusok jelentése

| Érték | Jelentés | Használat |
|-------|----------|-----------|
| `'ocr'` | OCR nyugta beolvasás | Nyugta scanner funkció |
| `'manual'` | Kézi bevitel | Termék manuális hozzáadása |
| `'import'` | JSON import | Tömeges JSON importálás |
| `'list'` | Bevásárlólista | Lista befejezése után |

---

## 🧪 Tesztelés

### 1. Ideiglenes megoldással (most):
```bash
# JSON import most már működik
# De a source mindig 'manual' lesz
```

**Ellenőrzés**:
```sql
SELECT source, COUNT(*) 
FROM shopping_statistics 
WHERE user_id = 'your-user-id'
GROUP BY source;

-- Eredmény:
-- manual | 25  (tartalmazza az importokat is)
-- list   | 10
-- ocr    | 5
```

### 2. Migration futtatása után:
```bash
# Visszaállítod a kódban: source: 'import'
# Majd import teszt
```

**Ellenőrzés**:
```sql
SELECT source, COUNT(*) 
FROM shopping_statistics 
WHERE user_id = 'your-user-id'
GROUP BY source;

-- Eredmény:
-- manual | 15  (csak valódi manuális)
-- import | 10  (JSON importok)
-- list   | 10
-- ocr    | 5
```

---

## 🚀 Következő lépések

### Azonnal (ideiglenes megoldással):
1. ✅ Kód módosítva: `source: 'manual'`
2. ✅ Nincs TypeScript hiba
3. ✅ JSON import működik
4. ⚠️ Import és manuális nem különböztethetők meg

### Később (végleges megoldás):
1. Futtasd le a migration-t Supabase-ben
2. Állítsd vissza a kódot: `source: 'import'`
3. Commit + push + deploy
4. Tesztelj egy JSON importot
5. Ellenőrizd, hogy `source = 'import'` megjelenik az adatbázisban

---

## 📝 Megjegyzések

### Miért nem volt probléma eddig?

A `shopping_statistics` tábla source mezőjét korábban NEM használták a JSON import során. 

Az új logika (2025-10-07) bevezette ezt:
```typescript
source: 'import' // ← ÚJ funkció
```

De a migration (`20250107_001_add_list_source_type.sql`) csak a `'list'` értéket adta hozzá, az `'import'`-ot nem.

### Miért van 'import' a product_price_history-ban?

A `product_price_history` táblát egy KORÁBBI migration hozta létre (2025-10-05), amikor az `'import'` érték része volt a specifikációnak:

```sql
-- 20250105_001_create_product_price_history.sql
CHECK (source IN ('ocr', 'manual', 'import'))
```

De a `shopping_statistics` tábla KÉSŐBB lett létrehozva és nem vették figyelembe az `'import'`-ot.

---

## ✅ Státusz

- [x] Probléma azonosítva
- [x] Ideiglenes megoldás alkalmazva
- [x] Migration fájl létrehozva
- [ ] Migration futtatása Supabase-ben
- [ ] Kód visszaállítása `source: 'import'`-ra
- [ ] Production deployment

---

**Dátum**: 2025. október 7.  
**Fájlok**:
- `app/termekek/page.tsx` (módosítva)
- `supabase/migrations/20250107_002_add_import_source_type.sql` (létrehozva)
