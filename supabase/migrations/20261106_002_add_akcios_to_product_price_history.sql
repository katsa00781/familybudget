-- Migráció: akciós ár jelölése az ártörténetben
-- Dátum: 2026-11-06
-- Cél: az akciós (ideiglenesen leárazott) árak ne számítsanak valódi árváltozásnak
-- az Árfigyelés és az Infláció számításaiban. A rekord megmarad (grafikonon látszik),
-- csak a változás-/inflációszámításból marad ki.

ALTER TABLE product_price_history
  ADD COLUMN IF NOT EXISTS akcios BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN product_price_history.akcios IS
  'Akciós ár: true esetén kimarad az árváltozás- és inflációszámításból';

-- A meglévő RLS policy-k (SELECT/INSERT/UPDATE/DELETE: auth.uid() = user_id)
-- már lefedik a szerkesztést és törlést, új policy nem kell.
