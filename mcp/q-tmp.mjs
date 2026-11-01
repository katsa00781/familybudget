import { createClient } from '@supabase/supabase-js'
const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {auth:{persistSession:false}})
const { data, error } = await s.from('budget_plans').select('id,name,budget_data,user_id').eq('name','2026 október')
if (error) { console.log(error); process.exit() }
for (const p of data) {
  const bd = typeof p.budget_data==='string'?JSON.parse(p.budget_data):p.budget_data
  const cats = Array.isArray(bd)?bd:bd.categories
  console.log(p.id, p.user_id)
  for (const c of cats) console.log(c.name, '|', JSON.stringify(c.walletCategories||null), '|', c.walletMainCategory||'', JSON.stringify(c.walletSubCategories||c.walletSubCategory||''))
}
