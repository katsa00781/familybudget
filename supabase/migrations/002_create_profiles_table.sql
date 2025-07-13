-- Felhasználói profilok táblája
-- Előfeltétel: 000_create_functions.sql már futott

-- Profiles tábla létrehozása
CREATE TABLE IF NOT EXISTS profiles (
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

-- RLS engedélyezése
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: felhasználók csak a saját profiljukat láthatják/módosíthatják
CREATE POLICY "Users can view and update their own profile" 
ON profiles 
FOR ALL 
USING (auth.uid() = id);

-- Policy: családtagok láthatják egymás profilját
CREATE POLICY "Family members can view each other profiles" 
ON profiles 
FOR SELECT 
USING (
    family_id = (
        SELECT family_id FROM profiles WHERE id = auth.uid()
    )
);

-- Trigger az updated_at frissítéséhez
CREATE TRIGGER update_profiles_updated_at 
    BEFORE UPDATE ON profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Trigger a felhasználó létrehozáskor (automatikus profil)
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
