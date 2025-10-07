'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/utils/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/src/components/ui/card'
import { ChevronDown, ChevronRight, Calendar, ShoppingCart, Package } from 'lucide-react'
import { Button } from '@/src/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/src/components/ui/table'

interface ShoppingItem {
  id: string
  shopping_date: string
  product_name: string
  product_category: string | null
  brand: string | null
  store_name: string | null
  quantity: number
  unit: string
  unit_price: number
  total_price: number
  source: string
}

interface DailyPurchase {
  date: string
  totalAmount: number
  itemCount: number
  items: ShoppingItem[]
}

interface MonthlyData {
  month: string // YYYY-MM
  totalAmount: number
  purchaseCount: number
  itemCount: number
  dailyPurchases: DailyPurchase[]
}

interface MonthlySpendingBreakdownProps {
  userId: string
  startDate?: string
  endDate?: string
  className?: string
}

const MonthlySpendingBreakdown: React.FC<MonthlySpendingBreakdownProps> = ({
  userId,
  startDate,
  endDate,
  className = ''
}) => {
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set())
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const loadMonthlyData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      let query = supabase
        .from('shopping_statistics')
        .select('*')
        .eq('user_id', userId)
        .order('shopping_date', { ascending: false })

      if (startDate) {
        query = query.gte('shopping_date', startDate)
      }
      if (endDate) {
        query = query.lte('shopping_date', endDate)
      }

      const { data, error: fetchError } = await query

      if (fetchError) throw fetchError

      if (!data || data.length === 0) {
        setMonthlyData([])
        return
      }

      // Csoportosítás hónapok szerint
      const monthMap = new Map<string, ShoppingItem[]>()
      
      data.forEach(item => {
        const month = item.shopping_date.substring(0, 7) // YYYY-MM
        if (!monthMap.has(month)) {
          monthMap.set(month, [])
        }
        monthMap.get(month)!.push(item)
      })

      // Havi adatok összeállítása
      const monthlyArray: MonthlyData[] = []

      monthMap.forEach((items, month) => {
        // Csoportosítás napok szerint
        const dayMap = new Map<string, ShoppingItem[]>()
        
        items.forEach(item => {
          const date = item.shopping_date
          if (!dayMap.has(date)) {
            dayMap.set(date, [])
          }
          dayMap.get(date)!.push(item)
        })

        // Napi vásárlások összeállítása
        const dailyPurchases: DailyPurchase[] = []
        dayMap.forEach((dayItems, date) => {
          dailyPurchases.push({
            date,
            totalAmount: dayItems.reduce((sum, item) => sum + item.total_price, 0),
            itemCount: dayItems.length,
            items: dayItems.sort((a, b) => a.product_name.localeCompare(b.product_name))
          })
        })

        // Rendezés dátum szerint (legújabb először)
        dailyPurchases.sort((a, b) => b.date.localeCompare(a.date))

        monthlyArray.push({
          month,
          totalAmount: items.reduce((sum, item) => sum + item.total_price, 0),
          purchaseCount: dayMap.size,
          itemCount: items.length,
          dailyPurchases
        })
      })

      // Rendezés hónap szerint (legújabb először)
      monthlyArray.sort((a, b) => b.month.localeCompare(a.month))

      setMonthlyData(monthlyArray)
    } catch (err) {
      console.error('Error loading monthly data:', err)
      setError('Hiba történt az adatok betöltésekor')
    } finally {
      setIsLoading(false)
    }
  }, [userId, startDate, endDate, supabase])

  useEffect(() => {
    loadMonthlyData()
  }, [loadMonthlyData])

  const toggleMonth = (month: string) => {
    const newExpanded = new Set(expandedMonths)
    if (newExpanded.has(month)) {
      newExpanded.delete(month)
      // Összes nap bezárása ebben a hónapban
      const newExpandedDays = new Set(expandedDays)
      monthlyData.find(m => m.month === month)?.dailyPurchases.forEach(d => {
        newExpandedDays.delete(d.date)
      })
      setExpandedDays(newExpandedDays)
    } else {
      newExpanded.add(month)
    }
    setExpandedMonths(newExpanded)
  }

  const toggleDay = (date: string) => {
    const newExpanded = new Set(expandedDays)
    if (newExpanded.has(date)) {
      newExpanded.delete(date)
    } else {
      newExpanded.add(date)
    }
    setExpandedDays(newExpanded)
  }

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('hu-HU', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      weekday: 'long'
    })
  }

  const formatMonth = (monthStr: string): string => {
    const [year, month] = monthStr.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('hu-HU', { year: 'numeric', month: 'long' })
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600">Adatok betöltése...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center py-8 text-red-600">
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (monthlyData.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="text-center py-8 text-gray-500">
            <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Még nincsenek vásárlási adatok</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Havi bontás
        </CardTitle>
        <CardDescription>
          Kattints egy hónapra a vásárlások megtekintéséhez, majd a dátumra a termékek részletezéséhez
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Időszak</TableHead>
                <TableHead className="text-right">Vásárlások száma</TableHead>
                <TableHead className="text-right">Tételek száma</TableHead>
                <TableHead className="text-right">Összeg</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthlyData.map((monthData) => (
                <React.Fragment key={monthData.month}>
                  {/* Hónap sor */}
                  <TableRow 
                    className="cursor-pointer hover:bg-gray-50 font-medium"
                    onClick={() => toggleMonth(monthData.month)}
                  >
                    <TableCell>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        {expandedMonths.has(monthData.month) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-semibold">
                      {formatMonth(monthData.month)}
                    </TableCell>
                    <TableCell className="text-right">
                      {monthData.purchaseCount} alkalom
                    </TableCell>
                    <TableCell className="text-right">
                      {monthData.itemCount} termék
                    </TableCell>
                    <TableCell className="text-right font-semibold text-blue-600">
                      {formatCurrency(monthData.totalAmount)}
                    </TableCell>
                  </TableRow>

                  {/* Napi vásárlások */}
                  {expandedMonths.has(monthData.month) && monthData.dailyPurchases.map((daily) => (
                    <React.Fragment key={daily.date}>
                      <TableRow 
                        className="bg-gray-50 cursor-pointer hover:bg-gray-100"
                        onClick={() => toggleDay(daily.date)}
                      >
                        <TableCell className="pl-8">
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            {expandedDays.has(daily.date) ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(daily.date)}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {/* Vásárlás száma mindig 1 egy napon belül */}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {daily.itemCount} termék
                        </TableCell>
                        <TableCell className="text-right text-sm font-medium">
                          {formatCurrency(daily.totalAmount)}
                        </TableCell>
                      </TableRow>

                      {/* Termékek listája */}
                      {expandedDays.has(daily.date) && daily.items.map((item) => (
                        <TableRow key={item.id} className="bg-blue-50/50">
                          <TableCell className="pl-12"></TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <Package className="h-3 w-3 text-gray-400" />
                              <span>{item.product_name}</span>
                              {item.brand && (
                                <span className="text-xs text-gray-500">({item.brand})</span>
                              )}
                            </div>
                            {item.store_name && (
                              <div className="text-xs text-gray-500 ml-5">
                                {item.store_name}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-sm text-gray-500">
                            {item.source === 'list' && '📋 Lista'}
                            {item.source === 'manual' && '✏️ Manuális'}
                            {item.source === 'import' && '📥 Import'}
                            {item.source === 'ocr' && '📷 OCR'}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {item.quantity} {item.unit}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {formatCurrency(item.total_price)}
                            <div className="text-xs text-gray-500">
                              ({formatCurrency(item.unit_price)}/{item.unit})
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </React.Fragment>
                  ))}
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Összesítés */}
        <div className="mt-4 p-4 bg-blue-50 rounded-lg">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {monthlyData.reduce((sum, m) => sum + m.purchaseCount, 0)}
              </div>
              <div className="text-sm text-gray-600">Összes vásárlás</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {monthlyData.reduce((sum, m) => sum + m.itemCount, 0)}
              </div>
              <div className="text-sm text-gray-600">Összes termék</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(monthlyData.reduce((sum, m) => sum + m.totalAmount, 0))}
              </div>
              <div className="text-sm text-gray-600">Összes költés</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default MonthlySpendingBreakdown
