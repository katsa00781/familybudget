// Egyenleg pillanatkép — a Wallet-számlák havi mentett egyenlegének típusai.
// Az adatok az `egyenleg_pillanatkep` táblában tárolódnak, a különbséget a
// lib/egyenlegValtozas.ts számolja.

// Egy számla mentett állapota (az `accounts` JSONB egy eleme).
export interface PillanatkepSzamla {
  id: string // a Wallet számla azonosítója
  name: string
  accountType: string // "CurrentAccount" | "CreditCard" | "SavingAccount" | "Cash" | ...
  currencyCode: string
  balance: number // előjeles egyenleg; a hitelkártya-tartozás NEGATÍV
  creditLimit: number | null // csak hitelkártyánál
}

// Egy havi mentés (egy DB sor megfelelője).
export interface EgyenlegPillanatkep {
  id: string
  user_id: string
  snapshot_month: string // YYYY-MM
  snapshot_at: string // ISO időbélyeg
  source: 'automatikus' | 'kezi'
  accounts: PillanatkepSzamla[]
  created_at: string
}

export type SzamlaAllapot = 'megvan' | 'uj' | 'megszunt'

// Egy számla változása két időpont között.
export interface SzamlaValtozas {
  id: string
  name: string
  accountType: string
  currencyCode: string
  kezdo: number // új számlánál 0
  zaro: number // megszűnt számlánál 0
  kulonbseg: number
  allapot: SzamlaAllapot
}

// Pénznemenkénti összesítés. Pénznemek között nincs átváltás.
export interface PenznemOsszesito {
  currencyCode: string
  kezdo: number
  zaro: number
  kulonbseg: number
}

export interface EgyenlegValtozas {
  szamlak: SzamlaValtozas[]
  osszesitok: PenznemOsszesito[]
}
