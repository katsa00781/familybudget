-- Migration: Create annual_budget_plans table
-- Éves költségvetés tervezés támogatása

-- ANNUAL_BUDGET_PLANS TÁBLA LÉTREHOZÁSA
CREATE TABLE IF NOT EXISTS annual_budget_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Éves terv alapadatok
    name VARCHAR(255) NOT NULL DEFAULT 'Éves költségvetés',
    description TEXT,
    year INTEGER NOT NULL, -- Melyik évre vonatkozik (pl. 2025)
    
    -- Havi bevételek tervezése (12 hónap)
    -- Formátum: [{"month": 1, "amount": 500000}, {"month": 2, "amount": 550000}, ...]
    monthly_incomes JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Nagyobb éves kiadások
    -- Formátum: [{"id": "...", "name": "Új autó", "amount": 5000000, "targetMonth": 6, "category": "Jármű", "monthlyAllocation": 416666}]
    annual_expenses JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Fix évente ismétlődő kiadások
    -- Formátum: [{"id": "...", "name": "Biztosítás", "amount": 120000, "month": 3, "category": "Pénzügyi kiadások", "addToMonthlyBudget": true}]
    recurring_expenses JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Havi megtakarítási ütemterv (generált a nagyobb kiadások alapján)
    -- Formátum: [{"month": 1, "amount": 50000, "allocatedTo": [{"expenseId": "...", "amount": 25000}]}]
    monthly_savings_plan JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Összesítések
    total_annual_income INTEGER NOT NULL DEFAULT 0,
    total_annual_expenses INTEGER NOT NULL DEFAULT 0,
    total_recurring_expenses INTEGER NOT NULL DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS engedélyezése
ALTER TABLE annual_budget_plans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can manage their own annual budget plans" ON annual_budget_plans;

-- Policy: felhasználók csak a saját éves költségvetéseiket látják és módosítják
CREATE POLICY "Users can manage their own annual budget plans" 
ON annual_budget_plans 
FOR ALL 
USING (auth.uid() = user_id);

-- Indexek a gyorsabb lekérdezésekhez
CREATE INDEX IF NOT EXISTS idx_annual_budget_plans_user_id 
ON annual_budget_plans(user_id);

CREATE INDEX IF NOT EXISTS idx_annual_budget_plans_year 
ON annual_budget_plans(year DESC);

CREATE INDEX IF NOT EXISTS idx_annual_budget_plans_created_at 
ON annual_budget_plans(created_at DESC);

-- Trigger az updated_at mezőhöz
DROP TRIGGER IF EXISTS update_annual_budget_plans_updated_at ON annual_budget_plans;
CREATE TRIGGER update_annual_budget_plans_updated_at 
    BEFORE UPDATE ON annual_budget_plans 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Megjegyzések
COMMENT ON TABLE annual_budget_plans IS 'Éves költségvetési tervek havi bevételekkel, nagyobb kiadásokkal és ismétlődő tételekkel';
COMMENT ON COLUMN annual_budget_plans.monthly_incomes IS 'Havi bevételek tömbje 12 hónapra';
COMMENT ON COLUMN annual_budget_plans.annual_expenses IS 'Nagyobb éves kiadások listája célhónappal és havi megtakarítási ütemezéssel';
COMMENT ON COLUMN annual_budget_plans.recurring_expenses IS 'Évente ismétlődő fix kiadások (pl. biztosítás, adó)';
COMMENT ON COLUMN annual_budget_plans.monthly_savings_plan IS 'Automatikusan generált havi megtakarítási terv a nagy kiadásokhoz';

SELECT 'Annual budget plans tábla sikeresen létrehozva!' as status;
