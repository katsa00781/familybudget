// Éves költségvetés integráció a havi költségvetéssel

import { createClient } from '@/lib/utils/supabase/client'
import type { AnnualBudgetPlan, RecurringExpense } from '@/types/annual-budget'

// Lokális típusdefiníciók az éves költségvetés integráció számára
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

/**
 * Lekéri az aktuális év éves költségvetési tervét
 */
export async function getActiveAnnualBudgetPlan(userId: string, year?: number): Promise<AnnualBudgetPlan | null> {
  const supabase = createClient()
  const targetYear = year || new Date().getFullYear()
  
  try {
    const { data, error } = await supabase
      .from('annual_budget_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('year', targetYear)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (error) {
      console.warn('No annual budget plan found:', error)
      return null
    }
    
    return data
  } catch (error) {
    console.error('Error fetching annual budget plan:', error)
    return null
  }
}

/**
 * Visszaadja az adott hónapra vonatkozó ismétlődő kiadásokat az éves tervből
 */
export function getRecurringExpensesForMonth(
  annualPlan: AnnualBudgetPlan | null,
  month: number
): RecurringExpense[] {
  if (!annualPlan || !annualPlan.recurring_expenses) return []
  
  return annualPlan.recurring_expenses.filter(
    (expense) => expense.month === month && expense.addToMonthlyBudget
  )
}

/**
 * Kiszámolja az adott hónapra eső megtakarítási összeget a nagy kiadásokhoz
 */
export function getPlannedSavingsForMonth(
  annualPlan: AnnualBudgetPlan | null,
  month: number
): number {
  if (!annualPlan || !annualPlan.monthly_savings_plan) return 0
  
  const monthPlan = annualPlan.monthly_savings_plan.find((plan) => plan.month === month)
  return monthPlan?.totalAmount || 0
}

/**
 * Kiszámolja az adott hónapra tervezett bevételt
 */
export function getPlannedIncomeForMonth(
  annualPlan: AnnualBudgetPlan | null,
  month: number
): number {
  if (!annualPlan || !annualPlan.monthly_incomes) return 0
  
  const monthIncome = annualPlan.monthly_incomes.find((income) => income.month === month)
  return monthIncome?.amount || 0
}

/**
 * Automatikusan hozzáadja az ismétlődő kiadásokat a költségvetési kategóriákhoz
 */
export function addRecurringExpensesToBudget(
  budgetCategories: BudgetCategory[],
  recurringExpenses: RecurringExpense[]
): BudgetCategory[] {
  if (recurringExpenses.length === 0) return budgetCategories
  
  const updatedCategories = [...budgetCategories]
  
  recurringExpenses.forEach((expense) => {
    // Megkeressük vagy létrehozzuk a kategóriát
    let category = updatedCategories.find((cat) => cat.name === expense.category)
    
    if (!category) {
      // Ha nincs ilyen kategória, létrehozzuk
      category = {
        name: expense.category,
        items: []
      }
      updatedCategories.push(category)
    }
    
    // Ellenőrizzük, hogy már benne van-e (ID vagy név alapján)
    const existingItem = category.items.find(
      (item) => item.subcategory === `${expense.name} (éves terv)` || item.subcategory === expense.name
    )
    
    if (!existingItem) {
      // Hozzáadjuk az ismétlődő kiadást
      const newItem: BudgetItem = {
        id: `annual_${expense.id}`,
        category: expense.category,
        type: 'Szükséglet', // Fix kiadások általában szükségletek
        subcategory: `${expense.name} (éves terv)`,
        amount: expense.amount
      }
      category.items.push(newItem)
    }
  })
  
  return updatedCategories
}

/**
 * Megtakarítási tétel hozzáadása a költségvetéshez
 */
export function addPlannedSavingsToBudget(
  budgetCategories: BudgetCategory[],
  savingsAmount: number,
  savingsDescription: string = 'Nagyobb kiadásokhoz'
): BudgetCategory[] {
  if (savingsAmount <= 0) return budgetCategories
  
  const updatedCategories = [...budgetCategories]
  
  // Megkeressük vagy létrehozzuk a Megtakarítás kategóriát
  let savingsCategory = updatedCategories.find((cat) => cat.name === 'Megtakarítás')
  
  if (!savingsCategory) {
    savingsCategory = {
      name: 'Megtakarítás',
      items: []
    }
    updatedCategories.push(savingsCategory)
  }
  
  // Hozzáadjuk a tervezett megtakarítást
  const newItem: BudgetItem = {
    id: 'annual_savings_plan',
    category: 'Megtakarítás',
    type: 'Megtakarítás',
    subcategory: `Havi megtakarítás (${savingsDescription})`,
    amount: savingsAmount
  }
  
  // Ellenőrizzük, hogy már van-e ilyen tétel
  const existingItem = savingsCategory.items.find((item) => item.id === 'annual_savings_plan')
  
  if (!existingItem) {
    savingsCategory.items.push(newItem)
  } else {
    // Frissítjük az összeget ha már létezik
    existingItem.amount = savingsAmount
  }
  
  return updatedCategories
}

/**
 * Teljes havi költségvetés előkészítése az éves terv alapján
 */
export async function prepareBudgetFromAnnualPlan(
  userId: string,
  budgetCategories: BudgetCategory[],
  month?: number
): Promise<{
  categories: BudgetCategory[]
  annualPlan: AnnualBudgetPlan | null
  recurringExpenses: RecurringExpense[]
  plannedSavings: number
  plannedIncome: number
}> {
  const currentMonth = month || new Date().getMonth() + 1
  const annualPlan = await getActiveAnnualBudgetPlan(userId)
  
  if (!annualPlan) {
    return {
      categories: budgetCategories,
      annualPlan: null,
      recurringExpenses: [],
      plannedSavings: 0,
      plannedIncome: 0
    }
  }
  
  const recurringExpenses = getRecurringExpensesForMonth(annualPlan, currentMonth)
  const plannedSavings = getPlannedSavingsForMonth(annualPlan, currentMonth)
  const plannedIncome = getPlannedIncomeForMonth(annualPlan, currentMonth)
  
  let updatedCategories = [...budgetCategories]
  
  // Ismétlődő kiadások hozzáadása
  updatedCategories = addRecurringExpensesToBudget(updatedCategories, recurringExpenses)
  
  // Tervezett megtakarítás hozzáadása
  updatedCategories = addPlannedSavingsToBudget(updatedCategories, plannedSavings)
  
  return {
    categories: updatedCategories,
    annualPlan,
    recurringExpenses,
    plannedSavings,
    plannedIncome
  }
}
