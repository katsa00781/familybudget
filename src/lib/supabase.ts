import { createClient } from '@supabase/supabase-js'

// Create a single supabase client for interacting with your database
export const createSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase URL or Key. Please check your environment variables.')
  }
  
  return createClient(supabaseUrl, supabaseKey)
}
