-- 012: Sávos túlóra-kategóriák hozzáadása a salary_calculations táblához
-- A bérkalkulátor KSZ szerinti pontosításához:
--   - 12 órás műszak (db): sávos napi túlóra (első 2 óra +50%, 3-4. óra +70%)
--   - pihenőnapi túlóra (óra): +125% pótlék
--   - munkaszüneti túlóra (óra): +225% pótlék
-- A régi tulora_orak / muszakpotlek_orak oszlopok megmaradnak (legacy, 0-ra mentve).

ALTER TABLE salary_calculations
  ADD COLUMN IF NOT EXISTS tizenket_oras_muszak     DECIMAL(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS pihenonapi_tulora_orak   DECIMAL(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS munkaszuneti_tulora_orak DECIMAL(6,2) NOT NULL DEFAULT 0;
