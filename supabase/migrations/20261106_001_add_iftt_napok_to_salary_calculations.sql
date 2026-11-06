-- 20261106_001: IFTT távollét (nap) hozzáadása a salary_calculations táblához
-- IFTT távollét alatt csak az alapbér arra a napra eső része jár (rendes órabér × 8,17 óra),
-- műszakpótlék nélkül; a ledolgozott napokat csökkenti.

ALTER TABLE salary_calculations
  ADD COLUMN IF NOT EXISTS iftt_napok DECIMAL(5,2) NOT NULL DEFAULT 0;
