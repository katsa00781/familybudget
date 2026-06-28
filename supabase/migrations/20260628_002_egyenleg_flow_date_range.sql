-- Egyenleg Flow — kezdő és záró dátum oszlopok
-- A horizon_days helyett a felhasználó saját dátumtartományt adhat meg.
-- horizon_days megmarad backward-compat fallbacknek.

ALTER TABLE egyenleg_flow
  ADD COLUMN IF NOT EXISTS start_date TEXT,   -- YYYY-MM-DD, NULL = mai nap fallback
  ADD COLUMN IF NOT EXISTS end_date   TEXT;   -- YYYY-MM-DD, NULL = horizon_days fallback
