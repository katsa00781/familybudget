// Egyenleg változás — a havi mentett és a későbbi számlaegyenlegek összevetése.
// Tiszta (UI-független) függvények.

import type { WalletAccount } from '@/lib/walletApi'
import type {
  EgyenlegValtozas, PenznemOsszesito, PillanatkepSzamla, SzamlaValtozas,
} from '@/types/egyenleg-pillanatkep'

// Előjeles egyenleg, a hitelkártya-tartozás NEGATÍV. A wallet-balance-snapshot Edge
// Function ugyanezzel a szabállyal ment, így a mentett és az élő érték összevethető.
export function nettoEgyenleg(wa: WalletAccount): number {
  if (wa.accountType !== 'CreditCard') return wa.currentBalance
  if (wa.creditLimit !== null && wa.creditLimit > 0 && wa.availableCredit !== null) {
    return wa.availableCredit - wa.creditLimit
  }
  return -Math.abs(wa.creditBalance ?? wa.currentBalance)
}

export function walletToPillanatkepSzamla(wa: WalletAccount): PillanatkepSzamla {
  return {
    id: wa.id,
    name: wa.name,
    accountType: wa.accountType,
    currencyCode: wa.currencyCode,
    balance: nettoEgyenleg(wa),
    creditLimit: wa.creditLimit,
  }
}

// Számlánkénti különbség. Az új számla 0-ról indul, a megszűnt 0-ra zár, így az
// összesítő különbsége mindig a záró és a kezdő összeg eltérése.
export function szamolValtozas(
  kezdo: PillanatkepSzamla[],
  zaro: PillanatkepSzamla[],
): EgyenlegValtozas {
  const zaroById = new Map(zaro.map((s) => [s.id, s]))
  const kezdoIds = new Set(kezdo.map((s) => s.id))

  const szamlak: SzamlaValtozas[] = [
    ...kezdo.map((k): SzamlaValtozas => {
      const z = zaroById.get(k.id)
      const zaroErtek = z?.balance ?? 0
      return {
        id: k.id,
        name: z?.name ?? k.name,
        accountType: k.accountType,
        currencyCode: k.currencyCode,
        kezdo: k.balance,
        zaro: zaroErtek,
        kulonbseg: zaroErtek - k.balance,
        allapot: z ? 'megvan' : 'megszunt',
      }
    }),
    ...zaro.filter((z) => !kezdoIds.has(z.id)).map((z): SzamlaValtozas => ({
      id: z.id,
      name: z.name,
      accountType: z.accountType,
      currencyCode: z.currencyCode,
      kezdo: 0,
      zaro: z.balance,
      kulonbseg: z.balance,
      allapot: 'uj',
    })),
  ]

  const osszesitoMap = new Map<string, PenznemOsszesito>()
  for (const s of szamlak) {
    const o = osszesitoMap.get(s.currencyCode)
      ?? { currencyCode: s.currencyCode, kezdo: 0, zaro: 0, kulonbseg: 0 }
    o.kezdo += s.kezdo
    o.zaro += s.zaro
    o.kulonbseg += s.kulonbseg
    osszesitoMap.set(s.currencyCode, o)
  }
  // A HUF kerül előre, a többi pénznem betűrendben
  const osszesitok = Array.from(osszesitoMap.values()).sort((a, b) => {
    if (a.currencyCode === 'HUF') return -1
    if (b.currencyCode === 'HUF') return 1
    return a.currencyCode.localeCompare(b.currencyCode)
  })

  return { szamlak, osszesitok }
}

// Az aktuális hónap ("YYYY-MM") a budapesti naptár szerint, mint az Edge Functionben.
export function aktualisHonap(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Budapest', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date()).slice(0, 7)
}

export function kovetkezoHonap(honap: string): string {
  const [y, m] = honap.split('-').map(Number)
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`
}

export function formatHonap(honap: string): string {
  const [y, m] = honap.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('hu-HU', { year: 'numeric', month: 'long' })
}
