# Family Budget - Vercel Deployment Útmutató

Ez az útmutató lépésről-lépésre bemutatja, hogyan kell telepíteni a Family Budget alkalmazást Vercelre.

## 📋 Előfeltételek

1. **Vercel fiók**: [vercel.com](https://vercel.com) - Regisztrálj ingyenes fiókkal
2. **Supabase projekt**: Működő Supabase adatbázis (migrations lefuttatva)
3. **GitHub repo** (opcionális): A projekt feltöltve GitHub-ra

## 🚀 Deployment módszerek

### A) Vercel Dashboard (Ajánlott - legegyszerűbb)

#### 1. lépés: GitHub/GitLab integráció

1. Nyisd meg: [vercel.com/new](https://vercel.com/new)
2. Importáld a repository-t:
   - **GitHub**: Válaszd ki a `familybudget` repository-t
   - **GitLab/Bitbucket**: Csatold a fiókot és válaszd ki a projektet
3. Kattints az **"Import"** gombra

#### 2. lépés: Projekt konfiguráció

A Vercel automatikusan felismeri, hogy Next.js projektről van szó:

- **Framework Preset**: Next.js
- **Root Directory**: `./` (alapértelmezett)
- **Build Command**: `npm run build` (automatikus)
- **Output Directory**: `.next` (automatikus)

#### 3. lépés: Environment változók beállítása

Kattints a **"Environment Variables"** szekcióra és add hozzá:

**KÖTELEZŐ változók:**

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**OPCIONÁLIS változók:**

```env
NEXT_PUBLIC_OPENAI_API_KEY=your-openai-api-key-here
```

> **Hol találod a Supabase adatokat?**
> 1. Nyisd meg: [supabase.com/dashboard](https://supabase.com/dashboard)
> 2. Válaszd ki a projektet
> 3. Menj a **Settings** → **API** menüpontra
> 4. Másold ki:
>    - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
>    - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

#### 4. lépés: Deploy

1. Kattints a **"Deploy"** gombra
2. Várj 2-3 percet amíg a build lefut
3. Kész! Az alkalmazás elérhető a `your-project.vercel.app` címen

---

### B) Vercel CLI (Haladó)

#### 1. lépés: Vercel CLI telepítése

```bash
npm install -g vercel
```

#### 2. lépés: Bejelentkezés

```bash
vercel login
```

Kövesd a böngészőben megjelenő utasításokat.

#### 3. lépés: Deployment

Projektkönyvtárban:

```bash
cd /Users/kacsorzsolt/Developer/Projektek/familybudget
vercel
```

A CLI végigvezet a beállításokon:

1. **Set up and deploy?** → `Y`
2. **Which scope?** → Válaszd a személyes fiókod
3. **Link to existing project?** → `N` (első alkalommal)
4. **Project name?** → `familybudget` (vagy egyedi név)
5. **Directory?** → `.` (nyomj Enter-t)

#### 4. lépés: Environment változók hozzáadása

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
# Másold be az értéket és nyomj Enter-t
# Válaszd: Production, Preview, Development (mind a 3)

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# Másold be az értéket
# Válaszd: Production, Preview, Development (mind a 3)

# Opcionális:
vercel env add NEXT_PUBLIC_OPENAI_API_KEY
# Másold be az értéket
# Válaszd: Production, Preview, Development (mind a 3)
```

#### 5. lépés: Production deployment

```bash
vercel --prod
```

---

## 🗄️ Adatbázis Migration

A Vercel deployment **NEM** fogja automatikusan lefuttatni a Supabase migration-öket!

### Migration-ök manuális futtatása:

1. Nyisd meg: [supabase.com/dashboard](https://supabase.com/dashboard)
2. Válaszd ki a projektet
3. Menj a **SQL Editor** menüpontra
4. Futtasd le **SORRENDBEN** az alábbi migration fájlokat:

```
supabase/migrations/
├── 001_*.sql
├── 002_*.sql
├── 003_*.sql
├── 004_*.sql
├── 005_create_shopping_lists.sql
├── 006_create_products.sql
├── 007_*.sql
├── ...
└── 20250107_001_add_list_source_type.sql  (legújabb)
```

**Minden migration fájl tartalmát:**
1. Nyisd meg a fájlt a helyi gépen
2. Másold ki a teljes SQL kódot
3. Illeszd be a Supabase SQL Editor-ba
4. Kattints a **"Run"** gombra
5. Ellenőrizd, hogy zöld checkmark jelent-e meg (sikeres)

> **FONTOS**: A migration-öket a számozás szerint, SORRENDBEN kell lefuttatni!

---

## ✅ Deployment ellenőrzése

### 1. Alkalmazás betöltődik?

- Nyisd meg: `https://your-project.vercel.app`
- Látható a login/regisztrációs felület? ✅

### 2. Supabase kapcsolat működik?

- Regisztrálj új felhasználót
- Jelentkezz be
- Látható a Dashboard? ✅

### 3. Adatbázis táblák elérhetők?

Próbáld ki:
- **Költségvetés**: Hozz létre új költségvetést
- **Bevételek**: Adj hozzá egy bevételt
- **Termékek**: Adj hozzá egy terméket
- **Bevásárlólista**: Hozz létre egy listát

Ha bármelyik hibát ad:
- Ellenőrizd, hogy az adott migration lefutott-e
- Nézd meg a böngésző Console-ját (F12 → Console)
- Nézd meg a Vercel Logs-ot (lásd lent)

---

## 🐛 Hibaelhárítás

### "Failed to fetch" vagy hálózati hibák

**Ok**: Nincs beállítva az environment változó vagy rossz az érték.

**Megoldás**:
1. Menj a Vercel Dashboard-ra
2. Projekt → **Settings** → **Environment Variables**
3. Ellenőrizd az értékeket (különösen a Supabase URL-t)
4. Ha módosítottál valamit: **Redeploy** (lásd lent)

### "Table does not exist" hiba

**Ok**: Nincs lefuttatva a megfelelő migration.

**Megoldás**:
1. Azonosítsd melyik tábla hiányzik (pl. `products`, `shopping_lists`)
2. Nézd meg a migration fájlneveket
3. Futtasd le a megfelelő migration-t a Supabase SQL Editor-ban

### Build hiba a Vercelen

**Ok**: TypeScript vagy ESLint hiba.

**Megoldás**:
1. Futtasd le lokálisan: `npm run build`
2. Javítsd ki a hibákat
3. Commit + push
4. Vercel automatikusan újra próbálja

### Hogyan nézem meg a Vercel logokat?

1. Menj a Vercel Dashboard-ra
2. Kattints a projektre
3. Válaszd ki a legutóbbi deployment-et
4. Kattints a **"View Function Logs"** vagy **"Runtime Logs"** gombra

---

## 🔄 Újratelepítés (Redeploy)

### Automatikus (Git alapú)

Ha GitHub/GitLab-ről telepítetted:
1. Commit + push a változtatásokat
2. Vercel automatikusan újratelepíti

### Manuális (Vercel Dashboard)

1. Menj a Vercel Dashboard-ra
2. Kattints a projektre
3. Válaszd ki a legutóbbi deployment-et
4. Kattints a **"⋯"** menüre (jobb felső sarok)
5. **"Redeploy"** → **"Use existing Build Cache"** VAGY **"Rebuild"**

### CLI-ből

```bash
vercel --prod
```

---

## 🔐 Biztonsági megjegyzések

### Row Level Security (RLS)

A Supabase táblák RLS-sel védettek. Győződj meg róla, hogy:

1. Minden táblán engedélyezve van az RLS
2. A policy-k helyesen vannak beállítva
3. A felhasználók csak a saját adataikat látják

Ellenőrzés:
```sql
-- Supabase SQL Editor-ban
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

Minden táblánál `rowsecurity = true` kell legyen!

### Environment változók

**SOHA ne** commit-old a `.env.local` fájlt Git-be!
- A `.gitignore` fájl automatikusan kizárja
- Használd a Vercel Environment Variables funkciót

---

## 📊 Domain beállítása (Opcionális)

Ha saját domain-t szeretnél:

1. Menj a Vercel Dashboard → Projekt → **Settings** → **Domains**
2. Adj hozzá új domain-t: `www.familybudget.hu`
3. Vercel megadja a DNS beállításokat:
   - **A Record**: `76.76.21.21`
   - **CNAME**: `cname.vercel-dns.com`
4. Add hozzá ezeket a domain regisztrátornál (pl. GoDaddy, Namecheap)
5. Várj 24-48 órát DNS propagációra

---

## 🎯 Következő lépések

A deployment után:

1. ✅ Regisztrálj felhasználót
2. ✅ Tesztelj minden funkciót:
   - Költségvetés kezelés
   - Bevételek/kiadások
   - Termékek és árak
   - Bevásárlólista
   - Statisztikák
3. ✅ Állítsd be a Supabase Email Auth beállításait:
   - Confirm email template
   - Redirect URLs (`https://your-project.vercel.app/**`)
4. ✅ (Opcionális) OCR funkció tesztelése OpenAI API key-vel

---

## 📞 Támogatás

**Vercel dokumentáció**: [vercel.com/docs](https://vercel.com/docs)  
**Next.js deployment**: [nextjs.org/docs/deployment](https://nextjs.org/docs/deployment)  
**Supabase dokumentáció**: [supabase.com/docs](https://supabase.com/docs)

---

**Sikeres deployment-et! 🚀**
