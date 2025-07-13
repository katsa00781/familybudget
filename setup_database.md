# Adatbázis beállítás - Lépésről lépésre útmutató

## 🚀 Gyors beállítás

### 1. Supabase Dashboard megnyitása
1. Menj a [https://supabase.com/dashboard](https://supabase.com/dashboard) oldalra
2. Jelentkezz be és válaszd ki a projekted

### 2. SQL Editor megnyitása
1. Bal oldali menüben: **SQL Editor**
2. Kattints a **"New Query"** gombra

### 3. Migration fájlok futtatása

#### A) Bevásárlólista tábla (KÖTELEZŐ)

Másold be és futtasd le:

```sql
-- Migration: Create shopping_lists table
-- SHOPPING_LISTS TÁBLA LÉTREHOZÁSA
CREATE TABLE IF NOT EXISTS shopping_lists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Shopping list data
    name VARCHAR(255) NOT NULL DEFAULT 'Bevásárlólista',
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Shopping items as JSONB for flexibility
    items JSONB DEFAULT '[]'::jsonb,
    
    -- Total amount for quick queries and summaries
    total_amount INTEGER NOT NULL DEFAULT 0,
    
    -- Status
    completed BOOLEAN DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS engedélyezése
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;

-- Policy: felhasználók csak a saját bevásárlólistáikat látják és módosítják
CREATE POLICY "Users can manage their own shopping lists" 
ON shopping_lists 
FOR ALL 
USING (auth.uid() = user_id);

-- Indexek a gyorsabb lekérdezésekhez
CREATE INDEX IF NOT EXISTS idx_shopping_lists_user_id 
ON shopping_lists(user_id);

CREATE INDEX IF NOT EXISTS idx_shopping_lists_date 
ON shopping_lists(date DESC);

CREATE INDEX IF NOT EXISTS idx_shopping_lists_created_at 
ON shopping_lists(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_shopping_lists_completed 
ON shopping_lists(completed);

SELECT 'Shopping lists tábla sikeresen létrehozva!' as status;
```

#### B) Termékadatbázis tábla (KÖTELEZŐ)

Új Query-ben másold be és futtasd le:

```sql
-- Migration: Create products table
-- PRODUCTS TÁBLA LÉTREHOZÁSA
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Product basic info
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255),
    category VARCHAR(100) NOT NULL,
    
    -- Store and pricing info
    store_name VARCHAR(255),
    price INTEGER, -- Ár forintban
    unit VARCHAR(50) NOT NULL DEFAULT 'db',
    
    -- Barcode and identification
    barcode VARCHAR(50),
    sku VARCHAR(100),
    
    -- Additional info
    description TEXT,
    image_url TEXT,
    
    -- Availability
    available BOOLEAN DEFAULT TRUE,
    last_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS engedélyezése
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Policy: felhasználók csak a saját termékeiket látják és módosítják
CREATE POLICY "Users can manage their own products" 
ON products 
FOR ALL 
USING (auth.uid() = user_id);

-- Indexek a gyorsabb lekérdezésekhez
CREATE INDEX IF NOT EXISTS idx_products_user_id 
ON products(user_id);

CREATE INDEX IF NOT EXISTS idx_products_category 
ON products(category);

CREATE INDEX IF NOT EXISTS idx_products_barcode 
ON products(barcode) WHERE barcode IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_name 
ON products(name);

CREATE INDEX IF NOT EXISTS idx_products_created_at 
ON products(created_at DESC);

SELECT 'Products tábla sikeresen létrehozva!' as status;
```

### 4. Ellenőrzés

1. **Database > Tables** menüben látnod kell:
   - ✅ `shopping_lists`
   - ✅ `products`

2. **Teszt az alkalmazásban**:
   - Bevásárlólista oldal betöltése hiba nélkül
   - Termékek oldal betöltése hiba nélkül
   - Bevásárlólista mentése működik
   - Termék hozzáadása működik

## ❗ Hibaelhárítás

### "Tábla már létezik" hiba
Ha a táblák már léteznek, futtasd le először:
```sql
DROP TABLE IF EXISTS shopping_lists CASCADE;
DROP TABLE IF EXISTS products CASCADE;
```

### "RLS policy már létezik" hiba
```sql
DROP POLICY IF EXISTS "Users can manage their own shopping lists" ON shopping_lists;
DROP POLICY IF EXISTS "Users can manage their own products" ON products;
```

### "Nincs jogosultság" hiba
Győződj meg róla, hogy:
1. A megfelelő Supabase projektben vagy
2. Admin jogokkal rendelkezel
3. RLS (Row Level Security) engedélyezett

## 🎉 Kész!

Miután mindkét migration lefutott, az alkalmazás teljes funkcionalitással használható!

**Elérhető funkciók:**
- 🛒 Bevásárlólisták létrehozása és mentése
- 📦 Termékadatbázis kezelése
- 💡 Intelligens termék javaslatok
- 📱 Mobilra felkészített vonalkód támogatás
- 💰 Költségkövetés és árak nyilvántartása
