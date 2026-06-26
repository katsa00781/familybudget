'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { createClient } from '@/lib/utils/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card'
import { Input } from '@/src/components/ui/input'
import { Button } from '@/src/components/ui/button'
import { Separator } from '@/src/components/ui/separator'
import { Badge } from '@/src/components/ui/badge'
import { 
  Calculator, PiggyBank, Car, Home, Heart, 
  Gamepad2, TrendingUp, Wallet, CreditCard,
  Save, DollarSign, Target, Gift, Plus, X, Calendar,
  ArrowLeftRight, RefreshCcw
} from 'lucide-react'
import { toast } from 'sonner'
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/src/components/ui/select'
import { getUserPreferences, setActiveIncomePlan, setActiveBudgetPlan } from '@/lib/userPreferences'
import { prepareBudgetFromAnnualPlan } from '@/lib/annualBudgetIntegration'
import { WALLET_CATEGORIES, WALLET_CATEGORY_MAP, OLD_SUBCATEGORY_TO_IDS } from '@/lib/walletCategories'

interface BudgetItem {
  id: string
  category: string
  type: 'Szükséglet' | 'Vágyak' | 'Megtakarítás' | ''
  subcategory: string
  amount: number
}

interface BudgetCategory {
  name: string
  items: BudgetItem[]
  walletCategories?: string[] // Wallet kategória UUID-k tömbje
}

interface SavedBudget {
  id: string
  user_id: string
  budget_data: BudgetStoragePayload
  total_amount: number
  name?: string
  description?: string
  actual_income?: number // Tényleges bevétel
  created_at: string
  updated_at?: string
}

interface IncomePlan {
  id: string
  user_id: string
  name: string
  description?: string
  monthly_income: number
  additional_incomes: { id: string; name: string; amount: number }[]
  total_income: number
  created_at: string
  updated_at?: string
}

interface User {
  id: string
  email?: string
}

interface TransferAccount {
  id: string
  name: string
  initialBalance: number
}

interface PlannedTransfer {
  id: string
  fromAccountId: string
  toAccountId: string
  amount: number
  description?: string
}

interface TransferPlanState {
  accounts: TransferAccount[]
  transfers: PlannedTransfer[]
}

interface BudgetStorageV2 {
  version: 'v2'
  categories: BudgetCategory[]
  transferPlan?: TransferPlanState
}

type BudgetStoragePayload = BudgetCategory[] | BudgetItem[] | BudgetStorageV2
type BudgetCategoryCompat = BudgetCategory & {
  walletSubCategory?: string
  walletMainCategory?: string
  walletSubCategories?: string[]
}

// Helper function to generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9)

const createInitialBudgetData = (): BudgetCategory[] => [
  {
    name: 'Autó',
    items: [
      { id: generateId(), category: 'Autó', type: 'Szükséglet', subcategory: 'Üzemanyag', amount: 30000 },
      { id: generateId(), category: 'Autó', type: '', subcategory: 'Utazás', amount: 0 },
      { id: generateId(), category: 'Autó', type: '', subcategory: 'Szervíz', amount: 0 },
      { id: generateId(), category: 'Autó', type: '', subcategory: 'Töltés', amount: 0 }
    ]
  },
  {
    name: 'Szórakozás',
    items: [
      { id: generateId(), category: 'Szórakozás', type: 'Vágyak', subcategory: 'Játék és Egyéb', amount: 0 },
      { id: generateId(), category: 'Szórakozás', type: '', subcategory: 'Szórakozás', amount: 50000 },
      { id: generateId(), category: 'Szórakozás', type: '', subcategory: 'Törökország', amount: 728000 }
    ]
  },
  {
    name: 'Háztartás',
    items: [
      { id: generateId(), category: 'Háztartás', type: 'Szükséglet', subcategory: 'Élelmiszer', amount: 250000 },
      { id: generateId(), category: 'Háztartás', type: '', subcategory: 'Tápszer', amount: 50000 },
      { id: generateId(), category: 'Háztartás', type: '', subcategory: 'Otthon', amount: 50000 }
    ]
  },
  {
    name: 'Mama',
    items: [
      { id: generateId(), category: 'Mama', type: 'Vágyak', subcategory: 'Mamci', amount: 180000 },
      { id: generateId(), category: 'Mama', type: '', subcategory: 'Kira edzés', amount: 11000 }
    ]
  },
  {
    name: 'Hitel',
    items: [
      { id: generateId(), category: 'Hitel', type: 'Szükséglet', subcategory: 'Folyószámla hitel', amount: 0 },
      { id: generateId(), category: 'Hitel', type: '', subcategory: 'Hitelkártya', amount: 0 },
      { id: generateId(), category: 'Hitel', type: '', subcategory: 'Lakáshitel', amount: 134000 },
      { id: generateId(), category: 'Hitel', type: '', subcategory: 'Autóhitel', amount: 133000 },
      { id: generateId(), category: 'Hitel', type: '', subcategory: 'Számlák és díjak', amount: 12000 },
      { id: generateId(), category: 'Hitel', type: 'Vágyak', subcategory: 'Telefon törlesztés', amount: 9000 }
    ]
  },
  {
    name: 'Rezsi',
    items: [
      { id: generateId(), category: 'Rezsi', type: 'Szükséglet', subcategory: 'Rezsi', amount: 100000 }
    ]
  },
  {
    name: 'Digitális Rezsi',
    items: [
      { id: generateId(), category: 'Digitális Rezsi', type: 'Vágyak', subcategory: 'Digitális rezsi', amount: 25000 }
    ]
  },
  {
    name: 'Megtakarítás',
    items: [
      { id: generateId(), category: 'Megtakarítás', type: 'Megtakarítás', subcategory: 'Állampapír', amount: 0 },
      { id: generateId(), category: 'Megtakarítás', type: '', subcategory: 'Nyugdíjpénztár', amount: 0 },
      { id: generateId(), category: 'Megtakarítás', type: '', subcategory: 'Részvény', amount: 0 }
    ]
  },
  {
    name: 'Egészség',
    items: [
      { id: generateId(), category: 'Egészség', type: 'Szükséglet', subcategory: 'Gyógyszer', amount: 0 },
      { id: generateId(), category: 'Egészség', type: '', subcategory: 'Orvos', amount: 0 }
    ]
  },
  {
    name: 'Egyéb',
    items: [
      { id: generateId(), category: 'Egyéb', type: 'Vágyak', subcategory: 'Evezőpad', amount: 0 },
      { id: generateId(), category: 'Egyéb', type: '', subcategory: 'Szépségápolás', amount: 0 },
      { id: generateId(), category: 'Egyéb', type: '', subcategory: 'Biztosítás', amount: 0 },
      { id: generateId(), category: 'Egyéb', type: '', subcategory: 'Egyéb', amount: 100000 }
    ]
  },
  {
    name: 'Készpénz',
    items: [
      { id: generateId(), category: 'Készpénz', type: '', subcategory: 'Készpénzfelvétel', amount: 0 }
    ]
  }
]

const createDefaultTransferPlan = (): TransferPlanState => ({
  accounts: [
    { id: 'main-account', name: 'Főszámla', initialBalance: 0 },
    { id: 'credit-card-1', name: 'Hitelkártya 1', initialBalance: 0 },
    { id: 'credit-card-2', name: 'Hitelkártya 2', initialBalance: 0 }
  ],
  transfers: []
})

const normalizeTransferPlan = (plan?: TransferPlanState): TransferPlanState => {
  if (!plan) {
    return createDefaultTransferPlan()
  }

  const providedAccounts = (plan.accounts || []).map(account => ({
    id: account.id || generateId(),
    name: account.name || 'Számla',
    initialBalance: Number(account.initialBalance) || 0
  }))

  const ensuredAccounts = [...providedAccounts]
  createDefaultTransferPlan().accounts.forEach(defaultAccount => {
    if (!ensuredAccounts.some(account => account.id === defaultAccount.id)) {
      ensuredAccounts.push({ ...defaultAccount })
    }
  })

  const sanitizedTransfers = (plan.transfers || [])
    .filter(transfer => transfer.fromAccountId && transfer.toAccountId)
    .map(transfer => ({
      id: transfer.id || generateId(),
      fromAccountId: transfer.fromAccountId,
      toAccountId: transfer.toAccountId,
      amount: Number(transfer.amount) || 0,
      description: transfer.description || ''
    }))

  return {
    accounts: ensuredAccounts,
    transfers: sanitizedTransfers
  }
}

const displayNumericInputValue = (value: number) => (value === 0 ? '' : value.toString())

type OldWalletCat = { mainCategory: string; subCategories: string[] }

function convertOldWalletCatsToIds(raw: unknown): string[] {
  if (!Array.isArray(raw) || raw.length === 0) return []
  if (typeof raw[0] === 'string') return raw as string[]
  const ids: string[] = []
  for (const wc of raw as OldWalletCat[]) {
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
    items: category.items?.map(item => ({ ...item })) || [],
    walletCategories: walletCategoryIds
  }
}

const convertLegacyItemsToCategories = (items: BudgetItem[]): BudgetCategory[] => {
  const base = createInitialBudgetData().map(category => ({
    ...category,
    items: [] as BudgetItem[]
  }))

  items.forEach(item => {
    const categoryIndex = base.findIndex(category => category.name === item.category)
    if (categoryIndex !== -1) {
      base[categoryIndex].items.push({ ...item })
    } else {
      base.push({
        name: item.category,
        items: [{ ...item }]
      })
    }
  })

  return base
}

const isBudgetStorageV2 = (payload: BudgetStoragePayload): payload is BudgetStorageV2 => {
  return typeof payload === 'object' && !Array.isArray(payload) && payload !== null && 'categories' in payload
}

const parseBudgetPayload = (payload?: BudgetStoragePayload): { categories: BudgetCategory[]; transferPlan: TransferPlanState } => {
  if (!payload) {
    return {
      categories: createInitialBudgetData(),
      transferPlan: createDefaultTransferPlan()
    }
  }

  if (Array.isArray(payload)) {
    const firstEntry = payload[0]
    const isCategoryArray = !!firstEntry && typeof firstEntry === 'object' && 'items' in firstEntry

    if (isCategoryArray) {
      const categories = (payload as BudgetCategoryCompat[]).map(mapWalletCategoryCompatibility)
      return {
        categories,
        transferPlan: createDefaultTransferPlan()
      }
    }

    return {
      categories: convertLegacyItemsToCategories(payload as BudgetItem[]),
      transferPlan: createDefaultTransferPlan()
    }
  }

  if (isBudgetStorageV2(payload)) {
    const categorySource = Array.isArray(payload.categories) ? payload.categories : []
    const categories = categorySource.length > 0
      ? (categorySource as BudgetCategoryCompat[]).map(mapWalletCategoryCompatibility)
      : createInitialBudgetData()

    return {
      categories,
      transferPlan: normalizeTransferPlan(payload.transferPlan)
    }
  }

  return {
    categories: createInitialBudgetData(),
    transferPlan: createDefaultTransferPlan()
  }
}

export default function KoltsegvetesPage() {
  const [budgetData, setBudgetData] = useState<BudgetCategory[]>(createInitialBudgetData())
  const [savedBudgets, setSavedBudgets] = useState<SavedBudget[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [budgetName, setBudgetName] = useState('')
  const [budgetDescription, setBudgetDescription] = useState('')
  // A terv vonatkozási hónapja (YYYY-MM) — a Terv vs. Tény oldal ez alapján párosít.
  const [planMonth, setPlanMonth] = useState<string>(() => new Date().toISOString().slice(0, 7))
  const [selectedBudgetId, setSelectedBudgetId] = useState<string>('')
  const [expectedIncome, setExpectedIncome] = useState<number>(0)
  const [incomePlans, setIncomePlans] = useState<IncomePlan[]>([])
  const [selectedIncomeId, setSelectedIncomeId] = useState<string>('')
  const [activeIncomeId, setActiveIncomeId] = useState<string | null>(null)
  const [activeBudgetId, setActiveBudgetId] = useState<string | null>(null)
  const [isCreatingNew, setIsCreatingNew] = useState(false) // Új költségvetés létrehozás jelzője
  const [actualIncome, setActualIncome] = useState<number>(0) // Tényleges bevétel
  const [transferPlan, setTransferPlan] = useState<TransferPlanState>(createDefaultTransferPlan())
  const supabase = createClient()

  // Felhasználó betöltése
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
    }
    getUser()
  }, [supabase.auth])

  // Összesítések számítása
  const calculateTotals = useCallback(() => {
    const allItems = budgetData.flatMap(category => category.items)
    const total = allItems.reduce((sum, item) => sum + item.amount, 0)
    
    const szuksegletTotal = allItems
      .filter(item => item.type === 'Szükséglet')
      .reduce((sum, item) => sum + item.amount, 0)
    
    const vagyakTotal = allItems
      .filter(item => item.type === 'Vágyak')
      .reduce((sum, item) => sum + item.amount, 0)
    
    const megtakaritasTotal = allItems
      .filter(item => item.type === 'Megtakarítás')
      .reduce((sum, item) => sum + item.amount, 0)

    return { total, szuksegletTotal, vagyakTotal, megtakaritasTotal }
  }, [budgetData])

  // Összeg módosítása
  const updateAmount = (categoryIndex: number, itemIndex: number, newAmount: string) => {
    const amount = parseInt(newAmount.replace(/\s/g, '')) || 0
    
    setBudgetData(prev => prev.map((category, catIdx) => 
      catIdx === categoryIndex 
        ? {
            ...category,
            items: category.items.map((item, itemIdx) => 
              itemIdx === itemIndex ? { ...item, amount } : item
            )
          }
        : category
    ))
  }

  // Új tétel hozzáadása
  const addItem = (categoryIndex: number) => {
    const newData = [...budgetData]
    const category = newData[categoryIndex]
    const newItem: BudgetItem = {
      id: generateId(),
      category: category.name,
      type: '',
      subcategory: 'Új tétel',
      amount: 0
    }
    newData[categoryIndex].items.push(newItem)
    setBudgetData(newData)
  }

  // Tétel eltávolítása
  const removeItem = (categoryIndex: number, itemIndex: number) => {
    const newData = [...budgetData]
    newData[categoryIndex].items.splice(itemIndex, 1)
    setBudgetData(newData)
  }

  // Tétel típusának módosítása
  const updateItemType = (categoryIndex: number, itemIndex: number, type: 'Szükséglet' | 'Vágyak' | 'Megtakarítás' | '') => {
    const newData = [...budgetData]
    newData[categoryIndex].items[itemIndex].type = type
    setBudgetData(newData)
  }

  // Tétel névének módosítása
  const updateItemName = (categoryIndex: number, itemIndex: number, name: string) => {
    const newData = [...budgetData]
    newData[categoryIndex].items[itemIndex].subcategory = name
    setBudgetData(newData)
  }

  // Wallet kategória UUID hozzáadása
  const addWalletCategory = (categoryIndex: number, id: string) => {
    const newData = [...budgetData]
    if (!newData[categoryIndex].walletCategories) {
      newData[categoryIndex].walletCategories = []
    }
    if (!newData[categoryIndex].walletCategories!.includes(id)) {
      newData[categoryIndex].walletCategories!.push(id)
    }
    setBudgetData(newData)
  }

  // Wallet kategória UUID eltávolítása
  const removeWalletCategory = (categoryIndex: number, id: string) => {
    const newData = [...budgetData]
    if (newData[categoryIndex].walletCategories) {
      newData[categoryIndex].walletCategories = newData[categoryIndex].walletCategories!.filter(
        wid => wid !== id
      )
    }
    setBudgetData(newData)
  }

  // Számla induló egyenleg frissítése
  const updateTransferAccount = (accountId: string, updates: Partial<TransferAccount>) => {
    setTransferPlan(prev => ({
      ...prev,
      accounts: prev.accounts.map(account =>
        account.id === accountId ? { ...account, ...updates } : account
      )
    }))
  }

  // Utalási sor hozzáadása
  const addTransferRow = () => {
    setTransferPlan(prev => {
      const fallbackReceiver = prev.accounts.find(account => account.id !== 'main-account')?.id || prev.accounts[0]?.id || 'main-account'
      const newTransfer: PlannedTransfer = {
        id: generateId(),
        fromAccountId: 'main-account',
        toAccountId: fallbackReceiver,
        amount: 0,
        description: ''
      }

      return {
        ...prev,
        transfers: [...prev.transfers, newTransfer]
      }
    })
  }

  // Utalási sor módosítása
  const updateTransferRow = (transferId: string, updates: Partial<PlannedTransfer>) => {
    setTransferPlan(prev => ({
      ...prev,
      transfers: prev.transfers.map(transfer =>
        transfer.id === transferId ? { ...transfer, ...updates } : transfer
      )
    }))
  }

  // Utalási sor törlése
  const removeTransferRow = (transferId: string) => {
    setTransferPlan(prev => ({
      ...prev,
      transfers: prev.transfers.filter(transfer => transfer.id !== transferId)
    }))
  }

  // Bevétel átvétele a főszámlára
  const handleApplyIncomeToMainAccount = (mode: 'expected' | 'actual') => {
    const value = mode === 'actual' ? actualIncome : expectedIncome

    if (!value || value <= 0) {
      toast.info('Nincs olyan bevétel, amit át lehetne venni a főszámlára.')
      return
    }

    setTransferPlan(prev => ({
      ...prev,
      accounts: prev.accounts.map(account =>
        account.id === 'main-account'
          ? { ...account, initialBalance: value }
          : account
      )
    }))

    toast.success(mode === 'actual' ? 'A tényleges bevétel bekerült a főszámla induló egyenlegébe.' : 'A tervezett bevétel bekerült a főszámla induló egyenlegébe.')
  }

  const accountSummaries = useMemo(() => {
    return transferPlan.accounts.map(account => {
      const incoming = transferPlan.transfers.reduce((sum, transfer) => (
        transfer.toAccountId === account.id ? sum + transfer.amount : sum
      ), 0)
      const outgoing = transferPlan.transfers.reduce((sum, transfer) => (
        transfer.fromAccountId === account.id ? sum + transfer.amount : sum
      ), 0)

      return {
        ...account,
        incoming,
        outgoing,
        projectedBalance: account.initialBalance + incoming - outgoing
      }
    })
  }, [transferPlan])

  const totalTransferVolume = useMemo(() => {
    return transferPlan.transfers.reduce((sum, transfer) => sum + transfer.amount, 0)
  }, [transferPlan])

  // Összes már hozzárendelt Wallet kategória ID (dupla könyvelés megakadályozásához)
  const allUsedWalletIds = useMemo(() => {
    const ids = new Set<string>()
    budgetData.forEach(cat => cat.walletCategories?.forEach(id => ids.add(id)))
    return ids
  }, [budgetData])

  // Kategória összegzése
  const getCategoryTotal = (category: BudgetCategory) => {
    return category.items.reduce((sum, item) => sum + item.amount, 0)
  }

  // Költségvetés mentése
  const saveBudget = async () => {
    if (!currentUser) {
      toast.error("Be kell jelentkezned a mentéshez!")
      return
    }

    console.log('=== KÖLTSÉGVETÉS MENTÉS KEZDÉSE ===')
    console.log('currentUser:', currentUser?.id)
    console.log('selectedBudgetId:', selectedBudgetId)
    console.log('budgetName:', budgetName)

    setIsLoading(true)
    try {
      const { total } = calculateTotals()

      console.log('budgetData categories:', budgetData.length)
      console.log('total:', total)

      const budgetPayload: BudgetStorageV2 = {
        version: 'v2',
        categories: budgetData,
        transferPlan: normalizeTransferPlan(transferPlan)
      }

      const budgetToSave = {
        user_id: currentUser.id,
        budget_data: budgetPayload, // Mentjük a teljes kategória struktúrát és az utalásokat
        total_amount: total,
        name: budgetName || `Költségvetés ${new Date().toLocaleDateString('hu-HU')}`,
        description: budgetDescription || null,
        actual_income: actualIncome > 0 ? actualIncome : null, // Tényleges bevétel mentése
        plan_month: planMonth || null // Vonatkozási hónap (Terv vs. Tény párosításhoz)
      }

      console.log('budgetToSave:', budgetToSave)

      let data, error

      if (selectedBudgetId) {
        // Meglévő költségvetés frissítése
        console.log('UPDATE módban')
        const updateResult = await supabase
          .from('budget_plans')
          .update(budgetToSave)
          .eq('id', selectedBudgetId)
          .select()
        
        data = updateResult.data
        error = updateResult.error
        
        console.log('UPDATE result:', { data, error })
        
        if (!error) {
          toast.success("Költségvetés sikeresen frissítve!")
        }
      } else {
        // Új költségvetés létrehozása
        console.log('INSERT módban')
        const insertResult = await supabase
          .from('budget_plans')
          .insert({
            ...budgetToSave,
            created_at: new Date().toISOString()
          })
          .select()
        
        data = insertResult.data
        error = insertResult.error
        
        console.log('INSERT result:', { data, error })
        
        if (!error && data && data[0]) {
          toast.success("Új költségvetés sikeresen elmentve! Mostantól frissíteni fogod ezt a költségvetést.")
          // Automatikusan kiválasztjuk ÉS aktívvá tesszük az új költségvetést
          setSelectedBudgetId(data[0].id)
          setIsCreatingNew(false) // Újat létrehozás vége
          console.log('setActiveBudgetPlan hívása:', currentUser.id, data[0].id)
          await setActiveBudgetPlan(currentUser.id, data[0].id)
        }
      }

      if (error) {
        console.error('Supabase hiba:', error)
        throw error
      }

      // Frissítjük a mentett költségvetések listáját
      await loadSavedBudgets()
      
      console.log('Saved budget:', data)
      console.log('=== KÖLTSÉGVETÉS MENTÉS VÉGE ===')
    } catch (error: unknown) {
      console.error('Error saving budget:', error)
      const errorMessage = error instanceof Error ? error.message : 'Ismeretlen hiba történt'
      toast.error(`Hiba a mentés során: ${errorMessage}`)
    } finally {
      setIsLoading(false)
    }
  }

  // Mentett költségvetések betöltése
  const loadSavedBudgets = useCallback(async () => {
    if (!currentUser) return
    
    try {
      // Aktív költségvetés ID betöltése
      const preferences = await getUserPreferences(currentUser.id)
      setActiveBudgetId(preferences?.active_budget_plan_id || null)
      
      const { data, error } = await supabase
        .from('budget_plans')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setSavedBudgets(data || [])
      
      console.log('Active budget ID:', preferences?.active_budget_plan_id)
    } catch (error) {
      console.error('Hiba a költségvetések betöltésekor:', error)
      toast.error('Hiba történt a költségvetések betöltésekor!')
    }
  }, [currentUser, supabase])

  // Tényleges bevétel mentése
  const saveActualIncome = async () => {
    if (!currentUser || !selectedBudgetId) {
      toast.error("Válassz ki egy költségvetést a tényleges bevétel mentéséhez!")
      return
    }

    setIsLoading(true)
    try {
      const { error } = await supabase
        .from('budget_plans')
        .update({ 
          actual_income: actualIncome > 0 ? actualIncome : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedBudgetId)
      
      if (error) throw error
      
      toast.success(`Tényleges bevétel mentve: ${actualIncome.toLocaleString('hu-HU')} HUF`)
      console.log('Tényleges bevétel mentve:', actualIncome)
    } catch (error) {
      console.error('Tényleges bevétel mentési hiba:', error)
      toast.error('Hiba történt a tényleges bevétel mentése során!')
    } finally {
      setIsLoading(false)
    }
  }

  // ÚJ költségvetés létrehozása (legutolsó másolása)
  const createNewBudget = () => {
    console.log('=== ÚJ KÖLTSÉGVETÉS LÉTREHOZÁSA (MÁSOLÁS) ===')
    setIsCreatingNew(true) // Jelezzük, hogy új költségvetést hozunk létre
    
    // Ha van mentett költségvetés, betöltjük a legutolsót (adatokkal együtt)
    if (savedBudgets.length > 0) {
      const latestBudget = savedBudgets[0]
      console.log('Legutolsó költségvetés másolása:', latestBudget.name)
      
      const { categories, transferPlan: parsedTransferPlan } = parseBudgetPayload(latestBudget.budget_data)
      setBudgetData(categories)
      setTransferPlan(parsedTransferPlan)
      
      // Név és leírás alapján új nevet generálunk
      const currentDate = new Date().toLocaleDateString('hu-HU')
      setBudgetName(`${latestBudget.name} - Másolat (${currentDate})`)
      setBudgetDescription(latestBudget.description || '')
      setActualIncome(0) // Új költségvetésben nullázzuk a tényleges bevételt
      toast.success(`Költségvetés másolva: ${latestBudget.name}. Adj neki új nevet és mentsd el!`)
    } else {
      // Ha nincs mentett költségvetés, kezdjük üres adatokkal
      setBudgetData(createInitialBudgetData())
      setBudgetName('')
      setBudgetDescription('')
      setActualIncome(0) // Új költségvetésben nullázzuk a tényleges bevételt
      setTransferPlan(createDefaultTransferPlan())
      toast.success('Új üres költségvetés indítva! Töltsd ki az adatokat és mentsd el.')
    }
    
    setPlanMonth(new Date().toISOString().slice(0, 7)) // Új terv: alapból az aktuális hónap
    setSelectedBudgetId('') // Ürítjük a kiválasztást (ez jelzi, hogy új költségvetés)
    console.log('selectedBudgetId törölve, új költségvetés létrehozva másolással')
  }

  // Betöltés az éves tervből
  const loadFromAnnualPlan = async () => {
    if (!currentUser) {
      toast.error('Be kell jelentkezned!')
      return
    }

    setIsLoading(true)
    try {
      const currentMonth = new Date().getMonth() + 1
      const result = await prepareBudgetFromAnnualPlan(
        currentUser.id,
        budgetData,
        currentMonth
      )

      if (!result.annualPlan) {
        toast.info('Nincs éves költségvetési terv az aktuális évre')
        return
      }

      setBudgetData(result.categories)
      setTransferPlan(createDefaultTransferPlan())
      
      // Ha van tervezett bevétel, állítsuk be
      if (result.plannedIncome > 0) {
        setExpectedIncome(result.plannedIncome)
      }

      // Generáljunk nevet
      const monthNames = [
        'Január', 'Február', 'Március', 'Április', 'Május', 'Június',
        'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'
      ]
      const monthName = monthNames[currentMonth - 1]
      setPlanMonth(`${new Date().getFullYear()}-${String(currentMonth).padStart(2, '0')}`) // Vonatkozási hónap az éves tervből
      setBudgetName(`${monthName} ${new Date().getFullYear()} - Éves terv alapján`)
      setBudgetDescription(
        `Automatikusan generált az éves tervből. ` +
        `Ismétlődő kiadások: ${result.recurringExpenses.length} db. ` +
        `Tervezett megtakarítás: ${result.plannedSavings.toLocaleString('hu-HU')} Ft.`
      )

      // Új költségvetésként kezeljük
      setIsCreatingNew(true)
      setSelectedBudgetId('')

      toast.success(
        `Betöltve az éves tervből! ${result.recurringExpenses.length} ismétlődő kiadás és ${result.plannedSavings.toLocaleString('hu-HU')} Ft megtakarítás hozzáadva.`
      )
    } catch (error) {
      console.error('Hiba az éves tervből való betöltéskor:', error)
      toast.error('Hiba történt az éves terv betöltésekor!')
    } finally {
      setIsLoading(false)
    }
  }

  // Meglévő költségvetés betöltése
  const loadBudget = useCallback(async (budgetId: string) => {
    console.log('=== KÖLTSÉGVETÉS BETÖLTÉSE ===', budgetId)
    
    if (!budgetId || budgetId === '') {
      // Ha üres érték jön, ne csináljunk semmit (ez csak a Select reset esetén fordulhat elő)
      return
    }
    
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('budget_plans')
        .select('*')
        .eq('id', budgetId)
        .single()
      
      if (error) throw error
      
      if (data) {
        const { categories, transferPlan: parsedPlan } = parseBudgetPayload(data.budget_data)
        setBudgetData(categories)
        setTransferPlan(parsedPlan)
        
        setBudgetName(data.name || '')
        setBudgetDescription(data.description || '')
        setActualIncome(data.actual_income || 0) // Tényleges bevétel betöltése
        setPlanMonth(data.plan_month || new Date(data.created_at).toISOString().slice(0, 7)) // Vonatkozási hónap (régi terveknél a created_at hónapja)
        setSelectedBudgetId(budgetId)
        setIsCreatingNew(false) // Betöltés esetén nem újat hozunk létre
        
        console.log('Költségvetés betöltve:', data.name, 'ID:', budgetId, 'Tényleges bevétel:', data.actual_income)
        toast.success(`Költségvetés betöltve: ${data.name}`)
      }
    } catch (error) {
      console.error('Hiba a költségvetés betöltésekor:', error)
      toast.error('Hiba történt a költségvetés betöltésekor!')
    } finally {
      setIsLoading(false)
    }
  }, [supabase])

  // Legutolsó költségvetés automatikus betöltése
  const loadLatestBudget = useCallback(async () => {
    if (!currentUser || savedBudgets.length === 0) return
    
    // A legutolsó mentett költségvetés kiválasztása (már created_at szerint rendezve van)
    const latestBudget = savedBudgets[0]
    if (latestBudget) {
      await loadBudget(latestBudget.id)
      toast.info(`Legutolsó költségvetés automatikusan betöltve: ${latestBudget.name}`)
    }
  }, [currentUser, savedBudgets, loadBudget])

  // Bevételi tervek betöltése
  const loadIncomePlans = useCallback(async () => {
    if (!currentUser) return
    
    try {
      const { data, error } = await supabase
        .from('income_plans')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setIncomePlans(data || [])
      
      // Aktív bevételi terv betöltése
      const prefs = await getUserPreferences(currentUser.id)
      if (prefs?.active_income_plan_id) {
        setActiveIncomeId(prefs.active_income_plan_id)
        setSelectedIncomeId(prefs.active_income_plan_id)
        
        // Beállítjuk az aktív terv összegét
        const activePlan = data?.find(plan => plan.id === prefs.active_income_plan_id)
        if (activePlan) {
          setExpectedIncome(activePlan.total_income)
        }
      }
    } catch (error) {
      console.error('Hiba a bevételi tervek betöltésekor:', error)
      toast.error('Hiba történt a bevételi tervek betöltésekor!')
    }
  }, [currentUser, supabase])

  // Bevételi terv kiválasztása
  const selectIncomePlan = useCallback(async (incomeId: string) => {
    if (!incomeId || incomeId === '') {
      setSelectedIncomeId('')
      setExpectedIncome(0)
      return
    }
    
    const selectedPlan = incomePlans.find(plan => plan.id === incomeId)
    if (selectedPlan) {
      setSelectedIncomeId(incomeId)
      setExpectedIncome(selectedPlan.total_income)
      
      // Beállítjuk aktívként
      if (currentUser) {
        const result = await setActiveIncomePlan(currentUser.id, incomeId)
        if (result.success) {
          setActiveIncomeId(incomeId)
          toast.success(`Bevételi terv betöltve és aktívként beállítva: ${selectedPlan.name}`)
        } else {
          toast.error('Nem sikerült aktívként beállítani a tervet')
        }
      }
    }
  }, [incomePlans, currentUser])

  // Költségvetés aktívvá tétele
  const setActiveBudget = useCallback(async (budgetId: string) => {
    if (!currentUser) {
      toast.error('Nincs bejelentkezett felhasználó')
      return
    }

    try {
      const result = await setActiveBudgetPlan(currentUser.id, budgetId)
      if (result.success) {
        setActiveBudgetId(budgetId)
        const budget = savedBudgets.find(b => b.id === budgetId)
        toast.success(`Költségvetés aktívként beállítva: ${budget?.name}`)
      } else {
        toast.error('Nem sikerült aktívként beállítani a költségvetést')
      }
    } catch (error) {
      console.error('Hiba a költségvetés aktívvá tételekor:', error)
      toast.error('Hiba történt a költségvetés aktívvá tételekor!')
    }
  }, [currentUser, savedBudgets])

  // Felhasználó és mentett költségvetések betöltése
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
    }
    getUser()
  }, [supabase.auth])

  // Mentett költségvetések betöltése amikor a felhasználó betöltődik
  useEffect(() => {
    if (currentUser) {
      loadSavedBudgets()
      loadIncomePlans()
    }
  }, [currentUser, loadSavedBudgets, loadIncomePlans])

  // Legutolsó költségvetés automatikus betöltése, amikor a mentett költségvetések betöltődnek
  useEffect(() => {
    if (savedBudgets.length > 0 && !selectedBudgetId && !isCreatingNew) {
      loadLatestBudget()
    }
  }, [savedBudgets, selectedBudgetId, loadLatestBudget, isCreatingNew])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Kategória ikonok hozzárendelése
  const getCategoryIcon = (categoryName: string) => {
    switch (categoryName) {
      case 'Autó': return <Car size={20} className="text-blue-600" />
      case 'Szórakozás': return <Gamepad2 size={20} className="text-purple-600" />
      case 'Lakás': return <Home size={20} className="text-green-600" />
      case 'Személyes': return <Heart size={20} className="text-pink-600" />
      case 'Egészség': return <Heart size={20} className="text-red-600" />
      case 'Egyéb': return <DollarSign size={20} className="text-gray-600" />
      case 'Készpénz': return <Wallet size={20} className="text-orange-600" />
      default: return <Calculator size={20} className="text-gray-600" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Szükséglet': return 'bg-red-100 text-red-800 border-red-200'
      case 'Vágyak': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'Megtakarítás': return 'bg-green-100 text-green-800 border-green-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const totals = calculateTotals()

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-teal-50 to-emerald-50 p-3 sm:p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 via-teal-500/20 to-emerald-500/20 animate-gradient"></div>
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-6 sm:mb-8 bg-white/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20">
          <div className="flex items-center gap-3 sm:gap-4 mb-4">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-3 sm:p-4 rounded-2xl shadow-lg animate-pulse-slow">
              <PiggyBank className="text-white" size={32} />
            </div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent tracking-tight">
              Költségvetés Tervező 2025
            </h1>
          </div>
          <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed px-1 font-medium">
            Tervezd meg havi költségvetésedet kategóriák szerint és tartsd kézben a pénzügyeidet.
          </p>
        </div>

        {/* Mentett költségvetések betöltése és bevétel kezelése */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Mentett költségvetések */}
          <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 hover:shadow-emerald-500/20 hover:scale-[1.02] transition-all duration-300 rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-bold">
                <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
                  <DollarSign size={16} className="text-white sm:w-5 sm:h-5" />
                </div>
                Mentett Költségvetések
              </CardTitle>
              <CardDescription className="text-sm text-gray-600 leading-relaxed">
                Töltsd be egy korábban elmentett költségvetésedet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label htmlFor="saved-budgets" className="block text-sm font-medium text-gray-700 mb-2">
                    Válassz egy költségvetést
                  </label>
                  <Select key={selectedBudgetId} value={selectedBudgetId || undefined} onValueChange={(value) => loadBudget(value)}>
                    <SelectTrigger className="h-9 sm:h-10 border-2 border-gray-200 hover:border-emerald-400 focus:border-emerald-500 transition-colors duration-200 rounded-xl">
                      <SelectValue placeholder="Válassz egy mentett költségvetést..." />
                    </SelectTrigger>
                    <SelectContent>
                      {savedBudgets.map((budget) => (
                        <SelectItem key={budget.id} value={budget.id}>
                          <div className="flex flex-col w-full">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{budget.name}</span>
                              {activeBudgetId === budget.id && (
                                <Badge className="text-xs bg-green-500 text-white border-0 px-2 py-0 h-5">Aktív</Badge>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 mt-1">
                              {new Date(budget.created_at).toLocaleDateString('hu-HU')} - 
                              {budget.total_amount.toLocaleString('hu-HU')} HUF
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button
                    onClick={createNewBudget}
                    variant="outline"
                    className="flex-1 flex items-center gap-2 h-9 text-sm bg-gradient-to-r from-green-50 to-emerald-50 hover:from-green-100 hover:to-emerald-100 border-2 border-green-300 text-green-700 font-semibold shadow-md hover:shadow-lg transition-all duration-200 rounded-xl"
                  >
                    <Plus size={14} />
                    Másolás új néven
                  </Button>
                  <Button
                    onClick={loadFromAnnualPlan}
                    variant="outline"
                    className="flex-1 flex items-center gap-2 h-9 text-sm bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border-2 border-purple-300 text-purple-700 font-semibold shadow-md hover:shadow-lg transition-all duration-200 rounded-xl"
                    disabled={isLoading}
                  >
                    <Calendar size={14} />
                    Betöltés éves tervből
                  </Button>
                  {selectedBudgetId && !isCreatingNew && activeBudgetId !== selectedBudgetId && (
                    <Button
                      onClick={() => setActiveBudget(selectedBudgetId)}
                      variant="outline"
                      className="flex-1 flex items-center gap-2 h-9 text-sm bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 border-2 border-blue-300 text-blue-700 font-semibold shadow-md hover:shadow-lg transition-all duration-200 rounded-xl"
                    >
                      <Target size={14} />
                      Aktívvá tétel
                    </Button>
                  )}
                  {selectedBudgetId && !isCreatingNew && (
                    <div className="flex-1 text-xs sm:text-sm text-gray-600 flex items-center">
                      <span className="font-medium">Módosítás alatt: </span>
                      <span className="ml-1 text-blue-600 font-semibold truncate">
                        {savedBudgets.find(b => b.id === selectedBudgetId)?.name}
                      </span>
                    </div>
                  )}
                  {isCreatingNew && (
                    <div className="flex-1 text-xs sm:text-sm text-gray-600 flex items-center">
                      <span className="font-medium">Másolat készítés: </span>
                      <span className="ml-1 text-green-600 font-semibold">
                        Módosítsd a nevet és mentsd el
                      </span>
                    </div>
                  )}
                </div>
                
                {savedBudgets.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-3 sm:py-4">
                    Még nincsenek mentett költségvetések
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Tervezett bevétel és összehasonlítás */}
          <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 hover:shadow-blue-500/20 hover:scale-[1.02] transition-all duration-300 rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-bold">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                  <TrendingUp size={16} className="text-white sm:w-5 sm:h-5" />
                </div>
                Bevétel vs Költségvetés
              </CardTitle>
              <CardDescription className="text-sm text-gray-600 leading-relaxed">
                Hasonlítsd össze a tervezett bevételed a költségvetéseddel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 sm:space-y-4">
                <div>
                  <label htmlFor="income-plan" className="block text-sm font-medium text-gray-700 mb-2">
                    Válassz egy bevételi tervet
                  </label>
                  <Select value={selectedIncomeId} onValueChange={(value) => selectIncomePlan(value)}>
                    <SelectTrigger className="h-9 sm:h-10 border-2 border-gray-200 hover:border-blue-400 focus:border-blue-500 transition-colors duration-200 rounded-xl">
                      <SelectValue placeholder="Válassz egy bevételi tervet..." />
                    </SelectTrigger>
                    <SelectContent>
                      {incomePlans.map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          <div className="flex flex-col w-full">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{plan.name}</span>
                              {plan.id === activeIncomeId && (
                                <Badge className="text-xs bg-green-500 text-white border-0 px-2 py-0 h-5">Aktív</Badge>
                              )}
                            </div>
                            <span className="text-xs text-gray-500 mt-1">
                              {new Date(plan.created_at).toLocaleDateString('hu-HU')} - 
                              {plan.total_income.toLocaleString('hu-HU')} HUF
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {incomePlans.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-2">
                      Még nincsenek mentett bevételi tervek
                    </p>
                  )}
                </div>
                
                <div className="text-xs sm:text-sm text-gray-600">
                  <span className="font-medium">Jelenleg kiválasztott bevétel: </span>
                  <span className="font-bold text-blue-600">
                    {expectedIncome > 0 ? `${expectedIncome.toLocaleString('hu-HU')} HUF` : 'Nincs kiválasztva'}
                  </span>
                </div>

                {/* Tényleges bevétel input mező */}
                <div>
                  <label htmlFor="actual-income" className="block text-sm font-medium text-gray-700 mb-2">
                    Tényleges bevétel
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="actual-income"
                      type="number"
                      placeholder="Tényleges bevétel összege"
                      value={actualIncome || ''}
                      onChange={(e) => setActualIncome(Number(e.target.value) || 0)}
                      className="h-9 sm:h-10 flex-1 border-2 border-gray-200 focus:border-green-400 transition-colors duration-200 rounded-xl"
                    />
                    <span className="text-sm text-gray-500 font-medium">HUF</span>
                    <Button 
                      onClick={saveActualIncome}
                      disabled={!selectedBudgetId || isLoading}
                      size="sm"
                      className="h-9 px-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all duration-200 rounded-xl"
                    >
                      <Save size={16} className="mr-1" />
                      Mentés
                    </Button>
                  </div>
                  <div className="flex flex-col gap-1 mt-1">
                    <p className="text-xs text-gray-500">
                      Add meg a ténylegesen megkapott bevételt és mentsd el
                    </p>
                    {!selectedBudgetId && (
                      <p className="text-xs text-orange-600 font-medium">
                        Válassz ki egy költségvetést a mentéshez!
                      </p>
                    )}
                    {actualIncome > 0 && (
                      <p className="text-xs text-green-600 font-medium">
                        Formázva: {formatCurrency(actualIncome)}
                      </p>
                    )}
                  </div>
                </div>
                
                {(expectedIncome > 0 || actualIncome > 0) && (
                  <div className="space-y-2 sm:space-y-3 p-3 sm:p-4 bg-gray-50 rounded-lg">
                    {expectedIncome > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm font-medium text-gray-600">Tervezett bevétel:</span>
                        <span className="font-bold text-blue-600 text-sm">
                          {expectedIncome.toLocaleString('hu-HU')} HUF
                        </span>
                      </div>
                    )}
                    {actualIncome > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm font-medium text-gray-600">Tényleges bevétel:</span>
                        <span className="font-bold text-green-600 text-sm">
                          {actualIncome.toLocaleString('hu-HU')} HUF
                        </span>
                      </div>
                    )}
                    {expectedIncome > 0 && actualIncome > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-xs sm:text-sm font-medium text-gray-600">Bevétel eltérés:</span>
                        <span className={`font-bold text-sm ${actualIncome - expectedIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {actualIncome > expectedIncome ? '+' : ''}{(actualIncome - expectedIncome).toLocaleString('hu-HU')} HUF
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-xs sm:text-sm font-medium text-gray-600">Összes költség:</span>
                      <span className="font-bold text-red-600 text-sm">
                        {calculateTotals().total.toLocaleString('hu-HU')} HUF
                      </span>
                    </div>
                    <Separator />
                    
                    {/* Összehasonlítás - használjuk a tényleges bevételt ha van, különben a tervezettet */}
                    {(() => {
                      const incomeToUse = actualIncome > 0 ? actualIncome : expectedIncome;
                      const difference = incomeToUse - calculateTotals().total;
                      const incomeLabel = actualIncome > 0 ? 'tényleges' : 'tervezett';
                      
                      return (
                        <>
                          <div className="flex justify-between items-center">
                            <span className="text-xs sm:text-sm font-medium text-gray-600">
                              Különbség ({incomeLabel} bevétel alapján):
                            </span>
                            <span className={`font-bold text-sm ${difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {difference.toLocaleString('hu-HU')} HUF
                            </span>
                          </div>
                          
                          {difference < 0 && (
                            <div className="flex items-center gap-2 p-2 sm:p-3 bg-red-50 border border-red-200 rounded-lg">
                              <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0"></div>
                              <span className="text-xs sm:text-sm text-red-700 font-medium">
                                Figyelem! A költségvetés meghaladja a {incomeLabel} bevételt!
                              </span>
                            </div>
                          )}
                          
                          {difference >= 0 && (
                            <div className="flex items-center gap-2 p-2 sm:p-3 bg-green-50 border border-green-200 rounded-lg">
                              <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                              <span className="text-xs sm:text-sm text-green-700 font-medium">
                                Kiváló! A költségvetés belefér a {incomeLabel} bevételbe.
                              </span>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Számlák és tervezett utalások */}
        <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 rounded-2xl mb-6 sm:mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-bold">
              <div className="p-2 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl">
                <ArrowLeftRight size={20} className="text-white sm:w-6 sm:h-6" />
              </div>
              Számlák és Tervezett Utalások
            </CardTitle>
            <CardDescription className="text-sm text-gray-600 leading-relaxed">
              Kövesd nyomon, honnan hova szeretnéd mozgatni a pénzt, és lásd előre a várható egyenlegeket.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Induló egyenlegek</p>
                    <p className="text-xs text-gray-500">Állítsd be a főszámla és a hitelkártyák kezdő értékeit.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApplyIncomeToMainAccount('expected')}
                      disabled={expectedIncome <= 0}
                      className="text-xs sm:text-sm h-8 border-blue-300 text-blue-700 hover:bg-blue-50"
                    >
                      <RefreshCcw size={14} className="mr-1" />
                      Tervezett bevétel
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApplyIncomeToMainAccount('actual')}
                      disabled={actualIncome <= 0}
                      className="text-xs sm:text-sm h-8 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                    >
                      <RefreshCcw size={14} className="mr-1" />
                      Tényleges bevétel
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                  {transferPlan.accounts.map(account => (
                    <div key={account.id} className="p-4 rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white shadow-sm">
                      <Input
                        value={account.name}
                        onChange={(e) => updateTransferAccount(account.id, { name: e.target.value })}
                        className="mb-2 h-9 text-sm border-2 border-gray-200 focus:border-cyan-400"
                      />
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          value={displayNumericInputValue(account.initialBalance)}
                          onChange={(e) => updateTransferAccount(account.id, { initialBalance: Number(e.target.value) || 0 })}
                          className="flex-1 h-9 text-sm text-right border-2 border-gray-200 focus:border-emerald-400"
                        />
                        <span className="text-xs text-gray-500 font-medium">Ft</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Formázva: <span className="font-semibold text-gray-800">{formatCurrency(account.initialBalance)}</span>
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              <div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Tervezett utalások</p>
                    <p className="text-xs text-gray-500">Adj hozzá utalási sorokat a főszámla és a kártyák között oda-vissza.</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addTransferRow}
                    className="h-8 text-xs sm:text-sm border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  >
                    <Plus size={14} className="mr-1" />
                    Új utalás
                  </Button>
                </div>

                {transferPlan.transfers.length === 0 ? (
                  <div className="p-4 rounded-2xl border border-dashed border-gray-300 text-center text-sm text-gray-500 bg-gray-50">
                    Még nincs tervezett utalás. Kattints az "Új utalás" gombra a kezdéshez.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transferPlan.transfers.map(transfer => (
                      <div key={transfer.id} className="grid grid-cols-1 gap-3 lg:grid-cols-5 items-center p-3 sm:p-4 rounded-2xl border border-gray-200 bg-white shadow-sm">
                        <div>
                          <label className="text-xs text-gray-500">Honnan</label>
                          <Select
                            value={transfer.fromAccountId}
                            onValueChange={(value) => updateTransferRow(transfer.id, { fromAccountId: value })}
                          >
                            <SelectTrigger className="h-9 border-2 border-gray-200 focus:border-blue-400 text-sm">
                              <SelectValue placeholder="Válassz számlát" />
                            </SelectTrigger>
                            <SelectContent>
                              {transferPlan.accounts.map(account => (
                                <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Hova</label>
                          <Select
                            value={transfer.toAccountId}
                            onValueChange={(value) => updateTransferRow(transfer.id, { toAccountId: value })}
                          >
                            <SelectTrigger className="h-9 border-2 border-gray-200 focus:border-purple-400 text-sm">
                              <SelectValue placeholder="Válassz számlát" />
                            </SelectTrigger>
                            <SelectContent>
                              {transferPlan.accounts.map(account => (
                                <SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <label className="text-xs text-gray-500">Összeg</label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              min="0"
                              value={displayNumericInputValue(transfer.amount)}
                              onChange={(e) => updateTransferRow(transfer.id, { amount: Number(e.target.value) || 0 })}
                              className="h-9 text-right border-2 border-gray-200 focus:border-emerald-400"
                            />
                            <span className="text-xs text-gray-500 font-medium">Ft</span>
                          </div>
                        </div>
                        <div className="lg:col-span-1">
                          <label className="text-xs text-gray-500">Megjegyzés</label>
                          <Input
                            value={transfer.description || ''}
                            onChange={(e) => updateTransferRow(transfer.id, { description: e.target.value })}
                            placeholder="Pl. minimum törlesztés"
                            className="h-9 text-sm border-2 border-gray-200 focus:border-cyan-400"
                          />
                        </div>
                        <div className="flex items-center justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeTransferRow(transfer.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 h-9 w-9 rounded-xl"
                          >
                            <X size={16} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex flex-col gap-1">
                  <p className="text-sm font-semibold text-gray-800">Számla előrejelzés</p>
                  <p className="text-xs text-gray-500">Induló egyenleg + bejövő utalások - kimenő utalások = várható egyenleg.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
                  {accountSummaries.map(account => (
                    <div key={account.id} className="p-4 rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-800">{account.name}</span>
                        <Badge className="bg-cyan-500 text-white border-0 text-xs">
                          {account.projectedBalance >= 0 ? 'Pozitív' : 'Negatív'}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-600 space-y-1">
                        <p>Induló: <span className="font-semibold">{formatCurrency(account.initialBalance)}</span></p>
                        <p>Bejövő: <span className="font-semibold text-emerald-600">+{formatCurrency(account.incoming)}</span></p>
                        <p>Kimenő: <span className="font-semibold text-red-600">-{formatCurrency(account.outgoing)}</span></p>
                      </div>
                      <Separator className="my-1" />
                      <p className="text-sm font-bold text-gray-900">
                        Várható egyenleg: <span className={account.projectedBalance >= 0 ? 'text-emerald-600' : 'text-red-600'}>{formatCurrency(account.projectedBalance)}</span>
                      </p>
                    </div>
                  ))}
                </div>
                <div className="text-xs text-gray-500 font-medium">
                  Összes tervezett pénzmozgás: <span className="text-gray-900">{formatCurrency(totalTransferVolume)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Összesítő kártyák */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <Card className="bg-white/90 backdrop-blur-xl shadow-xl border border-gray-200/50 hover:shadow-2xl hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden group">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-semibold text-gray-600 flex items-center gap-1 sm:gap-2">
                <div className="p-1.5 bg-gray-100 rounded-lg group-hover:bg-gray-200 transition-colors">
                  <Calculator size={14} className="text-gray-600 sm:w-4 sm:h-4" />
                </div>
                <span className="truncate">Összes költség</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-base sm:text-xl lg:text-2xl font-bold text-gray-900 tabular-nums">{formatCurrency(totals.total)}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-500 to-rose-600 text-white shadow-xl hover:shadow-2xl hover:shadow-red-500/50 hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden border-0 group">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-semibold text-red-50 flex items-center gap-1 sm:gap-2">
                <div className="p-1.5 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors backdrop-blur-sm">
                  <Target size={14} className="text-white sm:w-4 sm:h-4" />
                </div>
                <span className="truncate">Szükségletek</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-base sm:text-xl lg:text-2xl font-bold text-white drop-shadow-lg tabular-nums">{formatCurrency(totals.szuksegletTotal)}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-xl hover:shadow-2xl hover:shadow-blue-500/50 hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden border-0 group">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-semibold text-blue-50 flex items-center gap-1 sm:gap-2">
                <div className="p-1.5 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors backdrop-blur-sm">
                  <Gift size={14} className="text-white sm:w-4 sm:h-4" />
                </div>
                <span className="truncate">Vágyak</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-base sm:text-xl lg:text-2xl font-bold text-white drop-shadow-lg tabular-nums">{formatCurrency(totals.vagyakTotal)}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl hover:shadow-2xl hover:shadow-emerald-500/50 hover:scale-105 transition-all duration-300 rounded-2xl overflow-hidden border-0 group">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs sm:text-sm font-semibold text-green-50 flex items-center gap-1 sm:gap-2">
                <div className="p-1.5 bg-white/20 rounded-lg group-hover:bg-white/30 transition-colors backdrop-blur-sm">
                  <PiggyBank size={14} className="text-white sm:w-4 sm:h-4" />
                </div>
                <span className="truncate">Megtakarítás</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-base sm:text-xl lg:text-2xl font-bold text-white drop-shadow-lg tabular-nums">{formatCurrency(totals.megtakaritasTotal)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Mentés gomb */}
        <div className="mb-4 sm:mb-6">
          <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 rounded-2xl mb-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-bold">
                <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
                  <Save size={16} className="text-white sm:w-5 sm:h-5" />
                </div>
                Költségvetés Mentése
              </CardTitle>
              <CardDescription className="text-sm text-gray-600 leading-relaxed">
                Add meg a költségvetés nevét és leírását a mentés előtt
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 mb-4">
                <div>
                  <label htmlFor="budget-name" className="block text-sm font-semibold text-gray-700 mb-2">
                    Költségvetés neve
                  </label>
                  <Input
                    id="budget-name"
                    value={budgetName}
                    onChange={(e) => setBudgetName(e.target.value)}
                    placeholder={`Költségvetés ${new Date().toLocaleDateString('hu-HU')}`}
                    className="w-full h-9 sm:h-10 text-sm border-2 border-gray-200 focus:border-emerald-400 transition-colors duration-200 rounded-xl"
                  />
                </div>
                <div>
                  <label htmlFor="budget-month" className="block text-sm font-semibold text-gray-700 mb-2">
                    Vonatkozási hónap
                  </label>
                  <Input
                    id="budget-month"
                    type="month"
                    value={planMonth}
                    onChange={(e) => setPlanMonth(e.target.value)}
                    className="w-full h-9 sm:h-10 text-sm border-2 border-gray-200 focus:border-emerald-400 transition-colors duration-200 rounded-xl"
                  />
                  <p className="text-xs text-gray-500 mt-1">A Terv vs. Tény oldal ehhez a hónaphoz párosítja a Wallet tényadatokat.</p>
                </div>
                <div className="lg:col-span-2">
                  <label htmlFor="budget-description" className="block text-sm font-semibold text-gray-700 mb-2">
                    Leírás (opcionális)
                  </label>
                  <Input
                    id="budget-description"
                    value={budgetDescription}
                    onChange={(e) => setBudgetDescription(e.target.value)}
                    placeholder="Rövid leírás a költségvetésről"
                    className="w-full h-9 sm:h-10 text-sm border-2 border-gray-200 focus:border-emerald-400 transition-colors duration-200 rounded-xl"
                  />
                </div>
              </div>
              <Button 
                onClick={saveBudget} 
                disabled={isLoading || !currentUser}
                className="w-full sm:w-auto bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-600 hover:via-teal-600 hover:to-cyan-600 text-white shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 px-6 sm:px-8 py-3 sm:py-4 flex items-center justify-center gap-2 text-sm sm:text-base font-bold rounded-xl"
              >
                <Save size={16} className="sm:w-5 sm:h-5" />
                {isLoading ? 'Mentés...' : selectedBudgetId ? 'Költségvetés Frissítése' : 'Új Költségvetés Mentése'}
              </Button>
              {!currentUser && (
                <p className="text-xs sm:text-sm text-gray-500 mt-2">A mentéshez be kell jelentkezned!</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Költségvetési táblázat */}
        <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-bold">
              <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-600 rounded-xl">
                <CreditCard size={20} className="text-white sm:w-6 sm:h-6" />
              </div>
              Költségvetési Tételek
            </CardTitle>
            <CardDescription className="text-sm text-gray-600 leading-relaxed">
              Módosítsd az összegeket a kategóriák szerint
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 sm:space-y-6">
              {budgetData.map((category, categoryIndex) => (
                <div key={category.name} className="border-l-4 border-gradient-to-b from-emerald-400 to-teal-500 rounded-2xl p-4 sm:p-6 bg-gradient-to-r from-white to-gray-50 shadow-lg hover:shadow-xl transition-all duration-300">
                  <div className="flex flex-col gap-3 sm:gap-4 mb-3 sm:mb-4">
                    {/* Első sor: Kategória neve és összeg */}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col gap-2">
                        <h3 className="font-bold text-lg sm:text-xl text-gray-900 flex items-center gap-2 sm:gap-3">
                          {getCategoryIcon(category.name)}
                          {category.name}
                        </h3>
                        {/* Wallet kategória badge-ek */}
                        <div className="flex flex-wrap gap-1.5">
                          {category.walletCategories && category.walletCategories.length > 0 ? (
                            category.walletCategories.map((id) => {
                              const wc = WALLET_CATEGORY_MAP.get(id)
                              return (
                                <Badge
                                  key={id}
                                  variant="outline"
                                  className="text-xs bg-gradient-to-r from-blue-50 to-cyan-50 text-blue-700 border-2 border-blue-300 flex items-center gap-1 font-medium rounded-full px-3 py-1 shadow-sm hover:shadow-md transition-all"
                                >
                                  {wc ? `${wc.name}` : id}
                                  <X
                                    size={12}
                                    className="cursor-pointer hover:text-blue-900"
                                    onClick={() => removeWalletCategory(categoryIndex, id)}
                                  />
                                </Badge>
                              )
                            })
                          ) : (
                            <Badge variant="outline" className="text-xs bg-gray-50 text-gray-400 border-gray-200 rounded-full px-3 py-1">
                              Nincs wallet kategória
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 sm:gap-4">
                        <div className="text-xs sm:text-sm font-semibold text-gray-600 text-right">
                          Kategória összesen: <span className="text-base sm:text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent tabular-nums">{formatCurrency(getCategoryTotal(category))}</span>
                        </div>
                        <Button
                          onClick={() => addItem(categoryIndex)}
                          variant="outline"
                          size="sm"
                          className="w-full sm:w-auto flex items-center justify-center gap-1 text-emerald-600 border-2 border-emerald-300 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-teal-50 hover:border-emerald-400 text-sm h-8 font-semibold shadow-sm hover:shadow-md transition-all duration-200 rounded-xl"
                        >
                          <Plus size={14} />
                          <span className="sm:hidden">Új tétel</span>
                          <span className="hidden sm:inline">Tétel hozzáadása</span>
                        </Button>
                      </div>
                    </div>
                    
                    {/* Második sor: Wallet kategória választó */}
                    <div className="space-y-2">
                      <Select
                        value="add"
                        onValueChange={(value) => {
                          if (value !== 'add') addWalletCategory(categoryIndex, value)
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs sm:text-sm border-2 border-gray-200 hover:border-blue-400 focus:border-blue-500 transition-colors duration-200 rounded-xl">
                          <SelectValue placeholder="+ Wallet kategória hozzáadása" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="add" disabled>Válassz kategóriát</SelectItem>
                          {Array.from(new Set(WALLET_CATEGORIES.map(c => c.group))).map(group => {
                            const opts = WALLET_CATEGORIES.filter(
                              c => c.group === group &&
                              !category.walletCategories?.includes(c.id) &&
                              !allUsedWalletIds.has(c.id)
                            )
                            if (opts.length === 0) return null
                            return (
                              <SelectGroup key={group}>
                                <SelectLabel>{group}</SelectLabel>
                                {opts.map(wc => (
                                  <SelectItem key={wc.id} value={wc.id}>{wc.name}</SelectItem>
                                ))}
                              </SelectGroup>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {category.items.map((item, itemIndex) => (
                      <div key={item.id} className="grid grid-cols-1 gap-3 sm:gap-4 bg-white/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 shadow-md hover:shadow-xl hover:scale-[1.01] transition-all duration-200 border border-gray-100">
                        {/* Mobile layout */}
                        <div className="sm:hidden space-y-3">
                          {/* Row 1: Type and Badge */}
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <Select value={item.type || "none"} onValueChange={(value) => updateItemType(categoryIndex, itemIndex, value === "none" ? '' : value as 'Szükséglet' | 'Vágyak' | 'Megtakarítás')}>
                                <SelectTrigger className="w-full h-8 text-sm border-2 border-gray-200 hover:border-emerald-400 focus:border-emerald-500 transition-colors rounded-xl">
                                  <SelectValue placeholder="Típus" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Nincs</SelectItem>
                                  <SelectItem value="Szükséglet">Szükséglet</SelectItem>
                                  <SelectItem value="Vágyak">Vágyak</SelectItem>
                                  <SelectItem value="Megtakarítás">Megtakarítás</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            {item.type && (
                              <Badge variant="outline" className={`${getTypeColor(item.type)} text-xs`}>
                                {item.type}
                              </Badge>
                            )}
                          </div>
                          
                          {/* Row 2: Name */}
                          <div>
                            <Input
                              value={item.subcategory}
                              onChange={(e) => updateItemName(categoryIndex, itemIndex, e.target.value)}
                              className="font-semibold text-gray-700 border-2 border-gray-200 focus:border-emerald-400 h-8 text-sm transition-colors rounded-xl"
                              placeholder="Tétel neve"
                            />
                          </div>
                          
                          {/* Row 3: Amount and Delete */}
                          <div className="flex items-center gap-2">
                            <div className="flex-1 flex items-center gap-2">
                              <Input
                                type="text"
                                value={item.amount.toLocaleString('hu-HU')}
                                onChange={(e) => updateAmount(categoryIndex, itemIndex, e.target.value)}
                                className="text-right border-2 border-gray-200 focus:border-emerald-400 h-8 text-sm transition-colors rounded-xl font-mono"
                                placeholder="0"
                              />
                              <span className="text-xs text-gray-500 font-medium">Ft</span>
                            </div>
                            <div className="text-right font-bold text-gray-900 text-sm min-w-0 tabular-nums">
                              {formatCurrency(item.amount)}
                            </div>
                            <Button
                              onClick={() => removeItem(categoryIndex, itemIndex)}
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8 p-0 flex-shrink-0 rounded-xl transition-all hover:scale-110"
                            >
                              <X size={14} />
                            </Button>
                          </div>
                        </div>

                        {/* Desktop layout */}
                        <div className="hidden sm:grid sm:grid-cols-6 gap-4 items-center">
                          {/* Típus választó */}
                          <div className="flex items-center gap-2">
                            <Select value={item.type || "none"} onValueChange={(value) => updateItemType(categoryIndex, itemIndex, value === "none" ? '' : value as 'Szükséglet' | 'Vágyak' | 'Megtakarítás')}>
                              <SelectTrigger className="w-full h-9 border-2 border-gray-200 hover:border-emerald-400 focus:border-emerald-500 transition-colors rounded-xl">
                                <SelectValue placeholder="Típus" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">Nincs</SelectItem>
                                <SelectItem value="Szükséglet">Szükséglet</SelectItem>
                                <SelectItem value="Vágyak">Vágyak</SelectItem>
                                <SelectItem value="Megtakarítás">Megtakarítás</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {/* Címke */}
                          <div className="flex items-center gap-2">
                            {item.type && (
                              <Badge variant="outline" className={getTypeColor(item.type)}>
                                {item.type}
                              </Badge>
                            )}
                          </div>
                          
                          {/* Tétel neve */}
                          <div className="md:col-span-2">
                            <Input
                              value={item.subcategory}
                              onChange={(e) => updateItemName(categoryIndex, itemIndex, e.target.value)}
                              className="font-semibold text-gray-700 border-2 border-gray-200 focus:border-emerald-400 h-9 transition-colors rounded-xl"
                              placeholder="Tétel neve"
                            />
                          </div>
                          
                          {/* Összeg */}
                          <div className="flex items-center gap-2">
                            <Input
                              type="text"
                              value={item.amount.toLocaleString('hu-HU')}
                              onChange={(e) => updateAmount(categoryIndex, itemIndex, e.target.value)}
                              className="text-right border-2 border-gray-200 focus:border-emerald-400 h-9 transition-colors rounded-xl font-mono"
                              placeholder="0"
                            />
                            <span className="text-sm text-gray-500 font-medium">Ft</span>
                          </div>
                          
                          {/* Formázott összeg és törlés gomb */}
                          <div className="flex items-center justify-between">
                            <div className="text-right font-bold text-gray-900 text-lg tabular-nums">
                              {formatCurrency(item.amount)}
                            </div>
                            <Button
                              onClick={() => removeItem(categoryIndex, itemIndex)}
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 ml-2 rounded-xl hover:scale-110 transition-all"
                            >
                              <X size={16} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-4 sm:my-6" />
            
            {/* Összesítő sor */}
            <div className="flex flex-col sm:grid sm:grid-cols-4 gap-3 sm:gap-4 items-center bg-gradient-to-r from-emerald-50 via-teal-50 to-cyan-50 p-4 sm:p-6 rounded-2xl border-2 border-emerald-200 shadow-lg">
              <div className="hidden sm:block"></div>
              <div className="font-bold text-base sm:text-lg flex items-center justify-center sm:justify-start gap-2">
                <div className="p-2 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl">
                  <TrendingUp size={16} className="text-white sm:w-5 sm:h-5" />
                </div>
                Összesen:
              </div>
              <div className="hidden sm:block"></div>
              <div className="text-center sm:text-right font-extrabold text-2xl sm:text-3xl bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent tabular-nums">
                {formatCurrency(totals.total)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mentett költségvetések */}
        {savedBudgets.length > 0 && (
          <Card className="mt-6 sm:mt-8 bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg font-bold">
                <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl">
                  <Save size={20} className="text-white sm:w-6 sm:h-6" />
                </div>
                Mentett Költségvetések
              </CardTitle>
              <CardDescription className="text-sm text-gray-600 leading-relaxed">
                Korábban elmentett költségvetési terveid
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 sm:space-y-3">
                {savedBudgets.slice(0, 5).map((budget) => (
                  <div key={budget.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 p-3 sm:p-4 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border-2 border-emerald-200 shadow-md hover:shadow-lg hover:scale-[1.02] transition-all duration-200">
                    <div>
                      <div className="font-semibold text-gray-900 text-sm sm:text-base">
                        {new Date(budget.created_at).toLocaleDateString('hu-HU', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    <div className="font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent text-lg sm:text-xl tabular-nums">
                      {formatCurrency(budget.total_amount)}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
