import { supabase, USER_ID } from '../lib/supabase.js'

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

export async function getShoppingStatisticsHandler(args: {
  start_date?: string
  end_date?: string
  group_by?: 'day' | 'week' | 'month'
}) {
  const { start_date, end_date, group_by = 'month' } = args

  let query = supabase
    .from('shopping_statistics')
    .select('*')
    .eq('user_id', USER_ID)
    .order('shopping_date', { ascending: true })

  if (start_date) query = query.gte('shopping_date', start_date)
  if (end_date) query = query.lte('shopping_date', end_date)

  const { data, error } = await query

  if (error) {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ success: false, error: error.message })
      }]
    }
  }

  if (!data || data.length === 0) {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({
          success: true,
          total_spent: 0, total_items: 0, total_shoppings: 0, avg_per_shopping: 0,
          date_range: { start: '', end: '' },
          by_time: [], by_product: [], by_category: [], by_store: []
        })
      }]
    }
  }

  type StatRow = typeof data[0]

  const shoppingDates = new Set<string>()
  data.forEach(item => shoppingDates.add(item.shopping_date))

  const totalSpent = data.reduce((sum, item) => sum + (item.total_price || 0), 0)
  const totalItems = data.length
  const totalShoppings = shoppingDates.size

  const productMap = new Map<string, {
    product_name: string; category: string; total_spent: number
    total_quantity: number; avg_price: number; purchase_count: number
    first_purchase: string; last_purchase: string
  }>()
  const categoryMap = new Map<string, {
    category: string; total_spent: number; item_count: number; percentage: number; avg_item_price: number
  }>()
  const storeMap = new Map<string, {
    store_name: string; total_spent: number; shopping_count: number
    avg_per_visit: number; first_visit: string; last_visit: string
  }>()
  const timeMap = new Map<string, {
    period: string; total_amount: number; item_count: number; shopping_count: number; avg_per_shopping: number
  }>()
  const periodDates = new Map<string, Set<string>>()
  const storeDates = new Map<string, Set<string>>()

  data.forEach((item: StatRow) => {
    const shoppingDate = item.shopping_date
    const storeName = item.store_name || 'Ismeretlen'
    const category = item.product_category || 'Egyéb'
    const date = new Date(shoppingDate)

    let periodKey: string
    if (group_by === 'day') {
      periodKey = shoppingDate
    } else if (group_by === 'week') {
      const week = getWeekNumber(date)
      periodKey = `${date.getFullYear()}-W${week.toString().padStart(2, '0')}`
    } else {
      periodKey = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
    }

    if (!timeMap.has(periodKey)) {
      timeMap.set(periodKey, { period: periodKey, total_amount: 0, item_count: 0, shopping_count: 0, avg_per_shopping: 0 })
    }
    const timeStat = timeMap.get(periodKey)!
    timeStat.total_amount += item.total_price || 0
    timeStat.item_count += 1

    if (!periodDates.has(periodKey)) periodDates.set(periodKey, new Set())
    periodDates.get(periodKey)!.add(shoppingDate)

    if (!storeMap.has(storeName)) {
      storeMap.set(storeName, { store_name: storeName, total_spent: 0, shopping_count: 0, avg_per_visit: 0, first_visit: shoppingDate, last_visit: shoppingDate })
    }
    const storeStat = storeMap.get(storeName)!
    storeStat.total_spent += item.total_price || 0
    if (shoppingDate < storeStat.first_visit) storeStat.first_visit = shoppingDate
    if (shoppingDate > storeStat.last_visit) storeStat.last_visit = shoppingDate

    if (!storeDates.has(storeName)) storeDates.set(storeName, new Set())
    storeDates.get(storeName)!.add(shoppingDate)

    const productKey = item.product_name.toLowerCase()
    if (!productMap.has(productKey)) {
      productMap.set(productKey, { product_name: item.product_name, category, total_spent: 0, total_quantity: 0, avg_price: 0, purchase_count: 0, first_purchase: shoppingDate, last_purchase: shoppingDate })
    }
    const productStat = productMap.get(productKey)!
    productStat.total_spent += item.total_price || 0
    productStat.total_quantity += item.quantity || 1
    productStat.purchase_count += 1
    productStat.avg_price = productStat.total_quantity > 0 ? productStat.total_spent / productStat.total_quantity : 0
    if (shoppingDate < productStat.first_purchase) productStat.first_purchase = shoppingDate
    if (shoppingDate > productStat.last_purchase) productStat.last_purchase = shoppingDate

    if (!categoryMap.has(category)) {
      categoryMap.set(category, { category, total_spent: 0, item_count: 0, percentage: 0, avg_item_price: 0 })
    }
    const categoryStat = categoryMap.get(category)!
    categoryStat.total_spent += item.total_price || 0
    categoryStat.item_count += 1
    categoryStat.avg_item_price = categoryStat.total_spent / categoryStat.item_count
  })

  timeMap.forEach((stat, period) => {
    stat.shopping_count = periodDates.get(period)?.size || 0
    stat.avg_per_shopping = stat.shopping_count > 0 ? stat.total_amount / stat.shopping_count : 0
  })
  storeMap.forEach((stat, store) => {
    stat.shopping_count = storeDates.get(store)?.size || 0
    stat.avg_per_visit = stat.shopping_count > 0 ? stat.total_spent / stat.shopping_count : 0
  })
  categoryMap.forEach(stat => {
    stat.percentage = totalSpent > 0 ? (stat.total_spent / totalSpent) * 100 : 0
  })

  const result = {
    success: true,
    total_spent: totalSpent,
    total_items: totalItems,
    total_shoppings: totalShoppings,
    avg_per_shopping: totalShoppings > 0 ? totalSpent / totalShoppings : 0,
    date_range: { start: data[0].shopping_date, end: data[data.length - 1].shopping_date },
    by_time: Array.from(timeMap.values()).sort((a, b) => a.period.localeCompare(b.period)),
    by_product: Array.from(productMap.values()).sort((a, b) => b.total_spent - a.total_spent),
    by_category: Array.from(categoryMap.values()).sort((a, b) => b.total_spent - a.total_spent),
    by_store: Array.from(storeMap.values()).sort((a, b) => b.total_spent - a.total_spent)
  }

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify(result, null, 2)
    }]
  }
}
