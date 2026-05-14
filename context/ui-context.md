# UI Context

## Theme

Csak light mód. Nincs dark mode kapcsoló a felhasználói
felületen (a `.dark` CSS osztály létezik a globals.css-ben
a shadcn scaffold maradványaként, de nincs aktiválva).
A design language: friss, levegős háztartási pénzügyi
munkaterület — fehér kártyafelületek enyhe glassmorphism
effekttel, cyan-teal-emerald gradiens akcentus rendszer,
és tiszta szürke szöveg fehér háttéren.

## Colors

Két párhuzamos színrendszer működik az appban:

**shadcn/ui CSS változók** (`app/globals.css`):
A shadcn komponensek automatikusan ezeket használják.

| Szerep          | CSS változó            | Érték                    |
| --------------- | ---------------------- | ------------------------ |
| Oldal háttér    | `--background`         | `oklch(1 0 0)` (fehér)  |
| Kártya felület  | `--card`               | `oklch(1 0 0)` (fehér)  |
| Elsődleges szöv.| `--foreground`         | majdnem fekete           |
| Halványított    | `--muted-foreground`   | közepes szürke           |
| Keret           | `--border`             | világos szürke           |
| Hiba            | `--destructive`        | piros                    |

**Brand szín konstansok** (`src/config/constants.ts`):
Közvetlenül Tailwind osztályokban és gradiens kitöltésekben
használva.

| Szerep                  | Tailwind skála         | Alkalmazás                       |
| ----------------------- | ---------------------- | -------------------------------- |
| Elsődleges akcentus     | `cyan-500` / `teal-500`| Input fókusz, aktív nav, ikonok  |
| Pozitív / bevétel       | `emerald-500`          | Siker, bevétel összegek          |
| Negatív / kiadás        | `red-400` / `orange-500`| Kiadás összegek, hibák          |
| Egyenleg                | `cyan-600`             | Dashboard egyenleg szám          |
| Oldalháttér gradiens    | `cyan-50→teal-50→emerald-50` | Minden tartalomoldal      |

**Oldal háttér gradiens** (legtöbb tartalomoldalon):

```
bg-gradient-to-br from-cyan-50 via-teal-50 to-emerald-50
```

**Glassmorphism kártya** (az elsődleges kártyastílus
gradiens hátterű oldalakon):

```
bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/20
```

## Typography

| Szerep      | Betűtípus    | CSS változó             |
| ----------- | ------------ | ----------------------- |
| UI szöveg   | Geist Sans   | `--font-geist-sans`     |
| Kód / mono  | Geist Mono   | `--font-geist-mono`     |

Mindkét betűtípus `next/font/google`-n keresztül töltődik
be az `app/layout.tsx`-ben, és CSS változóként kerül az
`<body>` elemre.

## Border Radius

| Kontextus           | Osztály        |
| ------------------- | -------------- |
| Badge-ek / pill     | `rounded-full` |
| Input / gomb        | `rounded-xl`   |
| Kártyák (standard)  | `rounded-xl`   |
| Kártyák (üveg)      | `rounded-2xl`  |
| Modálok / dialógok  | `rounded-2xl`  |
| Nagy fejléc kártya  | `rounded-3xl`  |

## Component Library

shadcn/ui a Tailwind CSS v4 tetején. Komponensek a
`src/components/ui/` mappában. Új primitíveket a shadcn
CLI-vel adj hozzá — ne írj sajátot, és ne szerkeszd
a meglévő fájlokat.

Jelenleg telepített primitívek: `alert-dialog`, `avatar`,
`badge`, `button`, `card`, `checkbox`, `dialog`,
`dropdown-menu`, `form`, `input`, `label`, `popover`,
`progress`, `select`, `separator`, `sheet`, `sonner`,
`table`, `tabs`, `textarea`.

## Layout Patterns

- **App shell**: 256px (`w-64`) fix sidebar desktopon
  (fehér, `border-r border-gray-200`). Mobilon / tableten
  hamburger gomb (bal felső sarok, fixed) nyit egy `Sheet`
  komponenst bal oldalról.
- **Oldal tartalom**: `flex-1` fő terület a sidebar
  jobbján. Legtöbb oldalon gradiens háttér
  (`from-cyan-50 via-teal-50 to-emerald-50`),
  `min-h-screen` wrapper és `p-3 sm:p-4 md:p-6` padding.
- **Kártyák**: Fehér, `rounded-2xl`, `shadow` vagy
  `shadow-2xl`. Gradiens oldalon használd a glassmorphism
  változatot (`bg-white/80 backdrop-blur-xl`).
- **Modálok / dialógok**: Középre pozicionált overlay,
  shadcn `Dialog` komponens, `rounded-2xl`.
- **Toastok**: `sonner` `Toaster` a root layoutban.
  Siker: `toast.success()`, hiba: `toast.error()`,
  figyelmeztetés: `toast.warning()`.
- **Táblázatok**: shadcn `Table` komponens, halványcián
  fejléccel (`bg-cyan-50`).
- **Formok**: `react-hook-form` + `zod`. Label az input
  felett. Submit gombok gradiens kitöltéssel
  (`from-emerald-500 to-teal-600` vagy hasonló
  cyan-teal-emerald kombináció).
- **Eredmény panelek**: A bérkalkulátor és hasonló
  számítási oldalak a bal oldali 2/3 részen a formon,
  a jobb oldali 1/3 részen az eredményen osztozzák meg
  a területet (`xl:col-span-2` + `xl:col-span-1`).

## Icons

lucide-react, csak stroke-alapú ikonok.

- `size={16}` / `h-4 w-4` — inline szöveg ikonok, tábla cellák
- `size={20}` / `h-5 w-5` — navigációs sidebar elemek, gomb ikonok
- `size={24}` / `h-6 w-6` vagy nagyobb — szekció fejléc ikonok

Szín: illeszkedjen a szövegkörnyezethez (`text-gray-500` /
`text-gray-700`) vagy használj `text-cyan-500` /
`text-teal-500` akcentus ikonokhoz. A sidebar navigációs
ikonjai `size={20}`.
