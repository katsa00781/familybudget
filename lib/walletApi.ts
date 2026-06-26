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

export interface WalletMonthlyResponse {
  month: string // "YYYY-MM"
  currency: string
  categories: WalletCategorySpending[]
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
