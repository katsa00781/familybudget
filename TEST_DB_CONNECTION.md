# Adatbázis Ellenőrzés

## 1. Ellenőrizd a Supabase Dashboard-on

### SQL Editor → Új Query:

```sql
-- Ellenőrizd, hogy létezik-e a user_preferences tábla
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'user_preferences'
);
```

**Eredmény:**
- `true` → A tábla létezik ✅
- `false` → A tábla NEM létezik ❌ - Futtasd a migrációt!

---

## 2. Ha létezik, ellenőrizd a szerkezetet:

```sql
-- Tábla szerkezete
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_preferences'
ORDER BY ordinal_position;
```

**Várt eredmény:**
- id (uuid)
- user_id (uuid)
- active_income_plan_id (uuid)
- active_budget_plan_id (uuid)
- created_at (timestamp)
- updated_at (timestamp)

---

## 3. Ellenőrizd az RLS policy-kat:

```sql
-- RLS policies listája
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'user_preferences';
```

**Várt policy-k:**
- Users can view their own preferences (SELECT)
- Users can insert their own preferences (INSERT)
- Users can update their own preferences (UPDATE)
- Users can delete their own preferences (DELETE)

---

## 4. Tesztelj egy manuális insert-et:

```sql
-- Próbálj meg beszúrni egy rekordot (cseréld ki a user_id-t a saját UUID-dre)
INSERT INTO user_preferences (user_id, active_income_plan_id)
VALUES (
  auth.uid(),  -- Az aktuális bejelentkezett felhasználó ID-ja
  NULL
)
ON CONFLICT (user_id) DO UPDATE
SET updated_at = NOW();

-- Ellenőrizd, hogy beszúrta-e
SELECT * FROM user_preferences WHERE user_id = auth.uid();
```

---

## 5. Ha minden működik, de az app hibát dob:

### Böngésző Console ellenőrzése:

1. Nyisd meg a DevTools-t (F12)
2. Menj a Console tab-re
3. Mentsd el a bevételi tervet
4. Figyeld a console üzeneteket:

**Mit keress:**
- ❌ "user_preferences table does not exist yet" → Futtasd a migrációt
- ❌ "Error creating user preferences: [hiba]" → RLS policy probléma
- ❌ "new row violates row-level security policy" → RLS policy hiba
- ✅ "Set active income plan result: { success: true }" → Működik!

---

## 6. Leggyakoribb problémák:

### A) Tábla nem létezik
**Megoldás:** Futtasd le a teljes migrációs SQL-t a Supabase Dashboard SQL Editor-ban

### B) RLS policy hiba
**Tünet:** "new row violates row-level security policy"
**Megoldás:** 
```sql
-- Ellenőrizd, hogy az RLS policy-k jól vannak-e beállítva
DROP POLICY IF EXISTS "Users can insert their own preferences" ON user_preferences;
CREATE POLICY "Users can insert their own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

### C) Supabase környezeti változók hiányoznak
**Tünet:** "Invalid API key" vagy kapcsolódási hiba
**Megoldás:** Ellenőrizd a `.env.local` fájlt:
```
NEXT_PUBLIC_SUPABASE_URL=your_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key_here
```

