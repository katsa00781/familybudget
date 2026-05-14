'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/utils/supabase/client'
import { getPriceChanges, getProductPriceHistory, savePriceHistory } from '@/lib/priceHistory'
import type { PriceChange, ProductPriceHistory } from '@/types/enhanced'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card'
import { Button } from '@/src/components/ui/button'
import { Badge } from '@/src/components/ui/badge'
import { 
  TrendingUp, TrendingDown, Package, Store, AlertCircle
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/src/components/ui/dialog'

interface User {
  id: string
  email?: string
}

export default function ArfigyelesPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [priceChanges, setPriceChanges] = useState<PriceChange[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [timeRange, setTimeRange] = useState<string>('30')
  const [filterType, setFilterType] = useState<string>('all') // all, increase, decrease
  const [sortBy, setSortBy] = useState<string>('date') // percent, amount, date
  
  const [showHistoryDialog, setShowHistoryDialog] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<string>('')
  const [priceHistory, setPriceHistory] = useState<ProductPriceHistory[]>([])
  
  const supabase = createClient()

  // Felhasználó betöltése
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)
    }
    getUser()
  }, [supabase.auth])

  // Árváltozások betöltése
  const loadPriceChanges = useCallback(async () => {
    if (!currentUser) return
    
    try {
      setIsLoading(true)
      const changes = await getPriceChanges(currentUser.id, parseInt(timeRange))
      setPriceChanges(changes)
      console.log('Price changes loaded:', changes.length)
    } catch (error) {
      console.error('Hiba az árváltozások betöltésekor:', error)
      toast.error('Hiba történt az árváltozások betöltésekor!')
    } finally {
      setIsLoading(false)
    }
  }, [currentUser, timeRange])

  useEffect(() => {
    if (currentUser) {
      loadPriceChanges()
    }
  }, [currentUser, loadPriceChanges])

  // Szűrt és rendezett változások
  const filteredAndSortedChanges = priceChanges
    .filter(change => {
      if (filterType === 'increase') return change.price_change_percent > 0
      if (filterType === 'decrease') return change.price_change_percent < 0
      return true
    })
    .sort((a, b) => {
      if (sortBy === 'percent') {
        return Math.abs(b.price_change_percent) - Math.abs(a.price_change_percent)
      } else if (sortBy === 'amount') {
        return Math.abs(b.price_difference) - Math.abs(a.price_difference)
      } else {
        return new Date(b.new_date).getTime() - new Date(a.new_date).getTime()
      }
    })

  // Statisztikák
  const totalChanges = priceChanges.length
  const increases = priceChanges.filter(c => c.price_change_percent > 0).length
  const decreases = priceChanges.filter(c => c.price_change_percent < 0).length
  const avgChange = priceChanges.length > 0
    ? priceChanges.reduce((sum, c) => sum + c.price_change_percent, 0) / priceChanges.length
    : 0

  // Terméktörténet megnyitása
  const openHistory = async (productName: string) => {
    if (!currentUser) return
    
    try {
      setSelectedProduct(productName)
      const history = await getProductPriceHistory(currentUser.id, productName)
      setPriceHistory(history)
      setShowHistoryDialog(true)
    } catch (error) {
      console.error('Hiba a terméktörténet betöltésekor:', error)
      toast.error('Hiba történt a terméktörténet betöltésekor!')
    }
  }

  // Teszt adatok generálása
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
          date.setDate(date.getDate() - (product.prices.length - i - 1) * 7) // Heti adatok
          
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
      
      await loadPriceChanges()
    } catch (error) {
      console.error('Hiba a teszt adatok generálásakor:', error)
      toast.error('Hiba történt a teszt adatok generálásakor!')
    } finally {
      setIsLoading(false)
    }
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-teal-50 to-emerald-50 p-4 sm:p-6 lg:p-8 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 via-teal-500/20 to-emerald-500/20 animate-gradient"></div>
        <Card className="max-w-md mx-auto mt-20 bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 rounded-2xl relative z-10">
          <CardHeader>
            <CardTitle>Jelentkezz be</CardTitle>
            <CardDescription>Az árfigyeléshez be kell jelentkezned</CardDescription>
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
            <div className="bg-gradient-to-br from-orange-500 to-red-600 p-3 sm:p-4 rounded-2xl shadow-lg animate-pulse-slow">
              <TrendingUp className="text-white" size={32} />
            </div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-orange-600 via-red-600 to-pink-600 bg-clip-text text-transparent tracking-tight">
              Árfigyelés
            </h1>
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <p className="text-sm sm:text-base lg:text-lg text-gray-600 leading-relaxed px-1 font-medium">
              Kövesd nyomon a termékek árváltozásait
            </p>
            <div className="flex gap-2">
              <Button 
                onClick={loadPriceChanges} 
                disabled={isLoading} 
                variant="outline"
                className="bg-gradient-to-r from-orange-50 to-red-50 hover:from-orange-100 hover:to-red-100 border-2 border-orange-300 text-orange-700 font-semibold shadow-md hover:shadow-lg transition-all duration-200 rounded-xl"
              >
                {isLoading ? 'Betöltés...' : 'Frissítés'}
              </Button>
              {priceChanges.length === 0 && (
                <Button 
                  onClick={generateTestData} 
                  disabled={isLoading}
                  className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 font-bold rounded-xl"
                >
                  Teszt adatok generálása
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Főbb mutatók */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="bg-white/90 backdrop-blur-xl shadow-xl border border-white/20 hover:shadow-blue-500/30 hover:scale-[1.05] transition-all duration-300 rounded-2xl">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Összes változás</p>
                  <p className="text-xl sm:text-2xl font-bold">{totalChanges}</p>
                </div>
                <Package className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Drágulások</p>
                  <p className="text-xl sm:text-2xl font-bold text-red-600">{increases}</p>
                </div>
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/90 backdrop-blur-xl shadow-xl border border-white/20 hover:shadow-green-500/30 hover:scale-[1.05] transition-all duration-300 rounded-2xl">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Olcsóbbá vált</p>
                  <p className="text-xl sm:text-2xl font-bold text-green-600">{decreases}</p>
                </div>
                <TrendingDown className="h-6 w-6 sm:h-8 sm:w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-gray-600">Átlagos változás</p>
                  <p className={`text-xl sm:text-2xl font-bold ${avgChange > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {avgChange > 0 ? '+' : ''}{avgChange.toFixed(1)}%
                  </p>
                </div>
                <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 text-gray-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Szűrők */}
        <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 hover:shadow-orange-500/20 hover:scale-[1.01] transition-all duration-300 rounded-2xl">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Időszak</label>
                <Select value={timeRange} onValueChange={setTimeRange}>
                  <SelectTrigger className="h-11 sm:h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 nap</SelectItem>
                    <SelectItem value="14">14 nap</SelectItem>
                    <SelectItem value="30">30 nap</SelectItem>
                    <SelectItem value="60">60 nap</SelectItem>
                    <SelectItem value="90">90 nap</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Típus</label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="h-11 sm:h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Összes</SelectItem>
                    <SelectItem value="increase">Drágulások</SelectItem>
                    <SelectItem value="decrease">Olcsóbbá vált</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1">
                <label className="text-sm font-medium mb-1 block">Rendezés</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="h-11 sm:h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Százalék szerint</SelectItem>
                    <SelectItem value="amount">Összeg szerint</SelectItem>
                    <SelectItem value="date">Dátum szerint</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Árváltozások listája */}
        <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 hover:shadow-red-500/20 transition-all duration-300 rounded-2xl">
          <CardHeader className="p-4 sm:p-6">
            <CardTitle className="text-base sm:text-lg">Árváltozások</CardTitle>
            <CardDescription>{filteredAndSortedChanges.length} változás</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {filteredAndSortedChanges.length === 0 ? (
              <div className="text-center py-12 px-4">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">Nincs árváltozás ebben az időszakban</p>
              </div>
            ) : (
              <>
                {/* Mobile layout */}
                <div className="lg:hidden divide-y">
                  {filteredAndSortedChanges.map((change, index) => (
                    <div key={index} className="p-4 hover:bg-gray-50 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <Package className="h-5 w-5 text-gray-400 flex-shrink-0" />
                          <span className="font-semibold text-gray-900 truncate">{change.product_name}</span>
                        </div>
                        <Badge className={`ml-2 ${change.price_change_percent > 0 ? 'bg-red-500' : 'bg-green-500'}`}>
                          {change.price_change_percent > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                          {change.price_change_percent > 0 ? '+' : ''}{change.price_change_percent.toFixed(1)}%
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-gray-500">Régi ár:</p>
                          <p className="font-medium">{change.old_price.toLocaleString('hu-HU')} Ft</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Új ár:</p>
                          <p className="font-medium">{change.new_price.toLocaleString('hu-HU')} Ft</p>
                        </div>
                        <div>
                          <p className="text-gray-500">Változás:</p>
                          <p className={`font-medium ${change.price_difference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {change.price_difference > 0 ? '+' : ''}{change.price_difference.toLocaleString('hu-HU')} Ft
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Dátum:</p>
                          <p className="font-medium text-xs">
                            {new Date(change.old_date).toLocaleDateString('hu-HU')} → {new Date(change.new_date).toLocaleDateString('hu-HU')}
                          </p>
                        </div>
                      </div>
                      
                      {change.product_category && (
                        <div className="flex gap-2">
                          <Badge variant="outline">{change.product_category}</Badge>
                        </div>
                      )}
                      
                      {change.store_name && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Store className="h-4 w-4" />
                          {change.store_name}
                        </div>
                      )}
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full h-11"
                        onClick={() => openHistory(change.product_name)}
                      >
                        Teljes történet
                      </Button>
                    </div>
                  ))}
                </div>

                {/* Desktop layout */}
                <div className="hidden lg:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="p-3 text-left font-semibold">Termék</th>
                        <th className="p-3 text-left font-semibold">Kategória</th>
                        <th className="p-3 text-right font-semibold">Régi ár</th>
                        <th className="p-3 text-right font-semibold">Új ár</th>
                        <th className="p-3 text-right font-semibold">Különbség</th>
                        <th className="p-3 text-right font-semibold">Változás %</th>
                        <th className="p-3 text-left font-semibold">Dátum</th>
                        <th className="p-3 text-left font-semibold">Műveletek</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredAndSortedChanges.map((change, index) => (
                        <tr key={index} className="border-b hover:bg-gray-50">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <Package className="h-4 w-4 text-gray-400" />
                              <span className="font-medium">{change.product_name}</span>
                            </div>
                          </td>
                          <td className="p-3">
                            {change.product_category ? <Badge variant="outline">{change.product_category}</Badge> : '-'}
                          </td>
                          <td className="p-3 text-right">{change.old_price.toLocaleString('hu-HU')} Ft</td>
                          <td className="p-3 text-right">{change.new_price.toLocaleString('hu-HU')} Ft</td>
                          <td className="p-3 text-right">
                            <span className={change.price_difference > 0 ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
                              {change.price_difference > 0 ? '+' : ''}{change.price_difference.toLocaleString('hu-HU')} Ft
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <Badge className={`${change.price_change_percent > 0 ? 'bg-red-500' : 'bg-green-500'}`}>
                              {change.price_change_percent > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                              {change.price_change_percent > 0 ? '+' : ''}{change.price_change_percent.toFixed(1)}%
                            </Badge>
                          </td>
                          <td className="p-3 text-sm text-gray-600">
                            {new Date(change.new_date).toLocaleDateString('hu-HU')}
                          </td>
                          <td className="p-3">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => openHistory(change.product_name)}
                            >
                              Történet
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Price History Dialog */}
        <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {selectedProduct} - Ártörténet
              </DialogTitle>
              <DialogDescription>
                Teljes árelőzmények a termékhez
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {priceHistory.length === 0 ? (
                <div className="text-center py-8">
                  <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Nincs ártörténet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {priceHistory.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">{entry.unit_price.toLocaleString('hu-HU')} Ft</p>
                        <p className="text-sm text-gray-600">{new Date(entry.price_date).toLocaleDateString('hu-HU')}</p>
                        {entry.store_name && (
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <Store className="h-3 w-3" />
                            {entry.store_name}
                          </p>
                        )}
                      </div>
                      {index < priceHistory.length - 1 && (
                        <Badge className={entry.unit_price > priceHistory[index + 1].unit_price ? 'bg-red-500' : 'bg-green-500'}>
                          {entry.unit_price > priceHistory[index + 1].unit_price ? <TrendingUp className="h-3 w-3 mr-1" /> : <TrendingDown className="h-3 w-3 mr-1" />}
                          {entry.unit_price > priceHistory[index + 1].unit_price ? '+' : ''}
                          {((entry.unit_price - priceHistory[index + 1].unit_price) / priceHistory[index + 1].unit_price * 100).toFixed(1)}%
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </div>
  )
}
