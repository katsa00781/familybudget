'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/utils/supabase/client'
import { getShoppingStatistics } from '@/lib/shoppingStatistics'
import type { SpendingStatistics } from '@/lib/shoppingStatistics'
import MonthlySpendingBreakdown from '@/components/MonthlySpendingBreakdown'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card'
import { Button } from '@/src/components/ui/button'
import { Badge } from '@/src/components/ui/badge'
import { 
  ShoppingCart, TrendingUp, Package, Store, Calendar, 
  AlertCircle, DollarSign, BarChart3, PieChart
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/src/components/ui/table'

interface User {
  id: string
  email?: string
}

export default function StatisztikaPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [statistics, setStatistics] = useState<SpendingStatistics | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [timeRange, setTimeRange] = useState<string>('all')
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('month')
  
  const supabase = createClient()

  // Felhasználó betöltése
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
    }
    getUser()
  }, [supabase.auth])

  // Calculate date range
  const getDateRange = useCallback(() => {
    const end = new Date()
    const start = new Date()
    
    switch (timeRange) {
      case '7':
        start.setDate(end.getDate() - 7)
        break
      case '30':
        start.setDate(end.getDate() - 30)
        break
      case '90':
        start.setDate(end.getDate() - 90)
        break
      case '180':
        start.setDate(end.getDate() - 180)
        break
      case '365':
        start.setFullYear(end.getFullYear() - 1)
        break
      case 'all':
        return { start: undefined, end: undefined }
    }
    
    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    }
  }, [timeRange])

  // Statisztikák betöltése
  const loadStatistics = useCallback(async () => {
    if (!currentUser) return
    
    try {
      setIsLoading(true)
      const { start, end } = getDateRange()
      const stats = await getShoppingStatistics(currentUser.id, start, end, groupBy)
      setStatistics(stats)
      console.log('Statistics loaded:', stats)
    } catch (error) {
      console.error('Hiba a statisztikák betöltésekor:', error)
      toast.error('Hiba történt a statisztikák betöltésekor!')
    } finally {
      setIsLoading(false)
    }
  }, [currentUser, groupBy, getDateRange])

  useEffect(() => {
    if (currentUser) {
      loadStatistics()
    }
  }, [currentUser, loadStatistics])

  // Format period for display
  const formatPeriod = (period: string) => {
    if (period.includes('W')) {
      const [year, week] = period.split('-W')
      return `${year} ${week}. hét`
    }
    const [year, month] = period.split('-')
    if (month) {
      return `${year}. ${month}.`
    }
    return period
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-teal-50 to-emerald-50 p-4 sm:p-6 lg:p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 via-teal-500/20 to-emerald-500/20 animate-gradient"></div>
        <Card className="max-w-md mx-auto mt-20 bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 rounded-2xl relative z-10">
          <CardHeader>
            <CardTitle>Jelentkezz be</CardTitle>
            <CardDescription>A statisztikákhoz be kell jelentkezned</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-teal-50 to-emerald-50 p-3 sm:p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 via-teal-500/20 to-emerald-500/20 animate-gradient"></div>
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 relative z-10">
        
        {/* Header */}
        <div className="mb-6 sm:mb-8 bg-white/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20">
          <div className="flex items-center gap-3 sm:gap-4 mb-4">
            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-3 sm:p-4 rounded-2xl shadow-lg animate-pulse-slow">
              <BarChart3 className="text-white" size={32} />
            </div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent tracking-tight">
              Kiadások Statisztika
            </h1>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed px-1 font-medium">
              Bevásárlások részletes elemzése
            </p>
            <Button 
              onClick={loadStatistics} 
              disabled={isLoading}
              className="bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 font-bold rounded-xl"
            >
              {isLoading ? 'Betöltés...' : 'Frissítés'}
            </Button>
          </div>
        </div>

        {/* Szűrők */}
        <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 hover:shadow-purple-500/20 hover:scale-[1.01] transition-all duration-300 rounded-2xl">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Időszak</label>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="h-11 sm:h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Utolsó 7 nap</SelectItem>
                    <SelectItem value="30">Utolsó 30 nap</SelectItem>
                    <SelectItem value="90">Utolsó 90 nap</SelectItem>
                    <SelectItem value="180">Utolsó 6 hónap</SelectItem>
                    <SelectItem value="365">Utolsó év</SelectItem>
                    <SelectItem value="all">Összes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Csoportosítás</label>
                <Select value={groupBy} onValueChange={(v) => setGroupBy(v as 'day' | 'week' | 'month')}>
                  <SelectTrigger className="h-11 sm:h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">Naponta</SelectItem>
                    <SelectItem value="week">Hetente</SelectItem>
                    <SelectItem value="month">Havonta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {!statistics || statistics.total_shoppings === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">Nincs adat az adott időszakban</p>
              <p className="text-sm text-gray-500 mt-2">Tölts fel bevásárlásokat JSON formátumban!</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Összesítő mutatók */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <Card className="bg-white/90 backdrop-blur-xl shadow-xl border border-white/20 hover:shadow-green-500/30 hover:scale-[1.05] transition-all duration-300 rounded-2xl">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Összes költés</p>
                      <p className="text-xl sm:text-2xl font-bold text-green-600">
                        {statistics.total_spent.toLocaleString('hu-HU')} Ft
                      </p>
                    </div>
                    <DollarSign className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-xl shadow-xl border border-white/20 hover:shadow-blue-500/30 hover:scale-[1.05] transition-all duration-300 rounded-2xl">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Bevásárlások</p>
                      <p className="text-xl sm:text-2xl font-bold">{statistics.total_shoppings}</p>
                    </div>
                    <ShoppingCart className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-xl shadow-xl border border-white/20 hover:shadow-purple-500/30 hover:scale-[1.05] transition-all duration-300 rounded-2xl">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Átlag/bevásárlás</p>
                      <p className="text-xl sm:text-2xl font-bold">
                        {statistics.avg_per_shopping.toLocaleString('hu-HU')} Ft
                      </p>
                    </div>
                    <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/90 backdrop-blur-xl shadow-xl border border-white/20 hover:shadow-orange-500/30 hover:scale-[1.05] transition-all duration-300 rounded-2xl">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs sm:text-sm text-gray-600">Termékek száma</p>
                      <p className="text-xl sm:text-2xl font-bold">{statistics.total_items}</p>
                    </div>
                    <Package className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Időbeli bontás */}
            <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 hover:shadow-indigo-500/20 transition-all duration-300 rounded-2xl">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Időbeli bontás
                </CardTitle>
                <CardDescription>Költések {groupBy === 'day' ? 'naponta' : groupBy === 'week' ? 'hetente' : 'havonta'}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Időszak</TableHead>
                        <TableHead className="text-right">Összeg</TableHead>
                        <TableHead className="text-right">Bevásárlások</TableHead>
                        <TableHead className="text-right">Termékek</TableHead>
                        <TableHead className="text-right">Átlag</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {statistics.by_time.map((period, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{formatPeriod(period.period)}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {period.total_amount.toLocaleString('hu-HU')} Ft
                          </TableCell>
                          <TableCell className="text-right">{period.shopping_count}</TableCell>
                          <TableCell className="text-right">{period.item_count}</TableCell>
                          <TableCell className="text-right">
                            {period.avg_per_shopping.toLocaleString('hu-HU')} Ft
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Kategóriák */}
            <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 hover:shadow-green-500/20 transition-all duration-300 rounded-2xl">
              <CardHeader className="p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Kategóriák szerint
                </CardTitle>
                <CardDescription>Kiadások termékkategóriánként</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="space-y-4">
                  {statistics.by_category.map((cat, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{cat.category}</span>
                          <Badge variant="outline">{cat.item_count} tétel</Badge>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-green-600">
                            {cat.total_spent.toLocaleString('hu-HU')} Ft
                          </span>
                          <span className="text-sm text-gray-500 ml-2">({cat.percentage.toFixed(1)}%)</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${cat.percentage}%` }}
                        />
                      </div>
                      <div className="text-sm text-gray-600">
                        Átlag ár: {cat.avg_item_price.toLocaleString('hu-HU')} Ft
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Top 10 termék */}
              <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 hover:shadow-purple-500/20 transition-all duration-300 rounded-2xl">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Top 10 termék
                  </CardTitle>
                  <CardDescription>Legtöbbet vásárolt termékek</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {statistics.by_product.slice(0, 10).map((product, index) => (
                      <div key={index} className="p-4 hover:bg-gray-50">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="font-medium">{product.product_name}</div>
                            <Badge variant="outline" className="mt-1">{product.category}</Badge>
                          </div>
                          <div className="text-right ml-3">
                            <div className="font-bold text-green-600">
                              {product.total_spent.toLocaleString('hu-HU')} Ft
                            </div>
                            <div className="text-xs text-gray-500">
                              {product.purchase_count}x vásárolva
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-4 text-sm text-gray-600">
                          <span>Mennyiség: {product.total_quantity} {product.product_name.includes('kg') ? 'kg' : 'db'}</span>
                          <span>Átlag: {product.avg_price.toLocaleString('hu-HU')} Ft</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Boltok szerint */}
              <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 hover:shadow-blue-500/20 transition-all duration-300 rounded-2xl">
                <CardHeader className="p-4 sm:p-6">
                  <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                    <Store className="h-5 w-5" />
                    Boltok szerint
                  </CardTitle>
                  <CardDescription>Költések boltonként</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {statistics.by_store.map((store, index) => (
                      <div key={index} className="p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              <Store className="h-4 w-4 text-gray-400" />
                              {store.store_name}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {store.shopping_count} bevásárlás
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-green-600">
                              {store.total_spent.toLocaleString('hu-HU')} Ft
                            </div>
                            <div className="text-xs text-gray-500">
                              Átlag: {store.avg_per_visit.toLocaleString('hu-HU')} Ft
                            </div>
                          </div>
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(store.first_visit).toLocaleDateString('hu-HU')} - {new Date(store.last_visit).toLocaleDateString('hu-HU')}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Havi bontás részletes táblázat */}
            <MonthlySpendingBreakdown 
              userId={currentUser.id}
              startDate={getDateRange().start}
              endDate={getDateRange().end}
            />
          </>
        )}

      </div>
    </div>
  )
}
