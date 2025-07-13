-- BUDGET_PLANS TÁBLA LÉTREHOZÁSA
-- Futtasd ezt le a Supabase SQL Editor-ban

CREATE TABLE IF NOT EXISTS budget_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    budget_data JSONB NOT NULL,
    total_amount INTEGER NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS engedélyezése
ALTER TABLE budget_plans ENABLE ROW LEVEL SECURITY;

-- Policy: felhasználók csak a saját költségvetéseiket látják
CREATE POLICY "Users can manage their own budget plans" 
ON budget_plans 
FOR ALL 
USING (auth.uid() = user_id);

-- Index a gyorsabb lekérdezésekhez
CREATE INDEX IF NOT EXISTS idx_budget_plans_user_id 
ON budget_plans(user_id);

CREATE INDEX IF NOT EXISTS idx_budget_plans_created_at 
ON budget_plans(created_at DESC);

-- Trigger az updated_at mezőhöz
CREATE TRIGGER update_budget_plans_updated_at 
    BEFORE UPDATE ON budget_plans 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

SELECT 'Budget plans tábla sikeresen létrehozva!' as status;
