// Éves költségvetés típusok

export interface MonthlyIncome {
  month: number; // 1-12
  amount: number;
}

export interface AnnualExpense {
  id: string;
  name: string;
  amount: number;
  targetMonth: number; // Melyik hónapban kell kifizetni (1-12)
  category: string;
  description?: string;
  monthlyAllocation: number; // Havi megtakarítási összeg
  startSavingMonth?: number; // Melyik hónaptól kezdjük gyűjteni (opcionális)
}

export interface RecurringExpense {
  id: string;
  name: string;
  amount: number;
  month: number; // Melyik hónapban esedékes (1-12)
  category: string;
  description?: string;
  addToMonthlyBudget: boolean; // Automatikusan hozzáadja a havi költségvetéshez
}

export interface MonthlySavingsAllocation {
  expenseId: string;
  expenseName: string;
  amount: number;
}

export interface MonthlySavingsPlan {
  month: number;
  totalAmount: number;
  allocations: MonthlySavingsAllocation[];
}

export interface AnnualBudgetPlan {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  year: number;
  
  monthly_incomes: MonthlyIncome[];
  annual_expenses: AnnualExpense[];
  recurring_expenses: RecurringExpense[];
  monthly_savings_plan: MonthlySavingsPlan[];
  
  total_annual_income: number;
  total_annual_expenses: number;
  total_recurring_expenses: number;
  
  created_at: string;
  updated_at?: string;
}

export interface MonthlyBudgetSummary {
  month: number;
  monthName: string;
  income: number;
  plannedSavings: number;
  recurringExpenses: RecurringExpense[];
  availableForBudget: number; // income - plannedSavings - recurringExpenses
}
