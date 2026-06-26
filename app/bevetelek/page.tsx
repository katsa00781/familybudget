'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/utils/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card'
import { Button } from '@/src/components/ui/button'
import { Badge } from '@/src/components/ui/badge'
import { RefreshCw, Scale, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import type { BudgetCategory, BudgetItem } from '../../types/budget'
import { OLD_SUBCATEGORY_TO_IDS, resolveWalletCategory } from '@/lib/walletCategories'
import { fetchWalletMonthlySpending, type WalletCategorySpending, type WalletMonthlyResponse } from '@/lib/walletApi'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/src/components/ui/table'

interface User {
  id: string
  email?: string
}

interface BudgetPlanRecord {
  id: string
  name?: string
  budget_data: BudgetStoragePayload
  total_amount?: number
  created_at: string
  plan_month?: string | null
}

type BudgetStoragePayload = BudgetCategory[] | BudgetItem[] | BudgetStorageV2 | string | null | undefined

interface BudgetStorageV2 {
  version?: string
  categories?: BudgetCategoryCompat[]
  transferPlan?: unknown
}

interface BudgetCategoryCompat extends BudgetCategory {
  walletMainCategory?: string
  walletSubCategory?: string
  walletSubCategories?: string[]
}

interface BudgetAnalysisRow {
  category: string
  planned: number
  actual: number
  variance: number
  breakdown: { name: string; amount: number }[]
}

interface WalletCategoryTotal {
  name: string
  amount: number
}

interface BudgetAnalysisResult {
  rows: BudgetAnalysisRow[]
  walletExpenses: WalletCategoryTotal[]
  incomes: WalletCategoryTotal[]
  unmapped: WalletCategorySpending[]
  totalExpenses: number
  totalIncome: number
}

type OldWalletCategory = { mainCategory: string; subCategories: string[] }

function convertOldWalletCatsToIds(raw: unknown): string[] {
  if (!Array.isArray(raw) || raw.length === 0) return []
  if (typeof raw[0] === 'string') return raw as string[]
  // Régi objektum formátum
  const ids: string[] = []
  for (const wc of raw as OldWalletCategory[]) {
    for (const sub of wc.subCategories || []) {
      const mapped = OLD_SUBCATEGORY_TO_IDS[sub]
      if (mapped) ids.push(...mapped)
    }
    if ((wc.subCategories || []).length === 0) {
      const mapped = OLD_SUBCATEGORY_TO_IDS[wc.mainCategory]
      if (mapped) ids.push(...mapped)
    }
  }
  return [...new Set(ids)]
}

const mapWalletCategoryCompatibility = (category: BudgetCategoryCompat): BudgetCategory => {
  let walletCategoryIds: string[]

  if (category.walletCategories) {
    walletCategoryIds = convertOldWalletCatsToIds(category.walletCategories)
  } else if (category.walletMainCategory) {
    const subs = category.walletSubCategory
      ? [category.walletSubCategory]
      : (category.walletSubCategories || [])
    walletCategoryIds = convertOldWalletCatsToIds([{ mainCategory: category.walletMainCategory, subCategories: subs }])
  } else {
    walletCategoryIds = []
  }

  return {
    name: category.name,
    items: category.items?.map((item) => ({ ...item })) || [],
    walletCategories: walletCategoryIds
  }
}

const convertLegacyItemsToCategories = (items: BudgetItem[]): BudgetCategory[] => {
  const grouped = new Map<string, BudgetCategory>()

  items.forEach((item) => {
    const existing = grouped.get(item.category)
    if (existing) {
      existing.items.push({ ...item })
    } else {
      grouped.set(item.category, {
        name: item.category,
        items: [{ ...item }]
      })
    }
  })

  return Array.from(grouped.values())
}

const normalizeBudgetCategories = (payload: BudgetStoragePayload): BudgetCategory[] => {
  if (!payload) return []

  let parsed: unknown = payload

  if (typeof parsed === 'string') {
    try {
      parsed = JSON.parse(parsed)
    } catch (error) {
      console.error('Nem sikerült beolvasni a budget JSON-t:', error)
      return []
    }
  }

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return []
    const firstEntry = parsed[0] as Record<string, unknown>
    if (firstEntry && 'items' in firstEntry) {
      return (parsed as BudgetCategoryCompat[]).map(mapWalletCategoryCompatibility)
    }
    return convertLegacyItemsToCategories(parsed as BudgetItem[])
  }

  if (parsed && typeof parsed === 'object') {
    const maybeV2 = parsed as BudgetStorageV2
    if (Array.isArray(maybeV2.categories)) {
      return maybeV2.categories.map(mapWalletCategoryCompatibility)
    }
  }

  return []
}

// A Wallet havi kategória-tényadatokat a kiválasztott terv kategóriáihoz illesztjük.
// Az illesztés a kategória UUID-ja alapján történik (a terv walletCategories tömbje),
// így nincs szükség név-alapú alias-táblákra.
const analyzeWalletData = (
  walletCategories: WalletCategorySpending[],
  budgetCategories: BudgetCategory[]
): BudgetAnalysisResult => {
  const plannedMap = new Map<string, number>()
  const uuidToBudget = new Map<string, string>()
  budgetCategories.forEach((category) => {
    const planned = category.items.reduce((sum, item) => sum + (item.amount || 0), 0)
    plannedMap.set(category.name, planned)
    category.walletCategories?.forEach((id) => uuidToBudget.set(id, category.name))
  })

  const expensesByBudget = new Map<string, number>()
  const walletExpenses: WalletCategoryTotal[] = []
  const incomes: WalletCategoryTotal[] = []
  const breakdownMap = new Map<string, Map<string, number>>()
  const unmapped: WalletCategorySpending[] = []

  walletCategories.forEach((wc) => {
    // A Wallet REST a valódi (globális) rendszer-UUID-t adja angol névvel; ezt a belső
    // UUID-ra és magyar névre fordítjuk az egyeztetéshez és a megjelenítéshez.
    const { internalId, name } = resolveWalletCategory(wc.categoryId, wc.categoryName)
    if (wc.expense > 0) {
      walletExpenses.push({ name, amount: wc.expense })
      const budgetCategory = uuidToBudget.get(internalId)
      if (budgetCategory) {
        expensesByBudget.set(budgetCategory, (expensesByBudget.get(budgetCategory) || 0) + wc.expense)
        const breakdown = breakdownMap.get(budgetCategory) || new Map<string, number>()
        breakdown.set(name, (breakdown.get(name) || 0) + wc.expense)
        breakdownMap.set(budgetCategory, breakdown)
      } else {
        unmapped.push({ ...wc, categoryName: name })
      }
    }
    if (wc.income > 0) {
      incomes.push({ name, amount: wc.income })
    }
  })

  const categoryNames = new Set<string>([...plannedMap.keys(), ...expensesByBudget.keys()])
  const rows: BudgetAnalysisRow[] = Array.from(categoryNames).map((name) => {
    const planned = plannedMap.get(name) || 0
    const actual = expensesByBudget.get(name) || 0
    const breakdownEntries = Array.from(breakdownMap.get(name)?.entries() || [])
      .sort((a, b) => b[1] - a[1])
      .map(([walletCategory, amount]) => ({ name: walletCategory, amount }))

    return {
      category: name,
      planned,
      actual,
      variance: actual - planned,
      breakdown: breakdownEntries
    }
  }).sort((a, b) => a.category.localeCompare(b.category, 'hu'))

  walletExpenses.sort((a, b) => b.amount - a.amount)
  incomes.sort((a, b) => b.amount - a.amount)

  const totalExpenses = rows.reduce((sum, row) => sum + row.actual, 0)
  const totalIncome = incomes.reduce((sum, entry) => sum + entry.amount, 0)

  return { rows, walletExpenses, incomes, unmapped, totalExpenses, totalIncome }
}

const formatHuf = (value: number) =>
  value.toLocaleString('hu-HU', { maximumFractionDigits: 0 })

const formatMonthLabel = (monthKey: string) => {
  if (!monthKey.includes('-')) return monthKey
  const [year, month] = monthKey.split('-')
  return `${year}. ${month}.`
}

// Az utolsó N hónap kulcsa (YYYY-MM), a mai hónaptól visszafelé.
const recentMonths = (count: number): string[] => {
  const months: string[] = []
  const now = new Date()
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  return months
}

const planMonthOf = (plan: BudgetPlanRecord): string =>
  plan.plan_month || new Date(plan.created_at).toISOString().slice(0, 7)

export default function TervVsTenyPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [budgetPlans, setBudgetPlans] = useState<BudgetPlanRecord[]>([])
  const [selectedBudgetId, setSelectedBudgetId] = useState('')
  const [budgetLoading, setBudgetLoading] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<string>(() => new Date().toISOString().slice(0, 7))
  const [walletData, setWalletData] = useState<WalletMonthlyResponse | null>(null)
  const [walletLoading, setWalletLoading] = useState(false)
  const [walletError, setWalletError] = useState<string | null>(null)

  const supabase = createClient()

  const monthOptions = useMemo(() => {
    const months = new Set<string>(recentMonths(18))
    budgetPlans.forEach((plan) => months.add(planMonthOf(plan)))
    if (selectedMonth) months.add(selectedMonth)
    return Array.from(months).sort().reverse()
  }, [budgetPlans, selectedMonth])

  const selectedBudget = useMemo(
    () => budgetPlans.find((plan) => plan.id === selectedBudgetId) || null,
    [budgetPlans, selectedBudgetId]
  )

  const budgetCategories = useMemo(() => {
    if (!selectedBudget) return []
    return normalizeBudgetCategories(selectedBudget.budget_data)
  }, [selectedBudget])

  const analysisResult = useMemo(() => {
    if (!walletData?.categories.length || !budgetCategories.length) return null
    return analyzeWalletData(walletData.categories, budgetCategories)
  }, [walletData, budgetCategories])

  const totalPlanned = useMemo(() => {
    if (!analysisResult) return 0
    return analysisResult.rows.reduce((sum, row) => sum + row.planned, 0)
  }, [analysisResult])

  const totalVariance = useMemo(() => {
    if (!analysisResult) return 0
    return analysisResult.totalExpenses - totalPlanned
  }, [analysisResult, totalPlanned])

  const varianceIsPositive = totalVariance > 0
  const monthLabel = selectedMonth ? formatMonthLabel(selectedMonth) : 'Nincs kiválasztott hónap'
  const budgetSelectValue = selectedBudgetId || ''

  // Felhasználó betöltése
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
    }
    getUser()
  }, [supabase.auth])

  // Költségvetési tervek betöltése
  useEffect(() => {
    if (!currentUser) return
    const fetchBudgetPlans = async () => {
      try {
        setBudgetLoading(true)
        const { data, error } = await supabase
          .from('budget_plans')
          .select('id, name, budget_data, total_amount, created_at, plan_month')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false })

        if (error) throw error
        setBudgetPlans(data || [])
      } catch (error) {
        console.error('Hiba a költségvetések betöltésekor:', error)
        toast.error('Nem sikerült betölteni a költségvetési terveket')
      } finally {
        setBudgetLoading(false)
      }
    }

    fetchBudgetPlans()
  }, [currentUser, supabase])

  // A kiválasztott hónaphoz tartozó terv automatikus kiválasztása (plan_month, ill.
  // visszaesésként a created_at hónapja szerint).
  useEffect(() => {
    if (!selectedMonth || !budgetPlans.length) return
    const match = budgetPlans.find((plan) => planMonthOf(plan) === selectedMonth)
    if (match) {
      if (match.id !== selectedBudgetId) setSelectedBudgetId(match.id)
    } else if (!selectedBudgetId) {
      setSelectedBudgetId(budgetPlans[0].id)
    }
  }, [selectedMonth, budgetPlans]) // eslint-disable-line react-hooks/exhaustive-deps

  // Wallet havi tényadatok lekérése (élő API) a kiválasztott hónapra.
  const loadWalletMonth = useCallback(async (monthKey: string) => {
    if (!monthKey) return
    setWalletLoading(true)
    setWalletError(null)
    try {
      const data = await fetchWalletMonthlySpending(monthKey)
      setWalletData(data)
      if (!data.categories.length) {
        toast.info(`Nincs Wallet tranzakció erre a hónapra (${formatMonthLabel(monthKey)}).`)
      }
    } catch (error) {
      console.error('Wallet lekérési hiba:', error)
      const message = error instanceof Error ? error.message : 'Nem sikerült lekérni a Wallet adatokat'
      setWalletError(message)
      setWalletData(null)
      toast.error(message)
    } finally {
      setWalletLoading(false)
    }
  }, [])

  // Hónapváltáskor automatikusan frissítünk a Wallet-ből.
  useEffect(() => {
    if (!currentUser || !selectedMonth) return
    loadWalletMonth(selectedMonth)
  }, [currentUser, selectedMonth, loadWalletMonth])

  const hasWalletData = !!walletData && walletData.categories.length > 0

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-teal-50 to-emerald-50 p-4 sm:p-6 lg:p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 via-teal-500/20 to-emerald-500/20 animate-gradient"></div>
        <Card className="max-w-md mx-auto mt-20 bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 rounded-2xl relative z-10">
          <CardHeader>
            <CardTitle>Jelentkezz be</CardTitle>
            <CardDescription>A terv vs. tény összehasonlításhoz be kell jelentkezned</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-teal-50 to-emerald-50 p-3 sm:p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 via-teal-500/20 to-emerald-500/20 animate-gradient"></div>
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 relative z-10">

        {/* Header */}
        <div className="mb-6 sm:mb-8 bg-white/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20">
          <div className="flex items-center gap-3 sm:gap-4 mb-4">
            <div className="bg-gradient-to-br from-emerald-500 to-cyan-600 p-3 sm:p-4 rounded-2xl shadow-lg animate-pulse-slow">
              <Scale className="text-white" size={32} />
            </div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent tracking-tight">
              Terv vs. Tény
            </h1>
          </div>
          <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed px-1 font-medium">
            A Wallet havi tényadatait élőben kérjük le, és az azonos havi költségvetési terveddel vetjük össze.
          </p>
        </div>

        {/* Wallet összehasonlító */}
        <Card className="bg-white/90 backdrop-blur-xl shadow-xl border border-white/20 rounded-3xl">
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-emerald-500 to-cyan-500 p-3 rounded-2xl shadow-lg">
                  <Wallet className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold text-slate-900">Wallet havi összehasonlító</CardTitle>
                  <CardDescription>Válassz hónapot — a tényadatok automatikusan a Wallet-ből töltődnek.</CardDescription>
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                onClick={() => loadWalletMonth(selectedMonth)}
                disabled={walletLoading || !selectedMonth}
                className="h-11 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg hover:shadow-xl"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${walletLoading ? 'animate-spin' : ''}`} />
                {walletLoading ? 'Frissítés...' : 'Frissítés a Wallet-ből'}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">1. Elemzett hónap</p>
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="h-12 rounded-2xl">
                    <SelectValue placeholder="Válassz hónapot" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((month) => (
                      <SelectItem key={month} value={month}>
                        {formatMonthLabel(month)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {walletError ? (
                  <p className="text-sm text-red-600 mt-2">{walletError}</p>
                ) : walletData ? (
                  <p className="text-sm text-emerald-700 mt-2">
                    {walletData.recordCount.toLocaleString('hu-HU')} tranzakció · frissítve: {new Date(walletData.syncedAt).toLocaleString('hu-HU')}
                  </p>
                ) : null}
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">2. Költségvetési terv</p>
                <Select
                  value={budgetSelectValue}
                  onValueChange={setSelectedBudgetId}
                  disabled={budgetLoading || !budgetPlans.length}
                >
                  <SelectTrigger className="h-12 rounded-2xl">
                    <SelectValue placeholder={budgetLoading ? 'Tervek betöltése...' : 'Válassz egy tervet'} />
                  </SelectTrigger>
                  <SelectContent>
                    {budgetPlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {(plan.name || 'Névtelen terv')} · {formatMonthLabel(planMonthOf(plan))}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedBudget && planMonthOf(selectedBudget) === selectedMonth ? (
                  <p className="text-sm text-emerald-700 mt-2">Automatikusan az azonos havi terv van kiválasztva.</p>
                ) : selectedBudget ? (
                  <p className="text-sm text-amber-600 mt-2">Figyelem: a terv hónapja eltér az elemzett hónaptól.</p>
                ) : null}
              </div>
            </div>

            {analysisResult ? (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="p-4 rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl">
                    <p className="text-xs uppercase tracking-wide text-white/70">Tervezett keret</p>
                    <p className="text-2xl font-semibold">{formatHuf(totalPlanned)} Ft</p>
                  </div>
                  <div className="p-4 rounded-3xl bg-white border border-slate-200 shadow-sm">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Tényleges költés ({monthLabel})</p>
                    <p className="text-2xl font-semibold text-slate-900">{formatHuf(analysisResult.totalExpenses)} Ft</p>
                    <p className="text-xs text-slate-500">{walletData?.recordCount ?? 0} tranzakció</p>
                  </div>
                  <div className={`p-4 rounded-3xl border shadow-sm ${varianceIsPositive ? 'bg-rose-50 border-rose-200 text-rose-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'}`}>
                    <p className="text-xs uppercase tracking-wide">Eltérés</p>
                    <p className="text-2xl font-semibold">{formatHuf(totalVariance)} Ft</p>
                    <p className="text-xs">{varianceIsPositive ? 'Túlköltés' : 'Megmaradt keret'}</p>
                  </div>
                  <div className="p-4 rounded-3xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 text-blue-900">
                    <p className="text-xs uppercase tracking-wide">Wallet bevétel</p>
                    <p className="text-2xl font-semibold">{formatHuf(analysisResult.totalIncome)} Ft</p>
                    <p className="text-xs">{analysisResult.incomes.length} kategória</p>
                  </div>
                </div>

                <div className="rounded-3xl border border-white/30 bg-white/80 shadow-inner">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Kategória</TableHead>
                          <TableHead className="text-right">Terv</TableHead>
                          <TableHead className="text-right">Tény</TableHead>
                          <TableHead className="text-right">Eltérés</TableHead>
                          <TableHead>Részletek</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analysisResult.rows.map((row) => {
                          const varianceClass = row.variance > 0 ? 'text-rose-600' : row.variance < 0 ? 'text-emerald-600' : 'text-slate-600'
                          return (
                            <TableRow key={row.category}>
                              <TableCell className="font-medium">{row.category}</TableCell>
                              <TableCell className="text-right">{formatHuf(row.planned)} Ft</TableCell>
                              <TableCell className="text-right font-semibold">{formatHuf(row.actual)} Ft</TableCell>
                              <TableCell className={`text-right font-semibold ${varianceClass}`}>{formatHuf(row.variance)} Ft</TableCell>
                              <TableCell className="space-x-2">
                                {row.breakdown.slice(0, 3).map((item) => (
                                  <Badge key={`${row.category}-${item.name}`} variant="outline">
                                    {item.name}: {formatHuf(item.amount)} Ft
                                  </Badge>
                                ))}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                  <div className="rounded-3xl border border-white/40 bg-white/90 p-4">
                    <p className="text-sm font-semibold mb-3 text-slate-800">Top Wallet kategóriák</p>
                    <div className="space-y-2">
                      {analysisResult.walletExpenses.slice(0, 6).map((item) => (
                        <div key={item.name} className="flex items-center justify-between text-sm">
                          <span>{item.name}</span>
                          <span className="font-semibold text-slate-900">{formatHuf(item.amount)} Ft</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-3xl border border-white/40 bg-white/90 p-4">
                    <p className="text-sm font-semibold mb-3 text-slate-800">Bevételek</p>
                    <div className="space-y-2 text-sm">
                      {analysisResult.incomes.length === 0 ? (
                        <p className="text-gray-500">Nincs bevétel a hónapban.</p>
                      ) : (
                        analysisResult.incomes.slice(0, 6).map((income) => (
                          <div key={income.name} className="flex items-center justify-between">
                            <span>{income.name}</span>
                            <span className="font-semibold text-slate-900">{formatHuf(income.amount)} Ft</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                  <div className="rounded-3xl border border-white/40 bg-white/90 p-4">
                    <p className="text-sm font-semibold mb-3 text-slate-800">Nem párosított kategóriák</p>
                    {analysisResult.unmapped.length === 0 ? (
                      <p className="text-sm text-gray-500">Minden kategória a tervhez van rendelve.</p>
                    ) : (
                      <div className="space-y-2 text-sm">
                        {analysisResult.unmapped.slice(0, 6).map((item) => (
                          <div key={item.categoryId} className="flex items-center justify-between border border-dashed border-amber-200 rounded-2xl p-3">
                            <span className="font-semibold text-amber-900">{item.categoryName}</span>
                            <span className="text-amber-700">{formatHuf(item.expense)} Ft</span>
                          </div>
                        ))}
                        {analysisResult.unmapped.length > 6 && (
                          <p className="text-xs text-amber-600">+ {analysisResult.unmapped.length - 6} további kategória</p>
                        )}
                        <p className="text-xs text-amber-600 mt-1">
                          Ezeket a Költségvetés oldalon rendelheted Wallet-kategóriához.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : walletLoading ? (
              <div className="rounded-3xl border border-dashed border-emerald-200 bg-emerald-50/60 p-4 text-sm text-emerald-700">
                Wallet tényadatok lekérése ({monthLabel})...
              </div>
            ) : hasWalletData && budgetCategories.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-4 text-sm text-slate-700">
                Válassz egy költségvetési tervet az összehasonlításhoz.
              </div>
            ) : !hasWalletData && !walletError ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-4 text-sm text-slate-700">
                Nincs Wallet tranzakció a kiválasztott hónapra ({monthLabel}).
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
                Válassz hónapot és költségvetési tervet az összehasonlításhoz.
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
