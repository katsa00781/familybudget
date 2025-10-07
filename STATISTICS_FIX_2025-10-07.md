# Statisztikai Adatmentés Javítása - 2025.10.07

## 🎯 Probléma
A JSON import ugyan deduplikálta a termékeket a `products` táblában, de a manuális termékfelvitel és a bevásárlólista mentése **NEM** mentette el az adatokat a statisztikai táblákba (`product_price_history` és `shopping_statistics`).

Ez azt jelentette, hogy:
- ❌ Inflációs statisztikák hiányosak voltak
- ❌ Bevásárlási statisztikák hiányosak voltak
- ❌ Árfigyelés nem működött megfelelően

## ✅ Megoldás

### 1. Manuális Termékfelvitel (`app/termekek/page.tsx`)

**Módosítva:** `addProduct` függvény (210-260. sor)

**Új funkcionalitás:**
- ✅ Ha a terméknek van ára, automatikusan menti a `product_price_history` táblába
- ✅ Ha a terméknek van ára, automatikusan menti a `shopping_statistics` táblába
- ✅ `source: 'manual'` jelöléssel

**Kód:**
```typescript
if (insertedProduct && insertedProduct.price && insertedProduct.price > 0) {
  // 1. Price history mentése (árfigyeléshez és inflációhoz)
  await savePriceHistory(currentUser.id, insertedProduct.name, insertedProduct.price, {
    productId: insertedProduct.id,
    productCategory: insertedProduct.category,
    storeName: insertedProduct.store_name,
    unit: insertedProduct.unit,
    source: 'manual',
    priceDate: currentDate
  })

  // 2. Shopping statistics mentése (bevásárlási statisztikákhoz)
  await supabase.from('shopping_statistics').insert([shoppingStatData])
}
```

### 2. Bevásárlólista Mentés (`app/bevasarlas/page.tsx`)

**Módosítva:** `saveList` függvény (343-480. sor)

**Új funkcionalitás:**
- ✅ Lista mentésekor az áras tételek automatikusan mentve a `shopping_statistics` táblába
- ✅ Lista mentésekor az áras tételek automatikusan mentve a `product_price_history` táblába
- ✅ `source: 'list'` jelöléssel
- ✅ 50+ sor új kód a statisztikák mentésére

**Kód:**
```typescript
// Csak az áras tételeket mentjük
const itemsWithPrice = currentItems.filter(item => item.price && item.price > 0)

if (itemsWithPrice.length > 0) {
  // 1. Shopping statistics mentése
  const shoppingStatsData = itemsWithPrice.map(item => ({
    user_id: currentUser.id,
    shopping_date: selectedDate,
    product_name: item.name,
    product_category: item.category,
    quantity: item.quantity,
    unit: item.unit,
    unit_price: item.price,
    total_price: item.price * item.quantity,
    source: 'list'
  }))
  await supabase.from('shopping_statistics').insert(shoppingStatsData)

  // 2. Price history mentése
  const priceHistoryPromises = itemsWithPrice.map(item => 
    savePriceHistory(currentUser.id, item.name, item.price!, {...})
  )
  await Promise.allSettled(priceHistoryPromises)
}
```

### 3. Típusok Frissítése

**Módosított fájlok:**
- `types/enhanced.ts` - `ProductPriceHistory` és `ShoppingStatistic` interfészek
- `lib/priceHistory.ts` - `savePriceHistory` függvény options paraméter

**Új source típus:**
```typescript
source: 'ocr' | 'manual' | 'import' | 'list'
```

### 4. Adatbázis Migráció

**Új fájl:** `supabase/migrations/20250107_001_add_list_source_type.sql`

**Mit csinál:**
- Eltávolítja a régi CHECK constraint-eket
- Hozzáadja az új CHECK constraint-eket 'list' támogatással
- Biztonságos módszer, nem érinti a meglévő adatokat

**Futtatás:**
```sql
-- A Supabase SQL Editor-ban:
-- 1. Nyisd meg a 20250107_001_add_list_source_type.sql fájlt
-- 2. Másold ki a tartalmat
-- 3. Futtasd le a Supabase SQL Editor-ban
```

## 📊 Eredmény

### Adatmentési mátrix:

| Funkció | products deduplikáció | price_history mentés | shopping_statistics mentés |
|---------|----------------------|---------------------|---------------------------|
| **JSON Import** | ✅ Szűrve | ✅ MINDEN tétel | ✅ MINDEN tétel |
| **Manuális termék** | N/A | ✅ **ÚJ!** Ha van ár | ✅ **ÚJ!** Ha van ár |
| **Bevásárlólista** | N/A | ✅ **ÚJ!** Áras tételek | ✅ **ÚJ!** Áras tételek |
| **OCR Scanner** | N/A | ✅ Mentve | ❌ Inaktív (web) |

### Statisztikák most már teljesek:

- ✅ **Inflációs statisztikák**: Minden áradat mentve `product_price_history`-ba
- ✅ **Bevásárlási statisztikák**: Minden vásárlás mentve `shopping_statistics`-ba
- ✅ **Árfigyelés**: Minden termék árváltozása követhető
- ✅ **Forrás megjelölés**: 'manual', 'list', 'import', 'ocr' szerint szűrhető

## 🚀 Telepítés

### 1. Adatbázis migráció futtatása:
```bash
# Supabase SQL Editor-ban futtasd le:
supabase/migrations/20250107_001_add_list_source_type.sql
```

### 2. Alkalmazás újraindítása:
```bash
npm run dev
```

### 3. Tesztelés:

**Manuális termék hozzáadás:**
1. Menj a Termékek oldalra
2. Add hozzá egy új terméket ÁRRAL
3. Nézd meg a konzolt: "✅ Termék és statisztikák sikeresen mentve!"

**Bevásárlólista mentés:**
1. Menj a Bevásárlás oldalra
2. Hozz létre egy listát ÁRAS tételekkel
3. Mentsd el a listát
4. Nézd meg a konzolt: "📊 X áras tétel mentése shopping_statistics-ba..."
5. Ellenőrizd: "✅ Shopping statistics sikeresen mentve!"

### 4. Ellenőrzés Supabase-ben:
```sql
-- Nézd meg a shopping_statistics tábla source értékeit:
SELECT DISTINCT source FROM shopping_statistics;
-- Eredmény: 'manual', 'list', 'import', 'ocr'

-- Nézd meg a legfrissebb bevásárlási statisztikákat:
SELECT * FROM shopping_statistics 
WHERE source = 'list' 
ORDER BY created_at DESC 
LIMIT 10;
```

## 🔍 Debug logok

**Konzolban megjelenő üzenetek:**

Manuális termék:
```
✅ Termék és statisztikák sikeresen mentve!
```

Bevásárlólista:
```
📊 3 áras tétel mentése shopping_statistics-ba...
✅ Shopping statistics sikeresen mentve!
✅ Price history sikeresen mentve!
```

## 📝 Megjegyzések

- A deduplikáció továbbra is csak a `products` táblában működik (vonalkód + név+márka alapján)
- A statisztikai táblákban (`product_price_history`, `shopping_statistics`) **MINDEN** tétel mentve van, nincs deduplikáció
- Ez helyes, mert ezek a táblák történeti adatokat tárolnak (minden vásárlás, minden ár változás)
- Az OCR funkció jelenleg inaktív webes környezetben (nincs kamera hozzáférés)

## ✅ Tesztelési checklist

- [ ] SQL migráció lefuttatva Supabase-ben
- [ ] Alkalmazás újraindítva
- [ ] Manuális termék hozzáadás tesztelve
- [ ] Bevásárlólista mentés tesztelve
- [ ] Konzol logok ellenőrizve
- [ ] Supabase táblák ellenőrizve
- [ ] Statisztikák működnek (infláció, bevásárlás)
