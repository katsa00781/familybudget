'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/utils/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card'
import { Input } from '@/src/components/ui/input'
import { Button } from '@/src/components/ui/button'
import { Badge } from '@/src/components/ui/badge'
import { Separator } from '@/src/components/ui/separator'
import { Label } from '@/src/components/ui/label'
import { Textarea } from '@/src/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select'
import {
  Plus, Trash2, Save, TrendingUp, PiggyBank,
  DollarSign, Target, AlertCircle, Check,
  Wallet, Scale, ArrowDownUp
} from 'lucide-react'
import { toast } from 'sonner'
import { getActiveBudgetPlan, getActiveIncomePlan } from '@/lib/userPreferences'
import type {
  AnnualBudgetPlan, MonthlyIncome, AnnualExpense,
  RecurringExpense, MonthlySavingsPlan,
  MonthlyBudgetedExpense, CashflowMonth
} from '@/types/annual-budget'

const MONTHS = [
  'Január', 'Február', 'Március', 'Április', 'Május', 'Június',
  'Július', 'Augusztus', 'Szeptember', 'Október', 'November', 'December'
]

const CATEGORIES = [
  'Autó', 'Szórakozás', 'Ház', 'Egyéb', 'Megtakarítás',
  'Jármű', 'Lakhatás', 'Közlekedés', 'Élet és szórakozás',
  'Pénzügyi kiadások', 'Befektetések'
]

const generateId = () => Math.random().toString(36).substr(2, 9)

// Hónap-nevek parsing: a plan.name-ből kinyerjük a hónapot és az évet
const MONTH_NAMES_PARSE: [string, number][] = [
  ['január', 1], ['januar', 1],
  ['február', 2], ['februar', 2],
  ['március', 3], ['marcius', 3],
  ['április', 4], ['aprilis', 4],
  ['május', 5], ['majus', 5],
  ['június', 6], ['junius', 6],
  ['július', 7], ['julius', 7],
  ['augusztus', 8],
  ['szeptember', 9],
  ['október', 10], ['oktober', 10],
  ['november', 11],
  ['december', 12],
]

function parseMonthYear(name: string): { month: number | null; year: number | null } {
  const lower = name.toLowerCase()
  const yearMatch = lower.match(/\b(20\d\d)\b/)
  const year = yearMatch ? parseInt(yearMatch[1]) : null
  let month: number | null = null
  for (const [key, val] of MONTH_NAMES_PARSE) {
    if (lower.includes(key)) { month = val; break }
  }
  return { month, year }
}

// Adott hónap+év-hez keresi a legjobb tervet a listából.
// Elsőbbség: pontos hónap+év egyezés → csak hónap egyezés → fallback értéke.
function findAmountForMonth<T extends { name: string }>(
  plans: T[],
  getAmount: (p: T) => number,
  month: number,
  year: number,
  fallback: number
): number {
  const exact = plans.find(p => {
    const { month: m, year: y } = parseMonthYear(p.name)
    return m === month && y === year
  })
  if (exact) return getAmount(exact)
  const monthOnly = plans.find(p => {
    const { month: m, year: y } = parseMonthYear(p.name)
    return m === month && y === null
  })
  if (monthOnly) return getAmount(monthOnly)
  return fallback
}

export default function EvesKoltsegvetesPage() {
  const supabase = createClient()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  // Éves terv alapadatok
  const [planName, setPlanName] = useState('')
  const [planDescription, setPlanDescription] = useState('')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  
  // Cashflow: év nyitó egyenleg és cél év végi egyenleg
  const [openingBalance, setOpeningBalance] = useState(0)
  const [targetEndBalance, setTargetEndBalance] = useState(0)

  // Havi általános (megélhetési) kiadások — a cashflow fő kiadás-vivője
  const [monthlyBudgetedExpenses, setMonthlyBudgetedExpenses] = useState<MonthlyBudgetedExpense[]>(
    Array.from({ length: 12 }, (_, i) => ({ month: i + 1, amount: 0 }))
  )

  // Fallback: aktív terv összege (ha nincs hónap-specifikus terv)
  const [activeBudgetTotal, setActiveBudgetTotal] = useState(0)
  const [activeIncomePlanTotal, setActiveIncomePlanTotal] = useState(0)
  // Az összes budget/income plan neve és összege a hónap-matching-hez
  const [allBudgetPlans, setAllBudgetPlans] = useState<{ name: string; total_amount: number }[]>([])
  const [allIncomePlans, setAllIncomePlans] = useState<{ name: string; total_income: number }[]>([])

  // Havi bevételek (12 hónap)
  const [monthlyIncomes, setMonthlyIncomes] = useState<MonthlyIncome[]>(
    Array.from({ length: 12 }, (_, i) => ({ month: i + 1, amount: 0 }))
  )

  // Nagyobb éves kiadások
  const [annualExpenses, setAnnualExpenses] = useState<AnnualExpense[]>([])
  
  // Fix évente ismétlődő kiadások
  const [recurringExpenses, setRecurringExpenses] = useState<RecurringExpense[]>([])
  
  // Számított havi megtakarítási terv
  const [monthlySavingsPlan, setMonthlySavingsPlan] = useState<MonthlySavingsPlan[]>([])
  
  // Mentett tervek
  const [savedPlans, setSavedPlans] = useState<AnnualBudgetPlan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')

  // Felhasználó betöltése
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
    }
    getUser()
  }, [supabase.auth])

  // Mentett tervek és aktív tervek alapértékeinek betöltése
  useEffect(() => {
    if (currentUser) {
      loadSavedPlans()
      loadActivePlanDefaults()
    }
  }, [currentUser])

  // Összes terv betöltése (hónap-matching), + aktív terv a fallback-hoz
  const loadActivePlanDefaults = async () => {
    try {
      const [budgetResult, incomeResult, budgetPlan, incomePlan] = await Promise.all([
        supabase.from('budget_plans').select('name, total_amount').eq('user_id', currentUser.id),
        supabase.from('income_plans').select('name, total_income').eq('user_id', currentUser.id),
        getActiveBudgetPlan(currentUser.id),
        getActiveIncomePlan(currentUser.id),
      ])
      if (budgetResult.data) setAllBudgetPlans(budgetResult.data)
      if (incomeResult.data) setAllIncomePlans(incomeResult.data)
      if (budgetPlan?.total_amount) setActiveBudgetTotal(budgetPlan.total_amount)
      if (incomePlan?.total_income) setActiveIncomePlanTotal(incomePlan.total_income)
    } catch (error) {
      console.error('Hiba a tervek betöltésekor:', error)
    }
  }

  const loadSavedPlans = async () => {
    try {
      const { data, error } = await supabase
        .from('annual_budget_plans')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('year', { ascending: false })
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setSavedPlans(data || [])
    } catch (error) {
      console.error('Hiba a tervek betöltésekor:', error)
      toast.error('Hiba történt a tervek betöltésekor!')
    }
  }

  // Havi bevétel frissítése
  const updateMonthlyIncome = (month: number, amount: number) => {
    setMonthlyIncomes(prev =>
      prev.map(mi => mi.month === month ? { ...mi, amount } : mi)
    )
  }

  // Havi általános kiadás frissítése
  const updateMonthlyBudgetedExpense = (month: number, amount: number) => {
    setMonthlyBudgetedExpenses(prev =>
      prev.map(me => me.month === month ? { ...me, amount } : me)
    )
  }

  // Havi kiadások feltöltése: minden hónaphoz a nevében szereplő terv kiadása kerül be
  const fillFromActiveBudget = () => {
    const newExpenses = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      amount: findAmountForMonth(
        allBudgetPlans, p => p.total_amount, i + 1, selectedYear, activeBudgetTotal
      )
    }))
    setMonthlyBudgetedExpenses(newExpenses)
    toast.success('Kiadások feltöltve a havi tervekből')
  }

  // Havi bevételek feltöltése: minden hónaphoz a nevében szereplő terv bevétele kerül be
  const fillFromActiveIncomePlan = () => {
    const newIncomes = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      amount: findAmountForMonth(
        allIncomePlans, p => p.total_income, i + 1, selectedYear, activeIncomePlanTotal
      )
    }))
    setMonthlyIncomes(newIncomes)
    toast.success('Bevételek feltöltve a havi tervekből')
  }

  // Új éves kiadás hozzáadása
  const addAnnualExpense = () => {
    const newExpense: AnnualExpense = {
      id: generateId(),
      name: '',
      amount: 0,
      targetMonth: 12,
      category: 'Egyéb',
      monthlyAllocation: 0,
      startSavingMonth: 1
    }
    setAnnualExpenses([...annualExpenses, newExpense])
  }

  // Éves kiadás frissítése
  const updateAnnualExpense = (id: string, field: keyof AnnualExpense, value: any) => {
    setAnnualExpenses(prev => 
      prev.map(expense => {
        if (expense.id !== id) return expense
        
        const updated = { ...expense, [field]: value }
        
        // Automatikus havi megtakarítás számítása
        if (field === 'amount' || field === 'targetMonth' || field === 'startSavingMonth') {
          const startMonth = updated.startSavingMonth || 1
          const monthsToSave = Math.max(1, updated.targetMonth - startMonth + 1)
          updated.monthlyAllocation = Math.ceil(updated.amount / monthsToSave)
        }
        
        return updated
      })
    )
  }

  // Éves kiadás törlése
  const removeAnnualExpense = (id: string) => {
    setAnnualExpenses(prev => prev.filter(e => e.id !== id))
  }

  // Új ismétlődő kiadás hozzáadása
  const addRecurringExpense = () => {
    const newExpense: RecurringExpense = {
      id: generateId(),
      name: '',
      amount: 0,
      month: 1,
      category: 'Pénzügyi kiadások',
      addToMonthlyBudget: true
    }
    setRecurringExpenses([...recurringExpenses, newExpense])
  }

  // Ismétlődő kiadás frissítése
  const updateRecurringExpense = (id: string, field: keyof RecurringExpense, value: any) => {
    setRecurringExpenses(prev =>
      prev.map(expense => expense.id === id ? { ...expense, [field]: value } : expense)
    )
  }

  // Ismétlődő kiadás törlése
  const removeRecurringExpense = (id: string) => {
    setRecurringExpenses(prev => prev.filter(e => e.id !== id))
  }

  // Havi megtakarítási terv számítása
  const calculateMonthlySavingsPlan = (): MonthlySavingsPlan[] => {
    const plan: MonthlySavingsPlan[] = Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      totalAmount: 0,
      allocations: []
    }))

    annualExpenses.forEach(expense => {
      const startMonth = expense.startSavingMonth || 1
      
      for (let month = startMonth; month <= expense.targetMonth; month++) {
        const monthPlan = plan[month - 1]
        monthPlan.allocations.push({
          expenseId: expense.id,
          expenseName: expense.name,
          amount: expense.monthlyAllocation
        })
        monthPlan.totalAmount += expense.monthlyAllocation
      }
    })

    return plan
  }

  // Éves cashflow számítása — göngyölített egyenleggel
  const getCashflow = (): CashflowMonth[] => {
    let running = openingBalance

    return MONTHS.map((monthName, index) => {
      const month = index + 1
      const income = monthlyIncomes.find(mi => mi.month === month)?.amount || 0

      const recurring = recurringExpenses.filter(re => re.month === month)
      const recurringTotal = recurring.reduce((sum, re) => sum + re.amount, 0)

      // Valódi cashflow: a nagy kiadás teljes összege a célhónapban esedékes
      const annualDue = annualExpenses.filter(e => e.targetMonth === month)
      const annualDueTotal = annualDue.reduce((sum, e) => sum + e.amount, 0)

      const generalExpense = monthlyBudgetedExpenses.find(me => me.month === month)?.amount || 0

      const totalExpense = recurringTotal + annualDueTotal + generalExpense
      const netCashflow = income - totalExpense

      const opening = running
      running += netCashflow

      return {
        month,
        monthName,
        income,
        recurringTotal,
        annualDueTotal,
        generalExpense,
        totalExpense,
        netCashflow,
        openingBalance: opening,
        closingBalance: running,
        recurringExpenses: recurring,
        annualExpensesDue: annualDue
      }
    })
  }

  // Összesítések számítása
  const calculateTotals = () => {
    const totalIncome = monthlyIncomes.reduce((sum, mi) => sum + mi.amount, 0)
    const totalAnnualExpenses = annualExpenses.reduce((sum, e) => sum + e.amount, 0)
    const totalRecurringExpenses = recurringExpenses.reduce((sum, e) => sum + e.amount, 0)
    const totalGeneralExpenses = monthlyBudgetedExpenses.reduce((sum, me) => sum + me.amount, 0)

    return { totalIncome, totalAnnualExpenses, totalRecurringExpenses, totalGeneralExpenses }
  }

  // Terv mentése
  const savePlan = async () => {
    if (!currentUser) {
      toast.error('Be kell jelentkezned a mentéshez!')
      return
    }

    if (!planName.trim()) {
      toast.error('Add meg a terv nevét!')
      return
    }

    setIsLoading(true)
    try {
      const { totalIncome, totalAnnualExpenses, totalRecurringExpenses } = calculateTotals()
      const savingsPlan = calculateMonthlySavingsPlan()

      const planData = {
        user_id: currentUser.id,
        name: planName,
        description: planDescription || null,
        year: selectedYear,
        monthly_incomes: monthlyIncomes,
        annual_expenses: annualExpenses,
        recurring_expenses: recurringExpenses,
        monthly_savings_plan: savingsPlan,
        opening_balance: openingBalance,
        monthly_budgeted_expenses: monthlyBudgetedExpenses,
        target_end_balance: targetEndBalance,
        total_annual_income: totalIncome,
        total_annual_expenses: totalAnnualExpenses,
        total_recurring_expenses: totalRecurringExpenses
      }

      let result
      if (selectedPlanId) {
        // Frissítés
        result = await supabase
          .from('annual_budget_plans')
          .update(planData)
          .eq('id', selectedPlanId)
          .select()
      } else {
        // Új létrehozása
        result = await supabase
          .from('annual_budget_plans')
          .insert([planData])
          .select()
      }

      if (result.error) throw result.error

      toast.success(selectedPlanId ? 'Terv frissítve!' : 'Terv elmentve!')
      loadSavedPlans()
      
      if (!selectedPlanId && result.data?.[0]) {
        setSelectedPlanId(result.data[0].id)
      }
    } catch (error) {
      console.error('Hiba a mentéskor:', error)
      toast.error('Hiba történt a mentés során!')
    } finally {
      setIsLoading(false)
    }
  }

  // Terv betöltése
  const loadPlan = async (planId: string) => {
    if (!planId) return

    try {
      const { data, error } = await supabase
        .from('annual_budget_plans')
        .select('*')
        .eq('id', planId)
        .single()

      if (error) throw error
      if (!data) return

      setSelectedPlanId(data.id)
      setPlanName(data.name)
      setPlanDescription(data.description || '')
      setSelectedYear(data.year)
      setMonthlyIncomes(data.monthly_incomes)
      setAnnualExpenses(data.annual_expenses)
      setRecurringExpenses(data.recurring_expenses)
      setMonthlySavingsPlan(data.monthly_savings_plan)
      setOpeningBalance(data.opening_balance ?? 0)
      setTargetEndBalance(data.target_end_balance ?? 0)
      setMonthlyBudgetedExpenses(
        data.monthly_budgeted_expenses?.length
          ? data.monthly_budgeted_expenses
          : Array.from({ length: 12 }, (_, i) => ({ month: i + 1, amount: 0 }))
      )

      toast.success('Terv betöltve!')
    } catch (error) {
      console.error('Hiba a terv betöltésekor:', error)
      toast.error('Hiba történt a terv betöltésekor!')
    }
  }

  // Új terv kezdése — minden hónaphoz a megfelelő nevű terv töltődik be
  const startNewPlan = () => {
    const newYear = new Date().getFullYear()
    setSelectedPlanId('')
    setPlanName('')
    setPlanDescription('')
    setSelectedYear(newYear)
    setAnnualExpenses([])
    setRecurringExpenses([])
    setMonthlySavingsPlan([])
    setOpeningBalance(0)
    setTargetEndBalance(0)

    setMonthlyIncomes(Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      amount: findAmountForMonth(allIncomePlans, p => p.total_income, i + 1, newYear, activeIncomePlanTotal)
    })))
    setMonthlyBudgetedExpenses(Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      amount: findAmountForMonth(allBudgetPlans, p => p.total_amount, i + 1, newYear, activeBudgetTotal)
    })))

    toast.success('Új terv — bevételek és kiadások a havi tervekből betöltve')
  }

  const { totalIncome, totalAnnualExpenses, totalRecurringExpenses, totalGeneralExpenses } = calculateTotals()
  const cashflow = getCashflow()
  const yearEndBalance = cashflow[cashflow.length - 1]?.closingBalance ?? openingBalance
  const totalExpenses = totalAnnualExpenses + totalRecurringExpenses + totalGeneralExpenses
  const hasNegativeMonth = cashflow.some(c => c.closingBalance < 0)
  const balanceDiff = yearEndBalance - targetEndBalance

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-teal-50 to-emerald-50 p-3 sm:p-4 md:p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 via-teal-500/20 to-emerald-500/20 animate-gradient"></div>
      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Header */}
        <div className="mb-4 md:mb-6 bg-white/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl shadow-lg animate-pulse-slow">
              <ArrowDownUp className="text-white" size={32} />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 bg-clip-text text-transparent tracking-tight leading-tight">
                Éves Cashflow
              </h1>
              <p className="text-sm sm:text-base md:text-lg text-gray-600 font-medium mt-2">
                Kövesd a havi nettó egyenleget és a göngyölített pénzállományt — a cél az év végi egyensúly
              </p>
            </div>
          </div>

          {/* Terv választó */}
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1">
              <Label className="text-sm font-semibold text-gray-700 mb-2">Meglévő terv betöltése</Label>
              <Select value={selectedPlanId} onValueChange={loadPlan}>
                <SelectTrigger className="border-2 border-gray-200 hover:border-emerald-400 transition-colors rounded-xl">
                  <SelectValue placeholder="Válassz tervet..." />
                </SelectTrigger>
                <SelectContent>
                  {savedPlans.map(plan => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name} ({plan.year})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={startNewPlan}
              variant="outline"
              className="border-2 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all rounded-xl"
            >
              <Plus size={16} className="mr-2" />
              Új terv
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
          {/* Bal oldal: Adatbevitel */}
          <div className="xl:col-span-2 space-y-4 md:space-y-6">
            
            {/* Alapadatok */}
            <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                    <Target size={18} className="text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Alapadatok
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Terv neve</Label>
                    <Input
                      value={planName}
                      onChange={(e) => setPlanName(e.target.value)}
                      placeholder={`${selectedYear} éves költségvetés`}
                      className="mt-1 border-2 border-gray-200 focus:border-emerald-400 transition-colors rounded-xl"
                    />
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Év</Label>
                    <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
                      <SelectTrigger className="mt-1 border-2 border-gray-200 hover:border-emerald-400 transition-colors rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() + i).map(year => (
                          <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Nyitó egyenleg (Ft)</Label>
                    <Input
                      type="number"
                      value={openingBalance || ''}
                      onChange={(e) => setOpeningBalance(parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="mt-1 border-2 border-gray-200 focus:border-emerald-400 transition-colors rounded-xl font-mono"
                    />
                    <p className="text-xs text-gray-500 mt-1">Induló pénzállomány az év elején</p>
                  </div>
                  <div>
                    <Label className="text-sm font-semibold text-gray-700">Cél év végi egyenleg (Ft)</Label>
                    <Input
                      type="number"
                      value={targetEndBalance || ''}
                      onChange={(e) => setTargetEndBalance(parseInt(e.target.value) || 0)}
                      placeholder="0"
                      className="mt-1 border-2 border-gray-200 focus:border-emerald-400 transition-colors rounded-xl font-mono"
                    />
                    <p className="text-xs text-gray-500 mt-1">Egyensúly = 0, pozitív = tervezett többlet</p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-semibold text-gray-700">Leírás (opcionális)</Label>
                  <Textarea
                    value={planDescription}
                    onChange={(e) => setPlanDescription(e.target.value)}
                    placeholder="Adj meg egy leírást a tervről..."
                    className="mt-1 border-2 border-gray-200 focus:border-emerald-400 transition-colors rounded-xl"
                    rows={2}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Havi bevételek */}
            <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 rounded-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <div className="p-1.5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                        <DollarSign size={18} className="text-white" />
                      </div>
                      <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                        Havi bevételek
                      </span>
                    </CardTitle>
                    <CardDescription className="text-sm mt-1">
                      Tervezett havi bevétel — automatikusan az aktív bevételi tervből
                    </CardDescription>
                  </div>
                  <Button
                    onClick={fillFromActiveIncomePlan}
                    size="sm"
                    variant="outline"
                    className="border-2 border-green-200 hover:border-green-400 hover:bg-green-50 text-green-600 transition-all rounded-xl shrink-0"
                  >
                    <DollarSign size={14} className="mr-1" />
                    Aktív tervből
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500 mb-3">
                  A gombbal minden hónap a nevét tartalmazó bevételi tervből töltődik be (pl. <span className="font-mono">{selectedYear} január</span>). Ha nincs ilyen nevű terv, az aktív terv értéke kerül be.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {MONTHS.map((month, index) => (
                    <div key={index}>
                      <Label className="text-xs font-semibold text-gray-700">{month}</Label>
                      <Input
                        type="number"
                        value={monthlyIncomes[index].amount || ''}
                        onChange={(e) => updateMonthlyIncome(index + 1, parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="mt-1 h-9 text-sm border-2 border-gray-200 focus:border-emerald-400 transition-colors rounded-xl font-mono"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200/50">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-green-800">Éves bevétel összesen:</span>
                    <span className="text-lg font-extrabold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      {totalIncome.toLocaleString('hu-HU')} Ft
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Havi általános kiadások */}
            <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 rounded-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <div className="p-1.5 bg-gradient-to-br from-rose-500 to-pink-600 rounded-lg">
                        <Wallet size={18} className="text-white" />
                      </div>
                      <span className="bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
                        Havi kiadások (költségvetés)
                      </span>
                    </CardTitle>
                    <CardDescription className="text-sm mt-1">
                      A havi megélhetési költség, ami a göngyölített egyenleget viszi
                    </CardDescription>
                  </div>
                  <Button
                    onClick={fillFromActiveBudget}
                    size="sm"
                    variant="outline"
                    className="border-2 border-rose-200 hover:border-rose-400 hover:bg-rose-50 text-rose-600 transition-all rounded-xl shrink-0"
                  >
                    <Wallet size={14} className="mr-1" />
                    Aktív költségvetésből
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-gray-500 mb-3">
                  A gombbal minden hónap a nevét tartalmazó költségvetési tervből töltődik be (pl. <span className="font-mono">{selectedYear} január</span>). Ha nincs ilyen nevű terv, az aktív terv értéke kerül be.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {MONTHS.map((month, index) => (
                    <div key={index}>
                      <Label className="text-xs font-semibold text-gray-700">{month}</Label>
                      <Input
                        type="number"
                        value={monthlyBudgetedExpenses[index].amount || ''}
                        onChange={(e) => updateMonthlyBudgetedExpense(index + 1, parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="mt-1 h-9 text-sm border-2 border-gray-200 focus:border-emerald-400 transition-colors rounded-xl font-mono"
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-3 bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl border-2 border-rose-200/50">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-semibold text-rose-800">Éves általános kiadás összesen:</span>
                    <span className="text-lg font-extrabold bg-gradient-to-r from-rose-600 to-pink-600 bg-clip-text text-transparent">
                      {totalGeneralExpenses.toLocaleString('hu-HU')} Ft
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Nagyobb éves kiadások */}
            <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 rounded-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <div className="p-1.5 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg">
                        <Target size={18} className="text-white" />
                      </div>
                      <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                        Nagyobb éves kiadások
                      </span>
                    </CardTitle>
                    <CardDescription className="text-sm mt-1">
                      Tervezd meg a nagyobb kiadásokat és a megtakarítás ütemezését
                    </CardDescription>
                  </div>
                  <Button
                    onClick={addAnnualExpense}
                    size="sm"
                    className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white shadow-lg hover:scale-105 transition-all rounded-xl"
                  >
                    <Plus size={16} className="mr-1" />
                    Hozzáad
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {annualExpenses.length === 0 ? (
                  <div className="text-center text-gray-500 py-6 text-sm">
                    Még nincs nagyobb kiadás tervezve
                  </div>
                ) : (
                  annualExpenses.map((expense) => (
                    <div key={expense.id} className="p-4 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border-2 border-orange-200/50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="md:col-span-2">
                          <Label className="text-xs font-semibold text-gray-700">Megnevezés</Label>
                          <Input
                            value={expense.name}
                            onChange={(e) => updateAnnualExpense(expense.id, 'name', e.target.value)}
                            placeholder="pl. Új autó, Nyaralás..."
                            className="mt-1 h-9 text-sm border-2 border-gray-200 focus:border-emerald-400 transition-colors rounded-xl"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold text-gray-700">Összeg (Ft)</Label>
                          <Input
                            type="number"
                            value={expense.amount || ''}
                            onChange={(e) => updateAnnualExpense(expense.id, 'amount', parseInt(e.target.value) || 0)}
                            placeholder="0"
                            className="mt-1 h-9 text-sm border-2 border-gray-200 focus:border-emerald-400 transition-colors rounded-xl font-mono"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold text-gray-700">Kategória</Label>
                          <Select
                            value={expense.category}
                            onValueChange={(v) => updateAnnualExpense(expense.id, 'category', v)}
                          >
                            <SelectTrigger className="mt-1 h-9 text-sm border-2 border-gray-200 hover:border-emerald-400 transition-colors rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs font-semibold text-gray-700">Célhónap</Label>
                          <Select
                            value={expense.targetMonth.toString()}
                            onValueChange={(v) => updateAnnualExpense(expense.id, 'targetMonth', parseInt(v))}
                          >
                            <SelectTrigger className="mt-1 h-9 text-sm border-2 border-gray-200 hover:border-emerald-400 transition-colors rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {MONTHS.map((month, idx) => (
                                <SelectItem key={idx} value={(idx + 1).toString()}>{month}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs font-semibold text-gray-700">Gyűjtés kezdete</Label>
                          <Select
                            value={(expense.startSavingMonth || 1).toString()}
                            onValueChange={(v) => updateAnnualExpense(expense.id, 'startSavingMonth', parseInt(v))}
                          >
                            <SelectTrigger className="mt-1 h-9 text-sm border-2 border-gray-200 hover:border-emerald-400 transition-colors rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {MONTHS.map((month, idx) => (
                                <SelectItem key={idx} value={(idx + 1).toString()}>{month}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="md:col-span-2 flex items-center justify-between p-2 bg-white rounded-lg border border-gray-200">
                          <span className="text-xs font-semibold text-gray-600">Havi megtakarítás:</span>
                          <span className="text-sm font-bold text-orange-600">
                            {expense.monthlyAllocation.toLocaleString('hu-HU')} Ft/hó
                          </span>
                        </div>
                      </div>
                      <div className="flex justify-end mt-3">
                        <Button
                          onClick={() => removeAnnualExpense(expense.id)}
                          size="sm"
                          variant="outline"
                          className="border-2 border-red-200 hover:border-red-400 hover:bg-red-50 text-red-600 transition-all rounded-lg"
                        >
                          <Trash2 size={14} className="mr-1" />
                          Törlés
                        </Button>
                      </div>
                    </div>
                  ))
                )}
                {annualExpenses.length > 0 && (
                  <div className="mt-4 p-3 bg-gradient-to-br from-orange-50 to-red-50 rounded-xl border-2 border-orange-200/50">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-orange-800">Nagyobb kiadások összesen:</span>
                      <span className="text-lg font-extrabold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
                        {totalAnnualExpenses.toLocaleString('hu-HU')} Ft
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Fix ismétlődő kiadások */}
            <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 rounded-2xl">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      <div className="p-1.5 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg">
                        <PiggyBank size={18} className="text-white" />
                      </div>
                      <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                        Fix évente ismétlődő kiadások
                      </span>
                    </CardTitle>
                    <CardDescription className="text-sm mt-1">
                      Pl. biztosítások, adók, éves előfizetések
                    </CardDescription>
                  </div>
                  <Button
                    onClick={addRecurringExpense}
                    size="sm"
                    className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white shadow-lg hover:scale-105 transition-all rounded-xl"
                  >
                    <Plus size={16} className="mr-1" />
                    Hozzáad
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {recurringExpenses.length === 0 ? (
                  <div className="text-center text-gray-500 py-6 text-sm">
                    Még nincs ismétlődő kiadás tervezve
                  </div>
                ) : (
                  recurringExpenses.map((expense) => (
                    <div key={expense.id} className="p-4 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border-2 border-purple-200/50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs font-semibold text-gray-700">Megnevezés</Label>
                          <Input
                            value={expense.name}
                            onChange={(e) => updateRecurringExpense(expense.id, 'name', e.target.value)}
                            placeholder="pl. Gépjárműadó, Biztosítás..."
                            className="mt-1 h-9 text-sm border-2 border-gray-200 focus:border-emerald-400 transition-colors rounded-xl"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold text-gray-700">Összeg (Ft)</Label>
                          <Input
                            type="number"
                            value={expense.amount || ''}
                            onChange={(e) => updateRecurringExpense(expense.id, 'amount', parseInt(e.target.value) || 0)}
                            placeholder="0"
                            className="mt-1 h-9 text-sm border-2 border-gray-200 focus:border-emerald-400 transition-colors rounded-xl font-mono"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold text-gray-700">Hónap</Label>
                          <Select
                            value={expense.month.toString()}
                            onValueChange={(v) => updateRecurringExpense(expense.id, 'month', parseInt(v))}
                          >
                            <SelectTrigger className="mt-1 h-9 text-sm border-2 border-gray-200 hover:border-emerald-400 transition-colors rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {MONTHS.map((month, idx) => (
                                <SelectItem key={idx} value={(idx + 1).toString()}>{month}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs font-semibold text-gray-700">Kategória</Label>
                          <Select
                            value={expense.category}
                            onValueChange={(v) => updateRecurringExpense(expense.id, 'category', v)}
                          >
                            <SelectTrigger className="mt-1 h-9 text-sm border-2 border-gray-200 hover:border-emerald-400 transition-colors rounded-xl">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {CATEGORIES.map(cat => (
                                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="md:col-span-2 flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={`add-to-budget-${expense.id}`}
                            checked={expense.addToMonthlyBudget}
                            onChange={(e) => updateRecurringExpense(expense.id, 'addToMonthlyBudget', e.target.checked)}
                            className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                          />
                          <label htmlFor={`add-to-budget-${expense.id}`} className="text-xs font-medium text-gray-700">
                            Automatikusan hozzáadás a havi költségvetéshez
                          </label>
                        </div>
                      </div>
                      <div className="flex justify-end mt-3">
                        <Button
                          onClick={() => removeRecurringExpense(expense.id)}
                          size="sm"
                          variant="outline"
                          className="border-2 border-red-200 hover:border-red-400 hover:bg-red-50 text-red-600 transition-all rounded-lg"
                        >
                          <Trash2 size={14} className="mr-1" />
                          Törlés
                        </Button>
                      </div>
                    </div>
                  ))
                )}
                {recurringExpenses.length > 0 && (
                  <div className="mt-4 p-3 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl border-2 border-purple-200/50">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-purple-800">Ismétlődő kiadások összesen:</span>
                      <span className="text-lg font-extrabold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                        {totalRecurringExpenses.toLocaleString('hu-HU')} Ft
                      </span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mentés gomb */}
            <div className="flex gap-3">
              <Button
                onClick={savePlan}
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-3 text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 rounded-xl"
              >
                <Save size={18} className="mr-2" />
                {isLoading ? 'Mentés...' : selectedPlanId ? 'Terv frissítése' : 'Terv mentése'}
              </Button>
            </div>
          </div>

          {/* Jobb oldal: Éves cashflow */}
          <div className="space-y-4 md:space-y-6">
            <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <div className="p-1.5 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg">
                    <ArrowDownUp size={18} className="text-white" />
                  </div>
                  <span className="bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                    Éves cashflow
                  </span>
                </CardTitle>
                <CardDescription className="text-sm">
                  Havi nettó és göngyölített egyenleg — nyitóból kiindulva
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 max-h-[800px] overflow-y-auto">
                <div className="flex justify-between items-center text-sm px-1 pb-1 text-gray-500">
                  <span>Nyitó egyenleg:</span>
                  <span className={`font-bold ${openingBalance >= 0 ? 'text-gray-700' : 'text-red-600'}`}>
                    {openingBalance.toLocaleString('hu-HU')} Ft
                  </span>
                </div>
                {cashflow.map((c) => (
                  <div
                    key={c.month}
                    className={`p-4 rounded-xl border-2 shadow-sm hover:shadow-md transition-shadow ${
                      c.closingBalance < 0
                        ? 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200/60'
                        : 'bg-gradient-to-br from-gray-50 to-white border-gray-200/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-bold text-gray-900">{c.monthName}</h4>
                      {c.closingBalance < 0 ? (
                        <Badge variant="destructive" className="text-xs">
                          <AlertCircle size={12} className="mr-1" />
                          Likviditási hiány
                        </Badge>
                      ) : c.netCashflow >= 0 ? (
                        <Badge className="text-xs bg-green-500 text-white border-0">
                          <TrendingUp size={12} className="mr-1" />
                          Pozitív
                        </Badge>
                      ) : (
                        <Badge className="text-xs bg-amber-500 text-white border-0">
                          Negatív hó
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Bevétel:</span>
                        <span className="font-semibold text-green-600">
                          +{c.income.toLocaleString('hu-HU')} Ft
                        </span>
                      </div>
                      {c.generalExpense > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Havi kiadás:</span>
                          <span className="font-semibold text-rose-600">
                            -{c.generalExpense.toLocaleString('hu-HU')} Ft
                          </span>
                        </div>
                      )}
                      {c.recurringTotal > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Ismétlődő:</span>
                          <span className="font-semibold text-purple-600">
                            -{c.recurringTotal.toLocaleString('hu-HU')} Ft
                          </span>
                        </div>
                      )}
                      {c.annualDueTotal > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">
                            Nagy kiadás{c.annualExpensesDue.length === 1 ? ` (${c.annualExpensesDue[0].name || '–'})` : ''}:
                          </span>
                          <span className="font-semibold text-orange-600">
                            -{c.annualDueTotal.toLocaleString('hu-HU')} Ft
                          </span>
                        </div>
                      )}
                      <Separator className="my-2" />
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-700">Havi nettó:</span>
                        <span className={`font-bold ${c.netCashflow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {c.netCashflow >= 0 ? '+' : ''}{c.netCashflow.toLocaleString('hu-HU')} Ft
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="font-semibold text-gray-700">Göngyölített egyenleg:</span>
                        <span className={`font-extrabold ${c.closingBalance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {c.closingBalance.toLocaleString('hu-HU')} Ft
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Összesítő */}
            <Card className="bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-2xl border border-white/20 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Scale size={20} />
                  Éves egyensúly
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-white/90">Nyitó egyenleg:</span>
                  <span className="text-xl font-bold">{openingBalance.toLocaleString('hu-HU')} Ft</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/90">Összes bevétel:</span>
                  <span className="text-xl font-bold">+{totalIncome.toLocaleString('hu-HU')} Ft</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/90">Összes kiadás:</span>
                  <span className="text-xl font-bold">-{totalExpenses.toLocaleString('hu-HU')} Ft</span>
                </div>
                <Separator className="bg-white/20" />
                <div className="flex justify-between items-center">
                  <span className="font-bold text-lg">Év végi egyenleg:</span>
                  <span className={`text-3xl font-extrabold ${yearEndBalance >= 0 ? 'text-white' : 'text-red-200'}`}>
                    {yearEndBalance.toLocaleString('hu-HU')} Ft
                  </span>
                </div>

                {/* Egyensúly státusz */}
                <div className="mt-2 p-3 rounded-xl bg-white/15 backdrop-blur border border-white/20">
                  {Math.abs(balanceDiff) === 0 ? (
                    <div className="flex items-center gap-2 font-semibold">
                      <Check size={18} /> Egyensúlyban a cél szerint
                    </div>
                  ) : balanceDiff > 0 ? (
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 font-semibold">
                        <TrendingUp size={18} /> Többlet a célhoz képest
                      </span>
                      <span className="font-bold">+{balanceDiff.toLocaleString('hu-HU')} Ft</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-red-100">
                      <span className="flex items-center gap-2 font-semibold">
                        <AlertCircle size={18} /> Hiány a célhoz képest
                      </span>
                      <span className="font-bold">{balanceDiff.toLocaleString('hu-HU')} Ft</span>
                    </div>
                  )}
                  {hasNegativeMonth && (
                    <p className="text-xs text-red-100 mt-2 flex items-center gap-1">
                      <AlertCircle size={12} /> Év közben van negatív göngyölített egyenleg (likviditási hiány)
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
