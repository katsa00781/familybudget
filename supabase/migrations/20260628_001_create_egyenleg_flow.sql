-- Egyenleg Flow — napi bankszámla-egyenleg előrejelző
-- Egy tábla, JSONB tárolással (a budget_plans / annual_budget_plans mintáját követve):
--   accounts JSONB — a követett számlák (főszámla, hitelkártya, megtakarítás, ...)
--   events   JSONB — tervezett bevételek / kiadások / átvezetések (ismétlődéssel)
-- A napi egyenleg-előrejelzést a kliens számolja (lib/egyenlegFlow.ts).

CREATE TABLE IF NOT EXISTS egyenleg_flow (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR(255) NOT NULL DEFAULT 'Egyenleg Flow',
  horizon_days INTEGER NOT NULL DEFAULT 60,   -- előrejelzési időtáv napokban
  accounts JSONB NOT NULL DEFAULT '[]'::jsonb,
  events   JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS — felhasználónkénti izoláció (auth.uid() = user_id)
ALTER TABLE egyenleg_flow ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own egyenleg_flow" ON egyenleg_flow
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own egyenleg_flow" ON egyenleg_flow
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own egyenleg_flow" ON egyenleg_flow
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own egyenleg_flow" ON egyenleg_flow
  FOR DELETE USING (auth.uid() = user_id);

-- Index a teljesítmény javításához
CREATE INDEX IF NOT EXISTS idx_egyenleg_flow_user_id ON egyenleg_flow(user_id);

-- Trigger a frissítési dátum automatikus beállításához
-- (az update_updated_at_column() függvény a 008-as migrációban már létrejött)
CREATE TRIGGER update_egyenleg_flow_updated_at
  BEFORE UPDATE ON egyenleg_flow
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
