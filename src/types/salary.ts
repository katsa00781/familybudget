// Salary Calculator Types (Hungarian Tax System)
export interface SalaryResult {
  bruttoFizetes: number;
  nettoFizetes: number;
  adottTorvenyekSzerintiAdok: TaxBreakdown;
  munkavallasiKoltseg: number;
}

export interface TaxBreakdown {
  szja: number;
  tb: number;
  egeszsegugyi: number;
  szocialis: number;
  munkanelkuli: number;
  nyugdij: number;
  osszesen: number;
}

export interface TaxBracket {
  min: number;
  max: number;
  rate: number;
}

export interface SalaryBenefits {
  cafeteria?: number;
  szepkartya?: number;
  vallalkozasiKoltseg?: number;
  egyebJuttatások?: number;
}

// 2025-ös kulcsok és konstansok
export const KULCSOK = {
  minimumBer: 290000,
  garantaltMinimumBer: 348000,
  szocialisHozzajarulas: {
    munkavállaló: 0.185,
    munkáltató: 0.135
  },
  szja: {
    alap: 0.15,
    kedvezményes: 0.10 // 25 év alattiak számára
  },
  egeszsegugyi: {
    munkavállaló: 0.03,
    munkáltató: 0.012
  },
  nyugdij: {
    munkavállaló: 0.10,
    munkáltató: 0.155
  },
  munkanelkuli: {
    munkavállaló: 0.015,
    munkáltató: 0.015
  }
} as const;
