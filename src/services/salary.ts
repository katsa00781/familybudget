// Salary Service
import { createClient } from '@/lib/utils/supabase/client';

export interface SalaryCalculation {
  id: string;
  family_member_id: string;
  alapber: number;
  ledolgozott_napok: number;
  ledolgozott_orak: number;
  szabadsag_napok: number;
  betegszabadsag_napok: number;
  kikuldes_napok: number;
  gyed_mellett: number;
  formaruha_kompenzacio: number;
  csaladi_adokedvezmeny: number;
  brutto_ber: number;
  netto_ber: number;
  szja: number;
  tb_jarulék: number;
  szoc_hozzajarulas: number;
  teljes_munkaltaroi_koltseg: number;
  created_at: string;
  updated_at: string;
}

export class SalaryService {
  private supabase = createClient();

  /**
   * Save salary calculation to database
   */
  async saveSalaryCalculation(calculation: Omit<SalaryCalculation, 'id' | 'created_at' | 'updated_at'>): Promise<SalaryCalculation> {
    const { data, error } = await this.supabase
      .from('salary_calculations')
      .insert([calculation])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get salary calculations for a family member
   */
  async getSalaryCalculations(familyMemberId: string): Promise<SalaryCalculation[]> {
    const { data, error } = await this.supabase
      .from('salary_calculations')
      .select('*')
      .eq('family_member_id', familyMemberId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get latest salary calculation for a family member
   */
  async getLatestSalaryCalculation(familyMemberId: string): Promise<SalaryCalculation | null> {
    const { data, error } = await this.supabase
      .from('salary_calculations')
      .select('*')
      .eq('family_member_id', familyMemberId)
      .order('created_at', { ascending: false })
      .limit(1)
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
   * Update salary calculation
   */
  async updateSalaryCalculation(id: string, updates: Partial<SalaryCalculation>): Promise<SalaryCalculation> {
    const { data, error } = await this.supabase
      .from('salary_calculations')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete salary calculation
   */
  async deleteSalaryCalculation(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('salary_calculations')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Get all salary calculations for family
   */
  async getFamilySalaryCalculations(familyId: string): Promise<SalaryCalculation[]> {
    const { data, error } = await this.supabase
      .from('salary_calculations')
      .select(`
        *,
        profiles!inner(family_id)
      `)
      .eq('profiles.family_id', familyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}
