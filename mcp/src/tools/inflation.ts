import { supabase, USER_ID } from '../lib/supabase.js'

// Reimplementálva lib/priceHistory.ts getInflationData alapján
export async function getInflationReportHandler(args: { months_back?: number }) {
  const monthsBack = args.months_back ?? 12
  const cutoffDate = new Date()
  cutoffDate.setMonth(cutoffDate.getMonth() - monthsBack)
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('product_price_history')
    .select('*')
    .eq('user_id', USER_ID)
    .gte('price_date', cutoffDateStr)
    .order('price_date', { ascending: true })

  if (error || !data || data.length === 0) {
    return { content: [{ type: 'text' as const, text: JSON.stringify([]) }] }
  }

  type PriceRecord = typeof data[0]

  // Csoportosítás: hónap → termék → rekordok
  const monthlyData: { [period: string]: { [productName: string]: PriceRecord[] } } = {}

  data.forEach(record => {
    const period = record.price_date.substring(0, 7) // YYYY-MM
    if (!monthlyData[period]) monthlyData[period] = {}
    if (!monthlyData[period][record.product_name]) monthlyData[period][record.product_name] = []
    monthlyData[period][record.product_name].push(record)
  })

  const inflationData: object[] = []
  const periods = Object.keys(monthlyData).sort()

  for (let i = 1; i < periods.length; i++) {
    const currentPeriod = periods[i]
    const previousPeriod = periods[i - 1]
    const currentProducts = monthlyData[currentPeriod]
    const previousProducts = monthlyData[previousPeriod]

    let totalPriceChange = 0
    let productCount = 0
    const categoryData: { [cat: string]: { sum: number; count: number } } = {}

    Object.keys(currentProducts).forEach(productName => {
      if (!previousProducts[productName]) return

      const currentAvg = currentProducts[productName].reduce((s, p) => s + p.unit_price, 0)
        / currentProducts[productName].length
      const previousAvg = previousProducts[productName].reduce((s, p) => s + p.unit_price, 0)
        / previousProducts[productName].length

      if (previousAvg === 0) return

      const priceChange = ((currentAvg - previousAvg) / previousAvg) * 100
      totalPriceChange += priceChange
      productCount++

      const category = currentProducts[productName][0].product_category || 'Egyéb'
      if (!categoryData[category]) categoryData[category] = { sum: 0, count: 0 }
      categoryData[category].sum += priceChange
      categoryData[category].count++
    })

    if (productCount > 0) {
      const categories: { [cat: string]: { avg_price_change: number; item_count: number } } = {}
      Object.entries(categoryData).forEach(([cat, d]) => {
        categories[cat] = {
          avg_price_change: Math.round((d.sum / d.count) * 10) / 10,
          item_count: d.count
        }
      })

      inflationData.push({
        period: currentPeriod,
        total_items: productCount,
        avg_price_change_percent: Math.round((totalPriceChange / productCount) * 10) / 10,
        categories
      })
    }
  }

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify(inflationData, null, 2)
    }]
  }
}
