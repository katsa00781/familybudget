-- Migration: Add 'list' source type to product_price_history and shopping_statistics tables
-- Date: 2025-10-07
-- Purpose: Support shopping list items as a data source for price tracking and statistics

-- Step 1: Add 'source' column to product_price_history if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'product_price_history' AND column_name = 'source'
  ) THEN
    ALTER TABLE product_price_history 
    ADD COLUMN source TEXT DEFAULT 'manual';
    
    RAISE NOTICE 'Added source column to product_price_history';
  END IF;
END $$;

-- Step 2: Drop existing CHECK constraint on product_price_history (if exists)
ALTER TABLE product_price_history 
DROP CONSTRAINT IF EXISTS product_price_history_source_check;

-- Step 3: Add new CHECK constraint with 'list' included
ALTER TABLE product_price_history 
ADD CONSTRAINT product_price_history_source_check 
CHECK (source IN ('ocr', 'manual', 'import', 'list'));

-- Step 4: Add 'source' column to shopping_statistics if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'shopping_statistics' AND column_name = 'source'
  ) THEN
    ALTER TABLE shopping_statistics 
    ADD COLUMN source TEXT DEFAULT 'manual';
    
    RAISE NOTICE 'Added source column to shopping_statistics';
  END IF;
END $$;

-- Step 5: Drop existing CHECK constraint on shopping_statistics (if exists)
ALTER TABLE shopping_statistics 
DROP CONSTRAINT IF EXISTS shopping_statistics_source_check;

-- Step 6: Add new CHECK constraint with 'list' included for shopping_statistics
ALTER TABLE shopping_statistics 
ADD CONSTRAINT shopping_statistics_source_check 
CHECK (source IN ('ocr', 'manual', 'list'));

-- Step 7: Update existing NULL values to 'manual'
UPDATE product_price_history SET source = 'manual' WHERE source IS NULL;
UPDATE shopping_statistics SET source = 'manual' WHERE source IS NULL;

-- Verify the changes
SELECT 'Source type constraints updated successfully! Now supporting: ocr, manual, import, list' as status;
