"use client";

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/utils/supabase/client';
import { useUserProfile } from '@/src/hooks/useUserProfile';
import { Card, CardContent, CardHeader, CardTitle } from '@/src/components/ui/card';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Badge } from '@/src/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/src/components/ui/dialog';
import { 
  Users, 
  UserPlus, 
  Mail, 
  Crown, 
  User, 
  Send
} from 'lucide-react';
import { toast } from 'sonner';

interface FamilyMember {
  id: string;
  email: string;
  full_name?: string;
  display_name?: string;
  family_id?: string;
  created_at: string;
}

export default function FamilyMembers() {
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { userProfile, family } = useUserProfile();
  const supabase = createClient();

  // Családtagok betöltése
  const loadFamilyMembers = async () => {
    if (!userProfile?.family_id) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('family_id', userProfile.family_id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setFamilyMembers(data || []);
    } catch (error) {
      console.error('Hiba a családtagok betöltésekor:', error);
      toast.error('Hiba történt a családtagok betöltésekor!');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userProfile) {
      loadFamilyMembers();
    }
  }, [userProfile]); // eslint-disable-line react-hooks/exhaustive-deps

  // Családtag meghívása email címmel
  const inviteFamilyMember = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Kérjük, adjon meg egy email címet!');
      return;
    }

    if (!userProfile?.family_id) {
      toast.error('Nincs család beállítva!');
      return;
    }

    setIsInviting(true);
    try {
      // Ellenőrizzük, hogy létezik-e már ilyen email
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id, family_id')
        .eq('email', inviteEmail.trim())
        .single();

      if (existingUser) {
        if (existingUser.family_id === userProfile.family_id) {
          toast.error('Ez a felhasználó már a családod tagja!');
          return;
        } else if (existingUser.family_id) {
          toast.error('Ez a felhasználó már másik család tagja!');
          return;
        } else {
          // A felhasználó létezik, de nincs családja - hozzáadjuk
          const { error } = await supabase
            .from('profiles')
            .update({ family_id: userProfile.family_id })
            .eq('id', existingUser.id);

          if (error) throw error;
          
          toast.success('A felhasználó sikeresen hozzáadva a családhoz!');
          loadFamilyMembers();
          setInviteEmail('');
          setIsDialogOpen(false);
          return;
        }
      }

      // Itt lehetne email küldés funkciót implementálni
      // Egyelőre csak egy meghívó link generálása
      const inviteLink = `${window.location.origin}/join-family?code=${userProfile.family_id}&email=${encodeURIComponent(inviteEmail)}`;
      
      toast.success('Meghívó link elkészült! Küldd el a családtagnak.');
      console.log('Meghívó link:', inviteLink);
      
      // Vágólapra másolás
      navigator.clipboard.writeText(inviteLink);
      toast.info('Meghívó link a vágólapra másolva!');
      
    } catch (error) {
      console.error('Hiba a meghívás során:', error);
      toast.error('Hiba történt a meghívás során!');
    } finally {
      setIsInviting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('hu-HU');
  };

  const getMemberDisplayName = (member: FamilyMember) => {
    return member.display_name || member.full_name || member.email?.split('@')[0] || 'Névtelen';
  };

  const isCurrentUser = (member: FamilyMember) => {
    return member.id === userProfile?.id;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Családtagok
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">Betöltés...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          {family?.name || 'Család'} tagjai
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Családtagok listája */}
        <div className="space-y-3">
          {familyMembers.map((member) => (
            <div 
              key={member.id}
              className={`flex items-center justify-between p-3 rounded-lg border ${
                isCurrentUser(member) ? 'bg-cyan-50 border-cyan-200' : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-teal-500 rounded-full flex items-center justify-center">
                  {isCurrentUser(member) ? (
                    <Crown className="w-5 h-5 text-white" />
                  ) : (
                    <User className="w-5 h-5 text-white" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {getMemberDisplayName(member)}
                    </span>
                    {isCurrentUser(member) && (
                      <Badge variant="secondary" className="text-xs">
                        Te
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-500">
                    <Mail className="w-3 h-3" />
                    {member.email}
                  </div>
                </div>
              </div>
              <div className="text-sm text-gray-500">
                Csatlakozott: {formatDate(member.created_at)}
              </div>
            </div>
          ))}
        </div>

        {familyMembers.length === 0 && (
          <p className="text-gray-500 text-center py-4">
            Még nincsenek családtagok.
          </p>
        )}

        {/* Új családtag hozzáadása */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full" variant="outline">
              <UserPlus className="w-4 h-4 mr-2" />
              Családtag hozzáadása
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Új családtag meghívása</DialogTitle>
              <DialogDescription>
                Add meg a meghívni kívánt személy email címét. Ha már regisztrált, 
                automatikusan hozzáadódik a családodhoz. Egyébként meghívó linket kap.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">Email cím</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="pelda@email.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      inviteFamilyMember();
                    }
                  }}
                />
              </div>
              
              <div className="flex gap-2">
                <Button 
                  onClick={inviteFamilyMember}
                  disabled={isInviting || !inviteEmail.trim()}
                  className="flex-1"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isInviting ? 'Meghívás...' : 'Meghívás küldése'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsDialogOpen(false);
                    setInviteEmail('');
                  }}
                >
                  Mégse
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Statistikák */}
        <div className="pt-4 border-t">
          <p className="text-sm text-gray-500">
            Összesen {familyMembers.length} családtag
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
