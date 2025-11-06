-- Migration: Add actual_income column to budget_plans table
-- Adds support for tracking actual income vs planned income

-- Add the actual_income column to budget_plans table
ALTER TABLE budget_plans 
ADD COLUMN IF NOT EXISTS actual_income INTEGER DEFAULT NULL;

-- Add a comment to document the column
COMMENT ON COLUMN budget_plans.actual_income IS 'Tényleges bevétel összege forintban. NULL ha még nincs megadva.';

-- Create index for better query performance when filtering by actual_income
CREATE INDEX IF NOT EXISTS idx_budget_plans_actual_income 
ON budget_plans(actual_income) 
WHERE actual_income IS NOT NULL;