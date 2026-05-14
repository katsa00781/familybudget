import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
export const USER_ID = process.env.FAMILYBUDGET_USER_ID

if (!supabaseUrl) throw new Error('SUPABASE_URL env változó hiányzik')
if (!supabaseServiceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY env változó hiányzik')
if (!USER_ID) throw new Error('FAMILYBUDGET_USER_ID env változó hiányzik')

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})
