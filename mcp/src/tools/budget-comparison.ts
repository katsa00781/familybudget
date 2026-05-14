import { supabase, USER_ID } from '../lib/supabase.js'
import { CATEGORY_ALIAS_MAP, FALLBACK_CATEGORY_MAP } from '../lib/category-map.js'

interface BudgetItem {
  id?: string
  category: string
  type?: string
  subcategory?: string
  amount: number
}

interface WalletCategoryMapping {
  mainCategory: string
  subCategories: string[]
}

interface BudgetCategory {
  name: string
  items: BudgetItem[]
  walletCategories?: WalletCategoryMapping[]
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
}

function mapCategoryCompatibility(cat: BudgetCategory): BudgetCategory {
  if (cat.walletCategories) return cat
  if (!cat.walletMainCategory) return cat

  return {
    ...cat,
    walletCategories: [{
      mainCategory: cat.walletMainCategory,
      subCategories: cat.walletSubCategory
        ? [cat.walletSubCategory]
        : (cat.walletSubCategories || [])
    }]
  }
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
      return (parsed as BudgetCategory[]).map(mapCategoryCompatibility)
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
      return v2.categories.map(mapCategoryCompatibility)
    }
  }

  return []
}

function buildWalletMapping(categories: BudgetCategory[]): Map<string, string> {
  const mapping = new Map<string, string>()
  categories.forEach(cat => {
    cat.walletCategories?.forEach(wc => {
      if (wc.mainCategory) mapping.set(wc.mainCategory, cat.name)
      wc.subCategories?.forEach(sub => mapping.set(sub, cat.name))
    })
  })
  return mapping
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
  const walletMapping = buildWalletMapping(categories)

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

      const normalized = CATEGORY_ALIAS_MAP[record.category] || record.category
      let budgetCat = walletMapping.get(normalized) || walletMapping.get(record.category)
      if (!budgetCat) {
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
