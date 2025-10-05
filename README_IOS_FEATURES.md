# Family Budget - iOS Features Implementation

Ez a projekt az iOS Family Budget alkalmazásból hiányzó funkciókat implementálja a webes verzióban.

## 🎯 Implementált funkciók

### 1. OCR Receipt Scanner (Nyugta beolvasó) 📸
**Fájlok:**
- `lib/receiptOCR.ts` - OCR feldolgozó logika
- `components/OCRReceiptScanner.tsx` - React komponens

**Funkciók:**
- OpenAI GPT-4 Vision API integráció
- Magyar terméknevek felismerése és kategorizálása
- Automatikus ár és mennyiség kinyerés
- Kép előnézet és szerkesztési lehetőség
- Mock adatok fallback API hiba esetén
- Termékek manuális hozzáadása és szerkesztése

### 2. Price History Tracking (Ár követés) 📈
**Fájlok:**
- `lib/priceHistory.ts` - Ár történet kezelő funkciók
- `components/PriceChangeAlert.tsx` - Árváltozás riasztások
- `supabase/migrations/20250105_001_create_product_price_history.sql` - Adatbázis séma

**Funkciók:**
- Termékek árváltozásainak automatikus követése
- Árstatisztikák számítása (min, max, átlag, trend)
- Személyes infláció számítás kategóriánként
- Árváltozási riasztások valós időben
- Üzletenkénti áröszehasonlítás

### 3. Shopping Statistics (Vásárlási statisztikák) 📊
**Fájlok:**
- `components/ShoppingStatisticsScreen.tsx` - Statisztikák képernyő
- `supabase/migrations/20250105_002_family_and_statistics.sql` - Bővített adatbázis séma

**Funkciók:**
- Havi vásárlási összesítők
- Kategóriák szerinti költés bontás
- Üzletek szerinti elemzés
- Költségvetés teljesítmény követés
- Havi trendek és összehasonlítások
- Személyes inflációs adatok megjelenítése

### 4. Family Management (Család kezelés) 👨‍👩‍👧‍👦
**Fájlok:**
- `components/FamilyManagement.tsx` - Család kezelő komponens
- `supabase/migrations/20250105_002_family_and_statistics.sql` - Family members tábla

**Funkciók:**
- Családtagok meghívása email címmel
- Szerepkörök kezelése (admin, member, viewer)
- Jogosultságok beállítása
- Családtagok profiljának szerkesztése
- Státusz követés (aktív, meghívva, inaktív)

## 🗃️ Adatbázis séma

### Product Price History
```sql
product_price_history (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  product_name TEXT NOT NULL,
  product_category TEXT,
  store_name TEXT,
  unit_price DECIMAL(10,2),
  price_date DATE,
  source TEXT (ocr, manual, import)
)
```

### Family Members
```sql
family_members (
  id UUID PRIMARY KEY,
  family_id UUID,
  user_id UUID REFERENCES auth.users,
  role TEXT (admin, member, viewer),
  status TEXT (active, invited, inactive)
)
```

### Shopping Statistics
```sql
shopping_statistics (
  id UUID PRIMARY KEY,
  user_id UUID,
  period TEXT, -- YYYY-MM
  total_amount DECIMAL(12,2),
  total_items INTEGER,
  shopping_frequency INTEGER
)
```

## 🚀 Telepítés és konfiguráció

### 1. Migrációk futtatása
```bash
# Supabase Dashboard -> Database -> SQL Editor-ban:
```
Futtasd le a két migrációs fájlt:
- `supabase/migrations/20250105_001_create_product_price_history.sql`
- `supabase/migrations/20250105_002_family_and_statistics.sql`

### 2. Környezeti változók
```env
NEXT_PUBLIC_OPENAI_API_KEY=sk-xxx...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Függőségek telepítése
```bash
npm install lucide-react @supabase/supabase-js
```

## 🧪 Teszt és demó

### Demó oldal elérése:
```
http://localhost:3000/features-demo
```

A demó oldal tartalmazza:
- ✅ OCR Receipt Scanner tesztelő felület
- ✅ Price Change Alert komponens
- ✅ Shopping Statistics megjelenítő
- ✅ Family Management felület

### Mock adatok
Az alkalmazás mock adatokkal is működik, ha nincs beállítva az OpenAI API kulcs.

## 📱 iOS App párhuzam

Az implementált funkciók 1:1 megfelelnek az iOS alkalmazás funkcióinak:

| iOS Feature | Web Implementation | Status |
|-------------|-------------------|---------|
| Receipt OCR Scanner | `OCRReceiptScanner.tsx` | ✅ Complete |
| Price History | `priceHistory.ts` | ✅ Complete |
| Price Alerts | `PriceChangeAlert.tsx` | ✅ Complete |
| Shopping Stats | `ShoppingStatisticsScreen.tsx` | ✅ Complete |
| Family Management | `FamilyManagement.tsx` | ✅ Complete |

## 🔧 API Integráció

### OpenAI GPT-4 Vision
```typescript
// lib/receiptOCR.ts
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'gpt-4-vision-preview',
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: promptText },
        { type: 'image_url', image_url: { url: base64Image } }
      ]
    }],
    max_tokens: 1000
  })
});
```

### Supabase integráció
```typescript
// Példa price history mentés
const { data, error } = await supabase
  .from('product_price_history')
  .insert({
    user_id: userId,
    product_name: productName,
    unit_price: price,
    source: 'ocr'
  });
```

## 🔐 Biztonság és jogosultságok

### Row Level Security (RLS)
Minden tábla RLS-sel védett:
```sql
-- product_price_history
CREATE POLICY "Users can only access their own price history" 
ON product_price_history FOR ALL 
USING (auth.uid() = user_id);

-- family_members
CREATE POLICY "Users can only access their family members" 
ON family_members FOR ALL 
USING (auth.uid() = user_id OR family_id IN (
  SELECT family_id FROM family_members WHERE user_id = auth.uid()
));
```

## 📋 TODO és következő lépések

### Rövid távú:
- [ ] Next.js Image komponens használata `<img>` helyett
- [ ] Email küldés implementálása család meghívásoknál
- [ ] Offline OCR támogatás (Tesseract.js)
- [ ] Push notification árváltozásokról

### Hosszú távú:
- [ ] AI-alapú költségvetés ajánlások
- [ ] Shared shopping lists real-time sync
- [ ] Advanced analytics dashboard
- [ ] Export funkcionalitás (PDF, Excel)

## 🐛 Ismert problémák

1. **OCR pontosság**: A GPT-4 Vision API sometimes nem ismeri fel pontosan a magyar termékneveket
2. **Performance**: Nagy képek feltöltése lassú lehet
3. **Költségek**: OpenAI API használat költséges lehet nagy volumen mellett

## 🤝 Hozzájárulás

A kód teljes mértékben kompatibilis a meglévő Next.js alkalmazással és könnyen integrálható.

### Integráció lépései:
1. Másold be a komponenseket a `/components` mappába
2. Add hozzá a type definíciókat a `/types` mappához
3. Futtasd le a migrációkat Supabase-ben
4. Állítsd be a környezeti változókat
5. Importáld és használd a komponenseket

```tsx
// Példa integráció
import OCRReceiptScanner from '@/components/OCRReceiptScanner';
import PriceChangeAlert from '@/components/PriceChangeAlert';

function ShoppingPage() {
  return (
    <div>
      <OCRReceiptScanner userId={user.id} />
      <PriceChangeAlert userId={user.id} />
    </div>
  );
}
```

---

**Fejlesztő megjegyzések:**
- Minden komponens TypeScript-tel íródott és teljesen type-safe
- Responsive design, mobile-first megközelítés
- Accessibility (a11y) megfontolások beépítve
- Error handling és loading states minden komponensben
- Mock adatok fejlesztési és tesztelési célokra