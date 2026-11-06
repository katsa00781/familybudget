// Egységár-számítás az árfigyeléshez
//
// Az ártörténetben (`product_price_history`) a `unit_price` hol kiszerelésenkénti ár
// (pl. „400 g” csomag 899 Ft), hol kg-/literár (mérlegelt áru: unit = „kg”, tört mennyiség),
// a `unit` mező pedig szabad szöveg („400 g”, „6x1.5 l”, „0.967 kg × 2399 Ft/kg”, „db”…).
// Két ár csak akkor vethető össze, ha AZONOS boltból és AZONOS mértékegységre vetítve
// (Ft/kg, Ft/l, Ft/db, Ft/csomag) számoljuk őket — ezt adja az `egysegar()` és az
// `osszehasonlitasiKulcs()`.
//
// ⚠️ Az MCP szerver (`mcp/src/lib/egysegar.ts`) ugyanezt a fájlt használja másolatként —
// a szabályt a kettőben együtt kell módosítani.

/** Mire vetített az egységár. A `csomag` ismeretlen méretű kiszerelés (pl. „db”, „cs”). */
export type Mertekegyseg = 'kg' | 'l' | 'db' | 'csomag'

export interface Egysegar {
  /** Ár egy mértékegységre (Ft/kg, Ft/l, Ft/db vagy Ft/csomag) */
  ertek: number
  mertekegyseg: Mertekegyseg
}

export interface EgysegarForras {
  unit_price: number | string
  unit?: string | null
  product_name?: string | null
}

const SZAM = '(\\d+(?:[.,]\\d+)?)'
const MENNYISEG_EGYSEG = '(kg|dkg|g|l|dl|cl|ml)'

/** Tömeg/térfogat egység → szorzó a kg/l alapegységre */
const SZORZO: Record<string, { alap: 'kg' | 'l'; szorzo: number }> = {
  kg: { alap: 'kg', szorzo: 1 },
  dkg: { alap: 'kg', szorzo: 0.01 },
  g: { alap: 'kg', szorzo: 0.001 },
  l: { alap: 'l', szorzo: 1 },
  dl: { alap: 'l', szorzo: 0.1 },
  cl: { alap: 'l', szorzo: 0.01 },
  ml: { alap: 'l', szorzo: 0.001 },
}

const szam = (s: string): number => parseFloat(s.replace(',', '.'))

/**
 * Kiszerelés (tömeg/térfogat) kiolvasása szövegből: „400 g”, „1,01 kg”, „6x1.5 l”,
 * „2 × 1.5 l”, „1,5 l × 6 db”, „Görög joghurt 400g”. Eredmény kg-ban vagy literben.
 */
export const kiszerelesOlvasas = (szoveg: string): { mennyiseg: number; alap: 'kg' | 'l' } | null => {
  const s = szoveg.toLowerCase()

  // „6x1.5 l”, „10x28 g”, „2 × 1.5 l”
  const elol = s.match(new RegExp(`(\\d+)\\s*[x×*]\\s*${SZAM}\\s*${MENNYISEG_EGYSEG}(?![a-z])`))
  if (elol) {
    const { alap, szorzo } = SZORZO[elol[3]]
    const m = parseInt(elol[1], 10) * szam(elol[2]) * szorzo
    return m > 0 ? { mennyiseg: m, alap } : null
  }

  // „1,5 l × 6 db”
  const hatul = s.match(new RegExp(`${SZAM}\\s*${MENNYISEG_EGYSEG}\\s*[x×*]\\s*(\\d+)\\s*db`))
  if (hatul) {
    const { alap, szorzo } = SZORZO[hatul[2]]
    const m = szam(hatul[1]) * szorzo * parseInt(hatul[3], 10)
    return m > 0 ? { mennyiseg: m, alap } : null
  }

  // „400 g”, „1,01 kg”, „Pepsi 2,25l”
  const egyszeru = s.match(new RegExp(`(?:^|[^\\d.,])${SZAM}\\s*${MENNYISEG_EGYSEG}(?![a-z])`))
  if (egyszeru) {
    const { alap, szorzo } = SZORZO[egyszeru[2]]
    const m = szam(egyszeru[1]) * szorzo
    return m > 0 ? { mennyiseg: m, alap } : null
  }

  return null
}

/**
 * Egy ártörténet-bejegyzés egységára. Sorrend:
 *  1. kifejezett kg-/literár a kiszerelésben („0.967 kg × 2399 Ft/kg”)
 *  2. tömeg/térfogat a kiszerelésben („400 g”, „6x1.5 l”) → ár / mennyiség
 *  3. kifejezett darabár („2 × 50 Ft/db”) vagy darabszámos csomag („10 db”) → Ft/db
 *  4. puszta „kg” kiszerelés → mérlegelt áru, az ár már Ft/kg
 *  5. tömeg/térfogat a terméknévben („Görög joghurt 400g”)
 *  6. puszta „l” kiszerelés → Ft/l
 *  7. egyébként ismeretlen méretű csomag → Ft/csomag
 */
export const egysegar = (rec: EgysegarForras): Egysegar => {
  const ar = Number(rec.unit_price) || 0
  const unit = (rec.unit ?? '').trim().toLowerCase()

  // 1. „… 2399 Ft/kg”, „… 699 Ft/l”
  const kifejezett = unit.match(new RegExp(`${SZAM}\\s*ft\\s*/\\s*(kg|l)(?![a-z])`))
  if (kifejezett) {
    return { ertek: szam(kifejezett[1]), mertekegyseg: kifejezett[2] as 'kg' | 'l' }
  }

  // 2. kiszerelés a unit mezőben
  const kiszereles = kiszerelesOlvasas(unit)
  if (kiszereles) return { ertek: ar / kiszereles.mennyiseg, mertekegyseg: kiszereles.alap }

  // 3. darabár / darabszámos csomag
  const darabar = unit.match(new RegExp(`${SZAM}\\s*ft\\s*/\\s*db`))
  if (darabar) return { ertek: szam(darabar[1]), mertekegyseg: 'db' }
  const darab = unit.match(/^(\d+)\s*db\b/)
  if (darab && parseInt(darab[1], 10) > 1) {
    return { ertek: ar / parseInt(darab[1], 10), mertekegyseg: 'db' }
  }

  // 4. mérlegelt áru
  if (unit === 'kg' || unit === 'kilogramm') return { ertek: ar, mertekegyseg: 'kg' }

  // 5. kiszerelés a terméknévben
  const nevbol = rec.product_name ? kiszerelesOlvasas(rec.product_name) : null
  if (nevbol) return { ertek: ar / nevbol.mennyiseg, mertekegyseg: nevbol.alap }

  // 6. literár
  if (unit === 'l' || unit === 'liter') return { ertek: ar, mertekegyseg: 'l' }

  // 7. ismeretlen méretű csomag
  return { ertek: ar, mertekegyseg: 'csomag' }
}

/** Bolt-kulcs: kis/nagybetű és szóköz független, a hiányzó bolt üres string */
export const boltKulcs = (bolt?: string | null): string => (bolt ?? '').trim().toLowerCase()

/** Megjelenítendő boltnév */
export const boltNev = (bolt?: string | null): string => (bolt ?? '').trim() || 'Ismeretlen bolt'

/**
 * Összehasonlítási csoport: azonos termék + azonos bolt + azonos mértékegység.
 * Csak az azonos kulcsú bejegyzések árai vethetők össze.
 */
export const osszehasonlitasiKulcs = (
  rec: EgysegarForras & { store_name?: string | null }
): string => `${rec.product_name ?? ''}|${boltKulcs(rec.store_name)}|${egysegar(rec).mertekegyseg}`

/** Egységár címkéje: „Ft/kg”, „Ft/l”, „Ft/db”, csomagnál „Ft” */
export const egysegCimke = (m: Mertekegyseg): string =>
  m === 'csomag' ? 'Ft' : `Ft/${m}`

/** Egységár formázva, pl. „2 713 Ft/kg” */
export const egysegarFormat = (e: Egysegar): string =>
  `${Math.round(e.ertek).toLocaleString('hu-HU')} ${egysegCimke(e.mertekegyseg)}`
