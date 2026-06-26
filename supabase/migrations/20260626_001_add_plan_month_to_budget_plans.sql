-- Havi címke a költségvetési tervekhez.
-- A Terv vs. Tény oldal (/bevetelek) ez alapján párosítja automatikusan a kiválasztott
-- Wallet-hónaphoz a megfelelő költségvetési tervet. Formátum: 'YYYY-MM'.
alter table public.budget_plans
  add column if not exists plan_month text;

comment on column public.budget_plans.plan_month is
  'A költségvetési terv vonatkozási hónapja (YYYY-MM). A Terv vs. Tény összehasonlítás ez alapján párosít.';

-- Gyorsabb keresés a felhasználó + hónap kombinációra.
create index if not exists budget_plans_user_plan_month_idx
  on public.budget_plans (user_id, plan_month);
