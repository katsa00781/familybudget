-- Manual SQL commands to add missing columns to salary_calculations table
-- Run these in your Supabase SQL editor

-- Add name column
ALTER TABLE salary_calculations ADD COLUMN name TEXT;

-- Add munkarend_napok column  
ALTER TABLE salary_calculations ADD COLUMN munkarend_napok DECIMAL(5,2) DEFAULT 20.0;

-- Add comments
COMMENT ON COLUMN salary_calculations.name IS 'Name/description of the salary calculation for easy identification';
COMMENT ON COLUMN salary_calculations.munkarend_napok IS 'Number of working days according to work schedule (used to calculate total working hours as munkarend_napok * 8.1)';

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default 
FROM information_schema.columns 
WHERE table_name = 'salary_calculations' 
ORDER BY ordinal_position;
