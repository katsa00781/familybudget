# Supabase Adatbázis Beállítás

## 📋 Áttekintés

Ez a projekt Supabase-t használ adatbázisként és autentikációs szolgáltatásként. A következő táblák és funkciók kerültek implementálásra:

### 🗄️ Adatbázis Táblák

#### 1. **profiles** 
Felhasználói profilok tárolása
- `id` - Felhasználó UUID (auth.users-hez kapcsolódik)
- `email` - Email cím
- `full_name` - Teljes név
- `display_name` - Megjelenítési név
- `phone` - Telefonszám
- `address` - Lakcím
- `birth_date` - Születési dátum
- `avatar_url` - Profilkép URL
- `bio` - Bemutatkozás
- `family_id` - Család azonosító (UUID)

#### 2. **salary_calculations**
Bérszámítási eredmények tárolása
- Alapadatok: alapbér, ledolgozott napok/órák, szabadság, túlóra, stb.
- Számított eredmények: bruttó/nettó bér, levonások, munkáltatói terhek
- Audit mezők: created_at, updated_at

## 🚀 Telepítés és Beállítás

### 1. Supabase Projekt Létrehozása
1. Menj a [Supabase Dashboard](https://supabase.com/dashboard)-ra
2. Hozz létre egy új projektet
3. Másold ki a PROJECT URL és ANON KEY értékeket

### 2. Környezeti Változók Beállítása
Hozz létre egy `.env.local` fájlt a projekt gyökerében:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Adatbázis Inicializálás
1. Nyisd meg a Supabase Dashboard SQL Editor-ját
2. Futtasd le a `supabase/init_database.sql` fájl tartalmát
3. Ez létrehozza az összes szükséges táblát, indexet és policy-t

### 4. Alternatív Migration-ök
A `supabase/migrations/` mappában találhatók az egyes migration fájlok:
- `001_create_salary_calculations_table.sql`
- `002_create_profiles_table.sql`

## 🔐 Biztonság (RLS - Row Level Security)

### Profiles Tábla Policies:
- **Saját profil**: Felhasználók csak a saját profiljukat láthatják/szerkeszthetik
- **Családtagok**: Ugyanazon családban lévő tagok láthatják egymás profilját

### Salary Calculations Tábla Policies:
- **Család alapú hozzáférés**: Csak a saját családtag számításait lehet látni/módosítani
- **Felhasználó alapú**: A family_member_id alapján szűrés

## 📊 Használat

### Profil Oldal (`/profil`)
- Felhasználói adatok szerkesztése
- Profilkép feltöltés
- Személyes információk kezelése
- Családi kapcsolatok áttekintése

### Bérkalkulátor (`/berkalkulator`)
- Családtagok szinkronizálása Supabase-ből
- Bérszámítási adatok mentése
- Korábbi számítások megtekintése
- Napokban történő munkaidő bevitel

## 🛠️ Funkciók

### ✅ Implementált
- [x] Felhasználói profilok kezelése
- [x] Családtagok szinkronizálása
- [x] Bérszámítási adatok mentése/lekérése
- [x] Automatikus profil létrehozás regisztrációkor
- [x] RLS biztonsági szabályok
- [x] Napokban történő munkaidő számítás (1 nap = 8,1 óra)
- [x] Fizetett szabadság napokban
- [x] Műszakpótlékos órák automatikus szinkronizálása

### 🔄 Fejlesztés alatt
- [ ] Képfeltöltés Azure Blob Storage-ba
- [ ] Családi meghívók küldése
- [ ] Részletesebb jelentések
- [ ] Exportálási funkciók

## 📝 API Használat

### Profil Mentése
```typescript
const { data, error } = await supabase
  .from('profiles')
  .upsert([profileData])
  .select();
```

### Bérszámítás Mentése
```typescript
const { data, error } = await supabase
  .from('salary_calculations')
  .insert([calculationData])
  .select();
```

### Családtagok Lekérése
```typescript
const { data, error } = await supabase
  .from('profiles')
  .select('id, email, full_name, display_name');
```

## 🐛 Hibaelhárítás

### Gyakori Problémák:

1. **"profiles table doesn't exist"**
   - Futtasd le az `init_database.sql` scriptet

2. **"Row Level Security policy violation"**
   - Ellenőrizd, hogy be vagy-e jelentkezve
   - Győződj meg róla, hogy a policies megfelelően vannak beállítva

3. **"Cannot read properties of null"**
   - Ellenőrizd a Supabase környezeti változókat
   - Győződj meg róla, hogy a projekt URL és API kulcs helyes

### Debugging:
```typescript
// Konzolra kiírás a fejlesztés során
console.log('Supabase client initialized:', supabase);
console.log('Current user:', await supabase.auth.getUser());
```

## 🎯 Következő Lépések

1. **Kész profilok tesztelése**: Töltsd ki a profil oldalt
2. **Bérszámítás tesztelése**: Próbáld ki a kalkulátort és a mentést
3. **Családtagok hozzáadása**: Regisztrálj több felhasználót
4. **Tesztadatok**: Használd a családi bérkalkulátor funkciókat

---

*Ez a dokumentáció a familybudget projekt Supabase integrációjához készült. Frissítsd igény szerint!*
