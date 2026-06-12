-- 013: Szabadnapi túlóra-kategória hozzáadása a salary_calculations táblához
-- A bérjegyzék "TÓ szabadnapon" sora alapján:
--   - szabadnapi túlóra (óra): +100% alap (Túlóraalap sorban) + fix +100% pótlék
--     (nem sávos, eltér a 12 órás műszak sávos 50/70/100%-os elszámolásától)

ALTER TABLE salary_calculations
  ADD COLUMN IF NOT EXISTS szabadnapi_tulora_orak DECIMAL(6,2) NOT NULL DEFAULT 0;
