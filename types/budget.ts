// Közös budget típusok a költségvetés és éves terv között

export interface BudgetItem {
  id: string
  category: string
  type: 'Szükséglet' | 'Vágyak' | 'Megtakarítás' | ''
  subcategory: string
  amount: number
}

export interface BudgetCategory {
  name: string
  items: BudgetItem[]
  walletCategories?: string[] // Wallet kategória UUID-k tömbje
}
