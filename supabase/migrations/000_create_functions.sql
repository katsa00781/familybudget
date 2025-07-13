-- Közös funkciók létrehozása
-- Ez a migration fájl tartalmazza az összes táblához szükséges közös funkciókat

-- Updated_at oszlop automatikus frissítése trigger funkció
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Új felhasználó automatikus profil létrehozása
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

-- Funkciók sikeresen létrehozva
SELECT 'Közös funkciók létrehozva!' as status;
