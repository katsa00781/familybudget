-- Migration: Add additional_incomes column to salary_calculations table
-- Futtasd ezt le a Supabase SQL Editor-ban

-- Add additional_incomes column to store extra income sources from the calculator
ALTER TABLE salary_calculations 
ADD COLUMN IF NOT EXISTS additional_incomes JSONB DEFAULT '[]'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN salary_calculations.additional_incomes IS 'Array of additional income sources from the salary calculator (name, amount, description)';

SELECT 'additional_incomes mező sikeresen hozzáadva a salary_calculations táblához!' as status;
