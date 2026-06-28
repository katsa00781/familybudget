'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card'
import { Input } from '@/src/components/ui/input'
import { Button } from '@/src/components/ui/button'
import { Badge } from '@/src/components/ui/badge'
import { Label } from '@/src/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import {
  Wallet, Plus, Trash2, Save, RefreshCw, CalendarClock, AlertTriangle,
  CreditCard, Banknote, PiggyBank, ArrowLeftRight, TrendingUp, TrendingDown, X, Link2,
  FolderOpen, FilePlus, ShoppingCart, Receipt,
} from 'lucide-react'
import { Checkbox } from '@/src/components/ui/checkbox'
import { toast } from 'sonner'
import { fetchWalletAccounts, type WalletAccount } from '@/lib/walletApi'
import { buildForecast, formatFlowDate } from '@/lib/egyenlegFlow'
import {
  type FlowAccount, type FlowAccountType, type FlowEvent, type FlowEventType, type FlowRecurrence,
  FLOW_ACCOUNT_TYPE_LABELS, FLOW_RECURRENCE_LABELS,
} from '@/types/egyenleg-flow'

const ACCOUNT_COLORS = ['#0891b2', '#7c3aed', '#dc2626', '#16a34a', '#d97706', '#0d9488', '#db2777', '#475569']

// Wallet kategória UUID-k az "Étel" csoportból — napi bevásárlás előszűréséhez
const ETAL_WALLET_IDS = new Set([
  'ba1dbb27-cac2-4e9b-b556-391104e383fc', // Élelmiszerek
  'ea7668b0-8393-472a-bce1-fbc9664aad6a', // Étel és ital
  'a077f250-e799-4716-a521-baead9cbca02', // Étterem, gyorsétterem
  'a10361fb-b92b-4afd-95b3-d28721f4915d', // Bár, kávézó
])

interface BudgetPlanMeta {
  id: string
  name?: string
  plan_month?: string
  budget_data: unknown
  created_at: string
}

interface BudgetCatSummary {
  name: string
  amount: number
  walletCategoryIds: string[]
}

interface BudgetItemFlat {
  id: string
  categoryName: string
  name: string
  amount: number
}

function extractBudgetCategories(budgetData: unknown): BudgetCatSummary[] {
  type Cat = { name: string; items: Array<{ amount?: number }>; walletCategories?: string[] }
  let cats: Cat[] = []
  if (Array.isArray(budgetData)) {
    if (budgetData.length === 0) return []
    const first = budgetData[0] as Record<string, unknown>
    if ('items' in first) {
      cats = budgetData as Cat[]
    } else if ('category' in first) {
      const grouped = new Map<string, number>()
      for (const item of budgetData as Array<{ category: string; amount?: number }>) {
        grouped.set(item.category, (grouped.get(item.category) ?? 0) + (item.amount ?? 0))
      }
      return Array.from(grouped.entries()).map(([name, amount]) => ({ name, amount, walletCategoryIds: [] }))
    }
  } else if (typeof budgetData === 'object' && budgetData !== null) {
    const v2 = budgetData as { version?: string; categories?: Cat[] }
    if (v2.version === 'v2' && Array.isArray(v2.categories)) cats = v2.categories
  }
  return cats.map((cat) => ({
    name: cat.name,
    amount: (cat.items ?? []).reduce((s, i) => s + (i.amount ?? 0), 0),
    walletCategoryIds: cat.walletCategories ?? [],
  }))
}

function extractBudgetItemsFlat(budgetData: unknown): BudgetItemFlat[] {
  type Item = { id: string; subcategory?: string; amount?: number }
  type Cat = { name: string; items?: Item[] }
  let cats: Cat[] = []
  if (Array.isArray(budgetData)) {
    if (budgetData.length === 0) return []
    const first = budgetData[0] as Record<string, unknown>
    if ('items' in first) cats = budgetData as Cat[]
  } else if (typeof budgetData === 'object' && budgetData !== null) {
    const v2 = budgetData as { version?: string; categories?: Cat[] }
    if (v2.version === 'v2' && Array.isArray(v2.categories)) cats = v2.categories
  }
  return cats.flatMap((cat) =>
    (cat.items ?? [])
      .filter((item) => (item.amount ?? 0) > 0)
      .map((item) => ({
        id: item.id,
        categoryName: cat.name,
        name: item.subcategory || cat.name,
        amount: item.amount ?? 0,
      })),
  )
}

const ACCOUNT_TYPES: FlowAccountType[] = ['foszamla', 'hitelkartya', 'megtakaritas', 'keszpenz', 'egyeb']
const EVENT_TYPES: FlowEventType[] = ['bevetel', 'kiadas', 'atvezetes']
const EVENT_TYPE_LABELS: Record<FlowEventType, string> = {
  bevetel: 'Bevétel', kiadas: 'Kiadás', atvezetes: 'Átvezetés',
}
const RECURRENCES: FlowRecurrence[] = ['egyszeri', 'napi', 'heti', 'havi']

const ACCOUNT_TYPE_ICON: Record<FlowAccountType, typeof Wallet> = {
  foszamla: Banknote, hitelkartya: CreditCard, megtakaritas: PiggyBank, keszpenz: Wallet, egyeb: Wallet,
}

const fmt = (n: number) => `${Math.round(n).toLocaleString('hu-HU')} Ft`
const todayIso = () => new Date().toISOString().slice(0, 10)

function mapWalletType(t: string): FlowAccountType {
  switch (t) {
    case 'CreditCard': return 'hitelkartya'
    case 'SavingAccount': return 'megtakaritas'
    case 'Cash': return 'keszpenz'
    case 'CurrentAccount': return 'foszamla'
    default: return 'egyeb'
  }
}

function walletToFlowAccount(wa: WalletAccount, colorIdx: number): FlowAccount {
  const type = mapWalletType(wa.accountType)
  return {
    id: crypto.randomUUID(),
    name: wa.name,
    type,
    walletAccountId: wa.id,
    openingBalance: wa.currentBalance,
    openingDate: todayIso(),
    creditLimit: type === 'hitelkartya' && wa.creditLimit != null ? wa.creditLimit : undefined,
    color: ACCOUNT_COLORS[colorIdx % ACCOUNT_COLORS.length],
    track: true,
  }
}

function emptyEvent(accountId: string): FlowEvent {
  return {
    id: crypto.randomUUID(), name: '', amount: 0, type: 'kiadas',
    accountId, date: todayIso(), recurrence: 'egyszeri',
  }
}

interface SavedPlanMeta {
  id: string
  name: string
  updated_at: string
}

export default function EgyenlegFlowPage() {
  const supabase = createClient()
  const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null)
  const [rowId, setRowId] = useState<string | null>(null)
  const [name, setName] = useState('Egyenleg Flow')
  const [horizonDays, setHorizonDays] = useState(60)
  const [accounts, setAccounts] = useState<FlowAccount[]>([])
  const [events, setEvents] = useState<FlowEvent[]>([])

  const [savedPlans, setSavedPlans] = useState<SavedPlanMeta[]>([])
  const [showPlans, setShowPlans] = useState(false)

  const [walletAccounts, setWalletAccounts] = useState<WalletAccount[]>([])
  const [showWalletPicker, setShowWalletPicker] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [eventForm, setEventForm] = useState<FlowEvent | null>(null)

  // ── Napi gördülő bevásárlás a tervből ─────────────────────────────────────
  const [showDailyPanel, setShowDailyPanel] = useState(false)
  const [budgetPlans, setBudgetPlans] = useState<BudgetPlanMeta[]>([])
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>('')
  const [selectedBudgetCategories, setSelectedBudgetCategories] = useState<Set<string>>(new Set())
  const [dailyAccountId, setDailyAccountId] = useState<string>('')

  // ── Egyszeri kiadások a tervből ────────────────────────────────────────────
  const [showOneTimePanel, setShowOneTimePanel] = useState(false)
  const [selectedOneTimeItems, setSelectedOneTimeItems] = useState<Set<string>>(new Set())
  const [oneTimeAccountId, setOneTimeAccountId] = useState<string>('')
  const [oneTimeDate, setOneTimeDate] = useState<string>(todayIso())

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setCurrentUser(user))
  }, [supabase.auth])

  // ── Mentett tervek listájának betöltése ───────────────────────────────────
  const loadPlansList = useCallback(async () => {
    if (!currentUser) return
    const { data } = await supabase
      .from('egyenleg_flow')
      .select('id, name, updated_at')
      .eq('user_id', currentUser.id)
      .order('updated_at', { ascending: false })
    if (data) setSavedPlans(data)
  }, [currentUser, supabase])

  // ── Egy konkrét terv betöltése ID alapján ─────────────────────────────────
  const loadPlan = useCallback(async (id: string) => {
    const { data, error } = await supabase
      .from('egyenleg_flow')
      .select('*')
      .eq('id', id)
      .single()
    if (error) { toast.error('Hiba a betöltéskor!'); return }
    setRowId(data.id)
    setName(data.name || 'Egyenleg Flow')
    setHorizonDays(data.horizon_days || 60)
    setAccounts(Array.isArray(data.accounts) ? data.accounts : [])
    setEvents(Array.isArray(data.events) ? data.events : [])
    setShowPlans(false)
    toast.success(`„${data.name}" betöltve`)
  }, [supabase])

  // ── Budget tervek listájának betöltése (napi átlaghoz) ───────────────────
  const loadBudgetPlans = useCallback(async () => {
    if (!currentUser) return
    const { data } = await supabase
      .from('budget_plans')
      .select('id, name, plan_month, budget_data, created_at')
      .eq('user_id', currentUser.id)
      .order('created_at', { ascending: false })
    if (data) setBudgetPlans(data)
  }, [currentUser, supabase])

  // ── Kezdeti betöltés: a legutóbb módosított terv ──────────────────────────
  const loadLatest = useCallback(async () => {
    if (!currentUser) return
    const { data, error } = await supabase
      .from('egyenleg_flow')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) { toast.error('Hiba a flow betöltésekor!'); return }
    if (data) {
      setRowId(data.id)
      setName(data.name || 'Egyenleg Flow')
      setHorizonDays(data.horizon_days || 60)
      setAccounts(Array.isArray(data.accounts) ? data.accounts : [])
      setEvents(Array.isArray(data.events) ? data.events : [])
    }
  }, [currentUser, supabase])

  useEffect(() => {
    if (currentUser) {
      loadLatest()
      loadPlansList()
    }
  }, [currentUser, loadLatest, loadPlansList])

  // ── Új (üres) terv ────────────────────────────────────────────────────────
  const newPlan = () => {
    setRowId(null)
    setName('Új terv')
    setAccounts([])
    setEvents([])
    setHorizonDays(60)
    setEventForm(null)
    setShowPlans(false)
    toast.success('Új terv — adj hozzá számlákat és tételeket, majd mentsd el')
  }

  // ── Terv törlése ──────────────────────────────────────────────────────────
  const deletePlan = async (id: string, planName: string) => {
    if (!confirm(`Törlöd a „${planName}" tervet?`)) return
    const { error } = await supabase.from('egyenleg_flow').delete().eq('id', id)
    if (error) { toast.error('Hiba a törlésnél!'); return }
    setSavedPlans((prev) => prev.filter((p) => p.id !== id))
    if (rowId === id) {
      setRowId(null)
      setName('Egyenleg Flow')
      setAccounts([])
      setEvents([])
      setHorizonDays(60)
    }
    toast.success(`„${planName}" törölve`)
  }

  // ── Wallet szinkron ───────────────────────────────────────────────────────
  const syncWallet = useCallback(async () => {
    setIsSyncing(true)
    try {
      const res = await fetchWalletAccounts()
      setWalletAccounts(res.accounts)
      const today = todayIso()
      setAccounts((prev) => {
        if (prev.length === 0) {
          return res.accounts
            .filter((a) => a.currencyCode === 'HUF')
            .map((a, i) => walletToFlowAccount(a, i))
        }
        return prev.map((acc) => {
          if (!acc.walletAccountId) return acc
          const wa = res.accounts.find((w) => w.id === acc.walletAccountId)
          if (!wa) return acc
          return { ...acc, openingBalance: wa.currentBalance, openingDate: today }
        })
      })
      toast.success(`Wallet frissítve — ${res.accounts.length} számla`)
      setShowWalletPicker(true)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Wallet hiba')
    } finally {
      setIsSyncing(false)
    }
  }, [])

  const addWalletAccount = (wa: WalletAccount) => {
    setAccounts((prev) => [...prev, walletToFlowAccount(wa, prev.length)])
    toast.success(`„${wa.name}" hozzáadva`)
  }

  // ── Számla CRUD ───────────────────────────────────────────────────────────
  const updateAccount = (id: string, patch: Partial<FlowAccount>) =>
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, ...patch } : a)))

  const removeAccount = (id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id))
    setEvents((prev) => prev.filter((e) => e.accountId !== id && e.toAccountId !== id))
  }

  const addManualAccount = () => {
    setAccounts((prev) => [...prev, {
      id: crypto.randomUUID(), name: 'Új számla', type: 'egyeb',
      openingBalance: 0, openingDate: todayIso(),
      color: ACCOUNT_COLORS[prev.length % ACCOUNT_COLORS.length], track: true,
    }])
  }

  // ── Esemény CRUD ──────────────────────────────────────────────────────────
  const saveEventForm = () => {
    if (!eventForm) return
    if (!eventForm.name.trim()) { toast.error('Add meg a tétel nevét!'); return }
    if (eventForm.amount <= 0) { toast.error('Add meg az összeget!'); return }
    if (eventForm.type === 'atvezetes' && !eventForm.toAccountId) { toast.error('Válassz cél számlát!'); return }
    setEvents((prev) => {
      const exists = prev.some((e) => e.id === eventForm.id)
      return exists ? prev.map((e) => (e.id === eventForm.id ? eventForm : e)) : [...prev, eventForm]
    })
    setEventForm(null)
  }

  const removeEvent = (id: string) => setEvents((prev) => prev.filter((e) => e.id !== id))

  // ── Mentés ────────────────────────────────────────────────────────────────
  const save = async () => {
    if (!currentUser) return
    setIsSaving(true)
    const payload = {
      user_id: currentUser.id, name: name.trim() || 'Egyenleg Flow',
      horizon_days: horizonDays, accounts, events,
    }
    let error
    if (rowId) {
      ({ error } = await supabase.from('egyenleg_flow').update(payload).eq('id', rowId))
    } else {
      const res = await supabase.from('egyenleg_flow').insert([payload]).select('id').single()
      error = res.error
      if (res.data) setRowId(res.data.id)
    }
    setIsSaving(false)
    if (error) { toast.error('Hiba a mentéskor!'); return }
    toast.success('Flow elmentve!')
    loadPlansList()
  }

  // ── Előrejelzés ───────────────────────────────────────────────────────────
  const start = todayIso()
  const rows = useMemo(
    () => buildForecast(accounts, events, start, horizonDays),
    [accounts, events, start, horizonDays],
  )
  const trackedAccounts = useMemo(() => accounts.filter((a) => a.track), [accounts])
  const accountName = (id?: string) => accounts.find((a) => a.id === id)?.name ?? '—'

  const chartData = useMemo(() => rows.map((r) => {
    const point: Record<string, number | string> = { date: formatFlowDate(r.date).split(' (')[0] }
    for (const b of r.balances) point[b.accountId] = b.balance
    return point
  }), [rows])

  const minFoszamla = useMemo(() => {
    const foszamlak = trackedAccounts.filter((a) => a.type === 'foszamla').map((a) => a.id)
    if (foszamlak.length === 0) return null
    let min = Infinity
    for (const r of rows) for (const b of r.balances) if (foszamlak.includes(b.accountId)) min = Math.min(min, b.balance)
    return min === Infinity ? null : min
  }, [rows, trackedAccounts])

  const negativDays = useMemo(() => rows.filter((r) => r.foszamlaNegativ).length, [rows])
  const openingTotal = useMemo(
    () => trackedAccounts.filter((a) => a.type !== 'hitelkartya').reduce((s, a) => s + (a.openingBalance || 0), 0),
    [trackedAccounts],
  )

  const trackedWalletIds = new Set(accounts.map((a) => a.walletAccountId).filter(Boolean))

  // ── Napi átlag: budget terv → élelmiszer kategóriák ──────────────────────
  const selectedBudget = useMemo(
    () => budgetPlans.find((p) => p.id === selectedBudgetId),
    [budgetPlans, selectedBudgetId],
  )

  const budgetCategories = useMemo(
    () => (selectedBudget ? extractBudgetCategories(selectedBudget.budget_data) : []),
    [selectedBudget],
  )

  const selectedCategoryTotal = useMemo(
    () => budgetCategories.filter((c) => selectedBudgetCategories.has(c.name)).reduce((s, c) => s + c.amount, 0),
    [budgetCategories, selectedBudgetCategories],
  )

  const dailyAvg = useMemo(() => {
    if (selectedCategoryTotal === 0 || !selectedBudget) return 0
    const month = selectedBudget.plan_month ?? selectedBudget.created_at.slice(0, 7)
    const [y, m] = month.split('-').map(Number)
    const daysInMonth = new Date(y, m, 0).getDate()
    return Math.round(selectedCategoryTotal / daysInMonth)
  }, [selectedCategoryTotal, selectedBudget])

  // Élelmiszer kategóriák előzetes kijelölése budget terv váltáskor
  useEffect(() => {
    if (!selectedBudgetId || budgetCategories.length === 0) return
    const preSelected = new Set(
      budgetCategories
        .filter((c) => c.walletCategoryIds.some((id) => ETAL_WALLET_IDS.has(id)))
        .map((c) => c.name),
    )
    setSelectedBudgetCategories(preSelected)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedBudgetId])

  // ── Egyszeri kiadások: budget plan tételek ────────────────────────────────
  const budgetItemsFlat = useMemo(
    () => (selectedBudget ? extractBudgetItemsFlat(selectedBudget.budget_data) : []),
    [selectedBudget],
  )

  const groupedBudgetItems = useMemo(() => {
    const map = new Map<string, BudgetItemFlat[]>()
    for (const item of budgetItemsFlat) {
      if (!map.has(item.categoryName)) map.set(item.categoryName, [])
      map.get(item.categoryName)!.push(item)
    }
    return map
  }, [budgetItemsFlat])

  const selectedOneTimeTotal = useMemo(
    () => budgetItemsFlat.filter((i) => selectedOneTimeItems.has(i.id)).reduce((s, i) => s + i.amount, 0),
    [budgetItemsFlat, selectedOneTimeItems],
  )

  const applyOneTimeItems = useCallback(() => {
    if (!oneTimeAccountId || selectedOneTimeItems.size === 0) {
      toast.error('Válassz számlát és legalább egy tételt!')
      return
    }
    const items = budgetItemsFlat.filter((i) => selectedOneTimeItems.has(i.id))
    const newEvents: FlowEvent[] = items.map((item) => ({
      id: crypto.randomUUID(),
      name: item.name,
      amount: item.amount,
      type: 'kiadas' as FlowEventType,
      accountId: oneTimeAccountId,
      date: oneTimeDate,
      recurrence: 'egyszeri' as FlowRecurrence,
    }))
    setEvents((prev) => [...prev, ...newEvents])
    setShowOneTimePanel(false)
    setSelectedOneTimeItems(new Set())
    toast.success(`${newEvents.length} egyszeri kiadás hozzáadva`)
  }, [oneTimeAccountId, selectedOneTimeItems, budgetItemsFlat, oneTimeDate])

  const applyDailyAverage = useCallback(() => {
    if (!dailyAvg || !dailyAccountId || !selectedBudget) {
      toast.error('Válassz tervet, kategóriákat és számlát!')
      return
    }
    const month = selectedBudget.plan_month ?? selectedBudget.created_at.slice(0, 7)
    const [y, m] = month.split('-').map(Number)
    const firstDay = `${month}-01`
    const lastDay = new Date(y, m, 0).getDate()
    const endDate = `${month}-${String(lastDay).padStart(2, '0')}`
    const today = todayIso()
    const eventDate = today >= firstDay ? today : firstDay
    const newEvent: FlowEvent = {
      id: crypto.randomUUID(),
      name: 'Napi bevásárlás',
      amount: dailyAvg,
      type: 'kiadas',
      accountId: dailyAccountId,
      date: eventDate,
      recurrence: 'napi',
      endDate,
    }
    setEvents((prev) => [
      ...prev.filter((e) => !(e.recurrence === 'napi' && e.name === 'Napi bevásárlás')),
      newEvent,
    ])
    setShowDailyPanel(false)
    toast.success(`Napi bevásárlás beállítva: ${fmt(dailyAvg)} Ft/nap (${month})`)
  }, [dailyAvg, dailyAccountId, selectedBudget])

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 via-cyan-50 to-teal-50 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 md:space-y-6">

        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-2xl shadow-lg">
              <CalendarClock className="text-white" size={32} />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-4xl font-extrabold bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent tracking-tight">
                Egyenleg Flow
              </h1>
              <p className="text-sm sm:text-base text-gray-600 font-medium mt-1">
                Nap alapú bankszámla-egyenleg előrejelzés — melyik napon mit fizess, mennyi marad
              </p>
            </div>
          </div>

          {/* Terv neve + gombok */}
          <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center mb-4">
            <div className="flex-1 flex items-center gap-2">
              <Label className="text-xs text-gray-500 whitespace-nowrap">Terv neve:</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-8 text-sm font-semibold border-gray-200 rounded-lg max-w-xs"
                placeholder="pl. Júliusi terv"
              />
              {rowId && <Badge variant="outline" className="text-xs border-cyan-300 text-cyan-700 bg-cyan-50 shrink-0">mentett</Badge>}
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button onClick={() => setShowPlans((v) => !v)} variant="outline" className="rounded-xl border-2 h-9">
                <FolderOpen size={15} className="mr-1.5" />
                Tervek ({savedPlans.length})
              </Button>
              <Button onClick={newPlan} variant="outline" className="rounded-xl border-2 h-9">
                <FilePlus size={15} className="mr-1.5" /> Új terv
              </Button>
              <Button onClick={syncWallet} disabled={isSyncing}
                className="bg-gradient-to-r from-cyan-500 to-teal-600 hover:from-cyan-600 hover:to-teal-700 text-white rounded-xl h-9">
                <RefreshCw size={15} className={`mr-1.5 ${isSyncing ? 'animate-spin' : ''}`} />
                Wallet frissítés
              </Button>
              <Button onClick={save} disabled={isSaving} variant="outline" className="rounded-xl border-2 h-9">
                <Save size={15} className="mr-1.5" /> Mentés
              </Button>
            </div>
          </div>

          {/* Napi bevásárlás aktív badge */}
          {events.filter((e) => e.recurrence === 'napi').length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {events.filter((e) => e.recurrence === 'napi').map((e) => (
                <Badge key={e.id} variant="outline" className="text-xs border-emerald-300 text-emerald-700 bg-emerald-50">
                  <ShoppingCart size={10} className="mr-1" />
                  {e.name}: {fmt(e.amount)}/nap
                  {e.endDate && ` · −ig: ${e.endDate}`}
                </Badge>
              ))}
            </div>
          )}

          {/* Összesítő sáv */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200/60">
              <p className="text-xs text-gray-500 font-medium">Induló egyenleg (folyó)</p>
              <p className="text-lg font-extrabold text-blue-700">{fmt(openingTotal)}</p>
            </div>
            <div className={`p-3 rounded-xl border ${minFoszamla != null && minFoszamla < 0 ? 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200/60' : 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200/60'}`}>
              <p className="text-xs text-gray-500 font-medium">Min. főszámla egyenleg</p>
              <p className={`text-lg font-extrabold ${minFoszamla != null && minFoszamla < 0 ? 'text-red-700' : 'text-green-700'}`}>
                {minFoszamla != null ? fmt(minFoszamla) : '—'}
              </p>
            </div>
            <div className={`p-3 rounded-xl border ${negativDays > 0 ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200/60' : 'bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200/60'}`}>
              <p className="text-xs text-gray-500 font-medium">Mínuszos napok</p>
              <p className={`text-lg font-extrabold ${negativDays > 0 ? 'text-amber-700' : 'text-gray-700'}`}>
                {negativDays} nap
              </p>
            </div>
            <div className="p-3 bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-violet-200/60">
              <p className="text-xs text-gray-500 font-medium">Előrejelzési időtáv</p>
              <Select value={horizonDays.toString()} onValueChange={(v) => setHorizonDays(parseInt(v))}>
                <SelectTrigger className="mt-0.5 h-8 border-violet-200 rounded-lg text-sm font-bold text-violet-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[30, 45, 60, 90, 120].map((d) => <SelectItem key={d} value={d.toString()}>{d} nap</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Mentett tervek panel */}
        {showPlans && (
          <Card className="bg-white/90 backdrop-blur-xl shadow-xl border border-white/20 rounded-2xl">
            <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
                <FolderOpen size={18} className="text-cyan-600" /> Mentett tervek
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setShowPlans(false)} className="h-7 w-7 p-0">
                <X size={14} />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {savedPlans.length === 0 && (
                <p className="text-sm text-gray-400 italic text-center py-4">Még nincs mentett terv.</p>
              )}
              {savedPlans.map((plan) => (
                <div key={plan.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${plan.id === rowId ? 'bg-cyan-50 border-cyan-300' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'}`}>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-gray-800 truncate flex items-center gap-2">
                      {plan.name}
                      {plan.id === rowId && <Badge className="text-[10px] px-1.5 py-0 bg-cyan-600 text-white border-0">aktív</Badge>}
                    </div>
                    <p className="text-xs text-gray-500">
                      Módosítva: {new Date(plan.updated_at).toLocaleString('hu-HU', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => loadPlan(plan.id)}
                    disabled={plan.id === rowId} className="h-7 rounded-lg text-xs shrink-0">
                    Betölt
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deletePlan(plan.id, plan.name)}
                    className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 shrink-0">
                    <Trash2 size={13} />
                  </Button>
                </div>
              ))}
              <Button onClick={newPlan} variant="outline" className="w-full rounded-xl mt-2 border-dashed border-gray-300 text-gray-500 hover:text-cyan-700 hover:border-cyan-300">
                <FilePlus size={14} className="mr-2" /> Új terv létrehozása
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Wallet picker */}
        {showWalletPicker && walletAccounts.length > 0 && (
          <Card className="bg-white/90 backdrop-blur-xl shadow-xl border border-white/20 rounded-2xl">
            <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
                <Wallet size={18} className="text-cyan-600" /> Wallet számlák
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setShowWalletPicker(false)} className="h-7 w-7 p-0">
                <X size={14} />
              </Button>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {walletAccounts.map((wa) => {
                const tracked = trackedWalletIds.has(wa.id)
                return (
                  <div key={wa.id} className="flex items-center justify-between gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{wa.name}</p>
                      <p className="text-xs text-gray-500">
                        {wa.accountType === 'CreditCard'
                          ? `Tartozás: ${fmt(wa.currentBalance)}${wa.creditLimit ? ` / ${fmt(wa.creditLimit)}` : ''}`
                          : `${fmt(wa.currentBalance)} ${wa.currencyCode}`}
                      </p>
                    </div>
                    {tracked
                      ? <Badge variant="outline" className="text-xs border-green-300 text-green-700 bg-green-50 shrink-0"><Link2 size={10} className="mr-0.5" />Követve</Badge>
                      : <Button size="sm" variant="outline" onClick={() => addWalletAccount(wa)} className="h-7 rounded-lg shrink-0"><Plus size={12} /></Button>}
                  </div>
                )
              })}
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
          {/* Számlák */}
          <Card className="bg-white/90 backdrop-blur-xl shadow-xl border border-white/20 rounded-2xl">
            <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
                <Banknote size={18} className="text-cyan-600" /> Számlák ({accounts.length})
              </CardTitle>
              <Button size="sm" variant="outline" onClick={addManualAccount} className="h-8 rounded-lg">
                <Plus size={14} className="mr-1" /> Számla
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {accounts.length === 0 && (
                <p className="text-sm text-gray-400 italic text-center py-6">
                  Nincs számla. Kattints a „Wallet frissítés" gombra az élő egyenlegek importálásához.
                </p>
              )}
              {accounts.map((acc) => {
                const Icon = ACCOUNT_TYPE_ICON[acc.type]
                return (
                  <div key={acc.id} className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: acc.color }} />
                      <Icon size={15} className="text-gray-500 shrink-0" />
                      <Input value={acc.name} onChange={(e) => updateAccount(acc.id, { name: e.target.value })}
                        className="h-8 text-sm font-semibold border-gray-200 rounded-lg flex-1" />
                      {acc.walletAccountId && <Link2 size={13} className="text-cyan-500 shrink-0" />}
                      <Button size="sm" variant="ghost" onClick={() => removeAccount(acc.id)}
                        className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 shrink-0"><Trash2 size={13} /></Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-gray-500">Típus</Label>
                        <Select value={acc.type} onValueChange={(v) => updateAccount(acc.id, { type: v as FlowAccountType })}>
                          <SelectTrigger className="h-8 text-xs border-gray-200 rounded-lg mt-0.5"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {ACCOUNT_TYPES.map((t) => <SelectItem key={t} value={t}>{FLOW_ACCOUNT_TYPE_LABELS[t]}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">{acc.type === 'hitelkartya' ? 'Tartozás (Ft)' : 'Induló egyenleg (Ft)'}</Label>
                        <Input type="number" value={acc.openingBalance || ''} onChange={(e) => updateAccount(acc.id, { openingBalance: parseInt(e.target.value) || 0 })}
                          className="h-8 text-xs font-mono border-gray-200 rounded-lg mt-0.5" />
                      </div>
                      {acc.type === 'hitelkartya' && (
                        <>
                          <div>
                            <Label className="text-xs text-gray-500">Hitelkeret (Ft)</Label>
                            <Input type="number" value={acc.creditLimit || ''} onChange={(e) => updateAccount(acc.id, { creditLimit: parseInt(e.target.value) || 0 })}
                              className="h-8 text-xs font-mono border-gray-200 rounded-lg mt-0.5" />
                          </div>
                          <div>
                            <Label className="text-xs text-gray-500">Befizetési nap (1-31)</Label>
                            <Input type="number" min={1} max={31} value={acc.dueDay || ''} onChange={(e) => updateAccount(acc.id, { dueDay: parseInt(e.target.value) || undefined })}
                              className="h-8 text-xs font-mono border-gray-200 rounded-lg mt-0.5" />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          {/* Tervezett tételek */}
          <Card className="bg-white/90 backdrop-blur-xl shadow-xl border border-white/20 rounded-2xl">
            <CardHeader className="pb-3 flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
                <ArrowLeftRight size={18} className="text-cyan-600" /> Tervezett tételek ({events.length})
              </CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={accounts.length === 0}
                  onClick={() => {
                    const opening = !showDailyPanel
                    setShowDailyPanel(opening)
                    if (opening) {
                      setShowOneTimePanel(false)
                      loadBudgetPlans()
                      const foszamla = accounts.find((a) => a.type === 'foszamla')
                      if (foszamla && !dailyAccountId) setDailyAccountId(foszamla.id)
                    }
                  }}
                  className={`h-8 rounded-lg ${showDailyPanel ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : ''}`}>
                  <ShoppingCart size={14} className="mr-1" /> Napi átlag
                </Button>
                <Button size="sm" variant="outline" disabled={accounts.length === 0}
                  onClick={() => {
                    const opening = !showOneTimePanel
                    setShowOneTimePanel(opening)
                    if (opening) {
                      setShowDailyPanel(false)
                      loadBudgetPlans()
                      const foszamla = accounts.find((a) => a.type === 'foszamla')
                      if (foszamla && !oneTimeAccountId) setOneTimeAccountId(foszamla.id)
                      setOneTimeDate(todayIso())
                    }
                  }}
                  className={`h-8 rounded-lg ${showOneTimePanel ? 'bg-violet-50 border-violet-300 text-violet-700' : ''}`}>
                  <Receipt size={14} className="mr-1" /> Tervből másolás
                </Button>
                <Button size="sm" variant="outline" disabled={accounts.length === 0}
                  onClick={() => setEventForm(emptyEvent(accounts[0]?.id ?? ''))} className="h-8 rounded-lg">
                  <Plus size={14} className="mr-1" /> Tétel
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Napi gördülő bevásárlás panel */}
              {showDailyPanel && (
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 space-y-3">
                  <p className="text-xs font-semibold text-emerald-800 flex items-center gap-1.5">
                    <ShoppingCart size={13} /> Napi gördülő bevásárlás a havi tervből
                  </p>

                  <div>
                    <Label className="text-xs text-gray-500">Havi terv</Label>
                    <Select value={selectedBudgetId} onValueChange={(v) => setSelectedBudgetId(v)}>
                      <SelectTrigger className="h-8 text-xs border-gray-200 rounded-lg mt-0.5">
                        <SelectValue placeholder="Válassz tervet…" />
                      </SelectTrigger>
                      <SelectContent>
                        {budgetPlans.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name ?? 'Névtelen'}{p.plan_month ? ` (${p.plan_month})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {budgetCategories.length > 0 && (
                    <div>
                      <Label className="text-xs text-gray-500">
                        Kategóriák — összesen: {fmt(selectedCategoryTotal)}/hó
                      </Label>
                      <div className="mt-1 space-y-0.5 max-h-44 overflow-y-auto rounded-lg border border-emerald-200 bg-white">
                        {budgetCategories.map((cat) => (
                          <label key={cat.name}
                            className="flex items-center gap-2 cursor-pointer px-2.5 py-1.5 hover:bg-emerald-50 transition-colors">
                            <Checkbox
                              checked={selectedBudgetCategories.has(cat.name)}
                              onCheckedChange={(v) => {
                                setSelectedBudgetCategories((prev) => {
                                  const next = new Set(prev)
                                  if (v) next.add(cat.name); else next.delete(cat.name)
                                  return next
                                })
                              }}
                            />
                            <span className="text-xs text-gray-700 flex-1 min-w-0 truncate">{cat.name}</span>
                            {cat.walletCategoryIds.some((id) => ETAL_WALLET_IDS.has(id)) && (
                              <Badge className="text-[9px] px-1 py-0 bg-green-100 text-green-700 border border-green-300 shrink-0">étel</Badge>
                            )}
                            <span className="text-xs font-mono text-gray-500 shrink-0">{fmt(cat.amount)}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedBudgetId && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-gray-500">Forrás számla</Label>
                        <Select value={dailyAccountId} onValueChange={setDailyAccountId}>
                          <SelectTrigger className="h-8 text-xs border-gray-200 rounded-lg mt-0.5">
                            <SelectValue placeholder="Számla…" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map((a) => (
                              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Napi átlag</Label>
                        <div className="h-8 mt-0.5 flex items-center px-3 bg-white rounded-lg border border-gray-200 text-sm font-mono font-bold text-emerald-700">
                          {dailyAvg > 0 ? fmt(dailyAvg) : '—'}
                          <span className="font-normal text-gray-400 text-xs ml-1">/nap</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button size="sm" onClick={applyDailyAverage}
                      disabled={!dailyAvg || !dailyAccountId}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg h-8">
                      <Plus size={13} className="mr-1" /> Beállítás napi kiadásként
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowDailyPanel(false)} className="rounded-lg h-8">
                      Mégsem
                    </Button>
                  </div>
                </div>
              )}

              {/* Egyszeri kiadások a tervből */}
              {showOneTimePanel && (
                <div className="p-3 bg-violet-50 rounded-xl border border-violet-200 space-y-3">
                  <p className="text-xs font-semibold text-violet-800 flex items-center gap-1.5">
                    <Receipt size={13} /> Egyszeri kiadások másolása a havi tervből
                  </p>

                  <div>
                    <Label className="text-xs text-gray-500">Havi terv</Label>
                    <Select value={selectedBudgetId} onValueChange={(v) => {
                      setSelectedBudgetId(v)
                      setSelectedOneTimeItems(new Set())
                    }}>
                      <SelectTrigger className="h-8 text-xs border-gray-200 rounded-lg mt-0.5">
                        <SelectValue placeholder="Válassz tervet…" />
                      </SelectTrigger>
                      <SelectContent>
                        {budgetPlans.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name ?? 'Névtelen'}{p.plan_month ? ` (${p.plan_month})` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {budgetItemsFlat.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-xs text-gray-500">
                          Tételek — kijelölve: {fmt(selectedOneTimeTotal)}
                        </Label>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSelectedOneTimeItems(new Set(budgetItemsFlat.map((i) => i.id)))}
                            className="text-[10px] text-violet-600 hover:underline">Mind</button>
                          <button
                            onClick={() => setSelectedOneTimeItems(new Set())}
                            className="text-[10px] text-gray-400 hover:underline">Töröl</button>
                        </div>
                      </div>
                      <div className="max-h-52 overflow-y-auto rounded-lg border border-violet-200 bg-white space-y-0.5">
                        {Array.from(groupedBudgetItems.entries()).map(([catName, items]) => (
                          <div key={catName}>
                            <div className="px-2.5 py-1 bg-violet-50 text-[10px] font-semibold text-violet-700 uppercase tracking-wide sticky top-0">
                              {catName}
                            </div>
                            {items.map((item) => (
                              <label key={item.id}
                                className="flex items-center gap-2 cursor-pointer px-2.5 py-1.5 hover:bg-violet-50 transition-colors">
                                <Checkbox
                                  checked={selectedOneTimeItems.has(item.id)}
                                  onCheckedChange={(v) => {
                                    setSelectedOneTimeItems((prev) => {
                                      const next = new Set(prev)
                                      if (v) next.add(item.id); else next.delete(item.id)
                                      return next
                                    })
                                  }}
                                />
                                <span className="text-xs text-gray-700 flex-1 min-w-0 truncate">{item.name}</span>
                                <span className="text-xs font-mono text-gray-500 shrink-0">{fmt(item.amount)}</span>
                              </label>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {selectedBudgetId && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs text-gray-500">Forrás számla</Label>
                        <Select value={oneTimeAccountId} onValueChange={setOneTimeAccountId}>
                          <SelectTrigger className="h-8 text-xs border-gray-200 rounded-lg mt-0.5">
                            <SelectValue placeholder="Számla…" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map((a) => (
                              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Dátum</Label>
                        <Input type="date" value={oneTimeDate}
                          onChange={(e) => setOneTimeDate(e.target.value)}
                          className="h-8 text-xs border-gray-200 rounded-lg mt-0.5" />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button size="sm" onClick={applyOneTimeItems}
                      disabled={selectedOneTimeItems.size === 0 || !oneTimeAccountId}
                      className="flex-1 bg-violet-600 hover:bg-violet-700 text-white rounded-lg h-8">
                      <Plus size={13} className="mr-1" /> {selectedOneTimeItems.size > 0 ? `${selectedOneTimeItems.size} tétel hozzáadása` : 'Hozzáadás'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setShowOneTimePanel(false)} className="rounded-lg h-8">
                      Mégsem
                    </Button>
                  </div>
                </div>
              )}

              {/* Esemény form */}
              {eventForm && (
                <div className="p-3 bg-cyan-50 rounded-xl border border-cyan-200 space-y-2">
                  <div className="flex gap-1.5">
                    {EVENT_TYPES.map((t) => (
                      <Button key={t} size="sm" onClick={() => setEventForm({ ...eventForm, type: t })}
                        className={`flex-1 h-8 rounded-lg text-xs ${eventForm.type === t ? 'bg-cyan-600 text-white' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}>
                        {EVENT_TYPE_LABELS[t]}
                      </Button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <Label className="text-xs text-gray-500">Megnevezés</Label>
                      <Input value={eventForm.name} onChange={(e) => setEventForm({ ...eventForm, name: e.target.value })}
                        placeholder="pl. Fizetés, Lakbér, Hitelkártya befizetés"
                        className="h-8 text-sm border-gray-200 rounded-lg mt-0.5" />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Összeg (Ft)</Label>
                      <Input type="number" value={eventForm.amount || ''} onChange={(e) => setEventForm({ ...eventForm, amount: parseInt(e.target.value) || 0 })}
                        className="h-8 text-sm font-mono border-gray-200 rounded-lg mt-0.5" />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Dátum</Label>
                      <Input type="date" value={eventForm.date} onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                        className="h-8 text-xs border-gray-200 rounded-lg mt-0.5" />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">{eventForm.type === 'bevetel' ? 'Cél számla' : 'Forrás számla'}</Label>
                      <Select value={eventForm.accountId} onValueChange={(v) => setEventForm({ ...eventForm, accountId: v })}>
                        <SelectTrigger className="h-8 text-xs border-gray-200 rounded-lg mt-0.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {eventForm.type === 'atvezetes' && (
                      <div>
                        <Label className="text-xs text-gray-500">Cél számla</Label>
                        <Select value={eventForm.toAccountId ?? ''} onValueChange={(v) => setEventForm({ ...eventForm, toAccountId: v })}>
                          <SelectTrigger className="h-8 text-xs border-gray-200 rounded-lg mt-0.5"><SelectValue placeholder="Válassz…" /></SelectTrigger>
                          <SelectContent>
                            {accounts.filter((a) => a.id !== eventForm.accountId).map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    <div>
                      <Label className="text-xs text-gray-500">Ismétlődés</Label>
                      <Select value={eventForm.recurrence} onValueChange={(v) => setEventForm({ ...eventForm, recurrence: v as FlowRecurrence })}>
                        <SelectTrigger className="h-8 text-xs border-gray-200 rounded-lg mt-0.5"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {RECURRENCES.map((r) => <SelectItem key={r} value={r}>{FLOW_RECURRENCE_LABELS[r]}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    {eventForm.recurrence !== 'egyszeri' && (
                      <div>
                        <Label className="text-xs text-gray-500">Vége (opcionális)</Label>
                        <Input type="date" value={eventForm.endDate ?? ''} onChange={(e) => setEventForm({ ...eventForm, endDate: e.target.value || undefined })}
                          className="h-8 text-xs border-gray-200 rounded-lg mt-0.5" />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={saveEventForm} className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg">
                      <Save size={14} className="mr-1" /> Mentés
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setEventForm(null)} className="rounded-lg">Mégsem</Button>
                  </div>
                </div>
              )}

              {events.length === 0 && !eventForm && (
                <p className="text-sm text-gray-400 italic text-center py-6">
                  Nincs tervezett tétel. Vegyél fel fizetést, kiadást vagy átvezetést.
                </p>
              )}
              {[...events].sort((a, b) => a.date.localeCompare(b.date)).map((ev) => {
                const Icon = ev.type === 'bevetel' ? TrendingUp : ev.type === 'kiadas' ? TrendingDown : ArrowLeftRight
                const color = ev.type === 'bevetel' ? 'text-green-600' : ev.type === 'kiadas' ? 'text-red-600' : 'text-blue-600'
                return (
                  <div key={ev.id} className="flex items-center gap-2 p-2.5 bg-gray-50 rounded-xl border border-gray-200">
                    <Icon size={15} className={`${color} shrink-0`} />
                    <button onClick={() => setEventForm(ev)} className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-semibold text-gray-800 truncate">{ev.name || '(névtelen)'}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {new Date(ev.date).toLocaleDateString('hu-HU')}
                        {ev.recurrence !== 'egyszeri' && ` · ${FLOW_RECURRENCE_LABELS[ev.recurrence]}`}
                        {' · '}{accountName(ev.accountId)}{ev.type === 'atvezetes' && ` → ${accountName(ev.toAccountId)}`}
                      </p>
                    </button>
                    <span className={`text-sm font-bold font-mono shrink-0 ${color}`}>
                      {ev.type === 'kiadas' ? '−' : ev.type === 'bevetel' ? '+' : ''}{fmt(ev.amount)}
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => removeEvent(ev.id)}
                      className="h-7 w-7 p-0 text-red-500 hover:bg-red-50 shrink-0"><Trash2 size={13} /></Button>
                  </div>
                )
              })}
            </CardContent>
          </Card>
        </div>

        {/* Grafikon */}
        {trackedAccounts.length > 0 && (
          <Card className="bg-white/90 backdrop-blur-xl shadow-xl border border-white/20 rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
                <TrendingUp size={18} className="text-cyan-600" /> Egyenleg-előrejelzés
              </CardTitle>
              <CardDescription className="text-xs">Számlánkénti egyenleg az elkövetkező {horizonDays} napban</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" tick={{ fontSize: 10 }} interval="preserveStartEnd" minTickGap={30} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `${Math.round(v / 1000)}e`} width={45} />
                  <Tooltip formatter={(v: number, n: string) => [fmt(v), accountName(n)]} labelStyle={{ fontSize: 12 }} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" />
                  {trackedAccounts.map((a) => (
                    <Line key={a.id} type="monotone" dataKey={a.id} name={a.id} stroke={a.color} strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 mt-2">
                {trackedAccounts.map((a) => (
                  <div key={a.id} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <div className="w-3 h-1 rounded" style={{ backgroundColor: a.color }} />
                    {a.name}{a.type === 'hitelkartya' && ' (tartozás)'}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Napi idővonal táblázat */}
        {trackedAccounts.length > 0 && (
          <Card className="bg-white/90 backdrop-blur-xl shadow-xl border border-white/20 rounded-2xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
                <CalendarClock size={18} className="text-cyan-600" /> Napi idővonal
              </CardTitle>
              <CardDescription className="text-xs">Csak az eseményes és figyelmeztetett napok jelennek meg</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-left">
                      <th className="px-3 py-2 font-semibold text-gray-600 sticky left-0 bg-white">Nap</th>
                      <th className="px-3 py-2 font-semibold text-gray-600">Tételek</th>
                      {trackedAccounts.map((a) => (
                        <th key={a.id} className="px-3 py-2 font-semibold text-gray-600 text-right whitespace-nowrap">{a.name}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.filter((r) => {
                      const hasNonNapi = r.occurrences.some((o) => o.event.recurrence !== 'napi')
                      return hasNonNapi || r.foszamlaNegativ || r.hitelkartyaDue
                    }).map((r) => {
                      const visibleOccs = r.occurrences.filter((o) => o.event.recurrence !== 'napi')
                      const napiOccs = r.occurrences.filter((o) => o.event.recurrence === 'napi')
                      return (
                      <tr key={r.date} className={`border-b border-gray-100 ${r.foszamlaNegativ ? 'bg-red-50' : ''}`}>
                        <td className="px-3 py-2 whitespace-nowrap sticky left-0 bg-inherit">
                          <div className="font-medium text-gray-700">{formatFlowDate(r.date)}</div>
                          <div className="flex gap-1 mt-0.5">
                            {r.foszamlaNegativ && <Badge variant="destructive" className="text-[10px] px-1 py-0"><AlertTriangle size={9} className="mr-0.5" />mínusz</Badge>}
                            {r.hitelkartyaDue && <Badge className="text-[10px] px-1 py-0 bg-amber-500 text-white border-0">kártya esedékes</Badge>}
                          </div>
                        </td>
                        <td className="px-3 py-2">
                          <div className="space-y-0.5">
                            {visibleOccs.map((o, i) => (
                              <div key={i} className="text-xs flex items-center gap-1">
                                <span className={o.event.type === 'bevetel' ? 'text-green-600' : o.event.type === 'kiadas' ? 'text-red-600' : 'text-blue-600'}>
                                  {o.event.type === 'kiadas' ? '−' : o.event.type === 'bevetel' ? '+' : '⇄'}{fmt(o.event.amount)}
                                </span>
                                <span className="text-gray-500 truncate">{o.event.name}</span>
                              </div>
                            ))}
                            {napiOccs.length > 0 && (
                              <div className="text-[10px] text-gray-400 italic flex items-center gap-1">
                                <ShoppingCart size={9} />
                                {napiOccs.map((o) => `−${fmt(o.event.amount)} ${o.event.name}`).join(', ')} (napi)
                              </div>
                            )}
                          </div>
                        </td>
                        {trackedAccounts.map((a) => {
                          const b = r.balances.find((x) => x.accountId === a.id)
                          const val = b?.balance ?? 0
                          const bad = (a.type === 'foszamla' && val < 0) || b?.overLimit
                          return (
                            <td key={a.id} className={`px-3 py-2 text-right font-mono whitespace-nowrap ${bad ? 'text-red-600 font-bold' : 'text-gray-700'}`}>
                              {fmt(val)}
                            </td>
                          )
                        })}
                      </tr>
                    )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
