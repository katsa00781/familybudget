// Income Service
import { createClient } from '@/lib/utils/supabase/client';
import { IncomePlan } from '@/src/types';

export class IncomeService {
  private supabase = createClient();

  /**
   * Get all income plans for a family
   */
  async getIncomePlans(familyId: string): Promise<IncomePlan[]> {
    const { data, error } = await this.supabase
      .from('income_plans')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get income plan by ID
   */
  async getIncomePlan(id: string): Promise<IncomePlan | null> {
    const { data, error } = await this.supabase
      .from('income_plans')
      .select('*')
      .eq('id', id)
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
   * Create new income plan
   */
  async createIncomePlan(incomePlan: Omit<IncomePlan, 'id' | 'created_at' | 'updated_at'>): Promise<IncomePlan> {
    const { data, error } = await this.supabase
      .from('income_plans')
      .insert([incomePlan])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update income plan
   */
  async updateIncomePlan(id: string, updates: Partial<IncomePlan>): Promise<IncomePlan> {
    const { data, error } = await this.supabase
      .from('income_plans')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete income plan
   */
  async deleteIncomePlan(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('income_plans')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Get current month income plan
   */
  async getCurrentMonthIncome(familyId: string): Promise<IncomePlan | null> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');

    const { data, error } = await this.supabase
      .from('income_plans')
      .select('*')
      .eq('family_id', familyId)
      .eq('year', year)
      .eq('month', month)
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
   * Calculate total income including other sources
   */
  calculateTotalIncome(incomePlan: IncomePlan): number {
    const otherIncomeTotal = incomePlan.other_income.reduce(
      (sum, income) => sum + income.amount, 
      0
    );
    return incomePlan.base_income + otherIncomeTotal;
  }
}
