"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { Calculator, Clock, Plus, TrendingUp, Info } from 'lucide-react';
import { createClient } from "@/src/lib/utils/supabase/client";
import type { User as SupabaseUser } from "@supabase/supabase-js";

interface SavedCalculation {
  id: string;
  family_member_id: string;
  alapber: number;
  ledolgozott_napok: number;
  brutto_ber: number;
  netto_ber: number;
  created_at: string;
}

interface User {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    display_name?: string;
  };
}

export default function BerkalkulatorPage() {
  // Állapotok
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [familyMember, setFamilyMember] = useState("");
  const [alapber, setAlapber] = useState(986400);
  const [ledolgozottNapok, setLedolgozottNapok] = useState(18.15); // 147.06 / 8.1
  const [szabadsagNapok, setSzabadsagNapok] = useState(3.03); // 24.51 / 8.1
  const [tuloraOrak, setTuloraOrak] = useState(0);
  const [unnepnapiOrak, setUnnepnapiOrak] = useState(8.17);
  
  // Számított értékek
  const ledolgozottOrak = ledolgozottNapok * 8.1;
  const muszakpotlekOrak = ledolgozottOrak; // Mindig megegyezik a ledolgozott órákkal
  const szabadsagOrak = szabadsagNapok * 8.1;
  const [betegszabadsagNapok, setBetegszabadsagNapok] = useState(0);
  const [kikuldetesNapok, setKikuldetesNapok] = useState(4.05);
  const [gyedMellett, setGyedMellett] = useState(30);
  const [formaruhakompenzacio, setFormaruhakompenzacio] = useState(0);
  const [családiAdókedvezmény, setCsaládiAdókedvezmény] = useState(333330);
  interface SalaryResult {
    alapber: number;
    oraber: number;
    haviberesIdober: number;
    fizetettSzabadsag: number;
    tuloraAlapossszeg: number;
    muszakpotlek: number;
    tuloraMuszakpotlek: number;
    unnepnapiMunka: number;
    betegszabadsag: number;
    kikuldetesTobblet: number;
    gyedMunkavMellett: number;
    formaruhakompenzacio: number;
    bruttoBer: number;
    osszesJarandsag: number;
    tbJarulék: number;
    nyugdijJarulék: number;
    onkentesNyugdij: number;
    erdekKepvTagdij: number;
    szja: number;
    szjaAlap: number;
    kedvezményesAlap: number;
    osszesLevonas: number;
    netto: number;
    szocHozzjarulas: number;
    teljesMunkaltaroiKoltseg: number;
    levonasArany: string;
    munkaltaroiTerhek: string;
  }

  const [eredmény, setEredmény] = useState<SalaryResult | null>(null);

  // 2025-ös kulcsok a bérpapír alapján
  const KULCSOK = {
    SZOCIALIS_HOZZAJARULAS: 0.135, // 13.5%
    TB_JARULÉK: 0.185, // 18.5% (dolgozói)
    NYUGDIJJARULÉK: 0.10, // 10% (csak nagyobb bérekeknél)
    SZJA_KULCS: 0.15, // 15%
    ÖNKÉNTES_NYUGDIJ: 0.02, // 2% (opcionális)
    MUSZAKPOTLEK: 0.45, // 45% műszakpótlék
    TULORA_SZORZO: 1.5, // 150% túlóra
    UNNEPNAPI_SZORZO: 2.0, // 200% ünnepnapi munka
    BETEGSZABADSAG_SZAZALEK: 0.70, // 70% betegszabadság
    GYED_NAPI: 13570, // GYED napi összeg (407120/30)
    KIKULDETESI_POTLEK: 6710, // ~27165/4.05 nap
    ERDEKKÉPVISELETI_TAGDIJ_SZAZALEK: 0.008 // ~0.8%
  };

  const calculateSalary = useCallback(() => {
    // Alapbér óránkénti számítása (havi alapbér / 174 óra)
    const oraber = alapber / 174;
    
    // Járandóságok számítása
    const haviberesIdober = Math.round(ledolgozottOrak * oraber);
    const fizetettSzabadsag = Math.round(szabadsagOrak * oraber);
    const tuloraAlapossszeg = Math.round(tuloraOrak * oraber);
    const muszakpotlek = Math.round(muszakpotlekOrak * oraber * KULCSOK.MUSZAKPOTLEK);
    const tuloraMuszakpotlek = Math.round(tuloraOrak * oraber * KULCSOK.MUSZAKPOTLEK);
    const unnepnapiMunka = Math.round(unnepnapiOrak * oraber * KULCSOK.UNNEPNAPI_SZORZO);
    const betegszabadsag = Math.round(betegszabadsagNapok * (oraber * 8) * KULCSOK.BETEGSZABADSAG_SZAZALEK);
    const kikuldetesTobblet = Math.round(kikuldetesNapok * KULCSOK.KIKULDETESI_POTLEK);
    const gyedMunkavMellett = Math.round(gyedMellett * KULCSOK.GYED_NAPI);
    
    // Bruttó bér összesen
    const bruttoBer = haviberesIdober + fizetettSzabadsag + tuloraAlapossszeg + 
                     muszakpotlek + tuloraMuszakpotlek + unnepnapiMunka + 
                     betegszabadsag + kikuldetesTobblet;
    
    // Összes járandóság (bruttó + egyéb juttatások)
    const osszesJarandsag = bruttoBer + gyedMunkavMellett + formaruhakompenzacio;
    
    // TB járulék számítás (bruttó bér alapján)
    const tbJarulékAlap = Math.min(bruttoBer, 1200000);
    const tbJarulék = Math.round(tbJarulékAlap * KULCSOK.TB_JARULÉK);
    
    // Nyugdíjjárulék (csak nagyobb bérekeknél)
    const nyugdijJarulék = bruttoBer > 500000 ? Math.round(bruttoBer * KULCSOK.NYUGDIJJARULÉK) : 0;
    
    // Önkéntes nyugdíjpénztári befizetés
    const onkentesNyugdij = Math.round(bruttoBer * KULCSOK.ÖNKÉNTES_NYUGDIJ);
    
    // Érdekképviseleti tagdíj
    const erdekKepvTagdij = Math.round(bruttoBer * KULCSOK.ERDEKKÉPVISELETI_TAGDIJ_SZAZALEK);
    
    // SZJA alap (GYED nem része az SZJA alapnak)
    const szjaAlap = bruttoBer + formaruhakompenzacio - tbJarulék - nyugdijJarulék - onkentesNyugdij;
    
    // Családi adókedvezmény alkalmazása
    const kedvezményesAlap = Math.max(0, szjaAlap - családiAdókedvezmény);
    
    // SZJA számítás
    const szja = Math.round(kedvezményesAlap * KULCSOK.SZJA_KULCS);
    
    // Összes levonás
    const osszesLevonas = tbJarulék + nyugdijJarulék + onkentesNyugdij + szja + erdekKepvTagdij;
    
    // Nettó fizetés
    const netto = osszesJarandsag - osszesLevonas;
    
    // Munkáltatói terhek
    const szocHozzjarulas = Math.round((bruttoBer + formaruhakompenzacio) * KULCSOK.SZOCIALIS_HOZZAJARULAS);
    const teljesMunkaltaroiKoltseg = osszesJarandsag + szocHozzjarulas;

    setEredmény({
      alapber,
      oraber: Math.round(oraber),
      haviberesIdober,
      fizetettSzabadsag,
      tuloraAlapossszeg,
      muszakpotlek,
      tuloraMuszakpotlek,
      unnepnapiMunka,
      betegszabadsag,
      kikuldetesTobblet,
      gyedMunkavMellett,
      formaruhakompenzacio,
      bruttoBer,
      osszesJarandsag,
      tbJarulék,
      nyugdijJarulék,
      onkentesNyugdij,
      erdekKepvTagdij,
      szja,
      szjaAlap,
      kedvezményesAlap,
      osszesLevonas,
      netto,
      szocHozzjarulas,
      teljesMunkaltaroiKoltseg,
      levonasArany: ((osszesLevonas / osszesJarandsag) * 100).toFixed(1),
      munkaltaroiTerhek: ((szocHozzjarulas / osszesJarandsag) * 100).toFixed(1)
    });
  }, [alapber, ledolgozottNapok, ledolgozottOrak, szabadsagNapok, szabadsagOrak, tuloraOrak, muszakpotlekOrak, 
      unnepnapiOrak, betegszabadsagNapok, kikuldetesNapok, gyedMellett, 
      formaruhakompenzacio, családiAdókedvezmény]);

  // Felhasználók lekérése Supabase-ből
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const supabase = createClient();
        
        // Egyszerűbb megközelítés: profiles tábla használata
        const { data: profilesData, error } = await supabase
          .from('profiles')
          .select('id, email, full_name, display_name');
        
        if (error) {
          console.error('Error fetching profiles:', error);
          // Ha nincs profiles tábla, használjunk statikus adatokat
          setUsers([
            { id: '1', email: 'janos@example.com', user_metadata: { full_name: 'János' } },
            { id: '2', email: 'eva@example.com', user_metadata: { full_name: 'Éva' } },
            { id: '3', email: 'peter@example.com', user_metadata: { full_name: 'Péter' } }
          ]);
        } else {
          const formattedUsers = profilesData?.map(profile => ({
            id: profile.id,
            email: profile.email,
            user_metadata: {
              full_name: profile.full_name || profile.display_name,
              display_name: profile.display_name
            }
          })) || [];
          setUsers(formattedUsers);
          
          // Alapértelmezett családtag beállítása
          if (!familyMember && formattedUsers.length > 0) {
            setFamilyMember(formattedUsers[0].id);
          }
        }
      } catch (error) {
        console.error('Error:', error);
        // Fallback statikus adatok
        const fallbackUsers = [
          { id: '1', email: 'janos@example.com', user_metadata: { full_name: 'János' } },
          { id: '2', email: 'eva@example.com', user_metadata: { full_name: 'Éva' } },
          { id: '3', email: 'peter@example.com', user_metadata: { full_name: 'Péter' } }
        ];
        setUsers(fallbackUsers);
        if (!familyMember) {
          setFamilyMember('1');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    calculateSalary();
  }, [calculateSalary]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Korábbi számítások lekérése
  const [savedCalculations, setSavedCalculations] = useState<SavedCalculation[]>([]);
  
  const fetchSavedCalculations = useCallback(async () => {
    if (!familyMember) return;
    
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('salary_calculations')
        .select('*')
        .eq('family_member_id', familyMember)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching saved calculations:', error);
      } else {
        setSavedCalculations(data || []);
      }
    } catch (error) {
      console.error('Error:', error);
    }
  }, [familyMember]);

  // Számítások lekérése családtag váltáskor
  useEffect(() => {
    fetchSavedCalculations();
  }, [fetchSavedCalculations]);

  // Form küldés és mentés Supabase-be
  const handleSaveCalculation = async () => {
    if (!familyMember || !eredmény) {
      alert('Kérjük válasszon családtagot és számítsa ki a bért!');
      return;
    }

    try {
      const supabase = createClient();
      
      const calculationData = {
        family_member_id: familyMember,
        alapber,
        ledolgozott_napok: ledolgozottNapok,
        ledolgozott_orak: ledolgozottOrak,
        szabadsag_napok: szabadsagNapok,
        szabadsag_orak: szabadsagOrak,
        tulora_orak: tuloraOrak,
        muszakpotlek_orak: muszakpotlekOrak,
        unnepnapi_orak: unnepnapiOrak,
        betegszabadsag_napok: betegszabadsagNapok,
        kikuldes_napok: kikuldetesNapok,
        gyed_mellett: gyedMellett,
        formaruha_kompenzacio: formaruhakompenzacio,
        csaladi_adokedvezmeny: családiAdókedvezmény,
        // Számított eredmények
        brutto_ber: eredmény.bruttoBer,
        netto_ber: eredmény.netto,
        szja: eredmény.szja,
        tb_jarulék: eredmény.tbJarulék,
        szoc_hozzajarulas: eredmény.szocHozzjarulas,
        teljes_munkaltaroi_koltseg: eredmény.teljesMunkaltaroiKoltseg,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('salary_calculations')
        .insert([calculationData])
        .select();

      if (error) {
        console.error('Error saving calculation:', error);
        alert('Hiba történt a mentés során: ' + error.message);
      } else {
        console.log('Calculation saved:', data);
        alert('Számítás sikeresen elmentve!');
        // Frissítjük a korábbi számításokat
        fetchSavedCalculations();
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Hiba történt a mentés során!');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-400 via-teal-500 to-green-500 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-white mb-6">
          <div className="flex items-center gap-3 mb-4">
            <Calculator className="text-white" size={32} />
            <h1 className="text-3xl font-bold">Részletes Magyar Bérkalkulátor 2025</h1>
          </div>
          <p className="text-lg">
            Számítsd ki a havi nettó bért és add hozzá a passzív jövedelemeket a teljes 
            jövedelem meghatározásához.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Kalkulátor forma */}
          <div className="lg:col-span-2">
            <Card className="bg-white shadow-lg">
              <CardContent className="p-6">
                <div className="grid lg:grid-cols-3 gap-6 mb-6">
                  {/* Alapadatok */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                      <Info size={20} />
                      Alapadatok
                    </h3>
                    
                    {/* Családtag */}
                    <div>
                      <Label htmlFor="family-member" className="text-sm font-medium text-gray-700">
                        Családtag
                      </Label>
                      <Select value={familyMember} onValueChange={setFamilyMember}>
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder={loading ? "Betöltés..." : "Válassz családtagot"} />
                        </SelectTrigger>
                        <SelectContent>
                          {users.map((user) => (
                            <SelectItem key={user.id} value={user.id}>
                              {user.user_metadata?.full_name || user.email || `Felhasználó ${user.id}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        Besorolási alapbér (Ft/hó)
                      </Label>
                      <div className="mt-1 relative">
                        <Input
                          type="number"
                          value={alapber}
                          onChange={(e) => setAlapber(Number(e.target.value))}
                          className="pr-8"
                        />
                        <span className="absolute right-3 top-3 text-sm text-gray-500">Ft</span>
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        Családi adókedvezmény (Ft/hó)
                      </Label>
                      <div className="mt-1 relative">
                        <Input
                          type="number"
                          value={családiAdókedvezmény}
                          onChange={(e) => setCsaládiAdókedvezmény(Number(e.target.value))}
                          className="pr-8"
                        />
                        <span className="absolute right-3 top-3 text-sm text-gray-500">Ft</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">2 gyermek: 333.330 Ft</p>
                    </div>
                  </div>

                  {/* Munkaidő */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                      <Clock size={20} />
                      Munkaidő
                    </h3>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        Ledolgozott napok
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={ledolgozottNapok}
                        onChange={(e) => setLedolgozottNapok(Number(e.target.value))}
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {ledolgozottOrak.toFixed(2)} óra (1 nap = 8,1 óra)
                      </p>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        Fizetett szabadság (nap)
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={szabadsagNapok}
                        onChange={(e) => setSzabadsagNapok(Number(e.target.value))}
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        {szabadsagOrak.toFixed(2)} óra (1 nap = 8,1 óra)
                      </p>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        Túlóra (óra)
                      </Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={tuloraOrak}
                        onChange={(e) => setTuloraOrak(Number(e.target.value))}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        Műszakpótlékos órák
                      </Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={muszakpotlekOrak}
                        disabled
                        className="mt-1 bg-gray-50"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Automatikusan számított: {muszakpotlekOrak.toFixed(2)} óra (+45% pótlék)
                      </p>
                    </div>
                  </div>

                  {/* Egyéb */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                      <Plus size={20} />
                      Egyéb
                    </h3>
                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        Ünnepnapi munka (óra)
                      </Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={unnepnapiOrak}
                        onChange={(e) => setUnnepnapiOrak(Number(e.target.value))}
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">+100% pótlék</p>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        Betegszabadság (nap)
                      </Label>
                      <Input
                        type="number"
                        value={betegszabadsagNapok}
                        onChange={(e) => setBetegszabadsagNapok(Number(e.target.value))}
                        className="mt-1"
                      />
                      <p className="text-xs text-gray-500 mt-1">70% térítés</p>
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        Kiküldetés (nap)
                      </Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={kikuldetesNapok}
                        onChange={(e) => setKikuldetesNapok(Number(e.target.value))}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        GYED munkavégzés mellett (nap)
                      </Label>
                      <Input
                        type="number"
                        value={gyedMellett}
                        onChange={(e) => setGyedMellett(Number(e.target.value))}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-sm font-medium text-gray-700">
                        Formaruha kompenzáció (Ft)
                      </Label>
                      <Input
                        type="number"
                        value={formaruhakompenzacio}
                        onChange={(e) => setFormaruhakompenzacio(Number(e.target.value))}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Számítás és mentés gombok */}
                <div className="flex gap-3">
                  <Button onClick={calculateSalary} className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white py-3">
                    Számítás
                  </Button>
                  <Button 
                    onClick={handleSaveCalculation} 
                    className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3"
                    disabled={!eredmény}
                  >
                    Mentés
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Eredmény és korábbi kalkulációk */}
          <div className="space-y-6">
            {/* Eredmény */}
            {eredmény && (
              <Card className="bg-white shadow-lg">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <TrendingUp className="text-green-500" size={20} />
                    Eredmény
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600">Órabér</p>
                    <p className="text-lg font-bold text-cyan-600">
                      {formatCurrency(eredmény.oraber)}/óra
                    </p>
                  </div>

                  <div>
                    <p className="text-sm text-gray-600">Bruttó bér összesen</p>
                    <p className="text-xl font-bold text-green-600">
                      {formatCurrency(eredmény.bruttoBer)}
                    </p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-gray-600">Összes levonás</p>
                    <p className="text-lg font-bold text-red-600">
                      -{formatCurrency(eredmény.osszesLevonas)}
                    </p>
                    <p className="text-xs text-gray-500">
                      Levonások aránya: {eredmény.levonasArany}%
                    </p>
                  </div>

                  <div className="pt-3 border-t">
                    <p className="text-sm text-gray-600">Nettó fizetés</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(eredmény.netto)}
                    </p>
                  </div>

                  <div className="pt-3 border-t bg-orange-50 p-3 rounded-lg">
                    <p className="text-xs font-semibold text-gray-700 mb-1">Munkáltatói terhek:</p>
                    <p className="text-xs text-gray-600">
                      Szoc. hozzájárulás: {formatCurrency(eredmény.szocHozzjarulas)}
                    </p>
                    <p className="text-xs font-semibold text-gray-700">
                      Teljes költség: {formatCurrency(eredmény.teljesMunkaltaroiKoltseg)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Korábbi kalkulációk */}
            <Card className="bg-white shadow-lg">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Korábbi kalkulációk
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {savedCalculations.length > 0 ? (
                  savedCalculations.map((calc) => (
                    <div key={calc.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="font-medium text-gray-900">
                            {users.find(u => u.id === calc.family_member_id)?.user_metadata?.full_name || 'Ismeretlen'} - 
                            {new Date(calc.created_at).toLocaleDateString('hu-HU', { month: 'long' })}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(calc.created_at).toLocaleDateString('hu-HU')}
                          </p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Alapbér:</span>
                          <span className="font-medium text-gray-900">
                            {calc.alapber.toLocaleString()} Ft
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Ledolgozott napok:</span>
                          <span className="font-medium text-gray-900">
                            {calc.ledolgozott_napok} nap
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Bruttó bér:</span>
                          <span className="font-medium text-gray-900">
                            {calc.brutto_ber.toLocaleString()} Ft
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Nettó bér:</span>
                          <span className="font-medium text-green-600">
                            {calc.netto_ber.toLocaleString()} Ft
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    {loading ? 'Betöltés...' : 'Nincs mentett kalkuláció'}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
