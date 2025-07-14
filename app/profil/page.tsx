"use client";

import { useState, useEffect } from "react";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Textarea } from "@/src/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/src/components/ui/avatar";
import { Mail, Phone, MapPin, Calendar, Save, Camera, Users } from 'lucide-react';
import { createClient } from "@/src/lib/utils/supabase/client";
import { useUserProfile } from '@/src/hooks/useUserProfile';
import FamilyMembers from '@/src/components/family/FamilyMembers';

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  display_name: string;
  phone: string;
  address: string;
  birth_date: string;
  avatar_url: string;
  bio: string;
  family_id: string;
}

export default function ProfilPage() {
  const { getUserDisplayName, getUserInitials, getFamilyName, refetch } = useUserProfile();
  const [profile, setProfile] = useState<UserProfile>({
    id: '',
    email: '',
    full_name: '',
    display_name: '',
    phone: '',
    address: '',
    birth_date: '',
    avatar_url: '',
    bio: '',
    family_id: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const supabase = createClient();
        
        // Jelenlegi felhasználó lekérése
        const { data: userData, error: userError } = await supabase.auth.getUser();
        
        if (userError || !userData.user) {
          console.error('Error getting user:', userError);
          return;
        }

        // setCurrentUser(userData.user);
        
        // Profil lekérése
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userData.user.id)
          .single();

        if (profileError && profileError.code !== 'PGRST116') {
          console.error('Error fetching profile:', profileError);
        }

        // Ha van profil, használjuk azt, különben alapértelmezett értékek
        if (profileData) {
          setProfile(profileData);
        } else {
          // Alapértelmezett profil létrehozása az auth adatokból
          setProfile({
            id: userData.user.id,
            email: userData.user.email || '',
            full_name: userData.user.user_metadata?.full_name || '',
            display_name: userData.user.user_metadata?.display_name || '',
            phone: userData.user.user_metadata?.phone || '',
            address: '',
            birth_date: '',
            avatar_url: userData.user.user_metadata?.avatar_url || '',
            bio: '',
            family_id: ''
          });
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const handleSaveProfile = async () => {
    if (!profile.id) return;
    
    setSaving(true);
    try {
      const supabase = createClient();
      
      const profileData = {
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        display_name: profile.display_name,
        phone: profile.phone,
        address: profile.address,
        birth_date: profile.birth_date || null,
        avatar_url: profile.avatar_url,
        bio: profile.bio,
        updated_at: new Date().toISOString()
      };

      // Upsert (insert or update) profil
      const { data, error } = await supabase
        .from('profiles')
        .upsert([profileData])
        .select();

      if (error) {
        console.error('Error saving profile:', error);
        alert('Hiba történt a profil mentése során: ' + error.message);
      } else {
        console.log('Profile saved:', data);
        alert('Profil sikeresen mentve!');
        // Frissítjük a globális profil adatokat
        refetch();
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Hiba történt a mentés során!');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-400 via-pink-500 to-red-500 p-6 flex items-center justify-center">
        <div className="text-white text-xl">Betöltés...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-400 via-teal-500 to-green-500 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center space-y-2 mb-8">
          <h1 className="text-4xl font-bold text-white">Felhasználói Profil</h1>
          <p className="text-cyan-100">
            Üdvözöljük, {getUserDisplayName()}! Itt szerkesztheted a személyes adataidat.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profil kép és alapadatok */}
          <div className="lg:col-span-1">
            <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-teal-700">
                  Profilkép
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <Avatar className="w-32 h-32 mx-auto">
                  <AvatarImage src={profile.avatar_url} alt="Profilkép" />
                  <AvatarFallback className="text-2xl bg-gradient-to-br from-cyan-400 to-teal-500 text-white">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
                
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Profilkép URL
                  </Label>
                  <Input
                    type="url"
                    value={profile.avatar_url}
                    onChange={(e) => handleInputChange('avatar_url', e.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                    className="mt-1"
                  />
                </div>

                <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white">
                  <Camera size={16} className="mr-2" />
                  Kép feltöltése
                </Button>

                {/* Család információ */}
                <div className="mt-6 p-4 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-lg border border-teal-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="h-4 w-4 text-teal-600" />
                    <span className="text-sm font-medium text-gray-700">Család</span>
                  </div>
                  <span className="text-teal-700 font-medium">{getFamilyName()}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Személyes adatok */}
          <div className="lg:col-span-2">
            <Card className="bg-white/90 backdrop-blur-sm shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-teal-700">
                  Személyes adatok
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Email */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Mail size={16} />
                      Email cím
                    </Label>
                    <Input
                      type="email"
                      value={profile.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="mt-1"
                      disabled
                    />
                    <p className="text-xs text-gray-500 mt-1">Az email cím nem módosítható</p>
                  </div>

                  {/* Teljes név */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Teljes név *
                    </Label>
                    <Input
                      type="text"
                      value={profile.full_name}
                      onChange={(e) => handleInputChange('full_name', e.target.value)}
                      placeholder="pl. Kovács János"
                      className="mt-1"
                    />
                    <p className="text-xs text-gray-500 mt-1">Ez jelenik meg a hivatalos dokumentumokon</p>
                  </div>

                  {/* Megjelenítési név */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700">
                      Megjelenítési név *
                    </Label>
                    <Input
                      type="text"
                      value={profile.display_name}
                      onChange={(e) => handleInputChange('display_name', e.target.value)}
                      placeholder="Becenév vagy rövidített név"
                      className="mt-1"
                    />
                  </div>

                  {/* Telefon */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Phone size={16} />
                      Telefonszám
                    </Label>
                    <Input
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      placeholder="+36 30 123 4567"
                      className="mt-1"
                    />
                  </div>

                  {/* Születési dátum */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <Calendar size={16} />
                      Születési dátum
                    </Label>
                    <Input
                      type="date"
                      value={profile.birth_date}
                      onChange={(e) => handleInputChange('birth_date', e.target.value)}
                      className="mt-1"
                    />
                  </div>

                  {/* Cím */}
                  <div>
                    <Label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <MapPin size={16} />
                      Lakcím
                    </Label>
                    <Input
                      type="text"
                      value={profile.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      placeholder="1234 Budapest, Példa utca 12."
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <Label className="text-sm font-medium text-gray-700">
                    Bemutatkozás
                  </Label>
                  <Textarea
                    value={profile.bio}
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    placeholder="Írj magadról pár sort..."
                    className="mt-1"
                    rows={4}
                  />
                </div>

                {/* Mentés gomb */}
                <div className="flex justify-end pt-6 border-t border-gray-200">
                  <Button 
                    onClick={handleSaveProfile}
                    disabled={saving}
                    className="bg-teal-600 hover:bg-teal-700 text-white px-8"
                  >
                    <Save size={16} className="mr-2" />
                    {saving ? 'Mentés...' : 'Profil mentése'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Családi adatok */}
        <div className="mt-6">
          <Card className="bg-white shadow-lg">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Családi információk
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Család azonosító
                </Label>
                <Input
                  type="text"
                  value={profile.family_id}
                  disabled
                  className="mt-1 bg-gray-50"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Ez az azonosító köti össze a családtagokat. Automatikusan generált.
                </p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-700">
                  Felhasználó azonosító
                </Label>
                <Input
                  type="text"
                  value={profile.id}
                  disabled
                  className="mt-1 bg-gray-50"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Család információk és tagok */}
        <div className="mt-6 lg:mt-8">
          <FamilyMembers />
        </div>
      </div>
    </div>
  );
}
