// Budget and Financial Planning Types
export interface BudgetCategory {
  id: string;
  name: string;
  planned_amount: number;
  spent_amount: number;
  color?: string;
  icon?: string;
}

export interface BudgetPlan {
  id: string;
  name: string;
  family_id: string;
  categories: BudgetCategory[];
  total_planned: number;
  total_spent: number;
  month: string;
  year: number;
  created_at: string;
  updated_at: string;
}

export interface OtherIncome {
  id: string;
  name: string;
  amount: number;
  frequency?: 'monthly' | 'yearly' | 'one-time';
}

export interface IncomePlan {
  id: string;
  family_id: string;
  base_income: number;
  other_income: OtherIncome[];
  additional_incomes?: string; // JSON string for backward compatibility
  total_income: number;
  month: string;
  year: number;
  created_at: string;
  updated_at: string;
}

export interface AdditionalIncome {
  id: string;
  name: string;
  amount: number;
}
