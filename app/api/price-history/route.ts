import { createClient } from '@/lib/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Ensure user_id matches authenticated user
    if (body.user_id !== user.id) {
      return NextResponse.json(
        { error: 'Forbidden' },
        { status: 403 }
      )
    }

    const { data, error } = await supabase
      .from('product_price_history')
      .insert({
        user_id: body.user_id,
        product_name: body.product_name,
        product_category: body.product_category || null,
        store_name: body.store_name || null,
        unit: body.unit || 'db',
        unit_price: body.unit_price,
        quantity: body.quantity || 1,
        total_price: body.total_price || body.unit_price,
        price_date: body.price_date,
        source: body.source || 'manual'
      })
      .select()
      .single()

    if (error) {
      console.error('Error inserting price history:', error)
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error('Exception in price-history API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
