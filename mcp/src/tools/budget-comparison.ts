import { supabase, USER_ID } from '../lib/supabase.js'
import { CATEGORY_ALIAS_MAP, FALLBACK_CATEGORY_MAP } from '../lib/category-map.js'
import { WALLET_CATEGORY_NAME_TO_ID } from '../lib/wallet-categories.js'

interface BudgetItem {
  id?: string
  category: string
  type?: string
  subcategory?: string
  amount: number
}

interface BudgetCategory {
  name: string
  items: BudgetItem[]
  walletCategories?: string[] // Wallet kategória UUID-k tömbje
  // Legacy mezők
  walletMainCategory?: string
  walletSubCategory?: string
  walletSubCategories?: string[]
}

export interface WalletRecord {
  date: string
  category: string
  amount: number
  type: string
  note?: string
  payee?: string
  account?: string
  categoryId?: string // Wallet kategória UUID, ha elérhető
}

// Régi szöveges alkategória → UUID-k
const OLD_SUBCATEGORY_TO_IDS: Record<string, string[]> = {
  'Bevásárlás': ['ba1dbb27-cac2-4e9b-b556-391104e383fc', 'ea7668b0-8393-472a-bce1-fbc9664aad6a'],
  'Étterem, gyorsétterem': ['a077f250-e799-4716-a521-baead9cbca02', 'a10361fb-b92b-4afd-95b3-d28721f4915d'],
  'Bár, kávézó': ['a10361fb-b92b-4afd-95b3-d28721f4915d'],
  'Gyerekek': ['4be5aff2-a918-4f67-a0ef-02e227140853'],
  'Otthon, kert': ['78c0d3d4-e550-40bb-9fb0-add6abc59ffc'],
  'Elektronika, tartozékok': ['bd237eb1-3d10-4240-8635-2aa2a281f08a'],
  'Gyógyszertár, drogéria': ['2f9dfb2d-2664-4a5c-90b7-8ca88009fcd8'],
  'Ruházat és cipő': ['f3452432-ae2b-46bb-9457-14a8bddaebff'],
  'Egészségügyi ellátás, orvos': ['69d54220-6a3f-4e4c-bdf8-fbd5cc7e750c'],
  'Aktiv sport, Fitness': ['d1516469-9028-42a2-9a18-1fc930c4b9cc'],
  'TV, streaming': ['33d3e406-0f79-4c89-af70-bac03b4e6567'],
  'Szoftverek, alkalmazások, játékok': ['82194194-5a20-4727-aa98-b10cce060d6a'],
  'Telefon, mobiltelefon': ['5468cb5a-24aa-47a2-9572-579c6b9bbfda'],
  'Üzemanyag': ['ae2cdbe7-99ef-467e-b647-7464c8da9001'],
  'Parkolás': ['d8d9eed8-44e2-4402-bf1f-297ab6b300f3'],
  'Jármű karbantartása': ['c854b022-6721-4704-bacc-34bb25d90050'],
  'Lizing': ['98cb0cb2-a8f1-45ff-adbc-303c4f6765fb'],
  'Jelzáloghitel': ['8652e0ef-d3c6-4b19-9f2d-2eccabd0a10b'],
  'Energia, közművek': ['0c652764-bee2-4a88-b6cd-4bc7c1e11963'],
  'Szolgáltatások': ['baab1cc6-e082-4d0d-ab3c-b2f08c71221f'],
  'Ingatlanbiztosítás': ['67879bd3-779b-4f93-b97b-acbe850d1e68'],
  'Egyebek': ['76f3f616-000c-48de-becd-041b4166a39e'],
  'Egyéb': ['76f3f616-000c-48de-becd-041b4166a39e'],
  'Hiányzó': ['9dc3957c-579d-41b3-8fc1-f941b8a74565'],
}

function convertOldFormat(cat: BudgetCategory): BudgetCategory {
  if (cat.walletCategories) return cat
  if (!cat.walletMainCategory) return cat

  const allSubs = cat.walletSubCategory
    ? [cat.walletSubCategory]
    : (cat.walletSubCategories || [])

  const ids: string[] = []
  for (const sub of allSubs) {
    const mapped = OLD_SUBCATEGORY_TO_IDS[sub]
    if (mapped) ids.push(...mapped)
  }

  return { ...cat, walletCategories: [...new Set(ids)] }
}

function normalizeBudgetData(data: unknown): BudgetCategory[] {
  if (!data) return []

  let parsed: unknown = data
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed) } catch { return [] }
  }

  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return []
    const first = parsed[0] as Record<string, unknown>
    if (first && 'items' in first) {
      return (parsed as BudgetCategory[]).map(convertOldFormat)
    }
    // Legacy: lapos BudgetItem tömb
    const grouped = new Map<string, BudgetCategory>()
    ;(parsed as BudgetItem[]).forEach(item => {
      const existing = grouped.get(item.category)
      if (existing) {
        existing.items.push(item)
      } else {
        grouped.set(item.category, { name: item.category, items: [item] })
      }
    })
    return Array.from(grouped.values())
  }

  if (typeof parsed === 'object' && parsed !== null) {
    const v2 = parsed as { categories?: BudgetCategory[] }
    if (Array.isArray(v2.categories)) {
      return v2.categories.map(convertOldFormat)
    }
  }

  return []
}

// UUID → budget kategória neve
function buildWalletMapping(categories: BudgetCategory[]): Map<string, string> {
  const mapping = new Map<string, string>()
  categories.forEach(cat => {
    cat.walletCategories?.forEach(id => {
      mapping.set(id, cat.name)
    })
  })
  return mapping
}

// Wallet rekord kategória nevéből UUID-t keres
function resolveRecordCategoryId(record: WalletRecord): string | undefined {
  if (record.categoryId) return record.categoryId
  const normalized = CATEGORY_ALIAS_MAP[record.category] || record.category
  return WALLET_CATEGORY_NAME_TO_ID.get(normalized) || WALLET_CATEGORY_NAME_TO_ID.get(record.category)
}

function isExpense(type: string): boolean {
  return type === 'Kiadás' || type.toLowerCase() === 'expense'
}

export async function budgetComparisonHandler(args: {
  month: string
  wallet_records: WalletRecord[]
}) {
  const { month, wallet_records } = args

  // 1. Aktív budget plan lekérése
  const { data: prefs } = await supabase
    .from('user_preferences')
    .select('active_budget_plan_id')
    .eq('user_id', USER_ID)
    .maybeSingle()

  const planId = prefs?.active_budget_plan_id

  let planData: { id: string; name: string; budget_data: unknown } | null = null
  let planError: unknown = null

  if (planId) {
    const result = await supabase
      .from('budget_plans')
      .select('id, name, budget_data')
      .eq('user_id', USER_ID)
      .eq('id', planId)
      .maybeSingle()
    planData = result.data
    planError = result.error
  } else {
    const result = await supabase
      .from('budget_plans')
      .select('id, name, budget_data')
      .eq('user_id', USER_ID)
      .order('created_at', { ascending: false })
      .limit(1)
    planData = result.data?.[0] || null
    planError = result.error
  }

  if (planError || !planData) {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ error: 'Nem található aktív budget terv. Hozz létre egyet a /koltsegvetes oldalon.' })
      }]
    }
  }

  const categories = normalizeBudgetData(planData.budget_data)
  const walletMapping = buildWalletMapping(categories) // UUID → budget category

  // 2. Tervezett összegek kategóriánként
  const plannedMap = new Map<string, number>()
  categories.forEach(cat => {
    const total = cat.items.reduce((sum, item) => sum + (item.amount || 0), 0)
    plannedMap.set(cat.name, total)
  })

  // 3. Tényleges kiadások aggregálása
  const expensesByBudget = new Map<string, number>()
  const breakdownMap = new Map<string, Map<string, number>>()
  const unmappedCategories = new Map<string, number>()

  wallet_records
    .filter(r => r.date.startsWith(month) && isExpense(r.type))
    .forEach(record => {
      if (!Number.isFinite(record.amount)) return

      const categoryId = resolveRecordCategoryId(record)
      let budgetCat = categoryId ? walletMapping.get(categoryId) : undefined

      if (!budgetCat) {
        const normalized = CATEGORY_ALIAS_MAP[record.category] || record.category
        budgetCat = FALLBACK_CATEGORY_MAP[normalized] || FALLBACK_CATEGORY_MAP[record.category]
      }

      if (budgetCat) {
        expensesByBudget.set(budgetCat, (expensesByBudget.get(budgetCat) || 0) + record.amount)
        const breakdown = breakdownMap.get(budgetCat) || new Map<string, number>()
        breakdown.set(record.category, (breakdown.get(record.category) || 0) + record.amount)
        breakdownMap.set(budgetCat, breakdown)
      } else {
        unmappedCategories.set(record.category, (unmappedCategories.get(record.category) || 0) + record.amount)
      }
    })

  // 4. Összehasonlítás összeállítása
  const allCategories = new Set([...plannedMap.keys(), ...expensesByBudget.keys()])
  const comparison = Array.from(allCategories).map(name => {
    const planned = plannedMap.get(name) || 0
    const actual = expensesByBudget.get(name) || 0
    const variance = actual - planned
    const variance_percent = planned > 0 ? Math.round((variance / planned) * 1000) / 10 : 0
    const breakdown = Array.from(breakdownMap.get(name)?.entries() || [])
      .sort((a, b) => b[1] - a[1])
      .map(([wallet_category, amount]) => ({ wallet_category, amount }))

    return { category: name, planned, actual, variance, variance_percent, breakdown }
  }).sort((a, b) => b.actual - a.actual)

  const totalPlanned = Array.from(plannedMap.values()).reduce((s, v) => s + v, 0)
  const totalActual = Array.from(expensesByBudget.values()).reduce((s, v) => s + v, 0)

  const unmapped = Array.from(unmappedCategories.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([wallet_category, total_amount]) => ({ wallet_category, total_amount }))

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({
        month,
        plan_name: planData.name || 'Névtelen terv',
        comparison,
        totals: {
          planned: totalPlanned,
          actual: totalActual,
          variance: totalActual - totalPlanned
        },
        unmapped
      }, null, 2)
    }]
  }
}
