'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/utils/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card'
import { Input } from '@/src/components/ui/input'
import { Button } from '@/src/components/ui/button'
import { Textarea } from '@/src/components/ui/textarea'
import { Badge } from '@/src/components/ui/badge'
import { Progress } from '@/src/components/ui/progress'
import { 
  Plus, Target, TrendingUp, DollarSign, 
  PiggyBank, BarChart3, Trash2, Wallet, LineChart
} from 'lucide-react'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/src/components/ui/alert-dialog'

interface SavingsGoal {
  id: string
  name: string
  description?: string
  target_amount: number
  current_amount: number
  target_date: string
  color: string
  category: string
  created_at: string
}

interface Investment {
  id: string
  name: string
  symbol: string
  investment_type: 'stock' | 'bond' | 'etf' | 'crypto'
  quantity: number
  average_price: number
  current_price?: number
  currency: string
  purchase_date: string
}

const CATEGORIES = [
  'Nyaralás', 'Lakás/Ház', 'Autó', 'Elektronika', 'Vészhelyzet', 
  'Oktatás', 'Egészség', 'Nyugdíj', 'Egyéb'
]

const COLORS = [
  '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
  '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
]

const INVESTMENT_TYPES = [
  { value: 'stock', label: 'Részvény' },
  { value: 'bond', label: 'Állampapír' },
  { value: 'etf', label: 'ETF' },
  { value: 'crypto', label: 'Kriptovaluta' }
]

export default function MegtakaritasokPage() {
  const [savingsGoals, setSavingsGoals] = useState<SavingsGoal[]>([])
  const [investments, setInvestments] = useState<Investment[]>([])
  const [selectedGoal, setSelectedGoal] = useState<SavingsGoal | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null) // eslint-disable-line @typescript-eslint/no-explicit-any
  const [showNewGoalForm, setShowNewGoalForm] = useState(false)
  const [showInvestmentForm, setShowInvestmentForm] = useState(false)
  const [showAddMoneyForm, setShowAddMoneyForm] = useState(false)

  // Új cél form állapotok
  const [newGoal, setNewGoal] = useState({
    name: '',
    description: '',
    target_amount: '',
    target_date: '',
    category: 'Egyéb'
  })

  // Új befektetés form állapotok
  const [newInvestment, setNewInvestment] = useState({
    name: '',
    symbol: '',
    investment_type: 'stock' as 'stock' | 'bond' | 'etf' | 'crypto',
    quantity: '',
    average_price: '',
    current_price: '',
    currency: 'HUF'
  })

  // Pénz hozzáadás form állapotok
  const [newTransaction, setNewTransaction] = useState({
    amount: '',
    description: '',
    transaction_type: 'deposit' as 'deposit' | 'withdrawal'
  })

  const supabase = createClient()

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    setCurrentUser(user)
  }

  const loadSavingsGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('savings_goals')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setSavingsGoals(data || [])
    } catch (error) {
      console.error('Error loading savings goals:', error)
      toast.error('Hiba történt a megtakarítási célok betöltésekor')
    }
  }

  const loadInvestments = async () => {
    try {
      const { data, error } = await supabase
        .from('investment_portfolio')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setInvestments(data || [])
    } catch (error) {
      console.error('Error loading investments:', error)
      toast.error('Hiba történt a befektetések betöltésekor')
    }
  }

  const loadData = async () => {
    setIsLoading(true)
    await Promise.all([loadSavingsGoals(), loadInvestments()])
    setIsLoading(false)
  }

  useEffect(() => {
    checkUser()
    loadData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const saveGoal = async () => {
    if (!currentUser) {
      toast.error('Jelentkezz be a megtakarítási célok mentéséhez!')
      return
    }

    if (!newGoal.name.trim() || !newGoal.target_amount || !newGoal.target_date) {
      toast.error('Töltsd ki az összes kötelező mezőt!')
      return
    }

    try {
      const colorIndex = savingsGoals.length % COLORS.length
      const { error } = await supabase
        .from('savings_goals')
        .insert({
          user_id: currentUser.id,
          name: newGoal.name.trim(),
          description: newGoal.description.trim() || null,
          target_amount: parseFloat(newGoal.target_amount),
          target_date: newGoal.target_date,
          category: newGoal.category,
          color: COLORS[colorIndex]
        })

      if (error) throw error

      toast.success('Megtakarítási cél sikeresen mentve!')
      setShowNewGoalForm(false)
      setNewGoal({
        name: '',
        description: '',
        target_amount: '',
        target_date: '',
        category: 'Egyéb'
      })
      loadSavingsGoals()
    } catch (error) {
      console.error('Error saving savings goal:', error)
      toast.error('Hiba történt a megtakarítási cél mentésekor')
    }
  }

  const saveInvestment = async () => {
    if (!currentUser) {
      toast.error('Jelentkezz be a befektetések mentéséhez!')
      return
    }

    if (!newInvestment.name.trim() || !newInvestment.symbol.trim() || 
        !newInvestment.quantity || !newInvestment.average_price) {
      toast.error('Töltsd ki az összes kötelező mezőt!')
      return
    }

    try {
      const { error } = await supabase
        .from('investment_portfolio')
        .insert({
          user_id: currentUser.id,
          name: newInvestment.name.trim(),
          symbol: newInvestment.symbol.trim().toUpperCase(),
          investment_type: newInvestment.investment_type,
          quantity: parseFloat(newInvestment.quantity),
          average_price: parseFloat(newInvestment.average_price),
          current_price: newInvestment.current_price ? parseFloat(newInvestment.current_price) : null,
          currency: newInvestment.currency
        })

      if (error) throw error

      toast.success('Befektetés sikeresen mentve!')
      setShowInvestmentForm(false)
      setNewInvestment({
        name: '',
        symbol: '',
        investment_type: 'stock',
        quantity: '',
        average_price: '',
        current_price: '',
        currency: 'HUF'
      })
      loadInvestments()
    } catch (error) {
      console.error('Error saving investment:', error)
      toast.error('Hiba történt a befektetés mentésekor')
    }
  }

  const addTransaction = async () => {
    if (!selectedGoal || !newTransaction.amount) {
      toast.error('Töltsd ki az összes mezőt!')
      return
    }

    try {
      const amount = parseFloat(newTransaction.amount)
      
      // Tranzakció hozzáadása
      const { error: transactionError } = await supabase
        .from('savings_transactions')
        .insert({
          savings_goal_id: selectedGoal.id,
          amount: amount,
          transaction_type: newTransaction.transaction_type,
          description: newTransaction.description.trim() || null,
          transaction_date: new Date().toISOString().split('T')[0]
        })

      if (transactionError) throw transactionError

      // Megtakarítási cél frissítése
      const newCurrentAmount = newTransaction.transaction_type === 'deposit' 
        ? selectedGoal.current_amount + amount
        : selectedGoal.current_amount - amount

      const { error: updateError } = await supabase
        .from('savings_goals')
        .update({ current_amount: Math.max(0, newCurrentAmount) })
        .eq('id', selectedGoal.id)

      if (updateError) throw updateError

      toast.success(
        newTransaction.transaction_type === 'deposit' 
          ? 'Összeg sikeresen hozzáadva!' 
          : 'Összeg sikeresen levonva!'
      )
      
      setShowAddMoneyForm(false)
      setNewTransaction({
        amount: '',
        description: '',
        transaction_type: 'deposit'
      })
      setSelectedGoal(null)
      loadSavingsGoals()
    } catch (error) {
      console.error('Error adding transaction:', error)
      toast.error('Hiba történt a tranzakció mentésekor')
    }
  }

  const deleteGoal = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from('savings_goals')
        .delete()
        .eq('id', goalId)

      if (error) throw error

      toast.success('Megtakarítási cél törölve!')
      loadSavingsGoals()
    } catch (error) {
      console.error('Error deleting savings goal:', error)
      toast.error('Hiba történt a törléskor')
    }
  }

  const calculateMonthlyAmount = (goal: SavingsGoal): number => {
    const today = new Date()
    const targetDate = new Date(goal.target_date)
    const monthsLeft = Math.max(1, Math.ceil((targetDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30)))
    const remainingAmount = goal.target_amount - goal.current_amount
    return Math.max(0, remainingAmount / monthsLeft)
  }

  const getProgressPercentage = (goal: SavingsGoal): number => {
    return Math.min(100, (goal.current_amount / goal.target_amount) * 100)
  }

  const getDaysLeft = (targetDate: string): number => {
    const today = new Date()
    const target = new Date(targetDate)
    return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getTotalSavings = (): number => {
    return savingsGoals.reduce((sum, goal) => sum + goal.current_amount, 0)
  }

  const getTotalInvestmentValue = (): number => {
    return investments.reduce((sum, inv) => {
      const currentPrice = inv.current_price || inv.average_price
      return sum + (inv.quantity * currentPrice)
    }, 0)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-400 via-teal-500 to-green-500 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Fejléc */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
            <PiggyBank size={36} />
            Megtakarítási Tervek
          </h1>
          <p className="text-white/80 text-lg">Kövesd nyomon a pénzügyi céljaidat és befektetéseidet</p>
        </div>

        {/* Összefoglaló kártyák */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-white shadow-xl border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Összes Megtakarítás</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Wallet className="text-green-600" size={24} />
                <span className="text-2xl font-bold text-gray-900">
                  {formatCurrency(getTotalSavings())}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-xl border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Befektetések Értéke</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="text-blue-600" size={24} />
                <span className="text-2xl font-bold text-gray-900">
                  {formatCurrency(getTotalInvestmentValue())}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-xl border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Aktív Célok</CardTitle>
            </CardHeader>
            <CardContent>                <div className="flex items-center gap-2">
                  <Target className="text-teal-600" size={24} />
                  <span className="text-2xl font-bold text-gray-900">
                    {savingsGoals.length}
                  </span>
                </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Bal oldal - Megtakarítási célok */}
          <div className="xl:col-span-2">
            <Card className="bg-white shadow-xl border-0">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Target size={20} className="text-teal-600" />
                    Megtakarítási Célok
                  </CardTitle>
                  <Button 
                    onClick={() => setShowNewGoalForm(true)}
                    className="bg-teal-500 hover:bg-teal-600"
                  >
                    <Plus size={16} className="mr-2" />
                    Új cél
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500 mx-auto"></div>
                  </div>
                ) : savingsGoals.length > 0 ? (
                  <div className="space-y-4">
                    {savingsGoals.map((goal) => {
                      const progress = getProgressPercentage(goal)
                      const monthlyAmount = calculateMonthlyAmount(goal)
                      const daysLeft = getDaysLeft(goal.target_date)
                      
                      return (
                        <div key={goal.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className="font-semibold text-gray-900">{goal.name}</h3>
                              <Badge variant="outline" className="mt-1">
                                {goal.category}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedGoal(goal)
                                  setShowAddMoneyForm(true)
                                }}
                              >
                                <DollarSign size={14} />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="outline" size="sm" className="text-red-600">
                                    <Trash2 size={14} />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Cél törlése</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Biztosan törölni szeretnéd ezt a megtakarítási célt?
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Mégse</AlertDialogCancel>
                                    <AlertDialogAction 
                                      onClick={() => deleteGoal(goal.id)}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      Törlés
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>{formatCurrency(goal.current_amount)}</span>
                              <span>{formatCurrency(goal.target_amount)}</span>
                            </div>
                            <Progress value={progress} className="h-2" />
                            <div className="flex justify-between text-sm text-gray-600">
                              <span>{progress.toFixed(1)}% teljesítve</span>
                              <span>{daysLeft > 0 ? `${daysLeft} nap hátra` : 'Lejárt'}</span>
                            </div>
                            <div className="text-sm">
                              <span className="font-medium text-teal-600">
                                Havi szükséges: {formatCurrency(monthlyAmount)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Target size={48} className="mx-auto mb-2 opacity-50" />
                    <p>Még nincsenek megtakarítási célok</p>
                    <p className="text-sm">Hozz létre az első célodat!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Jobb oldal - Befektetések */}
          <div className="xl:col-span-1">
            <Card className="bg-white shadow-xl border-0">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 size={20} className="text-blue-600" />
                    Befektetések
                  </CardTitle>
                  <Button 
                    onClick={() => setShowInvestmentForm(true)}
                    variant="outline"
                    size="sm"
                  >
                    <Plus size={14} className="mr-2" />
                    Új
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {investments.length > 0 ? (
                  <div className="space-y-3">
                    {investments.map((investment) => {
                      const currentValue = investment.quantity * (investment.current_price || investment.average_price)
                      const initialValue = investment.quantity * investment.average_price
                      const gain = currentValue - initialValue
                      const gainPercent = (gain / initialValue) * 100
                      
                      return (
                        <div key={investment.id} className="p-3 border rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h4 className="font-medium">{investment.name}</h4>
                              <p className="text-sm text-gray-600">{investment.symbol}</p>
                            </div>
                            <Badge variant={gain >= 0 ? "default" : "destructive"}>
                              {investment.investment_type === 'stock' && '📈'}
                              {investment.investment_type === 'bond' && '🏛️'}
                              {investment.investment_type === 'etf' && '📊'}
                              {investment.investment_type === 'crypto' && '₿'}
                            </Badge>
                          </div>
                          <div className="text-sm space-y-1">
                            <div className="flex justify-between">
                              <span>Mennyiség:</span>
                              <span>{investment.quantity}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Jelenlegi érték:</span>
                              <span className="font-medium">{formatCurrency(currentValue)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Hozam:</span>
                              <span className={gain >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {gain >= 0 ? '+' : ''}{formatCurrency(gain)} ({gainPercent.toFixed(1)}%)
                              </span>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <LineChart size={48} className="mx-auto mb-2 opacity-50" />
                    <p>Még nincsenek befektetések</p>
                    <p className="text-sm">Add hozzá az első befektetésedet!</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Új cél modal */}
        {showNewGoalForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Új megtakarítási cél</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Cél neve</label>
                  <Input
                    placeholder="pl. Nyaralás Horvátországban"
                    value={newGoal.name}
                    onChange={(e) => setNewGoal({...newGoal, name: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1">Leírás</label>
                  <Textarea
                    placeholder="Részletek a célról..."
                    value={newGoal.description}
                    onChange={(e) => setNewGoal({...newGoal, description: e.target.value})}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Célösszeg (Ft)</label>
                    <Input
                      type="number"
                      placeholder="500000"
                      value={newGoal.target_amount}
                      onChange={(e) => setNewGoal({...newGoal, target_amount: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Céldátum</label>
                    <Input
                      type="date"
                      value={newGoal.target_date}
                      onChange={(e) => setNewGoal({...newGoal, target_date: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Kategória</label>
                  <select
                    value={newGoal.category}
                    onChange={(e) => setNewGoal({...newGoal, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  >
                    {CATEGORIES.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={saveGoal} className="flex-1 bg-teal-500 hover:bg-teal-600">
                    Mentés
                  </Button>
                  <Button variant="outline" onClick={() => setShowNewGoalForm(false)}>
                    Mégse
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Új befektetés modal */}
        {showInvestmentForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Új befektetés</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Név</label>
                  <Input
                    placeholder="pl. Apple Inc."
                    value={newInvestment.name}
                    onChange={(e) => setNewInvestment({...newInvestment, name: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Szimbólum</label>
                    <Input
                      placeholder="AAPL"
                      value={newInvestment.symbol}
                      onChange={(e) => setNewInvestment({...newInvestment, symbol: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Típus</label>
                    <select
                      value={newInvestment.investment_type}
                      onChange={(e) => setNewInvestment({...newInvestment, investment_type: e.target.value as typeof newInvestment.investment_type})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      {INVESTMENT_TYPES.map(type => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Mennyiség</label>
                    <Input
                      type="number"
                      step="0.000001"
                      placeholder="10"
                      value={newInvestment.quantity}
                      onChange={(e) => setNewInvestment({...newInvestment, quantity: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Vételi ár</label>
                    <Input
                      type="number"
                      placeholder="150"
                      value={newInvestment.average_price}
                      onChange={(e) => setNewInvestment({...newInvestment, average_price: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Jelenlegi ár</label>
                    <Input
                      type="number"
                      placeholder="160"
                      value={newInvestment.current_price}
                      onChange={(e) => setNewInvestment({...newInvestment, current_price: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Deviza</label>
                    <select
                      value={newInvestment.currency}
                      onChange={(e) => setNewInvestment({...newInvestment, currency: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="HUF">HUF</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                    </select>
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={saveInvestment} className="flex-1 bg-blue-500 hover:bg-blue-600">
                    Mentés
                  </Button>
                  <Button variant="outline" onClick={() => setShowInvestmentForm(false)}>
                    Mégse
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Pénz hozzáadás modal */}
        {showAddMoneyForm && selectedGoal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Összeg módosítása</CardTitle>
                <CardDescription>{selectedGoal.name}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Összeg (Ft)</label>
                  <Input
                    type="number"
                    placeholder="10000"
                    value={newTransaction.amount}
                    onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Típus</label>
                  <div className="flex gap-2">
                    <Button
                      variant={newTransaction.transaction_type === 'deposit' ? 'default' : 'outline'}
                      onClick={() => setNewTransaction({...newTransaction, transaction_type: 'deposit'})}
                      className="flex-1"
                    >
                      Hozzáadás
                    </Button>
                    <Button
                      variant={newTransaction.transaction_type === 'withdrawal' ? 'default' : 'outline'}
                      onClick={() => setNewTransaction({...newTransaction, transaction_type: 'withdrawal'})}
                      className="flex-1"
                    >
                      Levonás
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Megjegyzés</label>
                  <Input
                    placeholder="Havi megtakarítás"
                    value={newTransaction.description}
                    onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={addTransaction} className="flex-1 bg-green-500 hover:bg-green-600">
                    Mentés
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setShowAddMoneyForm(false)
                    setSelectedGoal(null)
                  }}>
                    Mégse
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
