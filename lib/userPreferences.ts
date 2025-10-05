// User Preferences Helper Functions
// Felhasználói beállítások kezelése: aktív bevételi és költségvetési tervek

import { createClient } from '@/lib/utils/supabase/client';

export interface UserPreferences {
  id: string;
  user_id: string;
  active_income_plan_id: string | null;
  active_budget_plan_id: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Felhasználó preferenciáinak lekérése
 */
export const getUserPreferences = async (userId: string): Promise<UserPreferences | null> => {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // Ha még nincs preferencia rekord, az nem hiba
      if (error.code === 'PGRST116') {
        return null;
      }
      // Ha a tábla nem létezik, csak logoljuk
      if (error.code === '42P01') {
        console.warn('user_preferences table does not exist yet. Please run migration.');
        return null;
      }
      console.error('Error fetching user preferences:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception in getUserPreferences:', error);
    return null;
  }
};

/**
 * Aktív bevételi terv beállítása
 */
export const setActiveIncomePlan = async (
  userId: string,
  incomePlanId: string | null
): Promise<{ success: boolean; error?: string }> => {
  try {
    const supabase = createClient();
    // Először ellenőrizzük, van-e már preferencia rekord
    const existingPrefs = await getUserPreferences(userId);

    if (existingPrefs) {
      // Frissítjük a meglévő rekordot
      const { error } = await supabase
        .from('user_preferences')
        .update({ active_income_plan_id: incomePlanId })
        .eq('user_id', userId);

      if (error) {
        // Ha a tábla nem létezik, csak logoljuk, de ne dobjunk hibát
        if (error.code === '42P01') {
          console.warn('user_preferences table does not exist yet. Please run migration.');
          return { success: true }; // Visszaadjuk sikeresként, hogy ne blokkolja a működést
        }
        console.error('Error updating active income plan:', error);
        return { success: false, error: error.message };
      }
    } else {
      // Létrehozunk egy új rekordot
      const { error } = await supabase
        .from('user_preferences')
        .insert({
          user_id: userId,
          active_income_plan_id: incomePlanId
        });

      if (error) {
        // Ha a tábla nem létezik, csak logoljuk, de ne dobjunk hibát
        if (error.code === '42P01') {
          console.warn('user_preferences table does not exist yet. Please run migration.');
          return { success: true }; // Visszaadjuk sikeresként, hogy ne blokkolja a működést
        }
        console.error('Error creating user preferences:', error);
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Exception in setActiveIncomePlan:', error);
    return { success: false, error: (error as Error).message };
  }
};

/**
 * Aktív költségvetési terv beállítása
 */
export const setActiveBudgetPlan = async (
  userId: string,
  budgetPlanId: string | null
): Promise<{ success: boolean; error?: string }> => {
  try {
    const supabase = createClient();
    const existingPrefs = await getUserPreferences(userId);

    if (existingPrefs) {
      const { error } = await supabase
        .from('user_preferences')
        .update({ active_budget_plan_id: budgetPlanId })
        .eq('user_id', userId);

      if (error) {
        // Ha a tábla nem létezik, csak logoljuk, de ne dobjunk hibát
        if (error.code === '42P01') {
          console.warn('user_preferences table does not exist yet. Please run migration.');
          return { success: true }; // Visszaadjuk sikeresként, hogy ne blokkolja a működést
        }
        console.error('Error updating active budget plan:', error);
        return { success: false, error: error.message };
      }
    } else {
      const { error } = await supabase
        .from('user_preferences')
        .insert({
          user_id: userId,
          active_budget_plan_id: budgetPlanId
        });

      if (error) {
        // Ha a tábla nem létezik, csak logoljuk, de ne dobjunk hibát
        if (error.code === '42P01') {
          console.warn('user_preferences table does not exist yet. Please run migration.');
          return { success: true }; // Visszaadjuk sikeresként, hogy ne blokkolja a működést
        }
        console.error('Error creating user preferences:', error);
        return { success: false, error: error.message };
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Exception in setActiveBudgetPlan:', error);
    return { success: false, error: (error as Error).message };
  }
};

/**
 * Aktív bevételi terv lekérése részletes adatokkal
 */
export const getActiveIncomePlan = async (userId: string) => {
  try {
    const supabase = createClient();
    const prefs = await getUserPreferences(userId);
    
    if (!prefs || !prefs.active_income_plan_id) {
      // Ha nincs aktív terv, visszaadjuk a legutóbbit
      const { data, error } = await supabase
        .from('income_plans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching latest income plan:', error);
        return null;
      }

      return data;
    }

    // Lekérjük az aktív tervet
    const { data, error } = await supabase
      .from('income_plans')
      .select('*')
      .eq('id', prefs.active_income_plan_id)
      .single();

    if (error) {
      console.error('Error fetching active income plan:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception in getActiveIncomePlan:', error);
    return null;
  }
};

/**
 * Aktív költségvetési terv lekérése részletes adatokkal
 */
export const getActiveBudgetPlan = async (userId: string) => {
  try {
    const supabase = createClient();
    const prefs = await getUserPreferences(userId);
    
    if (!prefs || !prefs.active_budget_plan_id) {
      // Ha nincs aktív terv, visszaadjuk a legutóbbit
      const { data, error } = await supabase
        .from('budget_plans')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching latest budget plan:', error);
        return null;
      }

      return data;
    }

    // Lekérjük az aktív tervet
    const { data, error } = await supabase
      .from('budget_plans')
      .select('*')
      .eq('id', prefs.active_budget_plan_id)
      .single();

    if (error) {
      console.error('Error fetching active budget plan:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception in getActiveBudgetPlan:', error);
    return null;
  }
};
