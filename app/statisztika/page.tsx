'use client'

import { useState, useEffect, useCallback, useMemo, useRef, type ChangeEvent } from 'react'
import { createClient } from '@/lib/utils/supabase/client'
import { getShoppingStatistics } from '@/lib/shoppingStatistics'
import type { SpendingStatistics } from '@/lib/shoppingStatistics'
import MonthlySpendingBreakdown from '@/components/MonthlySpendingBreakdown'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card'
import { Button } from '@/src/components/ui/button'
import { Badge } from '@/src/components/ui/badge'
import { Input } from '@/src/components/ui/input'
import { 
  ShoppingCart, TrendingUp, Package, Store, Calendar, 
  AlertCircle, DollarSign, BarChart3, PieChart, Upload, FileSpreadsheet
} from 'lucide-react'
import { toast } from 'sonner'
import type { BudgetCategory, BudgetItem } from '../../types/budget'
import { WALLET_CATEGORIES, OLD_SUBCATEGORY_TO_IDS } from '@/lib/walletCategories'
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

interface WalletRecord {
  account: string
  category: string
  currency: string
  amount: number
  type: string
  note: string
  date: string
  transfer: boolean
  payment_type?: string
  labels?: string
  payee?: string
}

interface BudgetPlanRecord {
  id: string
  name?: string
  budget_data: BudgetStoragePayload
  total_amount?: number
  created_at: string
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
  unmapped: WalletRecord[]
  totalExpenses: number
  totalIncome: number
}

const CATEGORY_ALIAS_MAP: Record<string, string> = {
  'Élelmiszerek': 'Bevásárlás',
  'Drogéria': 'Gyógyszertár, drogéria',
  'Egészség, szépség': 'Egészségügyi ellátás, orvos',
  'Ajándékok, örömök': 'Ajándékok, örömök',
  'Ruházat és lábbelik': 'Ruházat és cipő',
  'Jármű karbantartás': 'Jármű karbantartása',
  'Jótékonyság, ajándékok': 'Jótékonyság, ajándékok',
  'Bár, kávézó': 'Bár, kávézó'
}

const FALLBACK_CATEGORY_MAP: Record<string, string> = {
  'Ajándékok, örömök': 'Szórakozás',
  'Bár, kávézó': 'Szórakozás',
  'Jótékonyság, ajándékok': 'Mama',
  'Kultúra, sportesemények': 'Szórakozás',
  'Nyaralás, kirándulások, szállodák': 'Szórakozás',
  'Jelzáloghitel': 'Hitel',
  'Kölcsönök, törlesztőrészletek': 'Hitel',
  'Díjak': 'Hitel',
  'Internet': 'Rezsi',
  'Szolgáltatások': 'Rezsi',
  'Ruházat és lábbelik': 'Háztartás',
  'Egyéb': 'Egyéb',
  'Járműbiztosítás': 'Autó'
}

const parseWalletCsv = (content: string): WalletRecord[] => {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  if (lines.length === 0) return []

  const headers = lines[0].split(';').map((header) => header.trim())
  const records: WalletRecord[] = []

  for (const line of lines.slice(1)) {
    const values = line.split(';')
    if (values.length < headers.length) continue

    const row: Record<string, string> = {}
    headers.forEach((header, index) => {
      row[header] = values[index]?.trim() ?? ''
    })

    const amount = Number(row.amount?.replace(',', '.') ?? NaN)
    if (!row.date || Number.isNaN(amount)) continue

    records.push({
      account: row.account || '',
      category: row.category || 'Ismeretlen',
      currency: row.currency || 'HUF',
      amount,
      type: row.type || 'Kiadás',
      note: row.note || '',
      date: row.date,
      transfer: (row.transfer || '').toLowerCase() === 'true',
      payment_type: row.payment_type,
      labels: row.labels,
      payee: row.payee
    })
  }

  return records
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

const buildWalletCategoryMap = (categories: BudgetCategory[]) => {
  // UUID → budget kategória neve
  const uuidToBudget = new Map<string, string>()
  categories.forEach((category) => {
    category.walletCategories?.forEach((id) => {
      uuidToBudget.set(id, category.name)
    })
  })

  // Wallet kategória neve → budget kategória neve (CSV rekordokhoz)
  const nameMapping = new Map<string, string>()
  WALLET_CATEGORIES.forEach((wc) => {
    const budgetCat = uuidToBudget.get(wc.id)
    if (budgetCat) nameMapping.set(wc.name, budgetCat)
  })

  return nameMapping
}

const filterRecordsByMonth = (records: WalletRecord[], monthKey: string): WalletRecord[] => {
  if (!monthKey) return records
  return records.filter((record) => record.date.startsWith(monthKey))
}

const analyzeWalletData = (records: WalletRecord[], budgetCategories: BudgetCategory[]): BudgetAnalysisResult => {
  const plannedMap = new Map<string, number>()
  budgetCategories.forEach((category) => {
    const planned = category.items.reduce((sum, item) => sum + (item.amount || 0), 0)
    plannedMap.set(category.name, planned)
  })

  const walletMapping = buildWalletCategoryMap(budgetCategories)
  const expensesByBudget = new Map<string, number>()
  const walletExpenses = new Map<string, number>()
  const incomeTotals = new Map<string, number>()
  const breakdownMap = new Map<string, Map<string, number>>()
  const unmapped: WalletRecord[] = []

  records.forEach((record) => {
    const amount = record.amount
    if (!Number.isFinite(amount)) return
    if (record.transfer) return

    const normalized = CATEGORY_ALIAS_MAP[record.category] || record.category
    let budgetCategory = walletMapping.get(normalized) || walletMapping.get(record.category)
    if (!budgetCategory) {
      budgetCategory = FALLBACK_CATEGORY_MAP[normalized] || FALLBACK_CATEGORY_MAP[record.category]
    }

    if (record.type === 'Kiadás') {
      walletExpenses.set(record.category, (walletExpenses.get(record.category) || 0) + amount)

      if (budgetCategory) {
        expensesByBudget.set(budgetCategory, (expensesByBudget.get(budgetCategory) || 0) + amount)
        const breakdown = breakdownMap.get(budgetCategory) || new Map<string, number>()
        breakdown.set(record.category, (breakdown.get(record.category) || 0) + amount)
        breakdownMap.set(budgetCategory, breakdown)
      } else {
        unmapped.push(record)
      }
    } else if (record.type === 'Bevétel') {
      incomeTotals.set(record.category, (incomeTotals.get(record.category) || 0) + amount)
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

  const walletExpensesTotals = Array.from(walletExpenses.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, amount]) => ({ name, amount }))

  const incomeTotalsSorted = Array.from(incomeTotals.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, amount]) => ({ name, amount }))

  const totalExpenses = rows.reduce((sum, row) => sum + row.actual, 0)
  const totalIncome = incomeTotalsSorted.reduce((sum, entry) => sum + entry.amount, 0)

  return {
    rows,
    walletExpenses: walletExpensesTotals,
    incomes: incomeTotalsSorted,
    unmapped,
    totalExpenses,
    totalIncome
  }
}

const formatHuf = (value: number) =>
  value.toLocaleString('hu-HU', { maximumFractionDigits: 0 })

const formatMonthLabel = (monthKey: string) => {
  if (!monthKey.includes('-')) return monthKey
  const [year, month] = monthKey.split('-')
  return `${year}. ${month}.`
}

export default function StatisztikaPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [statistics, setStatistics] = useState<SpendingStatistics | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [timeRange, setTimeRange] = useState<string>('all')
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('month')
  const [budgetPlans, setBudgetPlans] = useState<BudgetPlanRecord[]>([])
  const [selectedBudgetId, setSelectedBudgetId] = useState('')
  const [budgetLoading, setBudgetLoading] = useState(false)
  const [walletRecords, setWalletRecords] = useState<WalletRecord[]>([])
  const [selectedMonth, setSelectedMonth] = useState<string>(() => new Date().toISOString().slice(0, 7))
  const [csvFileName, setCsvFileName] = useState('')
  const [csvError, setCsvError] = useState<string | null>(null)
  const [isParsingCsv, setIsParsingCsv] = useState(false)
  
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const monthOptions = useMemo(() => {
    const months = new Set<string>()
    walletRecords.forEach((record) => {
      if (record.date?.length >= 7) {
        months.add(record.date.slice(0, 7))
      }
    })
    if (months.size === 0) {
      budgetPlans.forEach((plan) => {
        if (plan.created_at) {
          const iso = new Date(plan.created_at).toISOString().slice(0, 7)
          months.add(iso)
        }
      })
    }
    return Array.from(months).sort().reverse()
  }, [walletRecords, budgetPlans])

  const selectedBudget = useMemo(
    () => budgetPlans.find((plan) => plan.id === selectedBudgetId) || null,
    [budgetPlans, selectedBudgetId]
  )

  const budgetCategories = useMemo(() => {
    if (!selectedBudget) return []
    return normalizeBudgetCategories(selectedBudget.budget_data)
  }, [selectedBudget])

  const filteredWalletRecords = useMemo(() => {
    return filterRecordsByMonth(walletRecords, selectedMonth)
  }, [walletRecords, selectedMonth])

  const analysisResult = useMemo(() => {
    if (!filteredWalletRecords.length || !budgetCategories.length) return null
    return analyzeWalletData(filteredWalletRecords, budgetCategories)
  }, [filteredWalletRecords, budgetCategories])

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
  const monthSelectValue = monthOptions.length ? selectedMonth : ''

  // Felhasználó betöltése
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
    }
    getUser()
  }, [supabase.auth])

  // Calculate date range
  const getDateRange = useCallback(() => {
    const end = new Date()
    const start = new Date()
    
    switch (timeRange) {
      case '7':
        start.setDate(end.getDate() - 7)
        break
      case '30':
        start.setDate(end.getDate() - 30)
        break
      case '90':
        start.setDate(end.getDate() - 90)
        break
      case '180':
        start.setDate(end.getDate() - 180)
        break
      case '365':
        start.setFullYear(end.getFullYear() - 1)
        break
      case 'all':
        return { start: undefined, end: undefined }
    }
    
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    }
  }, [timeRange])

  // Statisztikák betöltése
  const loadStatistics = useCallback(async () => {
    if (!currentUser) return
    
    try {
      setIsLoading(true)
      const { start, end } = getDateRange()
      const stats = await getShoppingStatistics(currentUser.id, start, end, groupBy)
      setStatistics(stats)
      console.log('Statistics loaded:', stats)
    } catch (error) {
      console.error('Hiba a statisztikák betöltésekor:', error)
      toast.error('Hiba történt a statisztikák betöltésekor!')
    } finally {
      setIsLoading(false)
    }
  }, [currentUser, groupBy, getDateRange])

  useEffect(() => {
    if (currentUser) {
      loadStatistics()
    }
  }, [currentUser, loadStatistics])

  useEffect(() => {
    if (!currentUser) return
    const fetchBudgetPlans = async () => {
      try {
        setBudgetLoading(true)
        const { data, error } = await supabase
          .from('budget_plans')
          .select('id, name, budget_data, total_amount, created_at')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false })

        if (error) throw error
        setBudgetPlans(data || [])
        if (!selectedBudgetId && data && data.length > 0) {
          setSelectedBudgetId(data[0].id)
        }
      } catch (error) {
        console.error('Hiba a költségvetések betöltésekor:', error)
        toast.error('Nem sikerült betölteni a költségvetési terveket')
      } finally {
        setBudgetLoading(false)
      }
    }

    fetchBudgetPlans()
  }, [currentUser])

  useEffect(() => {
    if (!monthOptions.length) return
    if (!selectedMonth || !monthOptions.includes(selectedMonth)) {
      setSelectedMonth(monthOptions[0])
    }
  }, [monthOptions, selectedMonth])

  const handleCsvUpload = useCallback(async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsParsingCsv(true)
    setCsvError(null)

    try {
      const text = await file.text()
      const parsed = parseWalletCsv(text)
      if (!parsed.length) {
        setWalletRecords([])
        setCsvFileName('')
        setCsvError('A fájl nem tartalmazott feldolgozható tranzakciókat.')
      } else {
        setWalletRecords(parsed)
        setCsvFileName(file.name)
        toast.success(`Wallet adatok betöltve (${parsed.length} sor).`)
      }
    } catch (error) {
      console.error('CSV feldolgozási hiba:', error)
      setCsvError('Nem sikerült feldolgozni a CSV fájlt.')
      toast.error('Nem sikerült beolvasni a CSV fájlt')
    } finally {
      setIsParsingCsv(false)
      event.target.value = ''
    }
  }, [])

  const handleFilePicker = () => {
    fileInputRef.current?.click()
  }

  const hasCsvData = walletRecords.length > 0
  const filteredRecordCount = filteredWalletRecords.length

  // Format period for display
  const formatPeriod = (period: string) => {
    if (period.includes('W')) {
      const [year, week] = period.split('-W')
      return `${year} ${week}. hét`
    }
    const [year, month] = period.split('-')
    if (month) {
      return `${year}. ${month}.`
    }
    return period
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-teal-50 to-emerald-50 p-4 sm:p-6 lg:p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 via-teal-500/20 to-emerald-500/20 animate-gradient"></div>
        <Card className="max-w-md mx-auto mt-20 bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 rounded-2xl relative z-10">
          <CardHeader>
            <CardTitle>Jelentkezz be</CardTitle>
            <CardDescription>A statisztikákhoz be kell jelentkezned</CardDescription>
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
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-3 sm:p-4 rounded-2xl shadow-lg animate-pulse-slow">
              <BarChart3 className="text-white" size={32} />
            </div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent tracking-tight">
              Kiadások Statisztika
            </h1>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed px-1 font-medium">
              Bevásárlások részletes elemzése
            </p>
            <Button 
              onClick={loadStatistics} 
              disabled={isLoading}
              className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 font-bold rounded-xl"
            >
              {isLoading ? 'Betöltés...' : 'Frissítés'}
            </Button>
          </div>
        </div>

        {/* Wallet CSV elemzés */}
        <Card className="bg-white/90 backdrop-blur-xl shadow-xl border border-white/20 rounded-3xl">
          <CardHeader className="pb-4">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-emerald-500 to-cyan-500 p-3 rounded-2xl shadow-lg">
                  <FileSpreadsheet className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl font-semibold text-slate-900">Wallet CSV összehasonlító</CardTitle>
                  <CardDescription>Az appon belül látod, mennyire tartod a havi kereted a valós költésekkel szemben.</CardDescription>
                </div>
              </div>
              <Badge variant="outline" className="border-emerald-200 text-emerald-700 bg-emerald-50/80">Béta</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={handleCsvUpload}
            />

            <div className="grid gap-4 lg:grid-cols-5">
              <div className="lg:col-span-3 space-y-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">1. Wallet export</p>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleFilePicker}
                    disabled={isParsingCsv}
                    className="h-12 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white shadow-lg hover:shadow-xl"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {isParsingCsv ? 'Feldolgozás...' : 'CSV kiválasztása'}
                  </Button>
                  <div className="flex-1 text-sm text-gray-600 truncate">
                    {csvFileName ? <span className="font-medium text-slate-800">{csvFileName}</span> : 'Nincs fájl kiválasztva'}
                  </div>
                </div>
                {csvError ? (
                  <p className="text-sm text-red-600">{csvError}</p>
                ) : hasCsvData ? (
                  <p className="text-sm text-emerald-700">
                    {walletRecords.length.toLocaleString('hu-HU')} tranzakció beolvasva · {monthOptions.length} hónap azonosítva
                  </p>
                ) : (
                  <p className="text-sm text-gray-500">
                    A Wallet alkalmazásban az Export &gt; CSV funkcióval töltsd le az adatokat, majd húzd ide a fájlt.
                  </p>
                )}
              </div>
              <div className="lg:col-span-2 rounded-3xl border border-dashed border-emerald-200 bg-gradient-to-br from-emerald-50 to-cyan-50 p-4 text-sm text-emerald-900 shadow-inner">
                <p className="font-semibold mb-2">Automatikus illesztés</p>
                <p className="text-emerald-800 text-sm leading-relaxed">
                  A Wallet kategóriákat a FamilyBudget kategóriákhoz rendeljük, felismerjük az aliasokat és jelezzük, hol csúszik meg a havi terv.
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
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
                        {(plan.name || 'Névtelen terv')} · {new Date(plan.created_at).toLocaleDateString('hu-HU', { year: 'numeric', month: '2-digit' })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">3. Elemzett hónap</p>
                <Select
                  value={monthSelectValue}
                  onValueChange={setSelectedMonth}
                  disabled={!monthOptions.length}
                >
                  <SelectTrigger className="h-12 rounded-2xl">
                    <SelectValue placeholder="Nincs elérhető hónap" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((month) => (
                      <SelectItem key={month} value={month}>
                        {formatMonthLabel(month)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    <p className="text-xs text-slate-500">{filteredRecordCount} tranzakció</p>
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
                    <p className="text-sm font-semibold mb-3 text-slate-800">Ismeretlen tételek</p>
                    {analysisResult.unmapped.length === 0 ? (
                      <p className="text-sm text-gray-500">Minden tranzakció kategorizálva lett.</p>
                    ) : (
                      <div className="space-y-2 text-sm">
                        {analysisResult.unmapped.slice(0, 5).map((item, index) => (
                          <div key={`${item.category}-${index}`} className="flex flex-col border border-dashed border-amber-200 rounded-2xl p-3">
                            <span className="font-semibold text-amber-900">{item.category}</span>
                            <span className="text-amber-700">{formatHuf(item.amount)} Ft · {item.date}</span>
                            <span className="text-xs text-amber-600">{item.note || 'Nincs megjegyzés'}</span>
                          </div>
                        ))}
                        {analysisResult.unmapped.length > 5 && (
                          <p className="text-xs text-amber-600">+ {analysisResult.unmapped.length - 5} további tétel</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : hasCsvData && budgetCategories.length > 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50/80 p-4 text-sm text-slate-700">
                Nincs a kiválasztott hónapra eső tranzakció, kérlek válassz másik hónapot.
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-600">
                Aktiváld a költségvetési tervet és tölts fel Wallet CSV-t az összehasonlításhoz.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Szűrők */}
        <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 hover:shadow-purple-500/20 hover:scale-[1.01] transition-all duration-300 rounded-2xl">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Időszak</label>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="h-11 sm:h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Utolsó 7 nap</SelectItem>
                    <SelectItem value="30">Utolsó 30 nap</SelectItem>
                    <SelectItem value="90">Utolsó 90 nap</SelectItem>
                    <SelectItem value="180">Utolsó 6 hónap</SelectItem>
                    <SelectItem value="365">Utolsó év</SelectItem>
                    <SelectItem value="all">Összes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Csoportosítás</label>
                <Select value={groupBy} onValueChange={(v) => setGroupBy(v as 'day' | 'week' | 'month')}>
                  <SelectTrigger className="h-11 sm:h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Naponta</SelectItem>
                    <SelectItem value="week">Hetente</SelectItem>
                    <SelectItem value="month">Havonta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {!statistics || statistics.total_shoppings === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nincs adat az adott időszakban</p>
              <p className="text-sm text-gray-500 mt-2">Tölts fel bevásárlásokat JSON formátumban!</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Összesítő mutatók */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Card className="bg-white/90 backdrop-blur-xl shadow-xl border border-white/20 hover:shadow-green-500/30 hover:scale-[1.05] transition-all duration-300 rounded-2xl">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Összes költés</p>
                      <p className="text-xl sm:text-2xl font-bold text-green-600">
                        {statistics.total_spent.toLocaleString('hu-HU')} Ft
                      </p>
                    </div>
                    <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-xl shadow-xl border border-white/20 hover:shadow-blue-500/30 hover:scale-[1.05] transition-all duration-300 rounded-2xl">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Bevásárlások</p>
                      <p className="text-xl sm:text-2xl font-bold">{statistics.total_shoppings}</p>
                    </div>
                    <ShoppingCart className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-xl shadow-xl border border-white/20 hover:shadow-purple-500/30 hover:scale-[1.05] transition-all duration-300 rounded-2xl">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Átlag/bevásárlás</p>
                      <p className="text-xl sm:text-2xl font-bold">
                        {statistics.avg_per_shopping.toLocaleString('hu-HU')} Ft
                      </p>
                    </div>
                    <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-xl shadow-xl border border-white/20 hover:shadow-orange-500/30 hover:scale-[1.05] transition-all duration-300 rounded-2xl">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Termékek száma</p>
                      <p className="text-xl sm:text-2xl font-bold">{statistics.total_items}</p>
                    </div>
                    <Package className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Időbeli bontás */}
            <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 hover:shadow-indigo-500/20 transition-all duration-300 rounded-2xl">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Időbeli bontás
                </CardTitle>
                <CardDescription>Költések {groupBy === 'day' ? 'naponta' : groupBy === 'week' ? 'hetente' : 'havonta'}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Időszak</TableHead>
                        <TableHead className="text-right">Összeg</TableHead>
                        <TableHead className="text-right">Bevásárlások</TableHead>
                        <TableHead className="text-right">Termékek</TableHead>
                        <TableHead className="text-right">Átlag</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statistics.by_time.map((period, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{formatPeriod(period.period)}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {period.total_amount.toLocaleString('hu-HU')} Ft
                          </TableCell>
                          <TableCell className="text-right">{period.shopping_count}</TableCell>
                          <TableCell className="text-right">{period.item_count}</TableCell>
                          <TableCell className="text-right">
                            {period.avg_per_shopping.toLocaleString('hu-HU')} Ft
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Kategóriák */}
            <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 hover:shadow-green-500/20 transition-all duration-300 rounded-2xl">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Kategóriák szerint
                </CardTitle>
                <CardDescription>Kiadások termékkategóriánként</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-4">
                  {statistics.by_category.map((cat, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{cat.category}</span>
                          <Badge variant="outline">{cat.item_count} tétel</Badge>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-green-600">
                            {cat.total_spent.toLocaleString('hu-HU')} Ft
                          </span>
                          <span className="text-sm text-gray-500 ml-2">({cat.percentage.toFixed(1)}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${cat.percentage}%` }}
                        />
                      </div>
                      <div className="text-sm text-gray-600">
                        Átlag ár: {cat.avg_item_price.toLocaleString('hu-HU')} Ft
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Top 10 termék */}
              <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 hover:shadow-purple-500/20 transition-all duration-300 rounded-2xl">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Top 10 termék
                  </CardTitle>
                  <CardDescription>Legtöbbet vásárolt termékek</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {statistics.by_product.slice(0, 10).map((product, index) => (
                      <div key={index} className="p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="font-medium">{product.product_name}</div>
                            <Badge variant="outline" className="mt-1">{product.category}</Badge>
                          </div>
                          <div className="text-right ml-3">
                            <div className="font-bold text-green-600">
                              {product.total_spent.toLocaleString('hu-HU')} Ft
                            </div>
                            <div className="text-xs text-gray-500">
                              {product.purchase_count}x vásárolva
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-4 text-sm text-gray-600">
                          <span>Mennyiség: {product.total_quantity} {product.product_name.includes('kg') ? 'kg' : 'db'}</span>
                          <span>Átlag: {product.avg_price.toLocaleString('hu-HU')} Ft</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Boltok szerint */}
              <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 hover:shadow-blue-500/20 transition-all duration-300 rounded-2xl">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Store className="h-5 w-5" />
                    Boltok szerint
                  </CardTitle>
                  <CardDescription>Költések boltonként</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {statistics.by_store.map((store, index) => (
                      <div key={index} className="p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              <Store className="h-4 w-4 text-gray-400" />
                              {store.store_name}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {store.shopping_count} bevásárlás
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-green-600">
                              {store.total_spent.toLocaleString('hu-HU')} Ft
                            </div>
                            <div className="text-xs text-gray-500">
                              Átlag: {store.avg_per_visit.toLocaleString('hu-HU')} Ft
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(store.first_visit).toLocaleDateString('hu-HU')} - {new Date(store.last_visit).toLocaleDateString('hu-HU')}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Havi bontás részletes táblázat */}
            <MonthlySpendingBreakdown 
              userId={currentUser.id}
              startDate={getDateRange().start}
              endDate={getDateRange().end}
            />
          </>
        )}

      </div>
    </div>
  )
}
