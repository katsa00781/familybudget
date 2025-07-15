-- Migration: Shopping Lists System
-- Bevásárlólisták és kapcsolódó táblák létrehozása

-- 1. Bevásárlólisták tábla
CREATE TABLE IF NOT EXISTS shopping_lists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    date DATE NOT NULL DEFAULT CURRENT_DATE,
    items JSONB NOT NULL DEFAULT '[]'::jsonb,
    total_amount NUMERIC(10,2) DEFAULT 0,
    completed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Vásárlási tranzakciók tábla (elkészült listák tárolására)
CREATE TABLE IF NOT EXISTS shopping_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    shopping_list_id UUID REFERENCES shopping_lists(id) ON DELETE CASCADE,
    item_name TEXT NOT NULL,
    category TEXT NOT NULL,
    quantity NUMERIC(10,2) NOT NULL,
    unit TEXT NOT NULL,
    price NUMERIC(10,2) NOT NULL,
    total_amount NUMERIC(10,2) NOT NULL,
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    month_year TEXT NOT NULL, -- YYYY-MM formátum a könnyű csoportosításhoz
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Termékek tábla (termékadatbázis)
CREATE TABLE IF NOT EXISTS products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    brand TEXT,
    category TEXT NOT NULL,
    store_name TEXT,
    price NUMERIC(10,2),
    unit TEXT NOT NULL,
    barcode TEXT,
    last_price NUMERIC(10,2),
    price_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexek a gyorsabb lekérdezésekhez
CREATE INDEX IF NOT EXISTS idx_shopping_lists_user_id ON shopping_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_lists_date ON shopping_lists(date);
CREATE INDEX IF NOT EXISTS idx_shopping_transactions_user_id ON shopping_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_shopping_transactions_month_year ON shopping_transactions(month_year);
CREATE INDEX IF NOT EXISTS idx_products_user_id ON products(user_id);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);

-- Trigger a shopping_lists tábla updated_at mezőjének frissítéséhez
CREATE OR REPLACE FUNCTION update_shopping_lists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER shopping_lists_updated_at
    BEFORE UPDATE ON shopping_lists
    FOR EACH ROW
    EXECUTE FUNCTION update_shopping_lists_updated_at();

-- Trigger a products tábla updated_at mezőjének frissítéséhez
CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW
    EXECUTE FUNCTION update_products_updated_at();

-- RLS (Row Level Security) beállítások
ALTER TABLE shopping_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- RLS Policy-k
CREATE POLICY "Users can manage their own shopping lists" ON shopping_lists
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own shopping transactions" ON shopping_transactions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own products" ON products
    FOR ALL USING (auth.uid() = user_id);

-- Néhány alapértelmezett kategória és termék beszúrása (opcionális)
INSERT INTO products (user_id, name, category, unit, price) VALUES
    ((SELECT id FROM auth.users LIMIT 1), 'Kenyér', 'Pékáruk', 'db', 450),
    ((SELECT id FROM auth.users LIMIT 1), 'Tej', 'Tejtermékek', 'liter', 350),
    ((SELECT id FROM auth.users LIMIT 1), 'Tojás', 'Tejtermékek', 'doboz', 650),
    ((SELECT id FROM auth.users LIMIT 1), 'Alma', 'Gyümölcsök', 'kg', 400),
    ((SELECT id FROM auth.users LIMIT 1), 'Banán', 'Gyümölcsök', 'kg', 500)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE shopping_lists IS 'Bevásárlólisták tárolása';
COMMENT ON TABLE shopping_transactions IS 'Elkészült vásárlások tárolása statisztikákhoz';
COMMENT ON TABLE products IS 'Termékadatbázis árváltozás követéssel';
