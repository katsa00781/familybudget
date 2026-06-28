// Wallet (BudgetBakers) élő adatok lekérése a `wallet-annual-cashflow` Supabase
// Edge Function-ön keresztül. A token a szerveren (Supabase secrets) marad — a
// kliens csak a saját JWT-jével hívja a függvényt.

import { createClient } from '@/lib/utils/supabase/client'
import type { MonthlyActuals } from '@/lib/walletCsv'

export interface WalletAnnualResponse {
  year: number
  currency: string
  months: MonthlyActuals[]
  syncedAt: string
}

// Egy teljes év havi tény bevétel/kiadás összesítése a Wallet REST API-ból.
export async function fetchWalletAnnualActuals(year: number): Promise<WalletAnnualResponse> {
  const supabase = createClient()
  const { data, error } = await supabase.functions.invoke('wallet-annual-cashflow', {
    body: { year },
  })

  if (error) {
    // A functions.invoke nem-2xx esetén hibát ad; próbáljuk a függvény üzenetét kinyerni
    let message = error.message || 'Nem sikerült lekérni a Wallet adatokat'
    try {
      const ctx = (error as { context?: Response }).context
      if (ctx && typeof ctx.json === 'function') {
        const body = await ctx.json()
        if (body?.error?.message) message = body.error.message
      }
    } catch {
      // marad az alap üzenet
    }
    throw new Error(message)
  }

  if (data?.error) {
    throw new Error(data.error.message || 'Wallet API hiba')
  }

  return data as WalletAnnualResponse
}

export interface WalletCategorySpending {
  categoryId: string
  categoryName: string
  expense: number
  income: number
}

export interface WalletDailySpending {
  day: number // a hónap napja (1-31)
  income: number
  expense: number
}

export interface WalletMonthlyResponse {
  month: string // "YYYY-MM"
  currency: string
  categories: WalletCategorySpending[]
  daily?: WalletDailySpending[] // napi bontás (a havi trendhez); régebbi függvény-verzióban hiányozhat
  totalExpense: number
  totalIncome: number
  recordCount: number
  syncedAt: string
}

// Egy hónap tényleges kiadásai/bevételei KATEGÓRIA szerinti bontásban a Wallet
// REST API-ból (a `wallet-monthly-spending` Edge Function-ön keresztül).
export async function fetchWalletMonthlySpending(monthKey: string): Promise<WalletMonthlyResponse> {
  const supabase = createClient()
  const { data, error } = await supabase.functions.invoke('wallet-monthly-spending', {
    body: { month: monthKey },
  })

  if (error) {
    let message = error.message || 'Nem sikerült lekérni a Wallet adatokat'
    try {
      const ctx = (error as { context?: Response }).context
      if (ctx && typeof ctx.json === 'function') {
        const body = await ctx.json()
        if (body?.error?.message) message = body.error.message
      }
    } catch {
      // marad az alap üzenet
    }
    throw new Error(message)
  }

  if (data?.error) {
    throw new Error(data.error.message || 'Wallet API hiba')
  }

  return data as WalletMonthlyResponse
}

export interface WalletAccount {
  id: string
  name: string
  accountType: string // "CurrentAccount" | "CreditCard" | "SavingAccount" | "Cash" | ...
  currencyCode: string
  archived: boolean
  currentBalance: number // standard számlánál az egyenleg (lehet negatív); hitelkártyánál a tartozás
  creditLimit: number | null // csak hitelkártyánál
  creditBalance: number | null // csak hitelkártyánál: aktuális tartozás
  availableCredit: number | null // csak hitelkártyánál: elérhető keret
}

export interface WalletAccountsResponse {
  currency: string
  accounts: WalletAccount[]
  syncedAt: string
}

// A felhasználó számláinak AKTUÁLIS egyenlege a Wallet REST API-ból (a
// `wallet-accounts` Edge Function-ön keresztül). Az Egyenleg Flow oldal ebből
// tölti fel a napi előrejelzés induló egyenlegeit.
export async function fetchWalletAccounts(includeArchived = false): Promise<WalletAccountsResponse> {
  const supabase = createClient()
  const { data, error } = await supabase.functions.invoke('wallet-accounts', {
    body: { includeArchived },
  })

  if (error) {
    let message = error.message || 'Nem sikerült lekérni a Wallet számlákat'
    try {
      const ctx = (error as { context?: Response }).context
      if (ctx && typeof ctx.json === 'function') {
        const body = await ctx.json()
        if (body?.error?.message) message = body.error.message
      }
    } catch {
      // marad az alap üzenet
    }
    throw new Error(message)
  }

  if (data?.error) {
    throw new Error(data.error.message || 'Wallet API hiba')
  }

  return data as WalletAccountsResponse
}
