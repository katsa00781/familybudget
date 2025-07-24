// Budget Service
import { createClient } from '@/lib/utils/supabase/client';
import { BudgetPlan } from '@/src/types';

export class BudgetService {
  private supabase = createClient();

  /**
   * Get all budget plans for a user
   */
  async getBudgetPlans(userId: string): Promise<BudgetPlan[]> {
    const { data, error } = await this.supabase
      .from('budget_plans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get budget plan by ID
   */
  async getBudgetPlan(planId: string): Promise<BudgetPlan | null> {
    const { data, error } = await this.supabase
      .from('budget_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data;
  }

  /**
   * Create new budget plan
   */
  async createBudgetPlan(budgetPlan: Omit<BudgetPlan, 'id' | 'created_at' | 'updated_at'>): Promise<BudgetPlan> {
    const { data, error } = await this.supabase
      .from('budget_plans')
      .insert([budgetPlan])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update budget plan
   */
  async updateBudgetPlan(planId: string, updates: Partial<BudgetPlan>): Promise<BudgetPlan> {
    const { data, error } = await this.supabase
      .from('budget_plans')
      .update(updates)
      .eq('id', planId)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete budget plan
   */
  async deleteBudgetPlan(planId: string): Promise<void> {
    const { error } = await this.supabase
      .from('budget_plans')
      .delete()
      .eq('id', planId);

    if (error) throw error;
  }

  /**
   * Get budget plans for current month
   */
  async getCurrentMonthBudget(userId: string): Promise<BudgetPlan[]> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    const { data, error } = await this.supabase
      .from('budget_plans')
      .select('*')
      .eq('user_id', userId)
      .eq('year', year)
      .eq('month', month);

    if (error) throw error;
    return data || [];
  }

  /**
   * Add expense to budget category
   */
  async addExpense(planId: string, categoryId: string, amount: number): Promise<BudgetPlan> {
    // First get the current plan
    const plan = await this.getBudgetPlan(planId);
    if (!plan) throw new Error('Budget plan not found');

    // Update the category spent amount
    const updatedCategories = plan.categories.map(category => {
      if (category.id === categoryId) {
        return {
          ...category,
          spent_amount: category.spent_amount + amount
        };
      }
      return category;
    });

    // Calculate new total spent
    const total_spent = updatedCategories.reduce((sum, cat) => sum + cat.spent_amount, 0);

    return this.updateBudgetPlan(planId, {
      categories: updatedCategories,
      total_spent
    });
  }
}
