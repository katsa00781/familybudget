-- Product Price History table for tracking price changes over time
CREATE TABLE IF NOT EXISTS product_price_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_category TEXT,
  store_name TEXT,
  unit TEXT DEFAULT 'db',
  unit_price DECIMAL(10,2) NOT NULL,
  quantity DECIMAL(10,3) DEFAULT 1,
  total_price DECIMAL(10,2) NOT NULL,
  price_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source TEXT CHECK (source IN ('ocr', 'manual', 'import')) DEFAULT 'manual',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_product_price_history_user_id ON product_price_history(user_id);
CREATE INDEX IF NOT EXISTS idx_product_price_history_product_name ON product_price_history(product_name);
CREATE INDEX IF NOT EXISTS idx_product_price_history_price_date ON product_price_history(price_date DESC);
CREATE INDEX IF NOT EXISTS idx_product_price_history_user_product ON product_price_history(user_id, product_name);

-- Enable RLS
ALTER TABLE product_price_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own price history" ON product_price_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own price history" ON product_price_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own price history" ON product_price_history
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own price history" ON product_price_history
    FOR DELETE USING (auth.uid() = user_id);