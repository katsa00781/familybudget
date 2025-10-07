-- Migration: Add 'import' source type to shopping_statistics table
-- Date: 2025-10-07
-- Purpose: Support JSON import as a data source for shopping statistics

-- Drop existing CHECK constraint on shopping_statistics
ALTER TABLE shopping_statistics 
DROP CONSTRAINT IF EXISTS shopping_statistics_source_check;

-- Add new CHECK constraint with 'import' included for shopping_statistics
ALTER TABLE shopping_statistics 
ADD CONSTRAINT shopping_statistics_source_check 
CHECK (source IN ('ocr', 'manual', 'import', 'list'));

-- Verify the changes
SELECT 'shopping_statistics now supports: ocr, manual, import, list' as status;
