'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/utils/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/src/components/ui/card'
import { Input } from '@/src/components/ui/input'
import { Button } from '@/src/components/ui/button'
import { Badge } from '@/src/components/ui/badge'
import { Label } from '@/src/components/ui/label'
import { Separator } from '@/src/components/ui/separator'
import { Progress } from '@/src/components/ui/progress'
import { Textarea } from '@/src/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select'
import {
  Target, Plus, Trash2, Save, TrendingUp, PiggyBank,
  Calendar, AlertCircle, Check, Edit2, X, ArrowUpRight,
  Scale
} from 'lucide-react'
import { toast } from 'sonner'
import { getActiveIncomePlan, getActiveBudgetPlan } from '@/lib/userPreferences'

interface PlannedIncomeInput {
  id: string
  amount: number
  year: number
  month: number
  description: string
}

interface SavingsGoal {
  id: string
  user_id: string
  name: string
  description?: string
  target_amount: number
  current_amount: number
  target_date: string
  color: string
  category: string
  created_at: string
  planned_incomes?: PlannedIncomeInput[]
}

const CATEGORIES = [
  'Ingatlan', 'Jármű', 'Felújítás', 'Nyaralás', 'Oktatás',
  'Egészség', 'Elektronika', 'Tartalék alap', 'Befektetés', 'Egyéb'
]

const CATEGORY_COLORS: Record<string, string> = {
  'Ingatlan': '#3B82F6',
  'Jármű': '#8B5CF6',
  'Felújítás': '#F59E0B',
  'Nyaralás': '#10B981',
  'Oktatás': '#6366F1',
  'Egészség': '#EF4444',
  'Elektronika': '#06B6D4',
  'Tartalék alap': '#84CC16',
  'Befektetés': '#F97316',
  'Egyéb': '#6B7280',
}

const MONTHS_HU = [
  'január', 'február', 'március', 'április', 'május', 'június',
  'július', 'augusztus', 'szeptember', 'október', 'november', 'december'
]

function getMonthsRemaining(targetDate: string): number {
  const today = new Date()
  const target = new Date(targetDate)
  return Math.max(0, (target.getFullYear() - today.getFullYear()) * 12 + (target.getMonth() - today.getMonth()))
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getFullYear()}. ${MONTHS_HU[d.getMonth()]}`
}

function getFuturePlannedTotal(plannedIncomes: PlannedIncomeInput[], targetDateStr: string): number {
  const today = new Date()
  const target = new Date(targetDateStr)
  return (plannedIncomes || [])
    .filter(pi => {
      const piDate = new Date(pi.year, pi.month - 1)
      return piDate > today && piDate <= target
    })
    .reduce((sum, pi) => sum + pi.amount, 0)
}

function getRequiredMonthlySavings(goal: SavingsGoal): number {
  const months = getMonthsRemaining(goal.target_date)
  if (months <= 0) return 0
  const plannedTotal = getFuturePlannedTotal(goal.planned_incomes || [], goal.target_date)
  const remaining = Math.max(0, goal.target_amount - goal.current_amount - plannedTotal)
  return Math.ceil(remaining / months)
}

function newPlannedIncomeRow(defaultYear: number): PlannedIncomeInput {
  return {
    id: crypto.randomUUID(),
    amount: 0,
    year: defaultYear,
    month: new Date().getMonth() + 1,
    description: '',
  }
}

function PlannedIncomesEditor({
  incomes,
  onChange,
  years,
}: {
  incomes: PlannedIncomeInput[]
  onChange: (incomes: PlannedIncomeInput[]) => void
  years: number[]
}) {
  const monthNumbers = Array.from({ length: 12 }, (_, i) => i + 1)

  const update = (id: string, field: keyof PlannedIncomeInput, value: string | number) =>
    onChange(incomes.map(pi => pi.id === id ? { ...pi, [field]: value } : pi))

  const remove = (id: string) =>
    onChange(incomes.filter(pi => pi.id !== id))

  return (
    <div className="space-y-2">
      {incomes.length === 0 && (
        <p className="text-xs text-gray-400 italic">Még nincs tervezett bevétel ehhez a célhoz.</p>
      )}
      {incomes.map((pi, idx) => (
        <div key={pi.id} className="p-3 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-700">{idx + 1}. tervezett bevétel</span>
            <Button size="sm" variant="ghost" onClick={() => remove(pi.id)}
              className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg">
              <X size={12} />
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs font-medium text-gray-600">Összeg (Ft)</Label>
              <Input
                type="number"
                value={pi.amount || ''}
                onChange={e => update(pi.id, 'amount', parseInt(e.target.value) || 0)}
                placeholder="500 000"
                className="mt-0.5 h-8 text-sm border-amber-200 focus:border-amber-400 rounded-lg font-mono"
              />
            </div>
            <div>
              <Label className="text-xs font-medium text-gray-600">Várható dátum</Label>
              <div className="flex gap-1 mt-0.5">
                <Select value={pi.year.toString()} onValueChange={v => update(pi.id, 'year', parseInt(v))}>
                  <SelectTrigger className="h-8 text-xs border-amber-200 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={pi.month.toString()} onValueChange={v => update(pi.id, 'month', parseInt(v))}>
                  <SelectTrigger className="h-8 text-xs border-amber-200 rounded-lg">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthNumbers.map(m => (
                      <SelectItem key={m} value={m.toString()}>{MONTHS_HU[m - 1]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="col-span-2">
              <Label className="text-xs font-medium text-gray-600">Megjegyzés (opcionális)</Label>
              <Input
                value={pi.description}
                onChange={e => update(pi.id, 'description', e.target.value)}
                placeholder="pl. Prémium, 13. havi juttatás, ingatlan eladás..."
                className="mt-0.5 h-8 text-xs border-amber-200 focus:border-amber-400 rounded-lg"
              />
            </div>
          </div>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => onChange([...incomes, newPlannedIncomeRow(years[0])])}
        className="w-full border-2 border-amber-200 hover:border-amber-400 hover:bg-amber-50 text-amber-700 rounded-xl text-xs"
      >
        <Plus size={12} className="mr-1" />
        Tervezett bevétel hozzáadása
      </Button>
    </div>
  )
}

export default function TervezesPage() {
  const supabase = createClient()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [goals, setGoals] = useState<SavingsGoal[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const [monthlyIncome, setMonthlyIncome] = useState(0)
  const [monthlyBudget, setMonthlyBudget] = useState(0)

  // Új cél form
  const [showNewGoalForm, setShowNewGoalForm] = useState(false)
  const [newGoalName, setNewGoalName] = useState('')
  const [newGoalDescription, setNewGoalDescription] = useState('')
  const [newGoalAmount, setNewGoalAmount] = useState(0)
  const [newGoalCurrentAmount, setNewGoalCurrentAmount] = useState(0)
  const [newGoalCategory, setNewGoalCategory] = useState('Egyéb')
  const [newGoalTargetYear, setNewGoalTargetYear] = useState(new Date().getFullYear() + 2)
  const [newGoalTargetMonth, setNewGoalTargetMonth] = useState(12)
  const [newGoalPlannedIncomes, setNewGoalPlannedIncomes] = useState<PlannedIncomeInput[]>([])

  // Befizetés form
  const [depositGoalId, setDepositGoalId] = useState<string | null>(null)
  const [depositAmount, setDepositAmount] = useState(0)
  const [depositDescription, setDepositDescription] = useState('')
  const [depositType, setDepositType] = useState<'deposit' | 'withdrawal'>('deposit')

  // Szerkesztés
  const [editGoalId, setEditGoalId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editAmount, setEditAmount] = useState(0)
  const [editCategory, setEditCategory] = useState('Egyéb')
  const [editTargetYear, setEditTargetYear] = useState(2027)
  const [editTargetMonth, setEditTargetMonth] = useState(12)
  const [editPlannedIncomes, setEditPlannedIncomes] = useState<PlannedIncomeInput[]>([])

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
    }
    getUser()
  }, [supabase.auth])

  const loadGoals = useCallback(async () => {
    if (!currentUser) return
    const { data, error } = await supabase
      .from('savings_goals')
      .select('*')
      .eq('user_id', currentUser.id)
      .order('target_date', { ascending: true })
    if (error) { toast.error('Hiba a célok betöltésekor!'); return }
    setGoals(data || [])
  }, [currentUser, supabase])

  const loadActivePlans = useCallback(async () => {
    if (!currentUser) return
    const [incomePlan, budgetPlan] = await Promise.all([
      getActiveIncomePlan(currentUser.id),
      getActiveBudgetPlan(currentUser.id)
    ])
    if (incomePlan?.total_income) setMonthlyIncome(incomePlan.total_income)
    if (budgetPlan?.total_amount) setMonthlyBudget(budgetPlan.total_amount)
  }, [currentUser])

  useEffect(() => {
    if (currentUser) {
      loadGoals()
      loadActivePlans()
    }
  }, [currentUser, loadGoals, loadActivePlans])

  const resetNewGoalForm = () => {
    setNewGoalName('')
    setNewGoalDescription('')
    setNewGoalAmount(0)
    setNewGoalCurrentAmount(0)
    setNewGoalCategory('Egyéb')
    setNewGoalTargetYear(new Date().getFullYear() + 2)
    setNewGoalTargetMonth(12)
    setNewGoalPlannedIncomes([])
    setShowNewGoalForm(false)
  }

  const saveNewGoal = async () => {
    if (!currentUser) return
    if (!newGoalName.trim()) { toast.error('Add meg a cél nevét!'); return }
    if (newGoalAmount <= 0) { toast.error('Add meg a célösszeget!'); return }

    setIsLoading(true)
    const targetDate = `${newGoalTargetYear}-${String(newGoalTargetMonth).padStart(2, '0')}-01`
    const { error } = await supabase.from('savings_goals').insert([{
      user_id: currentUser.id,
      name: newGoalName.trim(),
      description: newGoalDescription.trim() || null,
      target_amount: newGoalAmount,
      current_amount: newGoalCurrentAmount,
      target_date: targetDate,
      color: CATEGORY_COLORS[newGoalCategory] || '#6B7280',
      category: newGoalCategory,
      planned_incomes: newGoalPlannedIncomes.filter(pi => pi.amount > 0),
    }])
    setIsLoading(false)

    if (error) { toast.error('Hiba a mentéskor!'); return }
    toast.success('Cél elmentve!')
    resetNewGoalForm()
    loadGoals()
  }

  const deleteGoal = async (id: string) => {
    if (!confirm('Biztosan törölni szeretnéd ezt a célt?')) return
    const { error } = await supabase.from('savings_goals').delete().eq('id', id)
    if (error) { toast.error('Hiba a törlésnél!'); return }
    toast.success('Cél törölve!')
    loadGoals()
  }

  const startEdit = (goal: SavingsGoal) => {
    const d = new Date(goal.target_date)
    setEditGoalId(goal.id)
    setEditName(goal.name)
    setEditDescription(goal.description || '')
    setEditAmount(goal.target_amount)
    setEditCategory(goal.category)
    setEditTargetYear(d.getFullYear())
    setEditTargetMonth(d.getMonth() + 1)
    setEditPlannedIncomes(
      (goal.planned_incomes || []).map(pi => ({ ...pi, id: pi.id || crypto.randomUUID() }))
    )
  }

  const saveEdit = async () => {
    if (!editGoalId) return
    const targetDate = `${editTargetYear}-${String(editTargetMonth).padStart(2, '0')}-01`
    const { error } = await supabase.from('savings_goals').update({
      name: editName.trim(),
      description: editDescription.trim() || null,
      target_amount: editAmount,
      category: editCategory,
      color: CATEGORY_COLORS[editCategory] || '#6B7280',
      target_date: targetDate,
      planned_incomes: editPlannedIncomes.filter(pi => pi.amount > 0),
    }).eq('id', editGoalId)
    if (error) { toast.error('Hiba a módosításkor!'); return }
    toast.success('Cél frissítve!')
    setEditGoalId(null)
    loadGoals()
  }

  const addDeposit = async () => {
    if (!depositGoalId || depositAmount <= 0) {
      toast.error('Add meg a befizetés összegét!')
      return
    }
    const goal = goals.find(g => g.id === depositGoalId)
    if (!goal) return

    const delta = depositType === 'deposit' ? depositAmount : -depositAmount
    const newCurrent = Math.max(0, goal.current_amount + delta)

    const { error: txError } = await supabase.from('savings_transactions').insert([{
      savings_goal_id: depositGoalId,
      amount: depositAmount,
      transaction_type: depositType,
      description: depositDescription.trim() || null,
      transaction_date: new Date().toISOString().split('T')[0],
    }])
    if (txError) { toast.error('Hiba a tranzakció mentésekor!'); return }

    const { error: updateError } = await supabase.from('savings_goals')
      .update({ current_amount: newCurrent })
      .eq('id', depositGoalId)
    if (updateError) { toast.error('Hiba az egyenleg frissítésekor!'); return }

    toast.success(depositType === 'deposit' ? 'Befizetés rögzítve!' : 'Kivét rögzítve!')
    setDepositGoalId(null)
    setDepositAmount(0)
    setDepositDescription('')
    setDepositType('deposit')
    loadGoals()
  }

  // Számítások
  const totalMonthlySavingsNeeded = goals.reduce((sum, g) => sum + getRequiredMonthlySavings(g), 0)
  const monthlySurplus = monthlyIncome - monthlyBudget
  const savingsBalance = monthlySurplus - totalMonthlySavingsNeeded

  // Idővonal: évenkénti bontás
  const currentYear = new Date().getFullYear()
  const maxYear = goals.length > 0
    ? Math.max(...goals.map(g => new Date(g.target_date).getFullYear()))
    : currentYear + 3
  const timelineYears = Array.from({ length: maxYear - currentYear + 1 }, (_, i) => currentYear + i)

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i)
  const monthNumbers = Array.from({ length: 12 }, (_, i) => i + 1)

  // Új cél form előnézet
  const newGoalTargetDateStr = `${newGoalTargetYear}-${String(newGoalTargetMonth).padStart(2, '0')}-01`
  const newGoalPlannedTotal = getFuturePlannedTotal(newGoalPlannedIncomes, newGoalTargetDateStr)
  const newGoalMonths = Math.max(1,
    (newGoalTargetYear - new Date().getFullYear()) * 12 + (newGoalTargetMonth - (new Date().getMonth() + 1))
  )
  const newGoalPreviewMonthly = newGoalAmount > 0
    ? Math.ceil(Math.max(0, newGoalAmount - newGoalCurrentAmount - newGoalPlannedTotal) / newGoalMonths)
    : 0

  // Szerkesztési form előnézet
  const editTargetDateStr = `${editTargetYear}-${String(editTargetMonth).padStart(2, '0')}-01`
  const editPlannedTotal = getFuturePlannedTotal(editPlannedIncomes, editTargetDateStr)
  const editGoalCurrentAmount = goals.find(g => g.id === editGoalId)?.current_amount || 0
  const editMonths = Math.max(1,
    (editTargetYear - new Date().getFullYear()) * 12 + (editTargetMonth - (new Date().getMonth() + 1))
  )
  const editPreviewMonthly = editAmount > 0
    ? Math.ceil(Math.max(0, editAmount - editGoalCurrentAmount - editPlannedTotal) / editMonths)
    : 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-purple-50 to-pink-50 p-3 sm:p-4 md:p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-violet-400/10 via-purple-500/10 to-pink-500/10"></div>
      <div className="max-w-7xl mx-auto relative z-10">

        {/* Header */}
        <div className="mb-4 md:mb-6 bg-white/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
            <div className="p-3 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-lg">
              <Target className="text-white" size={32} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-violet-600 via-purple-600 to-pink-600 bg-clip-text text-transparent tracking-tight leading-tight">
                Hosszú Távú Tervezés
              </h1>
              <p className="text-sm sm:text-base text-gray-600 font-medium mt-1">
                Éveken átívelő pénzügyi célok — megtakarítási ütemterv és idővonal
              </p>
            </div>
          </div>

          {/* Összesítő sáv */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            <div className="p-3 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200/60">
              <p className="text-xs text-gray-500 font-medium">Havi bevétel</p>
              <p className="text-lg font-extrabold text-green-700">
                {monthlyIncome > 0 ? `${monthlyIncome.toLocaleString('hu-HU')} Ft` : '—'}
              </p>
            </div>
            <div className="p-3 bg-gradient-to-br from-rose-50 to-pink-50 rounded-xl border border-rose-200/60">
              <p className="text-xs text-gray-500 font-medium">Havi kiadás</p>
              <p className="text-lg font-extrabold text-rose-700">
                {monthlyBudget > 0 ? `${monthlyBudget.toLocaleString('hu-HU')} Ft` : '—'}
              </p>
            </div>
            <div className={`p-3 rounded-xl border ${monthlySurplus >= 0 ? 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200/60' : 'bg-gradient-to-br from-red-50 to-rose-50 border-red-200/60'}`}>
              <p className="text-xs text-gray-500 font-medium">Havi többlet</p>
              <p className={`text-lg font-extrabold ${monthlySurplus >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                {monthlyIncome > 0 ? `${monthlySurplus.toLocaleString('hu-HU')} Ft` : '—'}
              </p>
            </div>
            <div className={`p-3 rounded-xl border ${savingsBalance >= 0 ? 'bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200/60' : 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200/60'}`}>
              <p className="text-xs text-gray-500 font-medium">Szabad megtakarítási keret</p>
              <p className={`text-lg font-extrabold ${savingsBalance >= 0 ? 'text-violet-700' : 'text-amber-700'}`}>
                {totalMonthlySavingsNeeded > 0
                  ? `${savingsBalance.toLocaleString('hu-HU')} Ft`
                  : '—'}
              </p>
            </div>
          </div>

          {totalMonthlySavingsNeeded > 0 && monthlyIncome > 0 && (
            <div className={`mt-3 p-3 rounded-xl flex items-center gap-2 text-sm font-medium ${savingsBalance >= 0 ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
              {savingsBalance >= 0
                ? <><Check size={16} /> Az összes célhoz szükséges <strong>{totalMonthlySavingsNeeded.toLocaleString('hu-HU')} Ft/hó</strong> befér a havi többletbe.</>
                : <><AlertCircle size={16} /> A célokhoz szükséges <strong>{totalMonthlySavingsNeeded.toLocaleString('hu-HU')} Ft/hó</strong> meghaladja a havi többletet ({Math.abs(savingsBalance).toLocaleString('hu-HU')} Ft hiány).</>
              }
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
          {/* Bal oldal: Célok listája */}
          <div className="xl:col-span-2 space-y-4">

            {/* Új cél gomb */}
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">Pénzügyi célok</h2>
              <Button
                onClick={() => setShowNewGoalForm(v => !v)}
                className="bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg hover:scale-105 transition-all rounded-xl"
              >
                {showNewGoalForm ? <X size={16} className="mr-1" /> : <Plus size={16} className="mr-1" />}
                {showNewGoalForm ? 'Mégsem' : 'Új cél'}
              </Button>
            </div>

            {/* Új cél form */}
            {showNewGoalForm && (
              <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-violet-700 flex items-center gap-2">
                    <Plus size={18} />
                    Új pénzügyi cél
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label className="text-sm font-semibold text-gray-700">Cél neve</Label>
                      <Input
                        value={newGoalName}
                        onChange={e => setNewGoalName(e.target.value)}
                        placeholder="pl. Új autó, Nyaralás Thaiföldön, Lakásfelújítás..."
                        className="mt-1 border-2 border-gray-200 focus:border-violet-400 rounded-xl"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-gray-700">Célösszeg (Ft)</Label>
                      <Input
                        type="number"
                        value={newGoalAmount || ''}
                        onChange={e => setNewGoalAmount(parseInt(e.target.value) || 0)}
                        placeholder="5 000 000"
                        className="mt-1 border-2 border-gray-200 focus:border-violet-400 rounded-xl font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-gray-700">Meglévő megtakarítás (Ft)</Label>
                      <Input
                        type="number"
                        value={newGoalCurrentAmount || ''}
                        onChange={e => setNewGoalCurrentAmount(parseInt(e.target.value) || 0)}
                        placeholder="0"
                        className="mt-1 border-2 border-gray-200 focus:border-violet-400 rounded-xl font-mono"
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-gray-700">Kategória</Label>
                      <Select value={newGoalCategory} onValueChange={setNewGoalCategory}>
                        <SelectTrigger className="mt-1 border-2 border-gray-200 hover:border-violet-400 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-sm font-semibold text-gray-700">Célév és hónap</Label>
                      <div className="flex gap-2 mt-1">
                        <Select value={newGoalTargetYear.toString()} onValueChange={v => setNewGoalTargetYear(parseInt(v))}>
                          <SelectTrigger className="border-2 border-gray-200 hover:border-violet-400 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Select value={newGoalTargetMonth.toString()} onValueChange={v => setNewGoalTargetMonth(parseInt(v))}>
                          <SelectTrigger className="border-2 border-gray-200 hover:border-violet-400 rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {monthNumbers.map(m => (
                              <SelectItem key={m} value={m.toString()}>{MONTHS_HU[m - 1]}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <Label className="text-sm font-semibold text-gray-700">Megjegyzés (opcionális)</Label>
                      <Textarea
                        value={newGoalDescription}
                        onChange={e => setNewGoalDescription(e.target.value)}
                        placeholder="Rövid leírás..."
                        className="mt-1 border-2 border-gray-200 focus:border-violet-400 rounded-xl"
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* Tervezett nagyobb bevételek */}
                  <div>
                    <Label className="text-sm font-semibold text-gray-700 flex items-center gap-1.5 mb-2">
                      <TrendingUp size={14} className="text-amber-600" />
                      Tervezett nagyobb bevételek
                      <span className="text-xs font-normal text-gray-500">(pl. prémium, bónusz, ingatlan eladás)</span>
                    </Label>
                    <PlannedIncomesEditor
                      incomes={newGoalPlannedIncomes}
                      onChange={setNewGoalPlannedIncomes}
                      years={years}
                    />
                  </div>

                  {/* Kalkuláció előnézet */}
                  {newGoalAmount > 0 && (
                    <div className="p-3 bg-violet-50 rounded-xl border border-violet-200 space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Célösszeg:</span>
                        <span className="font-semibold text-gray-800">{newGoalAmount.toLocaleString('hu-HU')} Ft</span>
                      </div>
                      {newGoalCurrentAmount > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Meglévő megtakarítás:</span>
                          <span className="font-semibold text-green-700">−{newGoalCurrentAmount.toLocaleString('hu-HU')} Ft</span>
                        </div>
                      )}
                      {newGoalPlannedTotal > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Tervezett bevételek:</span>
                          <span className="font-semibold text-amber-700">−{newGoalPlannedTotal.toLocaleString('hu-HU')} Ft</span>
                        </div>
                      )}
                      {(newGoalCurrentAmount > 0 || newGoalPlannedTotal > 0) && (
                        <Separator className="my-0.5" />
                      )}
                      <div className="flex justify-between font-bold">
                        <span className="text-violet-700">Szükséges havi megtakarítás:</span>
                        <span className="text-violet-700">{newGoalPreviewMonthly.toLocaleString('hu-HU')} Ft/hó</span>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={saveNewGoal}
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white font-semibold rounded-xl"
                  >
                    <Save size={16} className="mr-2" />
                    Cél mentése
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Célok kártya-nézet */}
            {goals.length === 0 ? (
              <Card className="bg-white/90 backdrop-blur-xl shadow-xl border border-white/20 rounded-2xl">
                <CardContent className="text-center text-gray-500 py-12">
                  <Target size={48} className="mx-auto mb-3 text-gray-300" />
                  <p className="font-medium">Még nincsenek pénzügyi célok</p>
                  <p className="text-sm mt-1">Kattints az „Új cél" gombra az első cél létrehozásához</p>
                </CardContent>
              </Card>
            ) : (
              goals.map(goal => {
                const progressPct = goal.target_amount > 0
                  ? Math.min(100, Math.round((goal.current_amount / goal.target_amount) * 100))
                  : 0
                const monthsLeft = getMonthsRemaining(goal.target_date)
                const requiredMonthly = getRequiredMonthlySavings(goal)
                const isOverdue = monthsLeft <= 0 && goal.current_amount < goal.target_amount
                const isDone = goal.current_amount >= goal.target_amount
                const isEditing = editGoalId === goal.id
                const isDepositing = depositGoalId === goal.id
                const goalPlannedIncomes = goal.planned_incomes || []
                const futurePlannedTotal = getFuturePlannedTotal(goalPlannedIncomes, goal.target_date)

                return (
                  <Card key={goal.id} className={`bg-white/90 backdrop-blur-xl shadow-xl border rounded-2xl transition-all ${isDone ? 'border-green-300' : isOverdue ? 'border-red-300' : 'border-white/20'}`}>
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div
                            className="w-4 h-4 rounded-full shrink-0 mt-0.5"
                            style={{ backgroundColor: goal.color }}
                          />
                          <div className="min-w-0">
                            <CardTitle className="text-base font-bold text-gray-900 truncate">{goal.name}</CardTitle>
                            <div className="flex items-center gap-2 flex-wrap mt-1">
                              <Badge variant="outline" className="text-xs">{goal.category}</Badge>
                              {isDone && <Badge className="text-xs bg-green-500 text-white border-0"><Check size={10} className="mr-1" />Teljesítve</Badge>}
                              {isOverdue && !isDone && <Badge variant="destructive" className="text-xs"><AlertCircle size={10} className="mr-1" />Lejárt</Badge>}
                              {!isDone && !isOverdue && (
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <Calendar size={12} />
                                  Célzott: {formatDate(goal.target_date)} ({monthsLeft} hó)
                                </span>
                              )}
                              {goalPlannedIncomes.length > 0 && (
                                <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 bg-amber-50">
                                  <TrendingUp size={10} className="mr-0.5" />
                                  {goalPlannedIncomes.length} tervezett bevétel
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Button size="sm" variant="outline"
                            onClick={() => isEditing ? setEditGoalId(null) : startEdit(goal)}
                            className="h-8 w-8 p-0 rounded-lg border-gray-200 hover:border-violet-300"
                          >
                            {isEditing ? <X size={14} /> : <Edit2 size={14} />}
                          </Button>
                          <Button size="sm" variant="outline"
                            onClick={() => deleteGoal(goal.id)}
                            className="h-8 w-8 p-0 rounded-lg border-gray-200 hover:border-red-300 hover:text-red-600"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">

                      {/* Szerkesztés form */}
                      {isEditing && (
                        <div className="p-4 bg-violet-50 rounded-xl border border-violet-200 space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="md:col-span-2">
                              <Label className="text-xs font-semibold text-gray-700">Megnevezés</Label>
                              <Input value={editName} onChange={e => setEditName(e.target.value)}
                                className="mt-1 h-9 text-sm border-2 border-gray-200 focus:border-violet-400 rounded-xl" />
                            </div>
                            <div>
                              <Label className="text-xs font-semibold text-gray-700">Célösszeg (Ft)</Label>
                              <Input type="number" value={editAmount || ''} onChange={e => setEditAmount(parseInt(e.target.value) || 0)}
                                className="mt-1 h-9 text-sm border-2 border-gray-200 focus:border-violet-400 rounded-xl font-mono" />
                            </div>
                            <div>
                              <Label className="text-xs font-semibold text-gray-700">Kategória</Label>
                              <Select value={editCategory} onValueChange={setEditCategory}>
                                <SelectTrigger className="mt-1 h-9 text-sm border-2 border-gray-200 rounded-xl">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs font-semibold text-gray-700">Célév és hónap</Label>
                              <div className="flex gap-2 mt-1">
                                <Select value={editTargetYear.toString()} onValueChange={v => setEditTargetYear(parseInt(v))}>
                                  <SelectTrigger className="h-9 text-sm border-2 border-gray-200 rounded-xl">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                                <Select value={editTargetMonth.toString()} onValueChange={v => setEditTargetMonth(parseInt(v))}>
                                  <SelectTrigger className="h-9 text-sm border-2 border-gray-200 rounded-xl">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {monthNumbers.map(m => (
                                      <SelectItem key={m} value={m.toString()}>{MONTHS_HU[m - 1]}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="md:col-span-2">
                              <Label className="text-xs font-semibold text-gray-700">Megjegyzés</Label>
                              <Textarea value={editDescription} onChange={e => setEditDescription(e.target.value)}
                                className="mt-1 text-sm border-2 border-gray-200 focus:border-violet-400 rounded-xl" rows={2} />
                            </div>
                          </div>

                          {/* Tervezett bevételek szerkesztésben */}
                          <div>
                            <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1 mb-2">
                              <TrendingUp size={12} className="text-amber-600" />
                              Tervezett nagyobb bevételek
                            </Label>
                            <PlannedIncomesEditor
                              incomes={editPlannedIncomes}
                              onChange={setEditPlannedIncomes}
                              years={years}
                            />
                          </div>

                          {/* Kalkuláció előnézet szerkesztésben */}
                          {editAmount > 0 && (
                            <div className="p-2.5 bg-white rounded-xl border border-violet-200 space-y-1 text-xs">
                              {editGoalCurrentAmount > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Meglévő megtakarítás:</span>
                                  <span className="font-semibold text-green-700">−{editGoalCurrentAmount.toLocaleString('hu-HU')} Ft</span>
                                </div>
                              )}
                              {editPlannedTotal > 0 && (
                                <div className="flex justify-between">
                                  <span className="text-gray-500">Tervezett bevételek összesen:</span>
                                  <span className="font-semibold text-amber-700">−{editPlannedTotal.toLocaleString('hu-HU')} Ft</span>
                                </div>
                              )}
                              <div className="flex justify-between font-bold border-t border-violet-100 pt-1">
                                <span className="text-violet-700">Szükséges havi megtakarítás:</span>
                                <span className="text-violet-700">{editPreviewMonthly.toLocaleString('hu-HU')} Ft/hó</span>
                              </div>
                            </div>
                          )}

                          <Button onClick={saveEdit} size="sm"
                            className="bg-violet-600 hover:bg-violet-700 text-white rounded-xl">
                            <Save size={14} className="mr-1" /> Mentés
                          </Button>
                        </div>
                      )}

                      {/* Előrehaladás */}
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-gray-700">
                            {goal.current_amount.toLocaleString('hu-HU')} Ft
                          </span>
                          <span className="text-gray-500">
                            {goal.target_amount.toLocaleString('hu-HU')} Ft ({progressPct}%)
                          </span>
                        </div>
                        <Progress value={progressPct} className="h-2.5 rounded-full" />
                      </div>

                      {/* Kulcsadatok */}
                      {!isDone && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-gray-50 rounded-xl text-center">
                            <p className="text-xs text-gray-500 font-medium">Még szükséges</p>
                            <p className="text-base font-extrabold text-gray-800">
                              {(goal.target_amount - goal.current_amount).toLocaleString('hu-HU')} Ft
                            </p>
                            {futurePlannedTotal > 0 && (
                              <p className="text-xs text-amber-600 font-medium mt-0.5">
                                ebből tervezett: −{futurePlannedTotal.toLocaleString('hu-HU')} Ft
                              </p>
                            )}
                          </div>
                          <div className={`p-3 rounded-xl text-center ${requiredMonthly > 0 && monthlyIncome > 0 && requiredMonthly > monthlySurplus ? 'bg-amber-50' : 'bg-violet-50'}`}>
                            <p className="text-xs text-gray-500 font-medium">Szükséges/hó</p>
                            <p className={`text-base font-extrabold ${requiredMonthly > 0 && monthlyIncome > 0 && requiredMonthly > monthlySurplus ? 'text-amber-700' : 'text-violet-700'}`}>
                              {isOverdue ? '—' : `${requiredMonthly.toLocaleString('hu-HU')} Ft`}
                            </p>
                            {futurePlannedTotal > 0 && !isOverdue && (
                              <p className="text-xs text-amber-600 mt-0.5">tervezett bev. után</p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Tervezett bevételek listája */}
                      {goalPlannedIncomes.length > 0 && (
                        <div className="p-3 bg-amber-50 rounded-xl border border-amber-200">
                          <p className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-1">
                            <TrendingUp size={12} />
                            Tervezett bevételek
                          </p>
                          <div className="space-y-1.5">
                            {goalPlannedIncomes.map((pi, i) => {
                              const piDate = new Date(pi.year, pi.month - 1)
                              const isFuture = piDate > new Date()
                              return (
                                <div key={pi.id || i} className="flex items-center justify-between text-xs">
                                  <span className={`flex items-center gap-1 ${isFuture ? 'text-amber-700' : 'text-gray-400 line-through'}`}>
                                    <Calendar size={10} />
                                    {pi.year}. {MONTHS_HU[pi.month - 1]}
                                    {pi.description && ` — ${pi.description}`}
                                  </span>
                                  <span className={`font-bold ml-2 shrink-0 ${isFuture ? 'text-amber-700' : 'text-gray-400'}`}>
                                    {pi.amount.toLocaleString('hu-HU')} Ft
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {goal.description && (
                        <p className="text-xs text-gray-500 italic">{goal.description}</p>
                      )}

                      {/* Befizetés form */}
                      {isDepositing && (
                        <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-3">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => setDepositType('deposit')}
                              className={`flex-1 rounded-xl ${depositType === 'deposit' ? 'bg-emerald-600 text-white' : 'bg-white text-gray-700 border border-gray-200'}`}
                            >
                              Befizetés
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => setDepositType('withdrawal')}
                              className={`flex-1 rounded-xl ${depositType === 'withdrawal' ? 'bg-red-500 text-white' : 'bg-white text-gray-700 border border-gray-200'}`}
                            >
                              Kivét
                            </Button>
                          </div>
                          <div>
                            <Label className="text-xs font-semibold text-gray-700">Összeg (Ft)</Label>
                            <Input
                              type="number"
                              value={depositAmount || ''}
                              onChange={e => setDepositAmount(parseInt(e.target.value) || 0)}
                              placeholder="0"
                              className="mt-1 h-9 text-sm border-2 border-gray-200 focus:border-emerald-400 rounded-xl font-mono"
                            />
                          </div>
                          <div>
                            <Label className="text-xs font-semibold text-gray-700">Megjegyzés (opcionális)</Label>
                            <Input
                              value={depositDescription}
                              onChange={e => setDepositDescription(e.target.value)}
                              placeholder="pl. Január havi megtakarítás"
                              className="mt-1 h-9 text-sm border-2 border-gray-200 focus:border-emerald-400 rounded-xl"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={addDeposit} size="sm"
                              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
                              Rögzítés
                            </Button>
                            <Button onClick={() => setDepositGoalId(null)} size="sm" variant="outline"
                              className="rounded-xl">
                              Mégsem
                            </Button>
                          </div>
                        </div>
                      )}

                      {!isDepositing && !isDone && (
                        <Button
                          onClick={() => {
                            setDepositGoalId(goal.id)
                            setDepositAmount(0)
                            setDepositDescription('')
                            setDepositType('deposit')
                          }}
                          size="sm"
                          variant="outline"
                          className="w-full border-2 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 text-emerald-700 rounded-xl"
                        >
                          <ArrowUpRight size={14} className="mr-1" />
                          Megtakarítás rögzítése
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>

          {/* Jobb oldal: Idővonal */}
          <div className="space-y-4">

            {/* Összesítő */}
            <Card className="bg-gradient-to-br from-violet-600 to-purple-700 text-white shadow-2xl border border-white/10 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <Scale size={20} />
                  Megtakarítási mérleg
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-white/80 text-sm">Összes cél db:</span>
                  <span className="font-bold">{goals.length}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/80 text-sm">Összes célösszeg:</span>
                  <span className="font-bold">
                    {goals.reduce((s, g) => s + g.target_amount, 0).toLocaleString('hu-HU')} Ft
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white/80 text-sm">Összegyűjtve:</span>
                  <span className="font-bold">
                    {goals.reduce((s, g) => s + g.current_amount, 0).toLocaleString('hu-HU')} Ft
                  </span>
                </div>
                {goals.some(g => (g.planned_incomes || []).length > 0) && (
                  <div className="flex justify-between items-center">
                    <span className="text-white/80 text-sm">Tervezett bevételek:</span>
                    <span className="font-bold text-amber-300">
                      −{goals.reduce((s, g) => s + getFuturePlannedTotal(g.planned_incomes || [], g.target_date), 0).toLocaleString('hu-HU')} Ft
                    </span>
                  </div>
                )}
                <Separator className="bg-white/20" />
                <div className="flex justify-between items-center">
                  <span className="text-white/80 text-sm">Szükséges havi megtakarítás:</span>
                  <span className="text-xl font-extrabold">
                    {totalMonthlySavingsNeeded.toLocaleString('hu-HU')} Ft
                  </span>
                </div>
                {monthlyIncome > 0 && (
                  <div className={`p-3 rounded-xl ${savingsBalance >= 0 ? 'bg-white/15' : 'bg-red-500/30'} border border-white/20`}>
                    <div className="flex items-center gap-2 text-sm font-medium">
                      {savingsBalance >= 0
                        ? <><Check size={16} /> Megvalósítható a havi többletből</>
                        : <><AlertCircle size={16} /> Havi {Math.abs(savingsBalance).toLocaleString('hu-HU')} Ft hiány</>
                      }
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Évenkénti idővonal */}
            {goals.length > 0 && (
              <Card className="bg-white/90 backdrop-blur-xl shadow-xl border border-white/20 rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
                    <Calendar size={18} className="text-violet-600" />
                    Idővonal
                  </CardTitle>
                  <CardDescription className="text-sm">Mikor érhető el melyik cél?</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {timelineYears.map(year => {
                    const yearGoals = goals.filter(g => new Date(g.target_date).getFullYear() === year)
                    if (yearGoals.length === 0) return null
                    return (
                      <div key={year}>
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-2 h-2 rounded-full bg-violet-500"></div>
                          <span className="text-sm font-bold text-gray-700">{year}</span>
                          <div className="flex-1 h-px bg-gray-200"></div>
                        </div>
                        <div className="space-y-2 pl-4">
                          {yearGoals.map(g => {
                            const done = g.current_amount >= g.target_amount
                            const pct = g.target_amount > 0
                              ? Math.min(100, Math.round((g.current_amount / g.target_amount) * 100))
                              : 0
                            const monthlyNeeded = getRequiredMonthlySavings(g)
                            const hasPlanned = (g.planned_incomes || []).length > 0
                            return (
                              <div key={g.id} className="text-sm">
                                <div className="flex items-center gap-2">
                                  <div
                                    className="w-2 h-2 rounded-full shrink-0"
                                    style={{ backgroundColor: g.color }}
                                  />
                                  <span className={`flex-1 truncate ${done ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                    {g.name}
                                  </span>
                                  <span className="text-xs text-gray-500 shrink-0">
                                    {formatDate(g.target_date).replace(/\d{4}\. /, '')}
                                  </span>
                                  {done
                                    ? <Check size={14} className="text-green-500 shrink-0" />
                                    : <span className="text-xs font-semibold text-violet-600 shrink-0">{pct}%</span>
                                  }
                                </div>
                                {!done && monthlyNeeded > 0 && (
                                  <div className="ml-4 text-xs text-gray-400">
                                    {monthlyNeeded.toLocaleString('hu-HU')} Ft/hó
                                    {hasPlanned && ' (tervezett bev. után)'}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )}

            {/* Kategóriánkénti bontás */}
            {goals.length > 0 && (
              <Card className="bg-white/90 backdrop-blur-xl shadow-xl border border-white/20 rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base font-bold text-gray-800 flex items-center gap-2">
                    <PiggyBank size={18} className="text-violet-600" />
                    Kategóriánként
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Array.from(new Set(goals.map(g => g.category))).map(cat => {
                    const catGoals = goals.filter(g => g.category === cat)
                    const catTotal = catGoals.reduce((s, g) => s + g.target_amount, 0)
                    const catCurrent = catGoals.reduce((s, g) => s + g.current_amount, 0)
                    const catMonthly = catGoals.reduce((s, g) => s + getRequiredMonthlySavings(g), 0)
                    const color = CATEGORY_COLORS[cat] || '#6B7280'
                    return (
                      <div key={cat} className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center">
                            <span className="text-sm font-semibold text-gray-700 truncate">{cat}</span>
                            <span className="text-xs text-violet-600 font-bold shrink-0 ml-2">
                              {catMonthly > 0 ? `${catMonthly.toLocaleString('hu-HU')} Ft/hó` : '✓'}
                            </span>
                          </div>
                          <div className="text-xs text-gray-500">
                            {catCurrent.toLocaleString('hu-HU')} / {catTotal.toLocaleString('hu-HU')} Ft
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
