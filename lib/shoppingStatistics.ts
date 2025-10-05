import { createClient } from '@/lib/utils/supabase/client'

export interface TimeBasedSpending {
  period: string // YYYY-MM or YYYY-Www or YYYY-MM-DD
  total_amount: number
  item_count: number
  shopping_count: number // Unique shopping dates
  avg_per_shopping: number
}

export interface ProductSpending {
  product_name: string
  category: string
  total_spent: number
  total_quantity: number
  avg_price: number
  purchase_count: number
  first_purchase: string
  last_purchase: string
}

export interface CategorySpending {
  category: string
  total_spent: number
  item_count: number
  percentage: number
  avg_item_price: number
}

export interface StoreSpending {
  store_name: string
  total_spent: number
  shopping_count: number
  avg_per_visit: number
  first_visit: string
  last_visit: string
}

export interface SpendingStatistics {
  total_spent: number
  total_items: number
  total_shoppings: number
  avg_per_shopping: number
  date_range: {
    start: string
    end: string
  }
  by_time: TimeBasedSpending[]
  by_product: ProductSpending[]
  by_category: CategorySpending[]
  by_store: StoreSpending[]
}

/**
 * Get shopping statistics for a user within a date range from product_price_history
 */
export async function getShoppingStatistics(
  userId: string,
  startDate?: string,
  endDate?: string,
  groupBy: 'day' | 'week' | 'month' = 'month'
): Promise<SpendingStatistics> {
  const supabase = createClient()

  // Build query - get all shopping statistics
  let query = supabase
    .from('shopping_statistics')
    .select('*')
    .eq('user_id', userId)

  if (startDate) {
    query = query.gte('shopping_date', startDate)
  }
  if (endDate) {
    query = query.lte('shopping_date', endDate)
  }

  const { data: statistics, error } = await query.order('shopping_date', { ascending: true })

  if (error) {
    console.error('Error fetching shopping statistics:', error)
    throw error
  }

  if (!statistics || statistics.length === 0) {
    return {
      total_spent: 0,
      total_items: 0,
      total_shoppings: 0,
      avg_per_shopping: 0,
      date_range: { start: '', end: '' },
      by_time: [],
      by_product: [],
      by_category: [],
      by_store: []
    }
  }

  // Group by shopping date to count unique shoppings
  const shoppingDates = new Set<string>()
  statistics.forEach(item => {
    shoppingDates.add(item.shopping_date)
  })

  // Calculate totals
  const totalSpent = statistics.reduce((sum, item) => sum + (item.total_price || 0), 0)
  const totalItems = statistics.length
  const totalShoppings = shoppingDates.size

  const productMap = new Map<string, ProductSpending>()
  const categoryMap = new Map<string, CategorySpending>()
  const storeMap = new Map<string, StoreSpending>()
  const timeMap = new Map<string, TimeBasedSpending>()
  const shoppingsByDate = new Map<string, number>() // Track total per shopping date

  // Process each product entry
  statistics.forEach((item) => {
    const shoppingDate = item.shopping_date
    const storeName = item.store_name || 'Ismeretlen'
    const category = item.product_category || 'Egyéb'

    // Track spending per shopping date
    if (!shoppingsByDate.has(shoppingDate)) {
      shoppingsByDate.set(shoppingDate, 0)
    }
    shoppingsByDate.set(shoppingDate, shoppingsByDate.get(shoppingDate)! + item.total_price)

    // Time-based grouping
    let periodKey = ''
    const date = new Date(shoppingDate)
    if (groupBy === 'day') {
      periodKey = shoppingDate // YYYY-MM-DD
    } else if (groupBy === 'week') {
      const year = date.getFullYear()
      const week = getWeekNumber(date)
      periodKey = `${year}-W${week.toString().padStart(2, '0')}`
    } else {
      periodKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}` // YYYY-MM
    }

    if (!timeMap.has(periodKey)) {
      timeMap.set(periodKey, {
        period: periodKey,
        total_amount: 0,
        item_count: 0,
        shopping_count: 0,
        avg_per_shopping: 0
      })
    }
    const timeStat = timeMap.get(periodKey)!
    timeStat.total_amount += item.total_price
    timeStat.item_count += 1

    // Store statistics
    if (!storeMap.has(storeName)) {
      storeMap.set(storeName, {
        store_name: storeName,
        total_spent: 0,
        shopping_count: 0,
        avg_per_visit: 0,
        first_visit: shoppingDate,
        last_visit: shoppingDate
      })
    }
    const storeStat = storeMap.get(storeName)!
    storeStat.total_spent += item.total_price
    if (shoppingDate < storeStat.first_visit) storeStat.first_visit = shoppingDate
    if (shoppingDate > storeStat.last_visit) storeStat.last_visit = shoppingDate

    // Product statistics
    const productKey = item.product_name.toLowerCase()
    if (!productMap.has(productKey)) {
      productMap.set(productKey, {
        product_name: item.product_name,
        category: category,
        total_spent: 0,
        total_quantity: 0,
        avg_price: 0,
        purchase_count: 0,
        first_purchase: shoppingDate,
        last_purchase: shoppingDate
      })
    }
    const productStat = productMap.get(productKey)!
    productStat.total_spent += item.total_price
    productStat.total_quantity += item.quantity
    productStat.purchase_count += 1
    productStat.avg_price = productStat.total_spent / productStat.total_quantity
    if (shoppingDate < productStat.first_purchase) productStat.first_purchase = shoppingDate
    if (shoppingDate > productStat.last_purchase) productStat.last_purchase = shoppingDate

    // Category statistics
    if (!categoryMap.has(category)) {
      categoryMap.set(category, {
        category: category,
        total_spent: 0,
        item_count: 0,
        percentage: 0,
        avg_item_price: 0
      })
    }
    const categoryStat = categoryMap.get(category)!
    categoryStat.total_spent += item.total_price
    categoryStat.item_count += 1
    categoryStat.avg_item_price = categoryStat.total_spent / categoryStat.item_count
  })

  // Calculate shopping counts per period and store
  const periodShoppingDates = new Map<string, Set<string>>()
  const storeShoppingDates = new Map<string, Set<string>>()
  
  statistics.forEach((item) => {
    const shoppingDate = item.shopping_date
    const date = new Date(shoppingDate)
    const storeName = item.store_name || 'Ismeretlen'
    
    let periodKey = ''
    if (groupBy === 'day') {
      periodKey = shoppingDate
    } else if (groupBy === 'week') {
      const year = date.getFullYear()
      const week = getWeekNumber(date)
      periodKey = `${year}-W${week.toString().padStart(2, '0')}`
    } else {
      periodKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
    }
    
    if (!periodShoppingDates.has(periodKey)) {
      periodShoppingDates.set(periodKey, new Set())
    }
    periodShoppingDates.get(periodKey)!.add(shoppingDate)
    
    if (!storeShoppingDates.has(storeName)) {
      storeShoppingDates.set(storeName, new Set())
    }
    storeShoppingDates.get(storeName)!.add(shoppingDate)
  })

  // Update shopping counts
  timeMap.forEach((stat, period) => {
    stat.shopping_count = periodShoppingDates.get(period)?.size || 0
    stat.avg_per_shopping = stat.shopping_count > 0 ? stat.total_amount / stat.shopping_count : 0
  })

  storeMap.forEach((stat, store) => {
    stat.shopping_count = storeShoppingDates.get(store)?.size || 0
    stat.avg_per_visit = stat.shopping_count > 0 ? stat.total_spent / stat.shopping_count : 0
  })

  // Calculate category percentages
  categoryMap.forEach((stat) => {
    stat.percentage = (stat.total_spent / totalSpent) * 100
  })

  // Sort arrays
  const byTime = Array.from(timeMap.values()).sort((a, b) => a.period.localeCompare(b.period))
  const byProduct = Array.from(productMap.values()).sort((a, b) => b.total_spent - a.total_spent)
  const byCategory = Array.from(categoryMap.values()).sort((a, b) => b.total_spent - a.total_spent)
  const byStore = Array.from(storeMap.values()).sort((a, b) => b.total_spent - a.total_spent)

  return {
    total_spent: totalSpent,
    total_items: totalItems,
    total_shoppings: totalShoppings,
    avg_per_shopping: totalSpent / totalShoppings,
    date_range: {
      start: statistics[0].shopping_date,
      end: statistics[statistics.length - 1].shopping_date
    },
    by_time: byTime,
    by_product: byProduct,
    by_category: byCategory,
    by_store: byStore
  }
}

/**
 * Get week number of the year
 */
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

/**
 * Get top N products by spending
 */
export async function getTopProducts(userId: string, limit: number = 10): Promise<ProductSpending[]> {
  const stats = await getShoppingStatistics(userId)
  return stats.by_product.slice(0, limit)
}

/**
 * Get category breakdown
 */
export async function getCategoryBreakdown(userId: string): Promise<CategorySpending[]> {
  const stats = await getShoppingStatistics(userId)
  return stats.by_category
}
