import { useState, useEffect } from 'react';
import { createClient } from '@/lib/utils/supabase/client';

interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  display_name?: string;
  family_id?: string;
}

interface Family {
  id: string;
  name: string;
}

export function useUserProfile() {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [family, setFamily] = useState<Family | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Ellenőrizzük, hogy vannak-e környezeti változók
  const hasSupabaseConfig = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabase = hasSupabaseConfig ? createClient() : null;

  const loadUserProfile = async () => {
    try {
      setIsLoading(true);
      
      if (!supabase) {
        console.warn('Supabase not configured, skipping user profile loading');
        return;
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Profil betöltése
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (profile) {
          setUserProfile(profile);
          
          // Family name betöltése
          if (profile.family_id) {
            const { data: familyData } = await supabase
              .from('families')
              .select('*')
              .eq('id', profile.family_id)
              .single();
            
            if (familyData) {
              setFamily(familyData);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUserProfile();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getUserDisplayName = () => {
    if (!userProfile) return 'Felhasználó';
    return userProfile.display_name || userProfile.full_name || userProfile.email?.split('@')[0] || 'Felhasználó';
  };

  const getUserInitials = () => {
    const name = getUserDisplayName();
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getUserLastName = () => {
    const fullName = userProfile?.full_name || userProfile?.display_name;
    if (!fullName) return '';
    
    const nameParts = fullName.trim().split(' ');
    // Magyarországon általában az első név a vezetéknév
    return nameParts[0] || '';
  };

  const getFamilyName = () => {
    return family?.name || 'Család';
  };

  return {
    userProfile,
    family,
    isLoading,
    getUserDisplayName,
    getUserInitials,
    getUserLastName,
    getFamilyName,
    refetch: loadUserProfile
  };
}
