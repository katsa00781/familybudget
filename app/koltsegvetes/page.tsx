'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/utils/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card'
import { Input } from '@/src/components/ui/input'
import { Button } from '@/src/components/ui/button'
import { Separator } from '@/src/components/ui/separator'
import { Badge } from '@/src/components/ui/badge'
import { 
  Calculator, PiggyBank, Car, Home, Heart, 
  Gamepad2, TrendingUp, Wallet, CreditCard,
  Save, DollarSign, Target, Gift, Plus, X
} from 'lucide-react'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select'

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
}

interface SavedBudget {
  id: string
  user_id: string
  budget_data: BudgetItem[]
  total_amount: number
  created_at: string
}

interface User {
  id: string
  email?: string
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

export default function KoltsegvetesPage() {
  const [budgetData, setBudgetData] = useState<BudgetCategory[]>(createInitialBudgetData())
  const [savedBudgets, setSavedBudgets] = useState<SavedBudget[]>([])
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
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

    setIsLoading(true)
    try {
      const allItems = budgetData.flatMap(category => category.items)
      const { total } = calculateTotals()

      const { error } = await supabase
        .from('budget_plans')
        .insert({
          user_id: currentUser.id,
          budget_data: allItems,
          total_amount: total,
          created_at: new Date().toISOString()
        })

      if (error) throw error

      toast.success("Költségvetés sikeresen elmentve!")
      
      // Frissítjük a mentett költségvetések listáját
      loadSavedBudgets()
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
      const { data, error } = await supabase
        .from('budget_plans')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSavedBudgets(data || [])
    } catch (error: unknown) {
      console.error('Error loading budgets:', error)
    }
  }, [currentUser, supabase])

  useEffect(() => {
    if (currentUser) {
      loadSavedBudgets()
    }
  }, [currentUser, loadSavedBudgets])

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
    <div className="min-h-screen bg-gradient-to-br from-cyan-400 via-teal-500 to-green-500 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-white mb-6">
          <div className="flex items-center gap-3 mb-4">
            <PiggyBank className="text-white" size={32} />
            <h1 className="text-3xl font-bold">Költségvetés Tervező 2025</h1>
          </div>
          <p className="text-lg">
            Tervezd meg havi költségvetésedet kategóriák szerint és tartsd kézben a pénzügyeidet.
          </p>
        </div>

        {/* Összesítő kártyák */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="bg-white shadow-lg border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Calculator size={16} className="text-gray-600" />
                Összes költség
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(totals.total)}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-400 to-red-600 text-white shadow-lg border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-red-100 flex items-center gap-2">
                <Target size={16} className="text-red-100" />
                Szükségletek
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{formatCurrency(totals.szuksegletTotal)}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-lg border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-blue-100 flex items-center gap-2">
                <Gift size={16} className="text-blue-100" />
                Vágyak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{formatCurrency(totals.vagyakTotal)}</div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-400 to-green-600 text-white shadow-lg border-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-green-100 flex items-center gap-2">
                <PiggyBank size={16} className="text-green-100" />
                Megtakarítás
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{formatCurrency(totals.megtakaritasTotal)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Mentés gomb */}
        <div className="mb-6">
          <Button 
            onClick={saveBudget} 
            disabled={isLoading || !currentUser}
            className="bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white shadow-lg px-6 py-3 flex items-center gap-2"
          >
            <Save size={20} />
            {isLoading ? 'Mentés...' : 'Költségvetés Mentése'}
          </Button>
          {!currentUser && (
            <p className="text-sm text-white/80 mt-2">A mentéshez be kell jelentkezned!</p>
          )}
        </div>

        {/* Költségvetési táblázat */}
        <Card className="bg-white shadow-lg border-0">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard size={24} className="text-purple-600" />
              Költségvetési Tételek
            </CardTitle>
            <CardDescription>
              Módosítsd az összegeket a kategóriák szerint
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {budgetData.map((category, categoryIndex) => (
                <div key={category.name} className="border-2 border-gray-100 rounded-xl p-6 bg-gradient-to-r from-gray-50 to-gray-100">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-lg text-gray-900 flex items-center gap-3">
                      {getCategoryIcon(category.name)}
                      {category.name}
                    </h3>
                    <div className="flex items-center gap-4">
                      <div className="text-sm font-medium text-gray-600">
                        Kategória összesen: <span className="text-lg font-bold text-gray-900">{formatCurrency(getCategoryTotal(category))}</span>
                      </div>
                      <Button
                        onClick={() => addItem(categoryIndex)}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1 text-green-600 border-green-300 hover:bg-green-50"
                      >
                        <Plus size={16} />
                        Tétel hozzáadása
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {category.items.map((item, itemIndex) => (
                      <div key={item.id} className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center bg-white rounded-lg p-4 shadow-sm">
                        {/* Típus választó */}
                        <div className="flex items-center gap-2">
                          <Select value={item.type || "none"} onValueChange={(value) => updateItemType(categoryIndex, itemIndex, value === "none" ? '' : value as 'Szükséglet' | 'Vágyak' | 'Megtakarítás')}>
                            <SelectTrigger className="w-full">
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
                        
                        {/* Tétel neve (szerkeszthető) */}
                        <div className="md:col-span-2">
                          <Input
                            value={item.subcategory}
                            onChange={(e) => updateItemName(categoryIndex, itemIndex, e.target.value)}
                            className="font-medium text-gray-700 border-gray-300"
                            placeholder="Tétel neve"
                          />
                        </div>
                        
                        {/* Összeg */}
                        <div className="flex items-center gap-2">
                          <Input
                            type="text"
                            value={item.amount.toLocaleString('hu-HU')}
                            onChange={(e) => updateAmount(categoryIndex, itemIndex, e.target.value)}
                            className="text-right border-2 focus:border-green-400"
                            placeholder="0"
                          />
                          <span className="text-sm text-gray-500 font-medium">Ft</span>
                        </div>
                        
                        {/* Formázott összeg és törlés gomb */}
                        <div className="flex items-center justify-between">
                          <div className="text-right font-bold text-gray-900 text-lg">
                            {formatCurrency(item.amount)}
                          </div>
                          <Button
                            onClick={() => removeItem(categoryIndex, itemIndex)}
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 ml-2"
                          >
                            <X size={16} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <Separator className="my-6" />
            
            {/* Összesítő sor */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center bg-gradient-to-r from-green-50 to-teal-50 p-6 rounded-xl border-2 border-green-200">
              <div></div>
              <div className="font-bold text-lg flex items-center gap-2">
                <TrendingUp size={20} className="text-green-600" />
                Összesen:
              </div>
              <div></div>
              <div className="text-right font-bold text-2xl text-green-900">
                {formatCurrency(totals.total)}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mentett költségvetések */}
        {savedBudgets.length > 0 && (
          <Card className="mt-8 bg-white shadow-lg border-0">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Save size={24} className="text-green-600" />
                Mentett Költségvetések
              </CardTitle>
              <CardDescription>
                Korábban elmentett költségvetési terveid
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {savedBudgets.slice(0, 5).map((budget) => (
                  <div key={budget.id} className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                    <div>
                      <div className="font-medium text-gray-900">
                        {new Date(budget.created_at).toLocaleDateString('hu-HU', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    <div className="font-bold text-green-700 text-lg">
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
