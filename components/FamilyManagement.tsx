'use client';

import React, { useEffect, useState } from 'react';
import { Users, UserPlus, Mail, Phone, Crown, Eye, Trash2, Edit } from 'lucide-react';
import { FamilyMember } from '../types/enhanced';
import { createClient } from '@supabase/supabase-js';

interface FamilyManagementProps {
  userId: string;
  className?: string;
}

// Supabase kliens inicializálása
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const FamilyManagement: React.FC<FamilyManagementProps> = ({
  userId,
  className = ''
}) => {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [editingMember, setEditingMember] = useState<string | null>(null);

  const loadFamilyMembers = React.useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Először megkeressük a user family_id-ját
      const { data: userProfile, error: userError } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', userId)
        .single();

      if (userError) {
        console.error('Error finding user family:', userError);
        setError('Hiba a család megkeresése során');
        return;
      }

      // Majd betöltjük az összes családtagot
      const { data, error } = await supabase
        .from('family_members')
        .select('*')
        .eq('family_id', userProfile.family_id)
        .order('joined_at', { ascending: true });

      if (error) {
        console.error('Error loading family members:', error);
        setError('Hiba a családtagok betöltése során');
        return;
      }

      setMembers(data || []);
    } catch (err) {
      console.error('Exception in loadFamilyMembers:', err);
      setError('Váratlan hiba történt');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadFamilyMembers();
  }, [loadFamilyMembers]);

  const inviteMember = async () => {
    if (!inviteEmail.trim()) return;

    try {
      setInviteLoading(true);
      
      // Első lépés: megkeressük a meghívó családját
      const { data: inviterProfile, error: inviterError } = await supabase
        .from('family_members')
        .select('family_id')
        .eq('user_id', userId)
        .single();

      if (inviterError) {
        setError('Hiba a család megkeresése során');
        return;
      }

      // Második lépés: ellenőrizzük, hogy a meghívott email már létezik-e a családban
      const { data: existingMember } = await supabase
        .from('family_members')
        .select('id')
        .eq('family_id', inviterProfile.family_id)
        .eq('email', inviteEmail.trim().toLowerCase())
        .single();

      if (existingMember) {
        setError('Ez az email cím már tagja a családnak');
        return;
      }

      // Harmadik lépés: új meghívás létrehozása
      const { error } = await supabase
        .from('family_members')
        .insert({
          family_id: inviterProfile.family_id,
          email: inviteEmail.trim().toLowerCase(),
          role: 'member',
          status: 'invited',
          invited_by: userId,
          invited_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('Error inviting member:', error);
        setError('Hiba a meghívás során');
        return;
      }

      setInviteEmail('');
      loadFamilyMembers();
      
      // Itt lehetne email küldés implementálni
      alert(`Meghívás elküldve a következő címre: ${inviteEmail}`);
    } catch (err) {
      console.error('Exception in inviteMember:', err);
      setError('Váratlan hiba történt a meghívás során');
    } finally {
      setInviteLoading(false);
    }
  };

  const updateMemberRole = async (memberId: string, newRole: 'admin' | 'member' | 'viewer') => {
    try {
      const { error } = await supabase
        .from('family_members')
        .update({ role: newRole })
        .eq('id', memberId);

      if (error) {
        console.error('Error updating member role:', error);
        setError('Hiba a szerepkör frissítése során');
        return;
      }

      loadFamilyMembers();
    } catch (err) {
      console.error('Exception in updateMemberRole:', err);
      setError('Váratlan hiba történt');
    }
  };

  const removeMember = async (memberId: string) => {
    if (!confirm('Biztosan eltávolítod ezt a családtagot?')) return;

    try {
      const { error } = await supabase
        .from('family_members')
        .delete()
        .eq('id', memberId);

      if (error) {
        console.error('Error removing member:', error);
        setError('Hiba a családtag eltávolítása során');
        return;
      }

      loadFamilyMembers();
    } catch (err) {
      console.error('Exception in removeMember:', err);
      setError('Váratlan hiba történt');
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'admin': return <Crown className="w-4 h-4 text-yellow-600" />;
      case 'member': return <Users className="w-4 h-4 text-blue-600" />;
      case 'viewer': return <Eye className="w-4 h-4 text-gray-600" />;
      default: return <Users className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRoleName = (role: string) => {
    switch (role) {
      case 'admin': return 'Adminisztrátor';
      case 'member': return 'Tag';
      case 'viewer': return 'Megfigyelő';
      default: return 'Ismeretlen';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Aktív</span>;
      case 'invited':
        return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Meghívva</span>;
      case 'inactive':
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">Inaktív</span>;
      default:
        return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">Ismeretlen</span>;
    }
  };

  const currentUser = members.find(m => m.user_id === userId);
  const isAdmin = currentUser?.role === 'admin';

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-sm border p-6 ${className}`}>
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-sm border ${className}`}>
      <div className="p-6 border-b">
        <div className="flex items-center space-x-3 mb-4">
          <Users className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Család kezelése</h2>
        </div>

        {isAdmin && (
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="Email cím megadása..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && inviteMember()}
              />
            </div>
            <button
              onClick={inviteMember}
              disabled={inviteLoading || !inviteEmail.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>{inviteLoading ? 'Meghívás...' : 'Meghívás'}</span>
            </button>
          </div>
        )}

        {error && (
          <div className="mt-3 p-3 bg-red-100 border border-red-300 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}
      </div>

      <div className="divide-y">
        {members.map((member) => (
          <div key={member.id} className="p-6 hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-medium">
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt={member.display_name || member.email} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    (member.display_name || member.email).charAt(0).toUpperCase()
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-medium text-gray-900">
                      {member.full_name || member.display_name || member.email}
                    </h3>
                    {member.user_id === userId && (
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">Te</span>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                    <div className="flex items-center space-x-1">
                      <Mail className="w-3 h-3" />
                      <span>{member.email}</span>
                    </div>
                    {member.phone && (
                      <div className="flex items-center space-x-1">
                        <Phone className="w-3 h-3" />
                        <span>{member.phone}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-3 mt-2">
                    <div className="flex items-center space-x-1">
                      {getRoleIcon(member.role)}
                      <span className="text-sm text-gray-600">{getRoleName(member.role)}</span>
                    </div>
                    {getStatusBadge(member.status)}
                    <span className="text-xs text-gray-500">
                      Csatlakozott: {new Date(member.joined_at).toLocaleDateString('hu-HU')}
                    </span>
                  </div>
                </div>
              </div>

              {isAdmin && member.user_id !== userId && (
                <div className="flex items-center space-x-2">
                  <select
                    value={member.role}
                    onChange={(e) => updateMemberRole(member.id, e.target.value as 'admin' | 'member' | 'viewer')}
                    className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="viewer">Megfigyelő</option>
                    <option value="member">Tag</option>
                    <option value="admin">Adminisztrátor</option>
                  </select>
                  
                  <button
                    onClick={() => setEditingMember(editingMember === member.id ? null : member.id)}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded"
                    title="Szerkesztés"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  
                  <button
                    onClick={() => removeMember(member.id)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Eltávolítás"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {editingMember === member.id && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Teljes név</label>
                    <input
                      type="text"
                      defaultValue={member.full_name || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Megjelenített név</label>
                    <input
                      type="text"
                      defaultValue={member.display_name || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                    <input
                      type="tel"
                      defaultValue={member.phone || ''}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-2 mt-4">
                  <button
                    onClick={() => setEditingMember(null)}
                    className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
                  >
                    Mégse
                  </button>
                  <button
                    onClick={() => {
                      // Itt implementálni kell a mentést
                      setEditingMember(null);
                    }}
                    className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Mentés
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {members.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p>Még nincsenek családtagok.</p>
          <p className="text-sm mt-1">Hívj meg másokat email címük megadásával!</p>
        </div>
      )}

      <div className="px-6 py-4 bg-gray-50 border-t">
        <div className="text-sm text-gray-600">
          <p className="mb-2"><strong>Szerepkörök magyarázata:</strong></p>
          <ul className="space-y-1 text-xs">
            <li className="flex items-center space-x-2">
              <Crown className="w-3 h-3 text-yellow-600" />
              <span><strong>Adminisztrátor:</strong> Teljes hozzáférés, családtagok kezelése</span>
            </li>
            <li className="flex items-center space-x-2">
              <Users className="w-3 h-3 text-blue-600" />
              <span><strong>Tag:</strong> Vásárlási listák létrehozása és szerkesztése</span>
            </li>
            <li className="flex items-center space-x-2">
              <Eye className="w-3 h-3 text-gray-600" />
              <span><strong>Megfigyelő:</strong> Csak megtekintési jogosultság</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default FamilyManagement;