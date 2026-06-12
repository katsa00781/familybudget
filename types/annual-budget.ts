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

export interface MonthlyBudgetedExpense {
  month: number; // 1-12
  amount: number; // Havi általános (megélhetési) kiadás
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

  // Cashflow mezők (migráció 015)
  opening_balance: number; // Év nyitó egyenleg
  monthly_budgeted_expenses: MonthlyBudgetedExpense[]; // Havi általános kiadások
  target_end_balance: number; // Cél év végi egyenleg (egyensúly = 0)

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

// Éves cashflow — havonta egy göngyölített egyenleg sor
export interface CashflowMonth {
  month: number; // 1-12
  monthName: string;
  income: number;
  recurringTotal: number; // ismétlődő kiadások ebben a hónapban
  annualDueTotal: number; // nagy kiadások esedékes ebben a hónapban (teljes összeg)
  generalExpense: number; // havi általános (megélhetési) kiadás
  totalExpense: number; // recurringTotal + annualDueTotal + generalExpense
  netCashflow: number; // income - totalExpense
  openingBalance: number; // hónap nyitó göngyölített egyenlege
  closingBalance: number; // hónap záró göngyölített egyenlege
  recurringExpenses: RecurringExpense[];
  annualExpensesDue: AnnualExpense[];
}
