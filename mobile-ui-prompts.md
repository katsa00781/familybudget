# Mobile UI Prompts - Családi Költségvetés App

## 1. Dashboard Screen (Főoldal)

### Általános Layout
- **Background**: Gradient háttér cyan-400-től teal-500-ig, majd green-500-ig
- **Scroll**: Vertical ScrollView a teljes tartalommal
- **Padding**: 16px minden oldalon
- **SafeArea**: Top és bottom SafeAreaView használata

### Fejléc Szekció
```
Komponens típus: Text elemek középre igazítva
- Főcím: "Családi Költségvetés" - fehér, 32px, bold
- Alcím: "Üdvözöljük, [Felhasználó neve]!" - világosabb cyan (cyan-100), 16px
- Margin bottom: 32px
```

### Főbb Mutatók (4 kártya grid)
```
Layout: 2x2 grid mobil nézeten
Kártya stílus:
- Background: Fehér 90% átlátszóság, blur effekt
- Border radius: 12px
- Padding: 16px
- Shadow: könnyű árnyék
- Gap: 16px a kártyák között

1. Havi Bevétel Kártya:
   - Ikon: TrendingUp (teal színben)
   - Címke: "Havi bevétel" (szürke, 12px)
   - Érték: Nagy szám, teal-700, 20px, bold
   - Alcím: "Aktuális terv alapján" (teal-600, 10px)

2. Havi Kiadás Kártya:
   - Ikon: TrendingDown (piros színben)
   - Címke: "Havi kiadás" (szürke, 12px)
   - Érték: Nagy szám, red-600, 20px, bold
   - Alcím: "Tervezett kiadások" (red-500, 10px)

3. Egyenleg Kártya:
   - Ikon: Wallet (zöld színben)
   - Címke: "Egyenleg" (szürke, 12px)
   - Érték: Nagy szám, zöld ha pozitív/piros ha negatív, 20px, bold
   - Alcím: "Bevétel - Kiadás" (szürke, 10px)

4. Mai Bevásárlás Kártya:
   - Ikon: ShoppingCart (kék színben)
   - Címke: "Mai bevásárlás" (szürke, 12px)
   - Érték: Nagy szám, blue-600, 20px, bold
   - Alcím: "[X] lista ma" (blue-500, 10px)
```

### Megtakarítási Célok és Gyors Műveletek
```
Layout: Egymás alatt, nem mellette (mobile optimalizált)

Megtakarítási Célok Kártya:
- Fejléc: "Megtakarítási Célok" ikon + szöveg (teal-700)
- Ha nincs cél: Központozott üzenet "Még nincsenek megtakarítási célok"
- Ha vannak célok (max 3 megjelenítve):
  * Cél neve (bold, szürke-800)
  * Összeg: "jelenlegi / cél" (szürke-600, kis méret)
  * Progress bar: gradient teal-től green-ig
  * Százalék és határidő (kis szürke szöveg)

Gyors Műveletek Kártya:
- Fejléc: "Gyors műveletek" (teal-700)
- 4 gomb egymás alatt, teljes szélességben:
  1. Bérkalkulátor (teal háttér)
  2. Új bevásárlólista (kék háttér)
  3. Receptek (zöld háttér)
  4. Megtakarítások (lila háttér)
- Minden gombhoz ikon + szöveg
```

### Aktuális Költségvetési Terv
```
Komponens: Card ha van költségvetési terv
- Fejléc: "Aktuális Költségvetési Terv" + Badge a terv nevével
- Tartalom: Grid layout 1 oszlop mobilon
- Minden tétel:
  * Background: világos szürke gradient
  * Border radius: 8px
  * Padding: 16px
  * Tétel név (bold, szürke-800)
  * Kategória badge (outline)
  * Összeg (nagy, teal-600, bold)
  * Leírás (ha van, kis szürke szöveg)
- Footer: Összesítő infó (összes kiadás, tételek száma)
```

### Aktuális Bevételi Terv
```
Komponens: Card ha van bevételi terv
- Fejléc: "Aktuális Bevételi Terv" + zöld Badge
- Alapbevétel doboz:
  * Világos zöld háttér
  * "Havi alapbevétel" + összeg
- További bevételek (ha vannak):
  * Kis címsor: "További bevételek:"
  * Minden tétel külön dobozban
  * Név + összeg + leírás (ha van)
- Footer: Összes bevétel összesítés
```

### 50/30/20 Szabály és Kategóriák
```
Layout: Egymás alatt (nem mellette mobilon)

50/30/20 Szabály Kártya:
- Minden kategória (Szükségletek/Vágyak/Megtakarítások):
  * Színes jelölő + név
  * Százalék és összeg
  * Cél vs aktuális összehasonlítás
  * Progress bar színezéssel (zöld/sárga/piros)
- Footer: Szabály magyarázata kis kék dobozban

Kategóriák Kártya:
- Mobilon: Lista nézet (nem pie chart)
- Minden kategória:
  * Színes jelölő + kategória név
  * Összeg + százalék
- Footer: Összes összeg
```

### Havi Trend Grafikon
```
Komponens: Card ha van adat
- Fejléc: "Havi trend" + ikon
- Mobile-friendly line chart
- X tengely: napok (1-30)
- Y tengely: rövidített értékek (pl. 500K)
- 2 vonal: Bevételek (zöld), Kiadások (piros)
- Tooltip mobilbarát megjelenítéssel
```

### Üres Állapot
```
Ha nincs sem költségvetési, sem bevételi terv:
- Központozott layout
- Nagy ikon (BarChart2, szürke)
- Főcím: "Kezdje el a költségvetés tervezését!"
- Alcím: magyarázó szöveg
- 2 gomb vertikálisan:
  * "Bevételi terv létrehozása" (teal)
  * "Költségvetési terv" (kék)
```

### Loading Állapot
```
- Ugyanaz a gradient háttér
- Központozott loading spinner (fehér)
- "Adatok betöltése..." szöveg (fehér, 16px)
```

## 2. Salary Calculator Screen (Bérkalkulátor)

### Általános Layout
- **Background**: Ugyanaz a gradient háttér (cyan→teal→green)
- **Scroll**: Vertical ScrollView (hosszú form miatt)
- **Padding**: 16px minden oldalon
- **SafeArea**: Top és bottom SafeAreaView használata

### Fejléc Szekció
```
Komponens: Központozott layout fehér szöveggel
- Ikon: Calculator (32px, fehér)
- Főcím: "Részletes Magyar Bérkalkulátor 2025" (28px, bold, fehér)
- Alcím: "Számítsd ki a havi nettó bért és add hozzá a passzív jövedelmeket a teljes jövedelem meghatározásához." (16px, fehér, világosabb)
- Margin bottom: 24px
```

### Fő Tartalmi Terület
```
Layout: ScrollView egy nagy Card-dal a képernyő középső részén
Card stílus:
- Background: Fehér
- Border radius: 16px
- Shadow: erős árnyék
- Padding: 24px
- Margin: 16px minden oldalon
```

### Alapadatok Szekció
```
Cím: "💼 Alapadatok" (18px, bold, szürke-800)
Mezők vertikálisan egymás alatt:

1. Alapbér Input:
   - Label: "Alapbér (Ft/hó)"
   - Placeholder: "pl. 400000"
   - Keyboard: numeric
   - Style: border, rounded, padding

2. Ledolgozott napok Select:
   - Label: "Ledolgozott napok"
   - Options: 1-31
   - Default: 22
   - Style: picker/select komponens

3. Túlórák Input:
   - Label: "Túlórák (óra)"
   - Placeholder: "0"
   - Keyboard: numeric

4. Műszakpótlék Input:
   - Label: "Műszakpótlék (Ft)"
   - Placeholder: "0"
   - Keyboard: numeric

5. GYED munkavégzés mellett:
   - Label: "GYED munkavégzés mellett (Ft)"
   - Placeholder: "0"
   - Keyboard: numeric
   - Info badge: "Adómentes juttatás"

6. Formaruha kompenzáció:
   - Label: "Formaruha kompenzáció (Ft)"
   - Placeholder: "0"
   - Keyboard: numeric
```

### Eredmény Kártya (ha van számítás)
```
Kondicionális megjelenítés: Csak akkor látható, ha van bemeneti adat
Card stílus:
- Background: világos szürke
- Border radius: 12px
- Padding: 20px
- Margin top: 24px

Tartalom felépítése:
1. Bruttó számítások (szürke háttér):
   - "Bruttó bér: [összeg] Ft" (nagy, bold)
   - Részletező lista kis betűvel (órák, pótlékok stb.)

2. Levonások szekció (világos piros háttér):
   - Cím: "Levonások"
   - TB járulék
   - SZJA
   - Egyéb levonások
   - Összesen levonás (bold)

3. Nettó eredmény (zöld háttér):
   - "Nettó fizetés" (közepes méret)
   - "[összeg] Ft" (extra nagy, bold, kék)

4. Munkáltatói terhek (narancssárga háttér):
   - Szociális hozzájárulás
   - Teljes munkáltatói költség
```

### Egyéb Jövedelmek Szekció
```
Cím: "💰 Egyéb jövedelmek" (18px, bold)
Komponensek:

1. Hozzáadás gomb:
   - Style: Outline button, kis méret
   - Ikon: Plus
   - Szöveg: "Jövedelem hozzáadása"

2. Jövedelem lista (ha vannak tételek):
   - Minden tétel egy kis Card-ban:
     * Név input (placeholder: "pl. Passzív jövedelem")
     * Összeg input (keyboard: numeric)
     * Törlés gomb (X ikon, piros)
   - Background: világos szürke
   - Border radius: 8px
   - Padding: 12px
   - Gap: 8px tételek között

3. Összesítő doboz (ha vannak egyéb jövedelmek):
   - Background: zöld/teal gradient
   - "Teljes havi bevétel: [összeg] Ft" (nagy, bold)
   - Részletezés:
     * "Nettó bér: [összeg] Ft"
     * "Egyéb jövedelem: [összeg] Ft"
```

### Akciógombok
```
Layout: Fix bottom pozíció vagy scroll végén
Gombok vertikálisan egymás alatt:

1. Számítás gomb:
   - Style: Teljes szélesség, nagy
   - Background: Teal/kék
   - Szöveg: "Számítás frissítése"
   - Ikon: Calculator

2. Mentés gomb (ha van eredmény):
   - Style: Teljes szélesség, közepes
   - Background: Zöld
   - Szöveg: "Kalkuláció mentése"
   - Ikon: Save

3. Navigációs gomb:
   - Style: Outline, teljes szélesség
   - Szöveg: "Bevételi tervhez hozzáadás"
   - Navigate: /bevetelek
```

### Korábbi Kalkulációk Szekció
```
Cím: "📊 Korábbi kalkulációk" (18px, bold)
Kondicionális megjelenítés: Ha vannak mentett kalkulációk

Lista stílus:
- Minden kalkuláció egy Card
- Background: világos szürke
- Border radius: 8px
- Padding: 16px
- Margin bottom: 12px

Kalkuláció tétel tartalma:
- Dátum (kis méret, szürke)
- Alapbér + ledolgozott napok (közepes, bold)
- Nettó eredmény (nagy, zöld/kék)
- Törlés gomb (kis, jobb sarokban)
```

### Üres Állapot
```
Ha nincs mentett kalkuláció:
- Központozott layout
- Ikon: Calculator (nagy, szürke)
- Szöveg: "Még nincsenek mentett kalkulációk"
- Kis szöveg: "A számításaid automatikusan mentésre kerülnek"
```

### Loading Állapot
```
Ha számítás folyamatban:
- Overlay a teljes képernyőn
- Spinner + "Számítás..." szöveg
- Vagy: Disabled state az input mezőkön
```

## 3. Budget Planning Screen (Költségvetés)

### Általános Layout
- **Background**: Gradient háttér (cyan→teal→green)
- **Scroll**: Vertical ScrollView komplex form kezeléshez
- **Padding**: 16px minden oldalon
- **SafeArea**: Top és bottom SafeAreaView

### Fejléc Szekció
```
Komponens: Központozott layout fehér szöveggel
- Ikon: Wallet vagy Calculator (32px, fehér)
- Főcím: "Költségvetés Tervezés" (28px, bold, fehér)
- Alcím: "Havi költségvetés összeállítása és kezelése" (16px, fehér)
- Margin bottom: 24px
```

### Bevételi Terv Kapcsolás
```
Card komponens (ha vannak bevételi tervek):
- Background: világos kék/teal
- Border radius: 12px
- Padding: 16px
- Margin bottom: 16px

Tartalom:
- Cím: "📊 Bevételi terv kiválasztása"
- Select/Picker komponens:
  * Placeholder: "Válassz bevételi tervet"
  * Options: Mentett bevételi tervek listája
  * Megjelenítés: "Terv neve - [összeg] Ft"
- Várható bevétel kijelzés (ha kiválasztva):
  * "Várható bevétel: [összeg] Ft" (zöld, bold)
```

### Költségvetési Kategóriák
```
Főbb kategóriák vertikálisan egymás alatt:
1. Autó
2. Háztartás  
3. Szórakozás
4. Mama (személyes)
5. Hitel
6. Rezsi
7. Digitális Rezsi
8. Megtakarítás
9. Egészség
10. Egyéb
11. Készpénz

Minden kategória egy Collapsible Card:
- Header: Kategória név + összes érték
- Expandable: Tap-re nyitható/zárható
- Default: Összes nyitott mobilon (vagy első 3-4 nyitott)
```

### Kategória Card Felépítés
```
Card Style:
- Background: Fehér
- Border radius: 12px
- Shadow: közepes árnyék
- Margin bottom: 16px
- Border: vékony szürke (collapsed állapotban)

Header (mindig látható):
- Kategória ikon (pl. Car=autó, Home=háztartás)
- Kategória név (18px, bold)
- Összes érték (jobb oldalon, bold, szines)
- Expand/collapse ikon (chevron)

Expanded tartalom:
- Alcímkategóriák lista
- Minden alcímkategória egy sor:
  * Alcímkategória név (bal)
  * Típus badge (Szükséglet/Vágyak/Megtakarítás)
  * Összeg input (jobb, numeric keyboard)
  * Szélesség: teljes sor

Típus Badge színezés:
- Szükséglet: Zöld háttér
- Vágyak: Kék háttér  
- Megtakarítás: Arany/sárga háttér
- Üres: Szürke háttér
```

### Összesítő Panel (Sticky Bottom)
```
Fix pozíció a képernyő alján vagy ScrollView tetején sticky
Card stílus:
- Background: Fehér, erős shadow
- Padding: 20px
- Border radius: 16px csak felül
- Border: vékony szürke

Tartalom:
1. 50/30/20 Breakdown:
   - "Szükségletek: [összeg] Ft ([%]%)" - Zöld
   - "Vágyak: [összeg] Ft ([%]%)" - Kék
   - "Megtakarítások: [összeg] Ft ([%]%)" - Arany
   
2. Separator vonal

3. Főösszeg:
   - "Összes kiadás:" (közepes)
   - "[összeg] Ft" (nagy, bold, teal)

4. Balance (ha van bevételi terv):
   - "Egyenleg:" (közepes)
   - "[összeg] Ft" (nagy, bold, zöld vagy piros)
   - "([bevétel] - [kiadás])" (kis szürke szöveg)
```

### Akciómenü (Bottom Sheet vagy Fixed)
```
Gombok horizontálisan vagy vertikálisan:

1. Mentés gomb:
   - Style: Primary button (teal)
   - Szöveg: "Költségvetés mentése"
   - Ikon: Save
   - Funkció: Modal nyitás (név, leírás)

2. Betöltés gomb:
   - Style: Secondary button
   - Szöveg: "Korábbi betöltése"  
   - Ikon: Download
   - Funkció: Mentett tervek listája

3. Új kategória:
   - Style: Outline button
   - Szöveg: "Új kategória"
   - Ikon: Plus
   - Funkció: Kategória hozzáadás modal

4. Reset gomb:
   - Style: Outline button (piros)
   - Szöveg: "Alaphelyzet"
   - Ikon: Refresh
   - Funkció: Megerősítő dialog
```

### Mentés Modal
```
Modal/Alert Style:
- Background: Fehér
- Border radius: 16px
- Padding: 24px
- Overlay: Semi-transparent háttér

Tartalom:
1. Cím: "Költségvetés mentése"
2. Név input:
   - Placeholder: "pl. 2025 Január"
   - Required field
3. Leírás input (opcionális):
   - Placeholder: "Rövid leírás..."
   - Multiline: 3 sor
4. Akciógombok:
   - "Mégse" (outline)
   - "Mentés" (primary)
```

### Mentett Költségvetések Lista
```
Modal vagy új Screen:
- Cím: "Mentett költségvetések"
- Lista stílus vertikálisan

Minden tétel Card:
- Létrehozás dátuma (kis, szürke)
- Név (közepes, bold)
- Összes összeg (nagy, teal, jobb oldal)
- Leírás (ha van, kis, szürke)
- Akciógombok:
  * "Betöltés" (primary, kis)
  * "Törlés" (outline, piros, kis)

Üres állapot:
- Központozott ikon + szöveg
- "Még nincsenek mentett költségvetések"
```

### Új Kategória Modal
```
Modal tartalom:
1. Kategória név input
2. Ikon kiválasztó (grid layout)
3. Kezdő alcímkategóriák (opcionális)
4. Hozzáadás/Mégse gombok

Ikon választó:
- Grid layout 4x4 vagy 5x5
- Lucide-react ikonok
- Kiválasztott: highlight border
```

### Loading States
```
1. Betöltés: Skeleton placeholder kategóriáknak
2. Mentés: Overlay spinner "Mentés..."
3. Kalkuláció: Real-time összeg frissítés
```

### Responsive Behavior
```
- Tablet: 2 kategória egymás mellett
- Phone: 1 kategória teljes szélességben
- Összesítő: Mindig látható sticky vagy fixed
- Input focus: Keyboard megjelenéskor scroll adjustments
```

### Technikai Követelmények
- **Real-time Calculation**: Azonnali összeg frissítés
- **Persistence**: Auto-save drafts LocalStorage-ban
- **Validation**: Numerikus input validáció
- **Currency Formatting**: Magyar forint formázás
- **State Management**: Complex state (useState/useReducer)
- **Navigation**: Bevételi tervek oldalra linking
````markdown
## 4. Income Planning Screen (Bevételek)

### Általános Layout
- **Background**: Gradient háttér (cyan→teal→green)
- **Scroll**: Vertical ScrollView
- **Padding**: 16px minden oldalon
- **SafeArea**: Top és bottom SafeAreaView

### Fejléc Szekció
```
Komponens: Központozott layout fehér szöveggel
- Ikon: TrendingUp (32px, fehér)
- Főcím: "Bevételi Tervek" (28px, bold, fehér)
- Alcím: "Havi bevételek tervezése és kezelése" (16px, fehér)
- Margin bottom: 24px
```

### Új Bevételi Terv Létrehozása
```
Card stílus:
- Background: Fehér
- Border radius: 16px
- Shadow: közepes árnyék
- Padding: 24px
- Margin bottom: 24px

Cím: "💰 Új Bevételi Terv" (20px, bold)

Form mezők:
1. Terv név:
   - Label: "Terv neve"
   - Placeholder: "pl. 2025 Január bevételek"
   - Input style: border, rounded, full width

2. Leírás (opcionális):
   - Label: "Leírás"
   - Placeholder: "Rövid leírás a tervről..."
   - Multiline: 3 sor
   - Input style: border, rounded, full width

3. Havi alapbevétel:
   - Label: "Havi alapbevétel (Ft)"
   - Placeholder: "0"
   - Keyboard: numeric
   - Input style: border, rounded, full width
   - Currency formázás real-time
```

### További Bevételek Szekció
```
Cím: "➕ További bevételek" (18px, bold)
Margin top: 24px

Hozzáadás gomb:
- Style: Outline button
- Ikon: Plus
- Szöveg: "Bevétel hozzáadása"
- Full width
- Margin bottom: 16px

Bevétel lista (ha vannak tételek):
Minden tétel egy külön Card:
- Background: világos szürke (gray-50)
- Border radius: 8px
- Padding: 16px
- Margin bottom: 12px
- Border: vékony szürke

Tétel tartalom:
- Név input:
  * Placeholder: "pl. Freelance munka"
  * Style: border nélküli, háttér fehér
- Összeg input:
  * Placeholder: "0"
  * Keyboard: numeric
  * Style: border nélküli, háttér fehér
  * Currency formázás
- Törlés gomb:
  * Ikon: X (piros)
  * Position: jobb felső sarok
  * Style: kis, circle, outline
```

### Összesítő Panel
```
Card stílus:
- Background: Gradient (zöld/teal)
- Border radius: 16px
- Padding: 20px
- Margin: 16px 0
- Text: fehér

Tartalom:
1. Alapbevétel sor:
   - "Alapbevétel:" (bal)
   - "[összeg] Ft" (jobb, bold)

2. További bevételek sor (ha vannak):
   - "További bevételek:" (bal)
   - "[összeg] Ft" (jobb, bold)

3. Separator (fehér vonal)

4. Összes bevétel:
   - "Összes bevétel:" (bal, közepes)
   - "[összeg] Ft" (jobb, nagy, extra bold)

Kondicionális megjelenítés: Csak ha van bevétel adat
```

### Akciógombok
```
Gombok vertikálisan egymás alatt:

1. Mentés gomb:
   - Style: Primary (zöld/teal)
   - Full width
   - Szöveg: "Bevételi terv mentése"
   - Ikon: Save
   - Enabled: csak ha van név és alapbevétel

2. Reset gomb:
   - Style: Outline (piros)
   - Full width
   - Szöveg: "Adatok törlése"
   - Ikon: Trash
   - Margin top: 12px
```

### Mentett Bevételi Tervek
```
Card stílus:
- Background: Fehér
- Border radius: 16px
- Shadow: közepes árnyék
- Padding: 20px
- Margin top: 32px

Cím: "📊 Mentett Bevételi Tervek" (20px, bold)

Lista megjelenítés:
Ha nincs terv:
- Központozott layout
- Ikon: DollarSign (nagy, szürke)
- Szöveg: "Még nincsenek mentett bevételi tervek"
- Kis szöveg: "Hozd létre az első tervedet fent!"

Ha vannak tervek:
Minden terv egy Card:
- Background: világos szürke gradient
- Border radius: 12px
- Padding: 16px
- Margin bottom: 16px
- Border: vékony szürke

Terv kártya tartalma:
1. Header:
   - Terv neve (18px, bold, bal)
   - Létrehozás dátuma (12px, szürke, jobb)

2. Leírás (ha van):
   - Szöveg (14px, szürke)
   - Max 2 sor, ellipsis

3. Bevétel részletezés:
   - "Alapbevétel: [összeg] Ft" (14px)
   - További bevételek listája (ha vannak):
     * "[név]: [összeg] Ft" (12px, szürke)
   - Separator
   - "Összes: [összeg] Ft" (16px, bold, zöld)

4. Akciógombok:
   - "Betöltés" (Primary, kis méret)
   - "Törlés" (Outline piros, kis méret)
   - Layout: Horizontálisan egymás mellett
```

### Betöltés Funkcionalitás
```
Terv betöltésekor:
1. Összes form mező kitöltése
2. További bevételek lista frissítése
3. Toast üzenet: "Bevételi terv betöltve!"
4. Scroll to top (form tetejére)

Validáció:
- Ha van nem mentett adat, megerősítő dialog
- "Biztosan betöltöd? A jelenlegi adatok elvesznek."
```

### Törlés Funkcionalitás
```
Megerősítő Alert/Modal:
- Cím: "Bevételi terv törlése"
- Szöveg: "Biztosan törölni szeretnéd ezt a bevételi tervet? Ez a művelet nem vonható vissza."
- Gombok:
  * "Mégse" (outline)
  * "Törlés" (piros, primary)

Sikeres törlés után:
- Toast: "Bevételi terv törölve!"
- Lista frissítése
```

### Form Validation & UX
```
Real-time validáció:
- Név mező: Minimum 3 karakter
- Alapbevétel: Pozitív szám
- További bevételek: Név és összeg kötelező

Error states:
- Piros border invalid mezőknél
- Error message a mező alatt
- Save gomb disabled invalid állapotban

Success states:
- Zöld checkmark valid mezőknél
- Toast üzenetek sikeres műveleteknél
```

### Loading States
```
1. Oldal betöltés: Skeleton placeholder a listánál
2. Mentés: Button spinner + "Mentés..."
3. Törlés: Button spinner + "Törlés..."
4. Betöltés: Form overlay + spinner
```

### Technikai Követelmények
- **Real-time Currency**: Magyar forint formázás input során
- **Auto-calculation**: Automatikus összeg kalkuláció
- **Persistence**: Supabase adatbázis integráció
- **Validation**: Form validáció real-time és submit során
- **State Management**: Complex state kezelés
- **Error Handling**: Network és validációs hibák kezelése
````markdown
## 5. Shopping List Screen (Bevásárlás)

### Általános Layout
- **Background**: Gradient háttér (cyan→teal→green)
- **Scroll**: Vertical ScrollView
- **Padding**: 16px minden oldalon
- **SafeArea**: Top és bottom SafeAreaView

### Fejléc Szekció
```
Komponens: Központozott layout fehér szöveggel
- Ikon: ShoppingCart (32px, fehér)
- Főcím: "Bevásárlólista" (28px, bold, fehér)
- Alcím: "Okos bevásárlás tervezés és követés" (16px, fehér)
- Margin bottom: 24px
```

### Gyors Akciók Panel
```
Horizontal ScrollView vagy Row layout
Card stílus: Fehér, shadow, border-radius 12px, padding 16px

Akciógombok horizontálisan:
1. Új lista:
   - Ikon: Plus
   - Szöveg: "Új lista"
   - Style: Primary (teal)

2. QR szkenner:
   - Ikon: QrCode
   - Szöveg: "Termék keresés"
   - Style: Secondary (kék)

3. Korábbi listák:
   - Ikon: Calendar
   - Szöveg: "Korábbiak"
   - Style: Outline (szürke)

4. Termékek:
   - Ikon: Package
   - Szöveg: "Termékek"
   - Style: Outline (szürke)
```

### Aktuális Bevásárlólista
```
Card stílus:
- Background: Fehér
- Border radius: 16px
- Shadow: közepes árnyék
- Padding: 20px
- Margin: 16px 0

Header:
- Cím: "🛒 Mai bevásárlólista" (20px, bold)
- Dátum: [aktuális dátum] (14px, szürke, jobb oldal)
- Üzlet kiválasztó (opcionális):
  * Select/Picker: "Válassz üzletet"
  * Options: Mentett üzletek listája

Termék hozzáadás:
- Input sor:
  * Termék név input (placeholder: "Termék keresése vagy hozzáadása...")
  * Auto-complete dropdown (termék adatbázisból)
  * Mennyiség input (mini, jobb oldal)
  * Egység select (db, kg, liter, stb.)
  * Hozzáadás gomb (Plus ikon)

Autocomplete dropdown:
- Legördülő lista matching termékekkel
- Minden termék sor:
  * Termék név (bold)
  * Kategória badge
  * Korábbi ár (ha van)
  * Üzlet név (kis szürke szöveg)
```

### Bevásárlólista Tételek
```
Lista stílus: Vertical list
Kategóriák szerint csoportosítva (Collapsible)

Kategória header:
- Kategória név + ikon (18px, bold)
- Tételek száma
- Expand/collapse chevron
- Kategória színkód jelzés

Tétel sor felépítés:
Card/ListItem stílus:
- Background: világos szürke (ha nem kipipálva)
- Background: zöld tint (ha kipipálva)
- Border radius: 8px
- Padding: 12px
- Margin bottom: 8px

Tétel tartalom:
1. Bal oldal:
   - Checkbox (kipipálás státusz)
   - Termék név (bold, ha nincs kipipálva)
   - Termék név (áthúzott, szürke, ha kipipálva)

2. Középső rész:
   - Mennyiség + egység (pl. "2 kg")
   - Becsült ár (ha van, kis szürke szöveg)

3. Jobb oldal:
   - Mennyiség módosító gombok:
     * Minus gomb (csökkentés)
     * Aktuális mennyiség (közepes)
     * Plus gomb (növelés)
   - Törlés gomb (X ikon, piros, kis méret)

Interaction states:
- Swipe to delete (iOS style)
- Long press options menu
- Tap checkbox for toggle
```

### Összesítő Panel (Sticky Bottom)
```
Fix pozíció a képernyő alján
Card stílus:
- Background: Fehér, erős shadow
- Border radius: 16px csak felül
- Padding: 20px

Tartalom:
1. Statisztikák sor:
   - "Tételek: X/Y" (kipipált/összes)
   - "Becsült költség: [összeg] Ft"

2. Progress bar:
   - Zöld színű, kipipált arány
   - Animált változás

3. Akciógombok sor:
   - "Lista mentése" (Primary, teal)
   - "Bevásárlás befejezése" (Success, zöld)
   - "Lista törlése" (Outline, piros)
```

### Üzlet/Bolt Selector
```
Modal vagy Bottom Sheet:
Cím: "Üzlet kiválasztása"

Üzlet lista:
- Minden üzlet egy Card sor
- Üzlet neve (bold)
- Üzlet típusa/hálózat (kis szöveg)
- Utolsó látogatás dátuma
- Kiválasztás checkbox

Új üzlet hozzáadása:
- Input: Üzlet neve
- Select: Üzlet típus
- "Hozzáadás" gomb

Funkcionalitás:
- Termékárak üzlet szerint
- Korábbi vásárlások története
- Üzletspecifikus ajánlások
```

### Termék Keresés/Hozzáadás Modal
```
Full Screen Modal vagy Bottom Sheet (nagyobb képernyőn)

Header:
- "Termék keresése" cím
- Bezárás X gomb
- QR szkenner gomb

Keresés szekció:
- Nagy keresés input
- Kategória filter chipek
- Legutóbbi keresések (ha vannak)

Találatok lista:
- Termék név (bold)
- Márka név (kis szöveg)
- Kategória badge
- Utolsó ár + üzlet
- "Hozzáadás" gomb minden sorban

Új termék létrehozás:
- "Nem találod? Új termék létrehozása"
- Termék adatok form:
  * Név (kötelező)
  * Márka (opcionális)
  * Kategória (select)
  * Egység (select)
  * Becsült ár (opcionális)
```

### QR Szkenner Screen
```
Full Screen Camera View
Overlay elements:
- Scanning frame (négyzet középen)
- "Termék vonalkódjának szkennelje" szöveg
- Bezárás gomb (X, bal felső)
- Kézi hozzáadás gomb (alul)

Sikeres szkennelés után:
- Auto-fill termék adatok (ha megtalálható)
- Mennyiség és egység bekérése
- "Hozzáadás listához" gomb

Error states:
- "Vonalkód nem található"
- "Kézi hozzáadás" opció
- Újrapróbálkozás gomb
```

### Korábbi Listák
```
New Screen vagy Modal
Header: "Korábbi bevásárlólisták"

Lista view:
Minden korábbi lista egy Card:
- Dátum (nagy, bold)
- Üzlet neve (ha volt kiválasztva)
- Tételek száma + össz érték
- "Betöltés" gomb (új listához másolás)
- "Törlés" gomb (megerősítéssel)

Filter opciók:
- Dátum szerint (legutóbbi, hét, hónap)
- Üzlet szerint
- Összeg szerint

Üres állapot:
- "Még nincsenek korábbi listák"
- "Készítsd el az első bevásárlólistád!"
```

### Bevásárlás Befejezése Flow
```
Modal/Screen: "Bevásárlás összesítése"

Tartalom:
1. Végleges összeg input:
   - "Tényleges költség (Ft)"
   - Becsült vs tényleges összehasonlítás

2. Hiányzó tételek kezelése:
   - "Nem sikerült megvásárolni" lista
   - Átvitel következő listára opció

3. Jegyzet/megjegyzés:
   - Multiline input
   - "Tapasztalatok, megjegyzések..."

4. Akciógombok:
   - "Bevásárlás befejezése" (Primary)
   - "Folytatás később" (Secondary)

Sikeres befejezés után:
- Toast: "Bevásárlás mentve!"
- Navigáció: Dashboard vagy új lista
- Statisztikák frissítése
```

### Technikai Követelmények
- **Offline Support**: Cache termékek és listák
- **Real-time Sync**: Családtagok között megosztás
- **Camera Integration**: QR/vonalkód szkennelés
- **Auto-complete**: Gyors termék keresés
- **Price Tracking**: Árváltozások követése
- **Store Integration**: Üzletspecifikus funkciók
- **Smart Suggestions**: AI-powered termék javaslatok
````markdown
## 6. Profile Screen (Profil)

### Általános Layout
- **Background**: Gradient háttér (cyan→teal→green)
- **Scroll**: Vertical ScrollView
- **Padding**: 16px minden oldalon
- **SafeArea**: Top és bottom SafeAreaView

### Fejléc Szekció
```
Komponens: Központozott layout fehér szöveggel
- Ikon: User (32px, fehér)
- Főcím: "Profil" (28px, bold, fehér)
- Alcím: "Személyes adatok és beállítások" (16px, fehér)
- Margin bottom: 24px
```

### Avatar és Alapadatok
```
Card stílus:
- Background: Fehér
- Border radius: 16px
- Shadow: közepes árnyék
- Padding: 24px
- Margin bottom: 16px

Tartalom layout:
1. Avatar szekció (központozott):
   - Nagy avatar (80px diameter)
   - Circular border
   - Overlay: Camera ikon (fotó változtatás)
   - Fallback: Felhasználó kezdőbetűi

2. Alapadatok (központozott):
   - Megjelenített név (24px, bold)
   - Email cím (16px, szürke)
   - Család név (14px, badge formában)
   - Utolsó bejelentkezés (12px, szürke)
```

### Személyes Adatok Form
```
Card stílus:
- Background: Fehér
- Border radius: 16px
- Shadow: közepes árnyék
- Padding: 20px

Cím: "👤 Személyes adatok" (18px, bold)

Form mezők vertikálisan:
1. Teljes név:
   - Label: "Teljes név"
   - Icon: User
   - Placeholder: "Keresztnév Vezetéknév"

2. Megjelenített név:
   - Label: "Megjelenített név"
   - Icon: User
   - Placeholder: "Ahogy mások látnak"

3. Email:
   - Label: "Email cím"
   - Icon: Mail
   - Disabled/ReadOnly: Auth adatból
   - Style: szürke háttér

4. Telefon:
   - Label: "Telefonszám"
   - Icon: Phone
   - Placeholder: "+36 30 123 4567"
   - Keyboard: phone

5. Születési dátum:
   - Label: "Születési dátum"
   - Icon: Calendar
   - Component: Date Picker
   - Format: YYYY-MM-DD

6. Lakcím:
   - Label: "Lakcím"
   - Icon: MapPin
   - Placeholder: "Város, utca, házszám"

7. Bemutatkozás:
   - Label: "Rövid bemutatkozás"
   - Icon: None
   - Component: Textarea (4 sor)
   - Placeholder: "Néhány mondat magadról..."

Input stílus mindegyiknél:
- Border: 1px szürke
- Border radius: 8px
- Padding: 12px + icon space
- Focus: teal border
- Invalid: piros border + error message
```

### Család Kezelés
```
Card stílus:
- Background: Fehér
- Border radius: 16px
- Shadow: közepes árnyék
- Padding: 20px
- Margin top: 16px

Cím: "👨‍👩‍👧‍👦 Család" (18px, bold)

Család információk:
1. Család név megjelenítés:
   - "Család neve: [név]" (16px)
   - Szerkesztés gomb (kis, jobb oldal)

2. Családtagok lista:
   - Minden tag egy sor:
     * Avatar (kis, 32px)
     * Név + szerep (Owner/Member)
     * Státusz (aktív/meghívott)
   - Max 3-4 tag megjelenítés, "Több..." link

3. Akciógombok:
   - "Családtag meghívása" (Primary, teal)
   - "Család beállítások" (Outline)
   - "Család elhagyása" (Outline, piros)
```

### Beállítások Szekció
```
Card stílus:
- Background: Fehér
- Border radius: 16px
- Shadow: közepes árnyék
- Padding: 20px
- Margin top: 16px

Cím: "⚙️ Beállítások" (18px, bold)

Beállítás sorok:
1. Értesítések:
   - Ikon: Bell
   - Szöveg: "Értesítések"
   - Toggle switch (jobb oldal)

2. Sötét mód:
   - Ikon: Moon
   - Szöveg: "Sötét megjelenés"
   - Toggle switch

3. Nyelv:
   - Ikon: Globe
   - Szöveg: "Nyelv"
   - Current: "Magyar"
   - Arrow: chevron right

4. Adatvédelem:
   - Ikon: Shield
   - Szöveg: "Adatvédelem és biztonság"
   - Arrow: chevron right

5. Súgó és támogatás:
   - Ikon: HelpCircle
   - Szöveg: "Súgó és támogatás"
   - Arrow: chevron right

Minden sor:
- Padding: 16px 0
- Border bottom: vékony szürke (utolsó kivételével)
- Tap feedback: világos szürke highlight
```

### Akciógombok Footer
```
Sticky footer vagy scroll végén
Margin top: 32px

Gombok vertikálisan:
1. Profil mentése:
   - Style: Primary (teal)
   - Full width
   - Ikon: Save
   - Text: "Profil mentése"
   - Loading state: spinner + "Mentés..."

2. Jelszó módosítása:
   - Style: Secondary (outline)
   - Full width
   - Ikon: Key
   - Text: "Jelszó módosítása"
   - Navigation: Password change screen

3. Kijelentkezés:
   - Style: Outline (piros)
   - Full width
   - Ikon: LogOut
   - Text: "Kijelentkezés"
   - Confirmation alert előtt
```

### Avatar Módosítás Modal
```
Action Sheet vagy Modal:
Opciók:
1. "Fotó készítése"
   - Camera indítása
   - Crop funkcionalitás

2. "Kép választása galériából"
   - Galéria megnyitása
   - Crop funkcionalitás

3. "Avatar eltávolítása"
   - Visszaállítás kezdőbetűkre

4. "Mégse"
   - Modal bezárása

Crop funkcionalitás:
- Square crop area
- Zoom in/out gesture
- Save/Cancel gombok
```

### Családtag Meghívás Modal
```
Modal tartalom:
1. Email input:
   - Label: "Email cím"
   - Placeholder: "tag@example.com"
   - Validation: email format

2. Szerep kiválasztás:
   - Radio buttons vagy Select
   - Options: "Tag", "Megtekintő"

3. Személyes üzenet (opcionális):
   - Textarea
   - Placeholder: "Csatlakozz a családi költségvetésünkhöz!"

4. Akciógombok:
   - "Meghívó küldése" (Primary)
   - "Mégse" (Outline)

Success state:
- Toast: "Meghívó elküldve!"
- Email konfirmációs üzenet
```

### Validation & Error Handling
```
Real-time validáció:
- Email formátum
- Telefonszám formátum
- Név minimum hossz
- Születési dátum (reális tartomány)

Error messages:
- Piros szöveg input alatt
- Toast üzenetek network hibáknál
- Form submit disabled invalid állapotban

Success feedback:
- Zöld checkmark valid mezőknél
- Toast: "Profil frissítve!"
- Loading states mentés közben
```

### Technikai Követelmények
- **Image Upload**: Avatar feltöltés és tárolás
- **Form Validation**: Comprehensive validáció
- **Real-time Updates**: Profile changes sync
- **Family Management**: Multi-user támogatás
- **Settings Persistence**: Beállítások mentése
- **Security**: Jelszó módosítás biztonságos flow
````markdown
## 7. Login/Authentication Screen (Bejelentkezés)

### Általános Layout
- **Background**: Gradient háttér (cyan→teal→green)
- **Layout**: Centered content, nem scroll
- **Padding**: 24px minden oldalon
- **SafeArea**: Top és bottom SafeAreaView

### Logo és Branding Szekció
```
Központozott layout (felső harmad):
- App logo/ikon: Wallet (48px, fehér)
- App név: "FamilyBudget" (32px, bold, fehér)
- Tagline: "Családi költségvetés menedzser" (16px, fehér, világosabb)
- Margin bottom: 48px
```

### Login Form Card
```
Card stílus:
- Background: Fehér
- Border radius: 24px
- Shadow: erős árnyék
- Padding: 32px
- Margin: 16px
- Position: középen

Form cím: "Bejelentkezés" (24px, bold, center)

Form mezők:
1. Email input:
   - Label: "Email cím"
   - Icon: Mail (bal oldal)
   - Placeholder: "name@example.com"
   - Keyboard: email
   - Auto-capitalize: none
   - Auto-complete: email

2. Jelszó input:
   - Label: "Jelszó"
   - Icon: Lock (bal oldal)
   - Eye/EyeOff icon (jobb oldal, toggle)
   - Placeholder: "••••••••"
   - Secure text entry toggle
   - Min length: 6 karakter

3. Remember me checkbox:
   - Checkbox + "Emlékezz rám" szöveg
   - Kis méret (14px)

4. Login button:
   - Style: Primary (teal/kék)
   - Full width
   - Ikon: None vagy Login arrow
   - Text: "Bejelentkezés"
   - Loading state: spinner + "Bejelentkezés..."
   - Disabled: invalid form esetén

Input stílus:
- Border: 1px szürke
- Border radius: 12px
- Padding: 16px + icon space
- Focus: teal border glow
- Error: piros border + error message alatt
```

### Alternative Login Methods
```
Separator: "vagy" szöveggel (middle)

Social login gombok:
1. Google bejelentkezés:
   - Style: Fehér háttér, Google színek
   - Ikon: Google logo
   - Text: "Folytatás Google fiókkal"
   - Full width

2. Apple bejelentkezés (iOS only):
   - Style: Fekete háttér, fehér szöveg
   - Ikon: Apple logo
   - Text: "Folytatás Apple ID-val"
   - Full width

Margin: 16px gombok között
```

### Footer Links
```
Központozott layout (card alatt):
Linkek vertikálisan:

1. Elfelejtett jelszó:
   - "Elfelejtette jelszavát?"
   - Style: Underline, teal színű
   - Navigation: Password reset screen

2. Regisztráció:
   - "Nincs még fiókja? Regisztráció"
   - Style: Underline, fehér színű
   - Navigation: Registration screen

3. Súgó:
   - "Segítségre van szüksége?"
   - Style: Underline, fehér színű (világosabb)
   - Navigation: Help/Support

Font size: 14px
Margin: 8px linkek között
```

### Error States & Validation
```
Real-time validáció:
- Email formátum ellenőrzés
- Jelszó minimum hossz
- Required field validation

Error messages:
- Piros szöveg input alatt
- Konkrét hibaüzenet (pl. "Érvényes email címet adjon meg")

Network errors:
- Toast üzenetek:
  * "Bejelentkezés sikertelen!"
  * "Email megerősítés szükséges!"
  * "Hálózati hiba, próbálja újra!"

Loading states:
- Button spinner + disabled state
- Form overlay (opcionális)
```

### Registration Screen (Regisztráció)
```
Hasonló layout a login screen-hez

Kiegészítő mezők:
1. Teljes név input
2. Jelszó megerősítés input
3. Általános Szerződési Feltételek checkbox
4. Marketing emails checkbox (opcionális)

Validáció:
- Jelszó match ellenőrzés
- Stronger jelszó requirements
- ÁSZF elfogadás kötelező

Register button:
- "Fiók létrehozása"
- Loading: "Regisztráció..."

Footer link:
- "Van már fiókja? Bejelentkezés"
```

### Password Reset Screen
```
Minimalist layout:

Header:
- Back button (chevron left)
- Cím: "Jelszó visszaállítás"

Form:
- Email input
- "Visszaállítási link küldése" button

Success state:
- Email icon
- "Email elküldve!" üzenet
- "Ellenőrizze beérkezőjét" szöveg
- "Vissza a bejelentkezéshez" link

Error handling:
- "Email cím nem található"
- Network error toasts
```

### Biometric Authentication (ha támogatott)
```
Quick access opció:
- Face ID / Touch ID / Fingerprint icon
- "Gyors bejelentkezés" szöveg
- Csak ha korábban be volt jelentkezve

Fallback:
- Ha biometric sikertelen
- Visszaváltás standard login-ra
```

---

## Technikai Összefoglaló

### Közös Design System
```
Színpaletta:
- Primary: Teal (#14B8A6)
- Secondary: Cyan (#06B6D4)  
- Success: Green (#10B981)
- Warning: Yellow (#F59E0B)
- Error: Red (#EF4444)
- Background: Gradient (cyan→teal→green)

Typography:
- Font family: System default (iOS: SF Pro, Android: Roboto)
- Header 1: 32px, bold
- Header 2: 28px, bold
- Header 3: 24px, bold
- Body: 16px, regular
- Caption: 14px, regular
- Small: 12px, regular

Shadows:
- Card shadow: 0 4px 6px rgba(0,0,0,0.1)
- Button shadow: 0 2px 4px rgba(0,0,0,0.1)
- Strong shadow: 0 10px 25px rgba(0,0,0,0.1)

Border Radius:
- Small: 8px
- Medium: 12px
- Large: 16px
- XLarge: 24px
```

### Responsive Breakpoints
```
- Phone: < 768px (single column)
- Tablet: 768px - 1024px (optional dual column)
- Large: > 1024px (multi-column layouts)

Component adaptations:
- Cards: Full width on phone, max-width on larger screens
- Grids: 1 column phone, 2+ columns tablet/desktop
- Navigation: Tab bar on phone, sidebar on tablet+
```

### Animation Guidelines
```
Transition durations:
- Quick: 150ms (state changes)
- Normal: 250ms (screen transitions)
- Slow: 350ms (complex animations)

Easing curves:
- Standard: ease-in-out
- Enter: ease-out
- Exit: ease-in

Common animations:
- Fade in/out
- Slide up/down (modals)
- Scale (buttons, cards)
- Spin (loading indicators)
```

### Navigation Structure
```
Tab Navigation (Bottom):
1. Dashboard (Áttekintés)
2. Budget (Költségvetés)
3. Income (Bevételek) 
4. Shopping (Bevásárlás)
5. Profile (Profil)

Stack Navigation per Tab:
- Nested screens in each tab
- Modal presentations for forms
- Back navigation within stacks

Deep Linking:
- URL scheme: familybudget://
- Universal links support
- State restoration
```

### Offline/Loading States
```
Loading patterns:
- Skeleton screens (initial load)
- Shimmer effects (content loading)
- Spinners (actions/submit)
- Progress bars (file uploads)

Offline handling:
- Cache critical data
- Sync when online
- Offline indicators
- Queue actions for later sync

Error boundaries:
- Graceful degradation
- Retry mechanisms
- User-friendly error messages
```

### Platform-Specific Considerations
```
iOS:
- Safe Area handling
- Native navigation patterns
- iOS-specific icons (SF Symbols)
- Haptic feedback
- Face ID / Touch ID integration

Android:
- Material Design elements
- Back button handling
- Android-specific permissions
- Fingerprint authentication
- Status bar styling

Cross-platform:
- Consistent core functionality
- Platform-appropriate UX patterns
- Shared business logic
- Platform-specific optimizations
```
