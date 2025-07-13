-- Bérszámítási adatok táblája
-- Előfeltétel: 000_create_functions.sql és 002_create_profiles_table.sql már futottak

CREATE TABLE IF NOT EXISTS salary_calculations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    family_member_id UUID NOT NULL,
    
    -- Alap adatok
    alapber INTEGER NOT NULL,
    ledolgozott_napok DECIMAL(5,2) NOT NULL,
    ledolgozott_orak DECIMAL(5,2) NOT NULL,
    szabadsag_napok DECIMAL(5,2) NOT NULL DEFAULT 0,
    szabadsag_orak DECIMAL(5,2) NOT NULL DEFAULT 0,
    tulora_orak DECIMAL(5,2) NOT NULL DEFAULT 0,
    muszakpotlek_orak DECIMAL(5,2) NOT NULL DEFAULT 0,
    unnepnapi_orak DECIMAL(5,2) NOT NULL DEFAULT 0,
    betegszabadsag_napok DECIMAL(5,2) NOT NULL DEFAULT 0,
    kikuldes_napok DECIMAL(5,2) NOT NULL DEFAULT 0,
    gyed_mellett INTEGER NOT NULL DEFAULT 0,
    formaruha_kompenzacio INTEGER NOT NULL DEFAULT 0,
    csaladi_adokedvezmeny INTEGER NOT NULL DEFAULT 0,
    
    -- Számított eredmények
    brutto_ber INTEGER NOT NULL,
    netto_ber INTEGER NOT NULL,
    szja INTEGER NOT NULL DEFAULT 0,
    tb_jarulék INTEGER NOT NULL DEFAULT 0,
    szoc_hozzajarulas INTEGER NOT NULL DEFAULT 0,
    teljes_munkaltaroi_koltseg INTEGER NOT NULL DEFAULT 0,
    
    -- Audit mezők
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index a family_member_id-ra a gyorsabb keresésért
CREATE INDEX IF NOT EXISTS idx_salary_calculations_family_member 
ON salary_calculations(family_member_id);

-- Index a created_at-ra a chronological sorting-ért
CREATE INDEX IF NOT EXISTS idx_salary_calculations_created_at 
ON salary_calculations(created_at DESC);

-- RLS (Row Level Security) engedélyezése
ALTER TABLE salary_calculations ENABLE ROW LEVEL SECURITY;

-- Policy: felhasználók csak a saját családjuk adatait láthatják/módosíthatják
CREATE POLICY "Users can manage their family salary calculations" 
ON salary_calculations 
FOR ALL 
USING (auth.uid() = family_member_id OR EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid()
    AND profiles.family_id = (
        SELECT family_id FROM profiles WHERE id = family_member_id
    )
));

-- Trigger az updated_at frissítéséhez (funkció már létezik)
CREATE TRIGGER update_salary_calculations_updated_at 
    BEFORE UPDATE ON salary_calculations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
