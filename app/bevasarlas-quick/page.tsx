'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/utils/supabase/client'
import { savePriceHistory } from '@/lib/priceHistory'
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card'
import { Button } from '@/src/components/ui/button'
import { Checkbox } from '@/src/components/ui/checkbox'
import { ShoppingCart, CheckCircle2, X, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface ShoppingItem {
  id: string
  name: string
  quantity: number
  unit: string
  price?: number
  category: string
  checked: boolean
}

interface ShoppingList {
  id: string
  user_id: string
  name: string
  date: string
  items: ShoppingItem[]
  total_amount: number
  completed: boolean
  created_at: string
}

interface User {
  id: string
  email?: string
}

export default function QuickShoppingPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [activeList, setActiveList] = useState<ShoppingList | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Felhasználó betöltése
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
    }
    getUser()
  }, [supabase.auth])

  // Aktív lista betöltése
  const loadActiveList = useCallback(async () => {
    if (!currentUser) return

    try {
      setIsLoading(true)

      const { data, error } = await supabase
        .from('shopping_lists')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('completed', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error) {
        if (error.code === 'PGRST116') {
          // Nincs aktív lista
          setActiveList(null)
          return
        }
        throw error
      }

      setActiveList(data)
    } catch (error) {
      console.error('Hiba a lista betöltésekor:', error)
    } finally {
      setIsLoading(false)
    }
  }, [currentUser, supabase])

  useEffect(() => {
    if (currentUser) {
      loadActiveList()
    }
  }, [currentUser, loadActiveList])

  // Tétel kipipálása
  const toggleItem = async (itemId: string) => {
    if (!activeList) return

    const updatedItems = activeList.items.map(item =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    )

    setActiveList({ ...activeList, items: updatedItems })

    // Mentés az adatbázisba
    try {
      await supabase
        .from('shopping_lists')
        .update({ items: updatedItems })
        .eq('id', activeList.id)
    } catch (error) {
      console.error('Hiba a mentéskor:', error)
    }
  }

  // Bevásárlás befejezése
  const completeList = async () => {
    if (!activeList || !currentUser) return

    try {
      setIsCompleting(true)

      // 1. Lista befejezettnek jelölése
      const { error: updateError } = await supabase
        .from('shopping_lists')
        .update({ completed: true })
        .eq('id', activeList.id)

      if (updateError) throw updateError

      // 2. Statisztikák mentése - csak a kipipált, áras tételekhez
      const completedItems = activeList.items.filter(item => item.checked && item.price && item.price > 0)
      
      if (completedItems.length > 0) {
        const currentDate = new Date().toISOString().split('T')[0]

        // Shopping statistics mentése
        const shoppingStatsData = completedItems.map(item => ({
          user_id: currentUser.id,
          shopping_date: currentDate,
          product_name: item.name,
          product_category: item.category,
          brand: null,
          store_name: null,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.price,
          total_price: (item.price || 0) * item.quantity,
          source: 'list'
        }))

        const { error: statsError } = await supabase
          .from('shopping_statistics')
          .insert(shoppingStatsData)

        if (statsError) {
          console.error('⚠️ Shopping statistics mentési hiba:', statsError)
        }

        // Price history mentése
        const priceHistoryPromises = completedItems.map(item =>
          savePriceHistory(
            currentUser.id,
            item.name,
            item.price!,
            {
              productCategory: item.category,
              unit: item.unit,
              quantity: item.quantity,
              totalPrice: (item.price || 0) * item.quantity,
              source: 'list',
              priceDate: currentDate
            }
          )
        )

        await Promise.allSettled(priceHistoryPromises)
      }

      toast.success('Bevásárlás befejezve! ✅')
      
      // Vissza a főoldalra
      setTimeout(() => {
        router.push('/')
      }, 1000)

    } catch (error) {
      console.error('Hiba a befejezéskor:', error)
      toast.error('Hiba történt a befejezés során!')
    } finally {
      setIsCompleting(false)
    }
  }

  const checkedCount = activeList?.items.filter(item => item.checked).length || 0
  const totalCount = activeList?.items.length || 0
  const progress = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-6">
        <Card className="max-w-md mx-auto mt-20">
          <CardContent className="p-6 text-center">
            <p className="text-gray-600">Jelentkezz be a bevásárláshoz!</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-6">
        <Card className="max-w-2xl mx-auto mt-20">
          <CardContent className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-3 text-gray-600">Betöltés...</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!activeList) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-6">
        <Card className="max-w-2xl mx-auto mt-20">
          <CardContent className="p-12 text-center">
            <ShoppingCart className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Nincs aktív bevásárlólista</h2>
            <p className="text-gray-600 mb-6">Hozz létre egy új listát a bevásárlás menüpontban</p>
            <div className="flex gap-3 justify-center">
              <Button onClick={() => router.push('/')} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Vissza
              </Button>
              <Button onClick={() => router.push('/bevasarlas')} className="bg-blue-600 hover:bg-blue-700">
                <ShoppingCart className="mr-2 h-4 w-4" />
                Lista készítése
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto space-y-4">
        
        {/* Fejléc */}
        <div className="flex items-center justify-between">
          <Button
            onClick={() => router.push('/')}
            variant="ghost"
            className="text-gray-600"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Vissza
          </Button>
          <div className="text-sm text-gray-600">
            {new Date(activeList.date).toLocaleDateString('hu-HU')}
          </div>
        </div>

        {/* Fő kártya */}
        <Card className="shadow-xl">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-xl">
                <ShoppingCart className="h-6 w-6 text-blue-600" />
                {activeList.name}
              </CardTitle>
              <div className="text-sm text-gray-600 font-medium">
                {checkedCount}/{totalCount}
              </div>
            </div>
            
            {/* Progress bar */}
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-600 mb-1">
                <span>Előrehaladás</span>
                <span>{progress}%</span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* TODO Lista */}
            <div className="divide-y">
              {activeList.items.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 hover:bg-gray-50 transition-colors ${
                    item.checked ? 'opacity-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Checkbox
                      checked={item.checked}
                      onCheckedChange={() => toggleItem(item.id)}
                      className="h-5 w-5"
                    />
                    <div className="flex-1">
                      <div className={`font-medium ${item.checked ? 'line-through text-gray-500' : ''}`}>
                        {item.name}
                      </div>
                      <div className="text-sm text-gray-500 mt-0.5">
                        {item.quantity} {item.unit}
                        {item.price && ` • ${item.price.toLocaleString('hu-HU')} Ft`}
                        {item.category && ` • ${item.category}`}
                      </div>
                    </div>
                    {item.checked && (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Összesítő */}
            {activeList.total_amount > 0 && (
              <div className="p-4 bg-blue-50 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">Becsült összeg:</span>
                  <span className="text-xl font-bold text-blue-600">
                    {activeList.total_amount.toLocaleString('hu-HU')} Ft
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Befejezés gomb */}
        <div className="flex gap-3">
          <Button
            onClick={() => router.push('/bevasarlas')}
            variant="outline"
            className="flex-1"
          >
            <X className="mr-2 h-4 w-4" />
            Mégsem
          </Button>
          <Button
            onClick={completeList}
            disabled={isCompleting || checkedCount === 0}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white"
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {isCompleting ? 'Befejezés...' : 'Bevásárlás kész'}
          </Button>
        </div>

        {checkedCount === 0 && (
          <p className="text-center text-sm text-gray-500">
            Pipálj ki legalább egy tételt a befejezéshez
          </p>
        )}
      </div>
    </div>
  )
}
