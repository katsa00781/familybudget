-- Hozzáadjuk a name és munkarend_napok mezőket a salary_calculations táblához
-- Ez lehetővé teszi a kalkulációk könnyebb azonosítását és módosítását

-- Name mező hozzáadása (kalkuláció neve)
ALTER TABLE salary_calculations 
ADD COLUMN IF NOT EXISTS name TEXT;

-- Munkarend napok mező hozzáadása (munkarend szerinti napok)
ALTER TABLE salary_calculations 
ADD COLUMN IF NOT EXISTS munkarend_napok DECIMAL(5,2) DEFAULT 20.0;

-- Kommentek hozzáadása a mezőkhöz
COMMENT ON COLUMN salary_calculations.name IS 'A kalkuláció neve/leírása a könnyebb azonosítás érdekében';
COMMENT ON COLUMN salary_calculations.munkarend_napok IS 'Munkarend szerinti napok száma (használva a teljes munkaidő kiszámításához mint munkarend_napok * 8.1)';

-- Additional incomes mező hozzáadása (egyéb jövedelmek JSON formátumban)
ALTER TABLE salary_calculations 
ADD COLUMN IF NOT EXISTS additional_incomes JSONB;

COMMENT ON COLUMN salary_calculations.additional_incomes IS 'Egyéb jövedelmek JSON formátumban (például passzív jövedelmek, mellékállás, stb.)';

-- Jutalom mező hozzáadása
ALTER TABLE salary_calculations 
ADD COLUMN IF NOT EXISTS jutalom INTEGER DEFAULT 0;

COMMENT ON COLUMN salary_calculations.jutalom IS 'Eseti jutalom/prémium összege';
