-- database: :memory:
-- Migration: Create budget_plans table
-- Futtasd ezt le a Supabase SQL Editor-ban

-- First, create the updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- BUDGET_PLANS TÁBLA LÉTREHOZÁSA
CREATE TABLE IF NOT EXISTS budget_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Budget data as JSONB for flexibility
    budget_data JSONB NOT NULL,
    
    -- Total amount for quick queries and summaries
    total_amount INTEGER NOT NULL DEFAULT 0,
    
    -- Metadata
    name VARCHAR(255) DEFAULT 'Költségvetés',
    description TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS engedélyezése
ALTER TABLE budget_plans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage their own budget plans" ON budget_plans;

-- Policy: felhasználók csak a saját költségvetéseiket látják és módosítják
CREATE POLICY "Users can manage their own budget plans" 
ON budget_plans 
FOR ALL 
USING (auth.uid() = user_id);

-- Indexek a gyorsabb lekérdezésekhez
CREATE INDEX IF NOT EXISTS idx_budget_plans_user_id 
ON budget_plans(user_id);

CREATE INDEX IF NOT EXISTS idx_budget_plans_created_at 
ON budget_plans(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_budget_plans_total_amount 
ON budget_plans(total_amount);

-- Trigger az updated_at mezőhöz
DROP TRIGGER IF EXISTS update_budget_plans_updated_at ON budget_plans;
CREATE TRIGGER update_budget_plans_updated_at 
    BEFORE UPDATE ON budget_plans 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Sample data insert (optional - comment out if not needed)
-- INSERT INTO budget_plans (user_id, budget_data, total_amount, name) 
-- VALUES (
--     auth.uid(),
--     '[{"id":"1","category":"Teszt","type":"Szükséglet","subcategory":"Példa tétel","amount":50000}]'::jsonb,
--     50000,
--     'Teszt Költségvetés'
-- );

SELECT 'Budget plans tábla és related objektumok sikeresen létrehozva!' as status;
