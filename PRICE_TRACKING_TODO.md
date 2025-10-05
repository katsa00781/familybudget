# 📊 Árfigyelés és Infláció Követés

## ✅ Amit megvalósítottunk:

### 1. **Adatbázis Struktúra**
✅ `product_price_history` tábla létrehozva
- Migráció: `supabase/migrations/20250105_001_create_product_price_history.sql`
- Minden áradat mentve: termék, bolt, dátum, mennyiség, forrás (OCR/manual/import)

### 2. **Helper Functions**
✅ `lib/priceHistory.ts` - Teljes árfigyelési API
- `savePriceHistory()` - Ár mentése
- `getProductPriceHistory()` - Termék árelőzményei
- `getPriceChanges()` - Árváltozások kimutatása
- `getPriceStatistics()` - Árstatisztikák (átlag, min, max)
- `getInflationData()` - Személyes inflációs adatok
- `getLatestPrice()` - Legutóbbi ár lekérése

### 3. **Automatikus Ár Mentés**
✅ JSON import során automatikusan menti az árakat
```typescript
// app/termekek/page.tsx importFromJson()
// Minden importált termék ára automatikusan bekerül a price_history-ba
```

---

## 🎯 Amit még hiányzik - UI fejlesztések:

### 1. **Árstatisztikák Megjelenítése**
```
Termékek oldal bővítése:
- [ ] Termék kártya: árváltozás badge (+5%, -3%)
- [ ] Árelőzmények gomb
- [ ] Árgrafikon modal (Chart.js/Recharts)
```

### 2. **Árfigyelés Oldal (ÚJ)**
```
/arfigyeles útvonal létrehozása:
- [ ] Termékek listája árváltozásokkal
- [ ] Szűrés: növekvő/csökkenő árak
- [ ] Időszak választó (7/30/90 nap)
- [ ] Árriasztások beállítása
```

### 3. **Infláció Dashboard (ÚJ)**
```
/inflacio útvonal létrehozása:
- [ ] Személyes inflációs ráta
- [ ] Kategóriánkénti bontás
- [ ] Havi összehasonlítás
- [ ] Grafikonok (vonaldiagram, kördiagram)
```

### 4. **Termék Részletek Oldal Bővítése**
```
Termék kártya kattintásra:
- [ ] Teljes árelőzmények
- [ ] Árgrafikon (idővonal)
- [ ] Bolt összehasonlítás
- [ ] Átlagár, legolcsóbb, legdrágább
```

---

## 📱 Gyors Megvalósítás - Minimális UI:

### Prioritás 1: Árváltozás Badge (Termékek oldalon)
```tsx
// app/termekek/page.tsx
<Badge className={priceChange > 0 ? 'bg-red-500' : 'bg-green-500'}>
  {priceChange > 0 ? '↑' : '↓'} {Math.abs(priceChange)}%
</Badge>
```

### Prioritás 2: Árelőzmények Modal
```tsx
// Termék kártya bővítése
<Button onClick={() => showPriceHistory(product.name)}>
  📈 Árelőzmények
</Button>

// Modal tartalma
<Dialog>
  - Táblázat: Dátum, Bolt, Ár
  - Egyszerű vonaldiagram
</Dialog>
```

### Prioritás 3: Árfigyelés Oldal
```tsx
// app/arfigyeles/page.tsx
<Card>
  <h2>Legnagyobb árváltozások (30 nap)</h2>
  - Termék név
  - Régi ár → Új ár
  - Változás %
  - Dátum
</Card>
```

---

## 🚀 Implementációs Terv:

### 1. Lépés: Készítsünk Árstatisztika Komponenst
```bash
# Új komponens
src/components/PriceHistory.tsx
  - Árelőzmények táblázat
  - Egyszerű grafikon (opcional)
```

### 2. Lépés: Termékek oldal bővítése
```tsx
// app/termekek/page.tsx módosítás
1. Árváltozás badge hozzáadása
2. "Árelőzmények" gomb hozzáadása
3. Modal megjelenítése
```

### 3. Lépés: Új Árfigyelés oldal
```bash
# Új oldal
app/arfigyeles/page.tsx
  - getPriceChanges() használata
  - Termékek listája árváltozással
  - Szűrés és rendezés
```

### 4. Lépés: Infláció Dashboard
```bash
# Új oldal
app/inflacio/page.tsx
  - getInflationData() használata
  - Havi összehasonlítás
  - Kategóriánkénti bontás
```

---

## 💡 Következő Lépések (Te döntöd):

**Opció A: Minimális UI először**
1. Termékek oldal: árváltozás badge
2. Termékek oldal: árelőzmények modal
3. Készen van!

**Opció B: Teljes Árfigyelés**
1. Új /arfigyeles oldal
2. Árváltozások listája
3. Szűrés és keresés

**Opció C: Teljes Infláció Követés**
1. Új /inflacio oldal
2. Személyes inflációs ráta
3. Grafikonok

**Melyiket szeretnéd megvalósítani először?** 🤔

