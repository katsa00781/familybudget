-- Migration: Create income_plans table
-- Futtasd ezt le a Supabase SQL Editor-ban

-- INCOME_PLANS TÁBLA LÉTREHOZÁSA
CREATE TABLE IF NOT EXISTS income_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Income data
    name VARCHAR(255) NOT NULL DEFAULT 'Bevételi terv',
    description TEXT,
    monthly_income INTEGER NOT NULL DEFAULT 0,
    
    -- Additional income items as JSONB for flexibility
    additional_incomes JSONB DEFAULT '[]'::jsonb,
    
    -- Total calculated income (monthly_income + sum of additional incomes)
    total_income INTEGER NOT NULL DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS engedélyezése
ALTER TABLE income_plans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage their own income plans" ON income_plans;

-- Policy: felhasználók csak a saját bevételi terveiket látják és módosítják
CREATE POLICY "Users can manage their own income plans" 
ON income_plans 
FOR ALL 
USING (auth.uid() = user_id);

-- Indexek a gyorsabb lekérdezésekhez
CREATE INDEX IF NOT EXISTS idx_income_plans_user_id 
ON income_plans(user_id);

CREATE INDEX IF NOT EXISTS idx_income_plans_created_at 
ON income_plans(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_income_plans_total_income 
ON income_plans(total_income);

-- Trigger az updated_at mezőhöz
DROP TRIGGER IF EXISTS update_income_plans_updated_at ON income_plans;
CREATE TRIGGER update_income_plans_updated_at 
    BEFORE UPDATE ON income_plans 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Sample data insert (optional - comment out if not needed)
-- INSERT INTO income_plans (user_id, name, monthly_income, total_income) 
-- VALUES (
--     auth.uid(),
--     'Alapbevétel 2025',
--     350000,
--     350000
-- );

SELECT 'Income plans tábla és related objektumok sikeresen létrehozva!' as status;
