'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/utils/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card'
import { Input } from '@/src/components/ui/input'
import { Button } from '@/src/components/ui/button'
import { Separator } from '@/src/components/ui/separator'
import { 
  TrendingUp, Plus, X, Save, Trash2, DollarSign
} from 'lucide-react'
import { toast } from 'sonner'

interface AdditionalIncome {
  id: string
  name: string
  amount: number
}

interface IncomePlan {
  id: string
  user_id: string
  name: string
  description?: string
  monthly_income: number
  additional_incomes: AdditionalIncome[]
  total_income: number
  created_at: string
  updated_at?: string
}

interface User {
  id: string
  email?: string
}

// Helper function to generate unique IDs
const generateId = () => Math.random().toString(36).substr(2, 9)

export default function BevetelTervekPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [planName, setPlanName] = useState('')
  const [planDescription, setPlanDescription] = useState('')
  const [monthlyIncome, setMonthlyIncome] = useState<number>(0)
  const [additionalIncomes, setAdditionalIncomes] = useState<AdditionalIncome[]>([])
  const [savedPlans, setSavedPlans] = useState<IncomePlan[]>([])
  const supabase = createClient()

  // Felhasználó betöltése
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
    }
    getUser()
  }, [supabase.auth])

  // Mentett bevételi tervek betöltése
  const loadSavedPlans = useCallback(async () => {
    if (!currentUser) return
    
    try {
      const { data, error } = await supabase
        .from('income_plans')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setSavedPlans(data || [])
    } catch (error) {
      console.error('Hiba a bevételi tervek betöltésekor:', error)
      toast.error('Hiba történt a bevételi tervek betöltésekor!')
    }
  }, [currentUser, supabase])

  // Betöltés amikor a felhasználó betöltődik
  useEffect(() => {
    if (currentUser) {
      loadSavedPlans()
    }
  }, [currentUser, loadSavedPlans])

  // Egyéb jövedelmi tételek kezelése
  const addAdditionalIncome = () => {
    const newIncome: AdditionalIncome = {
      id: generateId(),
      name: '',
      amount: 0
    }
    setAdditionalIncomes(prev => [...prev, newIncome])
  }

  const removeAdditionalIncome = (id: string) => {
    setAdditionalIncomes(prev => prev.filter(income => income.id !== id))
  }

  const updateAdditionalIncome = (id: string, field: 'name' | 'amount', value: string | number) => {
    setAdditionalIncomes(prev => prev.map(income => 
      income.id === id 
        ? { ...income, [field]: value }
        : income
    ))
  }

  // Teljes bevétel számítása
  const calculateTotal = () => {
    const additionalTotal = additionalIncomes.reduce((sum, income) => sum + income.amount, 0)
    return monthlyIncome + additionalTotal
  }

  // Bevételi terv mentése
  const savePlan = async () => {
    if (!currentUser) {
      toast.error('A mentéshez be kell jelentkezned!')
      return
    }

    if (!planName.trim()) {
      toast.error('Add meg a terv nevét!')
      return
    }

    if (monthlyIncome <= 0) {
      toast.error('Add meg az alapbevételt!')
      return
    }

    try {
      setIsLoading(true)
      
      const planData = {
        user_id: currentUser.id,
        name: planName.trim(),
        description: planDescription.trim() || null,
        monthly_income: monthlyIncome,
        additional_incomes: additionalIncomes,
        total_income: calculateTotal()
      }

      const { error } = await supabase
        .from('income_plans')
        .insert([planData])

      if (error) throw error

      toast.success('Bevételi terv sikeresen elmentve!')
      
      // Form reset
      setPlanName('')
      setPlanDescription('')
      setMonthlyIncome(0)
      setAdditionalIncomes([])
      
      // Újratöltés
      loadSavedPlans()
    } catch (error) {
      console.error('Hiba a mentéskor:', error)
      toast.error('Hiba történt a mentés során!')
    } finally {
      setIsLoading(false)
    }
  }

  // Bevételi terv törlése
  const deletePlan = async (id: string) => {
    if (!confirm('Biztosan törölni szeretnéd ezt a bevételi tervet?')) return

    try {
      const { error } = await supabase
        .from('income_plans')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast.success('Bevételi terv törölve!')
      loadSavedPlans()
    } catch (error) {
      console.error('Hiba a törlésnél:', error)
      toast.error('Hiba történt a törlés során!')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-400 via-teal-500 to-green-500 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-white mb-6">
          <div className="flex items-center gap-3 mb-4">
            <TrendingUp className="text-white" size={32} />
            <h1 className="text-3xl font-bold">Bevételi Tervek Kezelése</h1>
          </div>
          <p className="text-lg">
            Hozz létre és kezelj bevételi terveket a költségvetéseid pontosabb tervezéséhez.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Új bevételi terv létrehozása */}
          <div className="space-y-6">
            <Card className="bg-white shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus size={20} className="text-green-600" />
                  Új Bevételi Terv
                </CardTitle>
                <CardDescription>
                  Hozz létre egy új bevételi tervet az alapbevétellel és egyéb jövedelmekkel
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Terv neve */}
                  <div>
                    <label htmlFor="plan-name" className="block text-sm font-medium text-gray-700 mb-2">
                      Terv neve
                    </label>
                    <Input
                      id="plan-name"
                      value={planName}
                      onChange={(e) => setPlanName(e.target.value)}
                      placeholder={`Bevételi terv ${new Date().toLocaleDateString('hu-HU')}`}
                      className="w-full"
                    />
                  </div>

                  {/* Leírás */}
                  <div>
                    <label htmlFor="plan-description" className="block text-sm font-medium text-gray-700 mb-2">
                      Leírás (opcionális)
                    </label>
                    <Input
                      id="plan-description"
                      value={planDescription}
                      onChange={(e) => setPlanDescription(e.target.value)}
                      placeholder="Rövid leírás a bevételi tervről"
                      className="w-full"
                    />
                  </div>

                  {/* Alapbevétel */}
                  <div>
                    <label htmlFor="monthly-income" className="block text-sm font-medium text-gray-700 mb-2">
                      Havi alapbevétel (HUF)
                    </label>
                    <Input
                      id="monthly-income"
                      type="number"
                      value={monthlyIncome || ''}
                      onChange={(e) => setMonthlyIncome(parseInt(e.target.value) || 0)}
                      placeholder="350000"
                      className="w-full"
                    />
                  </div>

                  {/* Egyéb jövedelmek */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="block text-sm font-medium text-gray-700">
                        Egyéb jövedelmek
                      </label>
                      <Button
                        onClick={addAdditionalIncome}
                        variant="outline"
                        size="sm"
                        className="flex items-center gap-1"
                      >
                        <Plus size={16} />
                        Hozzáad
                      </Button>
                    </div>
                    
                    {additionalIncomes.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4 border border-dashed border-gray-300 rounded-lg">
                        Még nincsenek egyéb jövedelmek hozzáadva
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {additionalIncomes.map((income) => (
                          <div key={income.id} className="flex gap-2 items-center">
                            <Input
                              value={income.name}
                              onChange={(e) => updateAdditionalIncome(income.id, 'name', e.target.value)}
                              placeholder="Jövedelem neve"
                              className="flex-1"
                            />
                            <Input
                              type="number"
                              value={income.amount || ''}
                              onChange={(e) => updateAdditionalIncome(income.id, 'amount', parseInt(e.target.value) || 0)}
                              placeholder="Összeg"
                              className="w-32"
                            />
                            <Button
                              onClick={() => removeAdditionalIncome(income.id)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                            >
                              <X size={16} />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Összegzés */}
                  {(monthlyIncome > 0 || additionalIncomes.some(i => i.amount > 0)) && (
                    <div className="p-4 bg-gray-50 rounded-lg space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Alapbevétel:</span>
                        <span className="font-medium">{formatCurrency(monthlyIncome)}</span>
                      </div>
                      {additionalIncomes.filter(i => i.amount > 0).map((income) => (
                        <div key={income.id} className="flex justify-between text-sm">
                          <span className="text-gray-600">{income.name || 'Névtelen jövedelem'}:</span>
                          <span className="font-medium">{formatCurrency(income.amount)}</span>
                        </div>
                      ))}
                      <Separator />
                      <div className="flex justify-between font-bold text-green-600">
                        <span>Összes havi bevétel:</span>
                        <span>{formatCurrency(calculateTotal())}</span>
                      </div>
                    </div>
                  )}

                  {/* Mentés gomb */}
                  <Button 
                    onClick={savePlan} 
                    disabled={isLoading || !currentUser || !planName.trim() || monthlyIncome <= 0}
                    className="w-full bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white shadow-lg flex items-center gap-2"
                  >
                    <Save size={20} />
                    {isLoading ? 'Mentés...' : 'Bevételi Terv Mentése'}
                  </Button>
                  {!currentUser && (
                    <p className="text-sm text-gray-500 text-center">A mentéshez be kell jelentkezned!</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Mentett bevételi tervek */}
          <div>
            <Card className="bg-white shadow-lg border-0">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign size={20} className="text-blue-600" />
                  Mentett Bevételi Tervek
                </CardTitle>
                <CardDescription>
                  A korábban létrehozott bevételi terveid
                </CardDescription>
              </CardHeader>
              <CardContent>
                {savedPlans.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    Még nincsenek mentett bevételi tervek
                  </p>
                ) : (
                  <div className="space-y-4">
                    {savedPlans.map((plan) => (
                      <div key={plan.id} className="p-4 border border-gray-200 rounded-lg">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-gray-900">{plan.name}</h3>
                            {plan.description && (
                              <p className="text-sm text-gray-600">{plan.description}</p>
                            )}
                            <p className="text-xs text-gray-500">
                              Létrehozva: {new Date(plan.created_at).toLocaleDateString('hu-HU')}
                            </p>
                          </div>
                          <Button
                            onClick={() => deletePlan(plan.id)}
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Alapbevétel:</span>
                            <span className="font-medium">{formatCurrency(plan.monthly_income)}</span>
                          </div>
                          
                          {plan.additional_incomes && plan.additional_incomes.length > 0 && (
                            <>
                              {plan.additional_incomes.map((income) => (
                                <div key={income.id} className="flex justify-between text-sm">
                                  <span className="text-gray-600">{income.name}:</span>
                                  <span className="font-medium">{formatCurrency(income.amount)}</span>
                                </div>
                              ))}
                            </>
                          )}
                          
                          <Separator />
                          <div className="flex justify-between font-bold text-green-600">
                            <span>Összes bevétel:</span>
                            <span>{formatCurrency(plan.total_income)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
