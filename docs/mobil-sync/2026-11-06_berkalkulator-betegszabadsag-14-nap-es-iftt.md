# Bérkalkulátor: betegszabadság első 14 napja távolléti díjon + új IFTT távollét

- **Dátum:** 2026-11-06
- **Érintett terület:** adatbázis / üzleti logika
- **Mobil teendő szükséges:** igen (ha a mobil app számol bért vagy írja/olvassa a `salary_calculations` táblát)

## Mi változott

`app/berkalkulator/page.tsx` (kiegészíti a `2026-11-06_berkalkulator-betegszabadsag-es-szerkesztes.md` jegyzetet):

1. **Betegszabadság díja:**
   - Régi: `napok × (rendes órabér × 8) × 70%`
   - Új: az első 14 nap a fizetett szabadsággal azonosan, a felette lévő napok 70%-on, mindkettő 8,17 órás napokkal:
     `min(napok, 14) × 8,17 × távolléti díj + max(napok − 14, 0) × 8,17 × távolléti díj × 0,70`
   - A *távolléti díj* ugyanaz az órabér, amit a fizetett szabadság használ (kézi felülírás → utolsó ≤3 mentett kalkuláció átlaga → `rendes órabér × 1,45`).
   - Új konstans: `KULCSOK.BETEGSZABADSAG_TELJES_NAPOK = 14`.
2. **Új tétel: IFTT távollét (nap):**
   - Díj: `napok × 8,17 × rendes órabér`, ahol `rendes órabér = alapbér / (munkarend napok × 8,17)`. Csak az alapbér napi része jár, **műszakpótlék nélkül**.
   - A bruttó bér része (így a TB-alapnak, az SZJA-alapnak és a százalékos levonásoknak is).
3. **Ledolgozott napok:** `munkarend − szabadság − fiz. távollét (óra / 8,17) − betegszabadság − IFTT`.

## Adatbázis / API változás

- Migráció: `supabase/migrations/20261106_001_add_iftt_napok_to_salary_calculations.sql`. Az éles adatbázison már lefutott (`add_iftt_napok_to_salary_calculations`).
- Új oszlop: `salary_calculations.iftt_napok DECIMAL(5,2) NOT NULL DEFAULT 0`.
- Edge Function: nincs változás.

## Teendő a mobil appban

- Ha a mobil app számol bért: a betegszabadság díját és a ledolgozott napokat a fenti képletekkel kell számolni, az IFTT tételt pedig fel kell venni.
- Ha a mobil app ment `salary_calculations` sort: az `iftt_napok` mezőt is mentse (alapértéke 0, tehát a régi mobil kód ettől még nem romlik el).
- Visszafelé kompatibilis: a régi sorokban az `iftt_napok` értéke 0. A korábban mentett `brutto_ber` / `netto_ber` értékek nem lettek újraszámolva.
