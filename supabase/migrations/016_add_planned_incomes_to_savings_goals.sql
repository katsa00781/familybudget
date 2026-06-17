ALTER TABLE savings_goals ADD COLUMN IF NOT EXISTS planned_incomes JSONB DEFAULT '[]'::jsonb;
