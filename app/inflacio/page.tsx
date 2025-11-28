'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/utils/supabase/client'
import { getInflationData, savePriceHistory } from '@/lib/priceHistory'
import type { InflationData } from '@/types/enhanced'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card'
import { Button } from '@/src/components/ui/button'
import { Badge } from '@/src/components/ui/badge'
import { 
  TrendingUp, TrendingDown, Percent, Calendar, BarChart3, 
  AlertCircle, Package
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select'

interface User {
  id: string
  email?: string
}

export default function InflacioPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [inflationData, setInflationData] = useState<InflationData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [timeRange, setTimeRange] = useState<string>('12')
  
  const supabase = createClient()

  // Felhasználó betöltése
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
    }
    getUser()
  }, [supabase.auth])

  // Inflációs adatok betöltése
  const loadInflationData = useCallback(async () => {
    if (!currentUser) return
    
    try {
      setIsLoading(true)
      const data = await getInflationData(currentUser.id, parseInt(timeRange))
      setInflationData(data)
      console.log('Inflation data loaded:', data.length)
    } catch (error) {
      console.error('Hiba az inflációs adatok betöltésekor:', error)
      toast.error('Hiba történt az inflációs adatok betöltésekor!')
    } finally {
      setIsLoading(false)
    }
  }, [currentUser, timeRange])

  useEffect(() => {
    if (currentUser) {
      loadInflationData()
    }
  }, [currentUser, loadInflationData])

  // Teszt adatok generálása (ugyanaz mint az árfigyelésnél)
  const generateTestData = async () => {
    if (!currentUser) return
    
    setIsLoading(true)
    try {
      const testProducts = [
        { name: 'Tej 1L', category: 'Tejtermékek', prices: [450, 460, 470, 485] },
        { name: 'Kenyér', category: 'Pékáru', prices: [380, 380, 390, 400] },
        { name: 'Tojás 10db', category: 'Tojás', prices: [650, 680, 720, 750] },
        { name: 'Alma 1kg', category: 'Zöldség-gyümölcs', prices: [550, 520, 580, 600] },
        { name: 'Csirkemell 1kg', category: 'Hús', prices: [1800, 1850, 1900, 1950] },
      ]

      const today = new Date()
      let successCount = 0
      let failCount = 0

      for (const product of testProducts) {
        for (let i = 0; i < product.prices.length; i++) {
          const date = new Date(today)
          date.setMonth(date.getMonth() - (product.prices.length - i - 1)) // Havi adatok
          
          const result = await savePriceHistory(
            currentUser.id,
            product.name,
            product.prices[i],
            {
              productCategory: product.category,
              unit: 'db',
              quantity: 1,
              totalPrice: product.prices[i],
              priceDate: date.toISOString().split('T')[0],
              source: 'manual'
            }
          )

          if (result.success) {
            successCount++
          } else {
            failCount++
            console.error('Failed to save price:', result.error)
          }
        }
      }

      if (failCount === 0) {
        toast.success(`Teszt adatok sikeresen generálva! (${successCount} ár mentve)`)
      } else {
        toast.warning(`${successCount} ár mentve, ${failCount} hiba történt`)
      }
      
      await loadInflationData()
    } catch (error) {
      console.error('Hiba a teszt adatok generálásakor:', error)
      toast.error('Hiba történt a teszt adatok generálásakor!')
    } finally {
      setIsLoading(false)
    }
  }

  // Átlagos infláció számítása
  const avgInflation = inflationData.length > 0
    ? inflationData.reduce((sum, d) => sum + d.avg_price_change_percent, 0) / inflationData.length
    : 0

  // Legutóbbi hónap
  const latestMonth = inflationData.length > 0 ? inflationData[inflationData.length - 1] : null

  // Legmagasabb infláció
  const maxInflation = inflationData.length > 0
    ? Math.max(...inflationData.map(d => d.avg_price_change_percent))
    : 0

  // Kategóriák összesítése
  const categoryTotals: { [key: string]: { total: number; count: number } } = {}
  inflationData.forEach(month => {
    Object.entries(month.categories).forEach(([category, data]) => {
      if (!categoryTotals[category]) {
        categoryTotals[category] = { total: 0, count: 0 }
      }
      categoryTotals[category].total += data.avg_price_change
      categoryTotals[category].count += 1
    })
  })

  const categoryAverages = Object.entries(categoryTotals)
    .map(([category, data]) => ({
      category,
      avgChange: data.total / data.count
    }))
    .sort((a, b) => Math.abs(b.avgChange) - Math.abs(a.avgChange))

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4 sm:p-6 lg:p-8">
        <Card className="max-w-md mx-auto mt-20">
          <CardHeader>
            <CardTitle>Jelentkezz be</CardTitle>
            <CardDescription>Az infláció követéshez be kell jelentkezned</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-3 sm:p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
              Személyes Infláció
            </h1>
            <p className="text-sm sm:text-base text-gray-600 mt-1">
              Kövesd nyomon a saját bevásárlásaid árváltozásait
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="3">3 hónap</SelectItem>
                <SelectItem value="6">6 hónap</SelectItem>
                <SelectItem value="12">12 hónap</SelectItem>
                <SelectItem value="24">24 hónap</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              onClick={loadInflationData} 
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? 'Betöltés...' : 'Frissítés'}
            </Button>
            {inflationData.length === 0 && (
              <Button onClick={generateTestData} disabled={isLoading}>
                Teszt adatok
              </Button>
            )}
          </div>
        </div>

        {/* Főbb mutatók */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Átlagos infláció</p>
                  <p className={`text-xl sm:text-2xl font-bold ${avgInflation > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {avgInflation > 0 ? '+' : ''}{avgInflation.toFixed(1)}%
                  </p>
                </div>
                <Percent className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Legutóbbi hónap</p>
                  <p className={`text-xl sm:text-2xl font-bold ${latestMonth && latestMonth.avg_price_change_percent > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {latestMonth ? `${latestMonth.avg_price_change_percent > 0 ? '+' : ''}${latestMonth.avg_price_change_percent.toFixed(1)}%` : '0%'}
                  </p>
                </div>
                <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Legmagasabb</p>
                  <p className="text-xl sm:text-2xl font-bold text-red-600">
                    +{maxInflation.toFixed(1)}%
                  </p>
                </div>
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Vizsgált hónapok</p>
                  <p className="text-xl sm:text-2xl font-bold">{inflationData.length}</p>
                </div>
                <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {inflationData.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nincs elég adat az infláció számításához</p>
              <p className="text-sm text-gray-500 mt-2">Legalább 2 hónap ár adatra van szükség</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Havi bontás */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Havi bontás</CardTitle>
                <CardDescription>Árváltozások hónapról hónapra</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {inflationData.map((month, index) => (
                    <div key={index} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <Calendar className="h-5 w-5 text-gray-400" />
                          <span className="font-medium">{month.period}</span>
                          <Badge variant="outline" className="text-xs">
                            {month.total_items} termék
                          </Badge>
                        </div>
                        <Badge className={`${month.avg_price_change_percent > 0 ? 'bg-red-500' : 'bg-green-500'}`}>
                          {month.avg_price_change_percent > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                          {month.avg_price_change_percent > 0 ? '+' : ''}{month.avg_price_change_percent.toFixed(1)}%
                        </Badge>
                      </div>
                      
                      {/* Kategóriák */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 mt-3">
                        {Object.entries(month.categories).map(([category, data]) => (
                          <div key={category} className="bg-gray-50 rounded px-2 py-1">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-gray-600 truncate">{category}</span>
                              <span className={`text-xs font-medium ml-1 ${data.avg_price_change > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {data.avg_price_change > 0 ? '+' : ''}{data.avg_price_change.toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Kategóriánkénti összesítés */}
            <Card>
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Kategóriánkénti átlagok</CardTitle>
                <CardDescription>Mely kategóriák drágultak/olcsóbbá váltak a legjobban</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-3">
                  {categoryAverages.map((cat, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <Package className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="text-sm font-medium truncate">{cat.category}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-32 sm:w-48 bg-gray-200 rounded-full h-2">
                          <div 
                            className={`h-2 rounded-full ${cat.avgChange > 0 ? 'bg-red-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(Math.abs(cat.avgChange) * 5, 100)}%` }}
                          />
                        </div>
                        <span className={`text-sm font-bold w-16 text-right ${cat.avgChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {cat.avgChange > 0 ? '+' : ''}{cat.avgChange.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}

      </div>
    </div>
  )
}
