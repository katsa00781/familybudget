-- 014: Formaruha AK (adóköteles formaruha-juttatás) hozzáadása a salary_calculations táblához
-- A bérjegyzék "Formaruha AK" sora alapján: nem kifizetendő, de a TB járulékalap része.
--   TB-alap = bruttó bér + formaruha kompenzáció + formaruha AK
--             + vállalati önk. nyugdíj (5,4% a bruttóból) + vállalati önk. egészség (fix 20.600 Ft)
--   TB járulék = TB-alap × 18,5%

ALTER TABLE salary_calculations
  ADD COLUMN IF NOT EXISTS formaruha_ak DECIMAL(12,2) NOT NULL DEFAULT 0;
