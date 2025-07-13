-- Migration: Create shopping_lists table
-- Futtasd ezt le a Supabase SQL Editor-ban

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

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage their own shopping lists" ON shopping_lists;

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

-- Trigger az updated_at mezőhöz
DROP TRIGGER IF EXISTS update_shopping_lists_updated_at ON shopping_lists;
CREATE TRIGGER update_shopping_lists_updated_at 
    BEFORE UPDATE ON shopping_lists 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Sample data insert (optional - comment out if not needed)
-- INSERT INTO shopping_lists (user_id, name, date, items, total_amount) 
-- VALUES (
--     auth.uid(),
--     'Heti nagybevásárlás',
--     CURRENT_DATE,
--     '[{"id":"1","name":"Tej 2,8%","quantity":1,"unit":"l","category":"Tejtermékek","checked":false,"price":400}]'::jsonb,
--     400
-- );

SELECT 'Shopping lists tábla és related objektumok sikeresen létrehozva!' as status;
