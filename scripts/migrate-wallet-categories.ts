/**
 * Egyszeri migráció: budget_plans.budget_data.categories[].walletCategories
 * konverzió régi { mainCategory, subCategories[] } objektumokból UUID string[] tömbre.
 *
 * Futtatás:
 *   npx tsx scripts/migrate-wallet-categories.ts
 *
 * Szükséges env változók: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Hiányzó env változók: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Régi szöveges alkategória → UUID-k mapping
const OLD_SUBCATEGORY_TO_IDS: Record<string, string[]> = {
  'Bevásárlás': ['ba1dbb27-cac2-4e9b-b556-391104e383fc', 'ea7668b0-8393-472a-bce1-fbc9664aad6a'],
  'Étterem, gyorsétterem': ['a077f250-e799-4716-a521-baead9cbca02', 'a10361fb-b92b-4afd-95b3-d28721f4915d'],
  'Bár, kávézó': ['a10361fb-b92b-4afd-95b3-d28721f4915d'],
  'Gyerekek': ['4be5aff2-a918-4f67-a0ef-02e227140853'],
  'Otthon, kert': ['78c0d3d4-e550-40bb-9fb0-add6abc59ffc'],
  'Elektronika, tartozékok': ['bd237eb1-3d10-4240-8635-2aa2a281f08a'],
  'Gyógyszertár, drogéria': ['2f9dfb2d-2664-4a5c-90b7-8ca88009fcd8'],
  'Ruházat és cipő': ['f3452432-ae2b-46bb-9457-14a8bddaebff'],
  'Egészségügyi ellátás, orvos': ['69d54220-6a3f-4e4c-bdf8-fbd5cc7e750c'],
  'Egészség, szépség': ['46c38faa-e533-42f7-bdcf-d2a346cd6e86'],
  'Aktiv sport, Fitness': ['d1516469-9028-42a2-9a18-1fc930c4b9cc'],
  'TV, streaming': ['33d3e406-0f79-4c89-af70-bac03b4e6567'],
  'Szoftverek, alkalmazások, játékok': ['82194194-5a20-4727-aa98-b10cce060d6a'],
  'Könyvek, hanganyagok': ['4c549e30-93dc-4ccd-b24b-4cf521b3a619'],
  'Kultúra, sportesemények': ['ab67f678-9202-4518-b1e0-ad1f58518eee'],
  'Nyaralás, utazások, hotelek': ['97bfb943-b94d-40f2-bc47-88d887200c2a'],
  'Hobbi': ['8eaa8479-7cbd-4174-920e-bf535d80d29f'],
  'Üzemanyag': ['ae2cdbe7-99ef-467e-b647-7464c8da9001'],
  'Parkolás': ['d8d9eed8-44e2-4402-bf1f-297ab6b300f3'],
  'Jármű karbantartása': ['c854b022-6721-4704-bacc-34bb25d90050'],
  'Lizing': ['98cb0cb2-a8f1-45ff-adbc-303c4f6765fb'],
  'Jelzáloghitel': ['8652e0ef-d3c6-4b19-9f2d-2eccabd0a10b'],
  'Energia, közművek': ['0c652764-bee2-4a88-b6cd-4bc7c1e11963'],
  'Szolgáltatások': ['baab1cc6-e082-4d0d-ab3c-b2f08c71221f'],
  'Ingatlanbiztosítás': ['67879bd3-779b-4f93-b97b-acbe850d1e68'],
  'Karbantartás, javítások': ['f1fd2b42-6d87-45d0-b540-32851780e0b9'],
  'Telefon, mobiltelefon': ['5468cb5a-24aa-47a2-9572-579c6b9bbfda'],
  'Internet': ['ec7a27f4-b53c-4778-a4ab-6a972df4f402'],
  'Kölcsönök, kamatok': ['ad608f9e-1175-40a0-a566-72e1e31027c3'],
  'Kölcsönök, törlesztőrészletek': ['ad608f9e-1175-40a0-a566-72e1e31027c3'],
  'Díjak': ['342f364d-5f7d-47e9-86ba-a34de34fb535'],
  'Díjak, tartozások': ['342f364d-5f7d-47e9-86ba-a34de34fb535'],
  'Egyebek': ['76f3f616-000c-48de-becd-041b4166a39e'],
  'Egyéb': ['76f3f616-000c-48de-becd-041b4166a39e'],
  'Hiányzó': ['9dc3957c-579d-41b3-8fc1-f941b8a74565'],
}

// UUID regexp: 8-4-4-4-12 hexadecimális karakterek
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type OldWalletCat = { mainCategory: string; subCategories: string[] }
type BudgetCategory = {
  name: string
  items: unknown[]
  walletCategories?: unknown
  [key: string]: unknown
}

function isAlreadyMigrated(walletCategories: unknown): boolean {
  if (!Array.isArray(walletCategories) || walletCategories.length === 0) return true
  return typeof walletCategories[0] === 'string' && UUID_RE.test(walletCategories[0])
}

function convertToIds(oldCats: OldWalletCat[]): string[] {
  const ids: string[] = []
  for (const wc of oldCats) {
    for (const sub of wc.subCategories || []) {
      const mapped = OLD_SUBCATEGORY_TO_IDS[sub]
      if (mapped) ids.push(...mapped)
    }
    if ((wc.subCategories || []).length === 0) {
      const mapped = OLD_SUBCATEGORY_TO_IDS[wc.mainCategory]
      if (mapped) ids.push(...mapped)
    }
  }
  return [...new Set(ids)]
}

function migrateBudgetData(budgetData: unknown): { changed: boolean; data: unknown } {
  let parsed: unknown = budgetData
  if (typeof parsed === 'string') {
    try { parsed = JSON.parse(parsed) } catch { return { changed: false, data: budgetData } }
  }

  let categories: BudgetCategory[] | null = null

  if (Array.isArray(parsed)) {
    if (parsed.length > 0 && typeof (parsed[0] as Record<string, unknown>).items !== 'undefined') {
      categories = parsed as BudgetCategory[]
    }
  } else if (parsed && typeof parsed === 'object') {
    const v2 = parsed as { categories?: BudgetCategory[] }
    if (Array.isArray(v2.categories)) {
      categories = v2.categories
    }
  }

  if (!categories) return { changed: false, data: budgetData }

  let changed = false
  const newCategories = categories.map(cat => {
    const wc = cat.walletCategories
    if (!wc || !Array.isArray(wc) || wc.length === 0) return cat
    if (isAlreadyMigrated(wc)) return cat

    const oldCats = wc as OldWalletCat[]
    const newIds = convertToIds(oldCats)
    changed = true
    return { ...cat, walletCategories: newIds }
  })

  if (!changed) return { changed: false, data: budgetData }

  if (Array.isArray(parsed)) {
    return { changed: true, data: newCategories }
  } else {
    return { changed: true, data: { ...(parsed as object), categories: newCategories } }
  }
}

async function main() {
  console.log('Budget plans wallet kategória migráció indítása...\n')

  const { data: plans, error } = await supabase
    .from('budget_plans')
    .select('id, name, budget_data')

  if (error) {
    console.error('Hiba a budget_plans lekérésekor:', error)
    process.exit(1)
  }

  console.log(`Összesen ${plans.length} budget plan található.\n`)

  let migratedCount = 0
  let skippedCount = 0

  for (const plan of plans) {
    const { changed, data: newData } = migrateBudgetData(plan.budget_data)

    if (!changed) {
      console.log(`[SKIP] ${plan.name || plan.id} – már UUID formátumban van vagy nincs walletCategories`)
      skippedCount++
      continue
    }

    const { error: updateError } = await supabase
      .from('budget_plans')
      .update({ budget_data: newData })
      .eq('id', plan.id)

    if (updateError) {
      console.error(`[HIBA] ${plan.name || plan.id}:`, updateError)
    } else {
      console.log(`[OK]   ${plan.name || plan.id} – migrálva`)
      migratedCount++
    }
  }

  console.log(`\nKész! Migrálva: ${migratedCount}, Kihagyva: ${skippedCount}`)
}

main().catch(err => {
  console.error('Nem várt hiba:', err)
  process.exit(1)
})
