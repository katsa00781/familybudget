# Családi Költségvetés

Egyszerű családi költségvetés kezelő alkalmazás Next.js-szel, shadcn UI komponensekkel és Supabase backenddel.

## Használt technológiák

- **Frontend**: [Next.js](https://nextjs.org/) (v15.3.4) - React keretrendszer
- **UI Komponensek**: [shadcn/ui](https://ui.shadcn.com/) - Újrafelhasználható komponenskönyvtár
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS keretrendszer
- **Backend**: [Supabase](https://supabase.com/) - Nyílt forráskódú Firebase alternatíva
- **Autentikáció**: [Supabase Auth](https://supabase.com/auth) - Felhasználó kezelés
- **Adatbázis**: [PostgreSQL](https://www.postgresql.org/) (Supabase-en keresztül)

## Telepítés

1. Klónozd le a projektet:
   ```bash
   git clone https://github.com/katsa00781/familybudget.git
   cd familybudget
   ```

2. Telepítsd a függőségeket:
   ```bash
   npm install
   ```

3. Másold le a `.env.local.example` fájlt, nevezd át `.env.local`-ra, és állítsd be a Supabase adatokat:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. Indítsd el a fejlesztői szervert:
   ```bash
   npm run dev
   ```

5. Nyisd meg a böngészőt a [http://localhost:3000](http://localhost:3000) címen, ahol a dashboard oldal fogad.

## Funkciók

- 📊 **Áttekintés** - Teljes pénzügyi áttekintés diagramokkal és statisztikákkal
- 💸 **Kiadások kezelése** - Kiadások követése és kategorizálása
- 💰 **Bevételek kezelése** - Bevételek rögzítése és nyomon követése
- 📋 **Költségvetési tervek** - Havi vagy éves költségvetések készítése és nyomon követése
- � **Bevásárlólista** - Intelligens bevásárlólista termék javaslatokkal
- 📦 **Termékadatbázis** - Termékek kezelése vonalkód támogatással
- �📱 **Reszponzív dizájn** - Minden eszközön jól használható felület
- 🔒 **Biztonságos autentikáció** - Felhasználói fiókok és adatvédelem

## Adatbázis migráció

**FONTOS**: Az alkalmazás használata előtt le kell futtatnod a migration fájlokat a Supabase-ben!

### Lépésről lépésre útmutató:

1. **Jelentkezz be a Supabase Dashboard-ba**:
   - Menj a [https://supabase.com/dashboard](https://supabase.com/dashboard) oldalra
   - Válaszd ki a projekted

2. **Nyisd meg az SQL Editor-t**:
   - A bal oldali menüben kattints a "SQL Editor" gombra

3. **Futtasd le a migration fájlokat sorrendben**:

   **A) Bevásárlólista tábla létrehozása:**
   ```sql
   -- Másold be és futtasd le a supabase/migrations/005_create_shopping_lists.sql tartalmát
   ```

   **B) Termék tábla létrehozása:**
   ```sql
   -- Másold be és futtasd le a supabase/migrations/006_create_products.sql tartalmát
   ```

4. **Ellenőrizd a táblák létrejöttét**:
   - A "Database" > "Tables" menüben ellenőrizd, hogy megjelentek-e:
     - `shopping_lists`
     - `shopping_list_items`
     - `products`

### Migration fájlok helye:
- `supabase/migrations/005_create_shopping_lists.sql` - Bevásárlólista rendszer
- `supabase/migrations/006_create_products.sql` - Termékadatbázis

### Mi történik, ha nem futtatod le a migration-eket?
- A bevásárlólista oldal hibával fog betölteni
- A termékek oldal "migration szükséges" figyelmeztetést fog mutatni
- Az intelligens termék javaslatok nem fognak működni

### Hibaelhárítás:
Ha hibát kapsz a migration futtatásakor:
1. Ellenőrizd, hogy már léteznek-e a táblák
2. Ha igen, használd a `DROP TABLE IF EXISTS` parancsot a migration fájl elejére
3. Vagy kihagyhatod a `CREATE TABLE` részeket és csak a `POLICY` részeket futtathatod le
