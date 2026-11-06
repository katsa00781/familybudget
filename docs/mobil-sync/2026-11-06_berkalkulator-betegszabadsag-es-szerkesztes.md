# Bérkalkulátor: betegszabadság csökkenti a ledolgozott napokat + kalkuláció szerkesztése

- **Dátum:** 2026-11-06
- **Érintett terület:** üzleti logika
- **Mobil teendő szükséges:** igen (ha a mobil app számol bért vagy szerkeszt `salary_calculations` sort)

## Mi változott

`app/berkalkulator/page.tsx`:

1. **Ledolgozott napok számítása:** a betegszabadság napjai mostantól levonódnak a ledolgozott napokból.
   - Régi: `ledolgozott = munkarend − szabadság − fizetett távollét (óra / 8,17)`
   - Új: `ledolgozott = munkarend − szabadság − fizetett távollét (óra / 8,17) − betegszabadság napok`
   - Ennek következtében a ledolgozott órák, a havibéres időbér és a 45%-os műszakpótlék is csökken betegszabadság esetén (a betegszabadság díja — 70% — változatlanul külön sorban szerepel).
2. **Meglévő kalkuláció szerkesztése:** a „Korábbi kalkulációk” listában a *Szerkesztés* gomb betölti a kalkulációt; a *Módosítás mentése* a meglévő `salary_calculations` sort **UPDATE**-eli (azonos `id`, `created_at` megmarad, `updated_at` frissül). A *Mentés újként* gomb új sort hoz létre.
3. A napos beviteli mezők (munkarend, szabadság, betegszabadság, kiküldetés, GYED) léptetője egész napokat lép (tisztán UI).

## Adatbázis / API változás

Nincs. A `salary_calculations` séma és RLS policy változatlan (a meglévő `FOR ALL` policy az UPDATE-et is engedi). A mentett `ledolgozott_napok` / `ledolgozott_orak` értékek az új szabály szerint kerülnek mentésre; a korábban mentett sorok nem lettek átszámolva.

## Teendő a mobil appban

- Ha a mobil app számolja a ledolgozott napokat/órákat, a betegszabadság napjait ugyanígy le kell vonni (és ebből következően a havibéres időbért és a műszakpótlékot is az új ledolgozott órákból kell számolni).
- Ha a mobil app módosít mentett bérkalkulációt, `update` hívással (az `id` alapján) írja felül, ne hozzon létre új sort; a `created_at` mezőt ne írja felül.
- Visszafelé kompatibilis: régi sorok olvasása változatlan.
