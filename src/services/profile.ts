// User Profile Service
import { createClient } from '@/lib/utils/supabase/client';
import { Profile } from '@/src/types';

export class ProfileService {
  private supabase = createClient();

  /**
   * Get user profile by user ID
   */
  async getProfile(userId: string): Promise<Profile | null> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No profile found
        return null;
      }
      throw error;
    }

    return data;
  }

  /**
   * Create or update user profile
   */
  async upsertProfile(profile: Partial<Profile>): Promise<Profile> {
    const { data, error } = await this.supabase
      .from('profiles')
      .upsert([profile])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get all family members
   */
  async getFamilyMembers(familyId: string): Promise<Profile[]> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .eq('family_id', familyId);

    if (error) throw error;
    return data || [];
  }

  /**
   * Update profile picture
   */
  async updateAvatar(userId: string, avatarUrl: string): Promise<void> {
    const { error } = await this.supabase
      .from('profiles')
      .update({ avatar_url: avatarUrl })
      .eq('id', userId);

    if (error) throw error;
  }

  /**
   * Delete profile
   */
  async deleteProfile(userId: string): Promise<void> {
    const { error } = await this.supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (error) throw error;
  }

  /**
   * Search profiles by name or email
   */
  async searchProfiles(query: string): Promise<Profile[]> {
    const { data, error } = await this.supabase
      .from('profiles')
      .select('*')
      .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,display_name.ilike.%${query}%`);

    if (error) throw error;
    return data || [];
  }
}
