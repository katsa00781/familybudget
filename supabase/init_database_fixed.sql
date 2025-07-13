-- Javított Adatbázis inicializálás script
-- Futtasd ezt a Supabase SQL Editor-ban

-- ELŐSZÖR: Töröljük a meglévő táblák és policy-k, ha léteznek
DROP POLICY IF EXISTS "Users can view and update their own profile" ON profiles;
DROP POLICY IF EXISTS "Family members can view each other profiles" ON profiles;
DROP POLICY IF EXISTS "Users can manage their family salary calculations" ON salary_calculations;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
DROP TRIGGER IF EXISTS update_salary_calculations_updated_at ON salary_calculations;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user();
DROP FUNCTION IF EXISTS update_updated_at_column();
DROP TABLE IF EXISTS salary_calculations;
DROP TABLE IF EXISTS profiles;

-- 1. Updated_at trigger funkció létrehozása ELŐSZÖR
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 2. Profiles tábla létrehozása
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT,
    full_name TEXT,
    display_name TEXT,
    phone TEXT,
    address TEXT,
    birth_date DATE,
    avatar_url TEXT,
    bio TEXT,
    family_id UUID DEFAULT gen_random_uuid(),
    
    -- Audit mezők
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Salary calculations tábla létrehozása UUID típussal
CREATE TABLE salary_calculations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    family_member_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    
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

-- 4. RLS (Row Level Security) engedélyezése
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE salary_calculations ENABLE ROW LEVEL SECURITY;

-- 5. Profiles policies
CREATE POLICY "Users can view and update their own profile" 
ON profiles 
FOR ALL 
USING (auth.uid() = id);

CREATE POLICY "Family members can view each other profiles" 
ON profiles 
FOR SELECT 
USING (
    family_id = (
        SELECT family_id FROM profiles WHERE id = auth.uid()
    )
);

-- 6. Salary calculations policies - JAVÍTOTT UUID kezeléssel
CREATE POLICY "Users can manage their family salary calculations" 
ON salary_calculations 
FOR ALL 
USING (
    auth.uid() = family_member_id 
    OR EXISTS (
        SELECT 1 FROM profiles p1, profiles p2
        WHERE p1.id = auth.uid()
        AND p2.id = family_member_id
        AND p1.family_id = p2.family_id
    )
);

-- 7. Indexek létrehozása
CREATE INDEX idx_salary_calculations_family_member 
ON salary_calculations(family_member_id);

CREATE INDEX idx_salary_calculations_created_at 
ON salary_calculations(created_at DESC);

CREATE INDEX idx_profiles_family_id 
ON profiles(family_id);

-- 8. Triggerek létrehozása
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_salary_calculations_updated_at 
    BEFORE UPDATE ON salary_calculations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 9. Automatikus profil létrehozás új felhasználó regisztrációjakor
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Trigger a felhasználó létrehozáskor
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Inicializálás befejezve!
SELECT 'Adatbázis sikeresen inicializálva UUID típusokkal!' as status;
