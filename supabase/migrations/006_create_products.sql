-- Migration: Create products table
-- Futtasd ezt le a Supabase SQL Editor-ban

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
    unit VARCHAR(50) NOT NULL DEFAULT 'db', -- egység: db, kg, g, l, ml, stb.
    
    -- Barcode and identification
    barcode VARCHAR(50), -- EAN13, UPC, stb.
    sku VARCHAR(100), -- Termék kód
    
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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage their own products" ON products;

-- Policy: felhasználók csak a saját termékeiket látják és módosítják
CREATE POLICY "Users can manage their own products" 
ON products 
FOR ALL 
USING (auth.uid() = user_id);

-- Indexek a gyorsabb lekérdezésekhez
CREATE INDEX IF NOT EXISTS idx_products_user_id 
ON products(user_id);

CREATE INDEX IF NOT EXISTS idx_products_name 
ON products(name);

CREATE INDEX IF NOT EXISTS idx_products_category 
ON products(category);

CREATE INDEX IF NOT EXISTS idx_products_store_name 
ON products(store_name);

CREATE INDEX IF NOT EXISTS idx_products_barcode 
ON products(barcode) WHERE barcode IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_products_available 
ON products(available);

-- Trigger az updated_at mezőhöz
DROP TRIGGER IF EXISTS update_products_updated_at ON products;
CREATE TRIGGER update_products_updated_at 
    BEFORE UPDATE ON products 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Sample data insert (optional - comment out if not needed)
-- INSERT INTO products (user_id, name, brand, category, store_name, price, unit, barcode) 
-- VALUES 
--     (auth.uid(), 'Tej 2,8%', 'Parmalat', 'Tejtermékek', 'Tesco', 400, 'l', '1234567890123'),
--     (auth.uid(), 'Kenyér', 'Bakers', 'Pékáruk', 'Spar', 650, 'db', '2345678901234'),
--     (auth.uid(), 'Zsemle', 'Bakers', 'Pékáruk', 'Auchan', 420, 'db', '3456789012345');

SELECT 'Products tábla és related objektumok sikeresen létrehozva!' as status;
