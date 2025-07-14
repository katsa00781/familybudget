"use client";

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/utils/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Users, X, Mail, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface FamilyInfo {
  family_id: string;
  memberCount: number;
}

interface User {
  id: string;
  email?: string;
}

export default function JoinFamilyPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [isJoining, setIsJoining] = useState(false);
  const [familyInfo, setFamilyInfo] = useState<FamilyInfo | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [email, setEmail] = useState('');
  
  const searchParams = useSearchParams();
  const router = useRouter();
  const supabase = createClient();
  
  const familyCode = searchParams.get('code');
  const inviteEmail = searchParams.get('email');

  useEffect(() => {
    if (inviteEmail) {
      setEmail(inviteEmail);
    }
    loadData();
  }, [familyCode, inviteEmail]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadData = async () => {
    try {
      setIsLoading(true);
      
      // Felhasználó ellenőrzése
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);

      if (!familyCode) {
        toast.error('Hiányzó család kód!');
        return;
      }

      // Család információk betöltése
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('family_id', familyCode)
        .limit(1);

      if (profiles && profiles.length > 0) {
        // Van legalább egy tag a családban, ez jelzi hogy érvényes a kód
        setFamilyInfo({
          family_id: familyCode,
          memberCount: profiles.length
        });
      } else {
        toast.error('Érvénytelen meghívó kód!');
      }
    } catch (error) {
      console.error('Hiba az adatok betöltésekor:', error);
      toast.error('Hiba történt az adatok betöltésekor!');
    } finally {
      setIsLoading(false);
    }
  };

  const joinFamily = async () => {
    if (!currentUser) {
      toast.error('Jelentkezz be a családhoz való csatlakozáshoz!');
      router.push('/login');
      return;
    }

    if (!familyCode) {
      toast.error('Hiányzó család kód!');
      return;
    }

    setIsJoining(true);
    try {
      // Ellenőrizzük, hogy a felhasználó nincs-e már családban
      const { data: currentProfile } = await supabase
        .from('profiles')
        .select('family_id')
        .eq('id', currentUser.id)
        .single();

      if (currentProfile?.family_id) {
        toast.error('Már vagy valamilyen család tagja!');
        return;
      }

      // Csatlakozás a családhoz
      const { error } = await supabase
        .from('profiles')
        .update({ family_id: familyCode })
        .eq('id', currentUser.id);

      if (error) throw error;

      toast.success('Sikeresen csatlakoztál a családhoz!');
      router.push('/profil');
    } catch (error) {
      console.error('Hiba a csatlakozás során:', error);
      toast.error('Hiba történt a csatlakozás során!');
    } finally {
      setIsJoining(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-teal-50 to-green-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Meghívó ellenőrzése...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!familyInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-teal-50 to-green-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <X className="w-5 h-5" />
              Érvénytelen meghívó
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Ez a meghívó link érvénytelen vagy lejárt.
            </p>
            <Link href="/profil">
              <Button className="w-full">
                Vissza a profilhoz
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-teal-50 to-green-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-center">
            <Users className="w-6 h-6 text-cyan-600" />
            Családi meghívó
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Család információk */}
          <div className="text-center p-4 bg-cyan-50 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">
              Meghívtak egy családba!
            </h3>
            <p className="text-sm text-gray-600">
              {familyInfo.memberCount} tag{familyInfo.memberCount > 1 ? '' : ''}
            </p>
          </div>

          {/* Email mező */}
          {inviteEmail && (
            <div>
              <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Mail className="w-4 h-4" />
                Meghívott email
              </Label>
              <Input
                type="email"
                value={email}
                disabled
                className="mt-1 bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                Ez az email címre érkezett a meghívó
              </p>
            </div>
          )}

          {/* Csatlakozás gomb */}
          <div className="space-y-3">
            {currentUser ? (
              <Button 
                onClick={joinFamily}
                disabled={isJoining}
                className="w-full bg-cyan-600 hover:bg-cyan-700"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                {isJoining ? 'Csatlakozás...' : 'Csatlakozás a családhoz'}
              </Button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 text-center">
                  A csatlakozáshoz be kell jelentkezned
                </p>
                <Link href={`/login?returnUrl=${encodeURIComponent(window.location.href)}`}>
                  <Button className="w-full">
                    Bejelentkezés
                  </Button>
                </Link>
              </div>
            )}

            <Link href="/profil">
              <Button variant="outline" className="w-full">
                Mégse
              </Button>
            </Link>
          </div>

          {/* Információs szöveg */}
          <div className="text-xs text-gray-500 text-center p-3 bg-gray-50 rounded-lg">
            A családhoz való csatlakozással hozzáférést kapsz a közös költségvetéshez, 
            bevásárló listákhoz és családi pénzügyi tervezéshez.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
