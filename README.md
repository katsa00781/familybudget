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

5. Nyisd meg a böngészőt a [http://localhost:3000](http://localhost:3000) címen.

## Funkciók

- 📊 **Áttekintés** - Teljes pénzügyi áttekintés diagramokkal és statisztikákkal
- 💸 **Kiadások kezelése** - Kiadások követése és kategorizálása
- 💰 **Bevételek kezelése** - Bevételek rögzítése és nyomon követése
- 📋 **Költségvetési tervek** - Havi vagy éves költségvetések készítése és nyomon követése
- 📱 **Reszponzív dizájn** - Minden eszközön jól használható felület
- 🔒 **Biztonságos autentikáció** - Felhasználói fiókok és adatvédelem
