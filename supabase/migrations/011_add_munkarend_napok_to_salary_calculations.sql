-- Add munkarend_napok column to salary_calculations table
ALTER TABLE salary_calculations 
ADD COLUMN munkarend_napok DECIMAL(5,2) DEFAULT 20.0;

-- Add comment to describe the column
COMMENT ON COLUMN salary_calculations.munkarend_napok IS 'Number of working days according to work schedule (used to calculate total working hours as munkarend_napok * 8.1)';
