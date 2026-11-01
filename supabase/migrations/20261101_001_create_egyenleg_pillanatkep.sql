-- Egyenleg pillanatkép — a Wallet-számlák egyenlege minden hónap 1-jén
-- Egy sor egy hónap (a budget_plans / egyenleg_flow JSONB-mintáját követve):
--   accounts JSONB — [{ id, name, accountType, currencyCode, balance, creditLimit }]
-- A balance előjeles: a hitelkártya-tartozás NEGATÍV, így a számlák összeadhatók.
-- A sorokat kizárólag a wallet-balance-snapshot Edge Function írja (service role),
-- ezért csak SELECT policy van: a lezárt mentés a kliensről nem módosítható.

CREATE TABLE IF NOT EXISTS egyenleg_pillanatkep (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  snapshot_month VARCHAR(7) NOT NULL CHECK (snapshot_month ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  snapshot_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  source VARCHAR(20) NOT NULL DEFAULT 'automatikus' CHECK (source IN ('automatikus', 'kezi')),
  accounts JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (user_id, snapshot_month)
);

-- RLS — felhasználónkénti izoláció (auth.uid() = user_id)
ALTER TABLE egyenleg_pillanatkep ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own egyenleg_pillanatkep" ON egyenleg_pillanatkep
  FOR SELECT USING (auth.uid() = user_id);
