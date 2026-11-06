import { supabase, USER_ID } from '../lib/supabase.js'
import { egysegar, osszehasonlitasiKulcs } from '../lib/egysegar.js'

export async function savePriceHistoryHandler(args: {
  product_name: string
  unit_price: number
  product_category?: string
  store_name?: string
  unit?: string
  quantity?: number
  price_date?: string
  source?: 'ocr' | 'manual'
}) {
  const {
    product_name,
    unit_price,
    product_category,
    store_name,
    unit = 'db',
    quantity = 1,
    source = 'manual'
  } = args
  const price_date = args.price_date || new Date().toISOString().split('T')[0]
  const total_price = unit_price * quantity

  const { data, error } = await supabase
    .from('product_price_history')
    .insert({
      user_id: USER_ID,
      product_name,
      unit_price,
      product_category: product_category || null,
      store_name: store_name || null,
      unit,
      quantity,
      total_price,
      price_date,
      source
    })
    .select('id')
    .single()

  if (error) {
    return {
      content: [{
        type: 'text' as const,
        text: JSON.stringify({ success: false, error: error.message })
      }]
    }
  }

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({ success: true, id: data.id, product_name, unit_price, price_date })
    }]
  }
}

// Reimplementálva lib/priceHistory.ts getPriceChanges alapján
export async function getPriceChangesHandler(args: { days_back?: number }) {
  const daysBack = args.days_back ?? 30
  const cutoffDate = new Date()
  cutoffDate.setDate(cutoffDate.getDate() - daysBack)
  const cutoffDateStr = cutoffDate.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('product_price_history')
    .select('*')
    .eq('user_id', USER_ID)
    .gte('price_date', cutoffDateStr)
    .order('product_name', { ascending: true })
    .order('price_date', { ascending: true })
    .order('created_at', { ascending: true })

  if (error || !data || data.length === 0) {
    return { content: [{ type: 'text' as const, text: JSON.stringify([]) }] }
  }

  type PriceRecord = typeof data[0]

  // Csoportosítás termék + bolt + mértékegység szerint — akciós árak nélkül (nem valódi
  // árváltozások). Más bolt ára vagy más kiszerelés nem árváltozás (lásd lib/egysegar.ts).
  const groups: { [key: string]: PriceRecord[] } = {}
  data.filter(record => !record.akcios).forEach(record => {
    const kulcs = osszehasonlitasiKulcs(record)
    if (!groups[kulcs]) groups[kulcs] = []
    groups[kulcs].push(record)
  })

  // Ablak előtti ár lekérése az egyszeres-rekordos csoportokhoz
  const singleRecordProducts = [...new Set(
    Object.values(groups).filter(recs => recs.length === 1).map(recs => recs[0].product_name as string)
  )]

  if (singleRecordProducts.length > 0) {
    const { data: prevData } = await supabase
      .from('product_price_history')
      .select('*')
      .eq('user_id', USER_ID)
      .lt('price_date', cutoffDateStr)
      .in('product_name', singleRecordProducts)
      .order('product_name', { ascending: true })
      .order('price_date', { ascending: false })
      .order('created_at', { ascending: false })

    const prevByGroup: { [key: string]: PriceRecord } = {}
    prevData?.filter(record => !record.akcios).forEach(record => {
      const kulcs = osszehasonlitasiKulcs(record)
      if (!prevByGroup[kulcs]) prevByGroup[kulcs] = record
    })

    Object.entries(groups).forEach(([kulcs, recs]) => {
      if (recs.length === 1 && prevByGroup[kulcs]) recs.unshift(prevByGroup[kulcs])
    })
  }

  const priceChanges: object[] = []

  Object.values(groups).forEach(records => {
    if (records.length < 2) return
    const oldRecord = records[records.length - 2]
    const newRecord = records[records.length - 1]
    // Egységár (Ft/kg, Ft/l, Ft/db, Ft/csomag) alapján, nem a kiszerelés ára alapján
    const regi = egysegar(oldRecord)
    const uj = egysegar(newRecord)
    const priceDiff = uj.ertek - regi.ertek
    const priceChangePercent = regi.ertek > 0 ? (priceDiff / regi.ertek) * 100 : 0

    if (Math.abs(priceChangePercent) > 1) {
      const daysBetween = Math.floor(
        (new Date(newRecord.price_date).getTime() - new Date(oldRecord.price_date).getTime())
        / (1000 * 60 * 60 * 24)
      )
      priceChanges.push({
        product_name: newRecord.product_name,
        product_category: newRecord.product_category || undefined,
        old_price: Number(oldRecord.unit_price),
        new_price: Number(newRecord.unit_price),
        price_difference: Math.round(priceDiff * 10) / 10,
        price_change_percent: Math.round(priceChangePercent * 10) / 10,
        old_date: oldRecord.price_date,
        new_date: newRecord.price_date,
        store_name: newRecord.store_name || undefined,
        days_between: daysBetween,
        old_egysegar: Math.round(regi.ertek * 10) / 10,
        new_egysegar: Math.round(uj.ertek * 10) / 10,
        mertekegyseg: uj.mertekegyseg,
        old_unit: oldRecord.unit || undefined,
        new_unit: newRecord.unit || undefined
      })
    }
  })

  priceChanges.sort((a, b) => {
    const aDate = (a as { new_date: string }).new_date
    const bDate = (b as { new_date: string }).new_date
    return bDate.localeCompare(aDate)
  })

  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify(priceChanges, null, 2)
    }]
  }
}
