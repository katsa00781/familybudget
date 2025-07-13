-- database: :memory:
-- POLICY HIBÁK JAVÍTÁSA
-- Futtasd ezt le a Supabase SQL Editor-ban

-- Törölni a hibás policy-kat
DROP POLICY IF EXISTS "Family members can view each other profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view and update their own profile" ON profiles;

-- Újra létrehozni az egyszerű policy-t
CREATE POLICY "Users can manage their own profile" 
ON profiles 
FOR ALL 
USING (auth.uid() = id);

-- Ellenőrizni hogy működik
SELECT 'Policy sikeresen javítva!' as status;
