-- Active Income Plan Tracking
-- Nyilvántartja, hogy melyik bevételi terv az aktív egy felhasználónál

-- User preferences tábla az aktív tervek tárolásához
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  active_income_plan_id UUID REFERENCES income_plans(id) ON DELETE SET NULL,
  active_budget_plan_id UUID REFERENCES budget_plans(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Egy felhasználónak csak egy preferencia rekordja lehet
  CONSTRAINT unique_user_preferences UNIQUE(user_id)
);

-- RLS policies
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Töröljük a meglévő policy-kat, ha léteznek
DROP POLICY IF EXISTS "Users can view their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can delete their own preferences" ON user_preferences;

-- Felhasználók csak a saját preferenciáikat láthatják és módosíthatják
CREATE POLICY "Users can view their own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences"
  ON user_preferences FOR DELETE
  USING (auth.uid() = user_id);

-- Index a gyorsabb lekérdezésekhez
DROP INDEX IF EXISTS idx_user_preferences_user_id;
DROP INDEX IF EXISTS idx_user_preferences_active_income;
DROP INDEX IF EXISTS idx_user_preferences_active_budget;

CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);
CREATE INDEX idx_user_preferences_active_income ON user_preferences(active_income_plan_id);
CREATE INDEX idx_user_preferences_active_budget ON user_preferences(active_budget_plan_id);

-- Trigger az updated_at automatikus frissítéséhez
CREATE OR REPLACE FUNCTION update_user_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_preferences_timestamp ON user_preferences;

CREATE TRIGGER update_user_preferences_timestamp
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_user_preferences_updated_at();

-- Komment a táblához
COMMENT ON TABLE user_preferences IS 'Felhasználói beállítások: aktív bevételi és költségvetési tervek';
COMMENT ON COLUMN user_preferences.active_income_plan_id IS 'Az aktív bevételi terv ID-ja';
COMMENT ON COLUMN user_preferences.active_budget_plan_id IS 'Az aktív költségvetési terv ID-ja';
