import { supabase, USER_ID } from '../lib/supabase.js'

export async function getProductsHandler(args: {
  category?: string
  store_name?: string
  search?: string
  available_only?: boolean
  limit?: number
}) {
  const { category, store_name, search, available_only = false, limit = 200 } = args

  let query = supabase
    .from('products')
    .select('id, name, brand, category, store_name, price, unit, barcode, available, last_seen_at, created_at')
    .eq('user_id', USER_ID)
    .order('name', { ascending: true })
    .limit(limit)

  if (category) {
    query = query.eq('category', category)
  }
  if (store_name) {
    query = query.eq('store_name', store_name)
  }
  if (available_only) {
    query = query.eq('available', true)
  }
  if (search) {
    query = query.ilike('name', `%${search}%`)
  }

  const { data, error } = await query

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
      text: JSON.stringify({ success: true, count: data?.length ?? 0, products: data ?? [] }, null, 2)
    }]
  }
}
