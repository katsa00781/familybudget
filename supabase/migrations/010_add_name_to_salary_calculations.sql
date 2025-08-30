-- Add name column to salary_calculations table
ALTER TABLE salary_calculations 
ADD COLUMN name TEXT;

-- Add comment to describe the column
COMMENT ON COLUMN salary_calculations.name IS 'Name/description of the salary calculation for easy identification';
