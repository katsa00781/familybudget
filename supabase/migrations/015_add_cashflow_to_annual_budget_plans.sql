-- Migration: Add cashflow fields to annual_budget_plans
-- Az éves költségvetést éves cashflow nézetté bővíti:
--   nyitó egyenleg, havi általános kiadások, cél év végi egyenleg.

-- Év nyitó egyenleg (induló pénzállomány az év elején)
ALTER TABLE annual_budget_plans
    ADD COLUMN IF NOT EXISTS opening_balance INTEGER NOT NULL DEFAULT 0;

-- Havi általános kiadások (megélhetési költség / havi költségvetés)
-- Formátum: [{"month": 1, "amount": 250000}, {"month": 2, "amount": 250000}, ...]
ALTER TABLE annual_budget_plans
    ADD COLUMN IF NOT EXISTS monthly_budgeted_expenses JSONB NOT NULL DEFAULT '[]'::jsonb;

-- Cél év végi egyenleg (egyensúly = 0; pozitív = tervezett többlet)
ALTER TABLE annual_budget_plans
    ADD COLUMN IF NOT EXISTS target_end_balance INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN annual_budget_plans.opening_balance IS 'Év nyitó egyenleg (induló pénzállomány)';
COMMENT ON COLUMN annual_budget_plans.monthly_budgeted_expenses IS 'Havi általános kiadások tömbje 12 hónapra (megélhetési költség)';
COMMENT ON COLUMN annual_budget_plans.target_end_balance IS 'Cél év végi egyenleg (egyensúly = 0)';

SELECT 'Annual budget plans cashflow mezők sikeresen hozzáadva!' as status;
