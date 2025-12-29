"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/src/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/src/components/ui/select";
import { Calculator, Clock, Plus, TrendingUp, Info, Trash2 } from 'lucide-react';
import { createClient } from "@/src/lib/utils/supabase/client";
import { setActiveIncomePlan } from "@/lib/userPreferences";

interface SavedCalculation {
  id: string;
  family_member_id: string;
  name?: string;
  alapber: number;
  munkarend_napok?: number;
  ledolgozott_napok: number;
  ledolgozott_orak?: number;
  szabadsag_napok?: number;
  szabadsag_orak?: number;
  tulora_orak?: number;
  muszakpotlek_orak?: number;
  unnepnapi_orak?: number;
  betegszabadsag_napok?: number;
  kikuldes_napok?: number;
  gyed_mellett?: number;
  formaruha_kompenzacio?: number;
  csaladi_adokedvezmeny?: number;
  brutto_ber: number;
  netto_ber: number;
  szja?: number;
  tb_jarulék?: number;
  additional_incomes?: string;
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

interface AdditionalIncome {
  id: string;
  name: string;
  amount: number;
}

// 2025-ös kulcsok a bérpapír alapján (konstansként a komponens kívül)
const KULCSOK = {
  // TB és járulékok
  TB_JARULÉK: 0.185, // 18.5% (298624 / 1614185 ≈ 0.185)
  SZJA_KULCS: 0.15, // 15% (adóelőleg)
  ÖNKÉNTES_NYUGDIJ: 0.015, // 1.5% (24213 / 1614185 ≈ 0.015)
  MÉSZ_TAGDIJ: 0.007, // 0.7% (11299 / 1614185 ≈ 0.007)
  SZOCIALIS_HOZZAJARULAS: 0.135, // 13.5% munkáltatói teher
  
  // Munkaidő konstansok
  HAVI_ÓRASZÁM: 174, // havi teljes munkaidő
  NAPI_ÓRASZÁM: 8.17, // napi munkaidő
  
  // Pótlékok (a bérpapír alapján)
  MUSZAKPOTLEK: 0.45, // 45% műszakpótlék
  MUSZAKPOTLEK_SZAZALEK: 0.45, // 45% műszakpótlék
  TULORA_POTLEK: 1.5, // 150% túlórapótlék
  SZABADNAPOS_TULORA: 2.0, // 200% szabadnapos túlóra
  PIHENONAPOS_TULORA: 1.5, // 150% pihenőnapos túlóra
  MUNKASZUNETI_POTLEK: 2.0, // 200% munkaszüneti nap
  UNNEPNAPI_SZORZO: 2.0, // 200% ünnepnapi munka
  
  // Egyéb konstansok
  GYEREKEK_UTAN_KEDVEZMENY: 333330, // 2 gyermek utáni adókedvezmény
  BETEGSZABADSAG_SZAZALEK: 0.70, // 70% betegszabadság
  GYED_NAPI: 13570, // GYED napi összeg
  KIKULDETESI_POTLEK: 6710, // kiküldetési pótlék napi
  ERDEKKÉPVISELETI_TAGDIJ_SZAZALEK: 0.008, // érdekképviseleti tagdíj
  NYUGDIJJARULÉK: 0.10 // nyugdíjjárulék nagyobb bérekeknél
};

export default function BerkalkulatorPage() {
  // Állapotok a bérpapír adatok alapján
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [familyMember, setFamilyMember] = useState("");
  const [calculationName, setCalculationName] = useState(""); // Kalkuláció neve
  const [alapber, setAlapber] = useState(986400); // Alapbér a bérpapírból
  const [jutalom, setJutalom] = useState(0); // Jutalom (eseti jövedelem)
  const [munkarendNapok, setMunkarendNapok] = useState(20); // Munkarend szerinti napok
  const [szabadsagNapok, setSzabadsagNapok] = useState(0); // Fizetett szabadság: 0 nap (default)
  const [tuloraOrak, setTuloraOrak] = useState(0); // Túlóra: 0 óra (default)
  const [unnepnapiOrak, setUnnepnapiOrak] = useState(0); // Munkaszüneti munkavégzés: 0 óra (default)
  const [additionalIncomes, setAdditionalIncomes] = useState<AdditionalIncome[]>([]);
  
  // Számított értékek a munkarend alapján
  const ledolgozottNapok = munkarendNapok - szabadsagNapok; // Ledolgozott napok = munkanapok - szabadság
  const munkarendSzerintiOrak = munkarendNapok * 8.1; // Munkarend szerinti idő: napok * 8,1 óra
  const ledolgozottOrak = ledolgozottNapok * 8.1; // Ledolgozott órák: ledolgozott napok * 8,1
  // muszakpotlekOrak már nem használt, a műszakpótlék a havibéres időbér alapján számolódik
  const szabadsagOrak = szabadsagNapok * 8.1; // Fizetett szabadság órák
  const [betegszabadsagNapok, setBetegszabadsagNapok] = useState(0);
  const [kikuldetesNapok, setKikuldetesNapok] = useState(0);
  const [gyedMellett, setGyedMellett] = useState(0); // GYED munkavégzés mellett: 0 nap (default)
  const [formaruhakompenzacio, setFormaruhakompenzacio] = useState(0);
  const [családiAdókedvezmény, setCsaládiAdókedvezmény] = useState(500000); // Családi adókedvezmény: 500,000 Ft (default)
  interface SalaryResult {
    alapber: number;
    jutalom: number;
    oraber: number;
    haviberesIdober: number;
    fizetettSzabadsag: number;
    tuloraAlapossszeg: number;
    tuloraPotlek: number; // Hozzáadva a túlóra pótlék
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
  const [savedCalculations, setSavedCalculations] = useState<SavedCalculation[]>([]);

  // Helper funkció az input mezők kezelésére
  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  const handleInputChange = (setter: (value: number) => void) => {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      console.log('Input changed:', value);
      if (value === '') {
        setter(0);
      } else {
        setter(Number(value));
      }
    };
  };

  const calculateSalary = useCallback(() => {
    console.log('calculateSalary function called with inputs:', {
      alapber, 
      munkarendNapok,
      munkarendSzerintiOrak,
      szabadsagNapok,
      ledolgozottOrak, // Calculated dynamically
      szabadsagOrak, // Calculated dynamically
      tuloraOrak, 
      unnepnapiOrak
    });
    console.log('calculateSalary called with alapber:', alapber);
    console.log('munkarendSzerintiOrak:', munkarendSzerintiOrak);
    console.log('ledolgozottOrak:', ledolgozottOrak);
    
    // Órabér számítása a helyes képlet szerint: alapbér / munkarend szerinti órák
    const oraber = alapber / munkarendSzerintiOrak;
    
    console.log('Calculated oraber (alapber / munkarendSzerintiOrak):', oraber, '=', alapber, '/', munkarendSzerintiOrak);
    
    // Járandóságok számítása a helyes órábérrel
    // Havibéres időbér: ledolgozott órák × órábér
    const haviberesIdober = Math.round(ledolgozottOrak * oraber);
    
    // Fizetett szabadság: szabadság órák × órábér
    const fizetettSzabadsag = Math.round(szabadsagOrak * oraber);
    
    // Túlóra alap: túlóra órák × órábér
    const tuloraAlapossszeg = Math.round(tuloraOrak * oraber);
    
    // Túlóra pótlék: túlóra órák × órábér × 150%
    const tuloraPotlek = Math.round(tuloraOrak * oraber * KULCSOK.TULORA_POTLEK);
    
    // Műszakpótlék: havibéres időbér × 45%
    // FONTOS: A műszakpótlék az ALAPBÉR (havibéres időbér) 45%-a, NEM az órák × órábér × 45%!
    const muszakpotlek = Math.round(haviberesIdober * KULCSOK.MUSZAKPOTLEK);
    
    // Túlóra műszakpótlék: túlóra alap × 45%
    // FONTOS: A túlóra műszakpótléke a túlóra ALAPössszeg 45%-a, nem az órák × órábér × 45%!
    const tuloraMuszakpotlek = Math.round(tuloraAlapossszeg * KULCSOK.MUSZAKPOTLEK);
    
    // Munkaszüneti munkavégzés: 8,17 óra × 8750 Ft/óra = 71488 Ft (200% szorzó)
    const unnepnapiMunka = Math.round(unnepnapiOrak * oraber * KULCSOK.MUNKASZUNETI_POTLEK);
    
    // Betegszabadság, kiküldetés, GYED - ezek nem szerepelnek a példa bérpapíron
    const betegszabadsag = Math.round(betegszabadsagNapok * (oraber * 8) * KULCSOK.BETEGSZABADSAG_SZAZALEK);
    const kikuldetesTobblet = Math.round(kikuldetesNapok * KULCSOK.KIKULDETESI_POTLEK);
    const gyedMunkavMellett = Math.round(gyedMellett * KULCSOK.GYED_NAPI);
    
    // Bruttó bér összesen (jutalom hozzáadva)
    const bruttoBer = haviberesIdober + fizetettSzabadsag + tuloraAlapossszeg + tuloraPotlek +
                     muszakpotlek + tuloraMuszakpotlek + unnepnapiMunka +
                     betegszabadsag + kikuldetesTobblet + jutalom;
    
    // Összes járandóság (bruttó + GYED + formaruha)
    const osszesJarandsag = bruttoBer + gyedMunkavMellett + formaruhakompenzacio;
    
    // Levonások a bérpapír szerint:
    // Adóelőleg: 165 433 Ft
    // TB járulék: 298 624 Ft  
    // Önkéntes nyugdíj: 24 213 Ft
    // MÉSZ: 11 299 Ft
    
    // TB járulék: 18.5% a bruttó bérből
    const tbJarulék = Math.round(bruttoBer * KULCSOK.TB_JARULÉK);
    
    // Önkéntes nyugdíjpénztári befizetés: 1.5%
    const onkentesNyugdij = Math.round(bruttoBer * KULCSOK.ÖNKÉNTES_NYUGDIJ);
    
    // MÉSZ tagdíj: 0.7%
    const meszTagdij = Math.round(bruttoBer * KULCSOK.MÉSZ_TAGDIJ);
    
    // SZJA alap számítása: bruttó + formaruha - TB - nyugdíj - családi kedvezmény
    // A családi adókedvezmény AZ ADÓALAPOT csökkenti!
    const szjaAlapKedvezmenyElott = bruttoBer - meszTagdij;
    const szjaAlap = Math.max(0, szjaAlapKedvezmenyElott - családiAdókedvezmény);
    
    // SZJA számítás: 15% a (kedvezménnyel csökkentett) adóalapból
    const szja = Math.round(szjaAlap * KULCSOK.SZJA_KULCS);
    
    // Összes levonás (bérpapír szerint: 499 569 Ft)
    const osszesLevonas = tbJarulék + onkentesNyugdij + meszTagdij + szja;
    
    // Nettó fizetés (bérpapír szerint: 1 114 616 Ft)
    const netto = osszesJarandsag - osszesLevonas;
    
    // Munkáltatói terhek: 13.5%
    const szocHozzjarulas = Math.round((bruttoBer + formaruhakompenzacio) * KULCSOK.SZOCIALIS_HOZZAJARULAS);
    const teljesMunkaltaroiKoltseg = osszesJarandsag + szocHozzjarulas;

    console.log('Calculation completed:', { bruttoBer, netto, szja, tbJarulék });

    setEredmény({
      alapber,
      jutalom,
      oraber: Math.round(oraber),
      haviberesIdober,
      fizetettSzabadsag,
      tuloraAlapossszeg,
      tuloraPotlek,
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
      nyugdijJarulék: 0, // A példában nem szerepel
      onkentesNyugdij,
      erdekKepvTagdij: meszTagdij, // MÉSZ tagdíj
      szja,
      szjaAlap, // Adóalap a családi kedvezmény levonása UTÁN
      kedvezményesAlap: szjaAlap, // Ugyanaz, mint az szjaAlap (kompatibilitás)
      osszesLevonas,
      netto,
      szocHozzjarulas,
      teljesMunkaltaroiKoltseg,
      levonasArany: ((osszesLevonas / osszesJarandsag) * 100).toFixed(1),
      munkaltaroiTerhek: ((szocHozzjarulas / osszesJarandsag) * 100).toFixed(1)
    });
  }, [alapber, jutalom, munkarendNapok, szabadsagNapok, tuloraOrak, 
      unnepnapiOrak, betegszabadsagNapok, kikuldetesNapok, gyedMellett, 
      formaruhakompenzacio, családiAdókedvezmény, munkarendSzerintiOrak, 
      ledolgozottOrak, szabadsagOrak, setEredmény]);

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
    // Kezdeti számítás
    setTimeout(() => {
      calculateSalary();
    }, 100);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    console.log('First useEffect triggered, running calculation...');
    calculateSalary();
  }, [calculateSalary]);

  // Automatikus újraszámítás az input értékek változásánál
  useEffect(() => {
    console.log('Automatic recalculation triggered due to input changes...');
    const timer = setTimeout(() => {
      calculateSalary();
    }, 100); // Kis késleltetéssel, hogy ne legyen túl gyakori

    return () => clearTimeout(timer);
  }, [alapber, munkarendNapok, szabadsagNapok, tuloraOrak, unnepnapiOrak, 
      betegszabadsagNapok, kikuldetesNapok, gyedMellett, formaruhakompenzacio, 
      családiAdókedvezmény, additionalIncomes, calculateSalary]);

  // Kezdeti számítás az oldal betöltésekor
  useEffect(() => {
    console.log('Initial calculation triggered on page load...');
    calculateSalary();
  }, [calculateSalary]); // Csak egyszer, az oldal betöltésekor

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  // Korábbi számítások lekérése
  
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
  }, [familyMember, setSavedCalculations]);

  // Kalkuláció betöltése módosításhoz
  const handleLoadCalculation = (calc: SavedCalculation) => {
    // Beállítjuk a kalkuláció nevét
    setCalculationName(calc.name || '');
    
    // Beállítjuk az alapadatokat
    setAlapber(calc.alapber);
    setMunkarendNapok(calc.munkarend_napok || 20);
    setSzabadsagNapok(calc.szabadsag_napok || 0);
    setTuloraOrak(calc.tulora_orak || 0);
    setUnnepnapiOrak(calc.unnepnapi_orak || 0);
    setBetegszabadsagNapok(calc.betegszabadsag_napok || 0);
    setKikuldetesNapok(calc.kikuldes_napok || 0);
    setGyedMellett(calc.gyed_mellett || 0);
    setFormaruhakompenzacio(calc.formaruha_kompenzacio || 0);
    setCsaládiAdókedvezmény(calc.csaladi_adokedvezmeny || 0);
    
    // Egyéb jövedelmek betöltése
    if (calc.additional_incomes) {
      try {
        const parsedIncomes = JSON.parse(calc.additional_incomes);
        setAdditionalIncomes(parsedIncomes);
      } catch (error) {
        console.error('Error parsing additional incomes:', error);
      }
    }
    
    // Automatikusan újraszámoljuk
    setTimeout(() => {
      calculateSalary();
    }, 100);
    
    // Visszajelzés a felhasználónak
    alert('Kalkuláció betöltve! Módosíthatod az értékeket és újra mentheted.');
  };

  // Kalkuláció törlése
  const handleDeleteCalculation = async (calculationId: string) => {
    if (!confirm('Biztosan törölni szeretnéd ezt a kalkulációt?')) {
      return;
    }

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('salary_calculations')
        .delete()
        .eq('id', calculationId);

      if (error) {
        console.error('Error deleting calculation:', error);
        alert('Hiba történt a törlés során: ' + error.message);
      } else {
        console.log('Calculation deleted successfully');
        alert('Kalkuláció sikeresen törölve!');
        // Frissítjük a korábbi számításokat
        fetchSavedCalculations();
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Hiba történt a törlés során!');
    }
  };

  // Számítások lekérése családtag váltáskor
  useEffect(() => {
    fetchSavedCalculations();
  }, [fetchSavedCalculations]);

  // Form küldés és mentés Supabase-be
  const handleSaveCalculation = async () => {
    console.log('Save calculation button clicked');
    console.log('Current state:', { familyMember, eredmény, calculationName });
    
    if (!familyMember || !eredmény || !calculationName.trim()) {
      alert('Kérjük válasszon családtagot, adjon nevet a kalkulációnak és számítsa ki a bért!');
      return;
    }

    try {
      const supabase = createClient();
      
      const calculationData = {
        name: calculationName,
        family_member_id: familyMember,
        alapber,
        munkarend_napok: munkarendNapok,
        ledolgozott_napok: ledolgozottNapok,
        ledolgozott_orak: ledolgozottOrak,
        szabadsag_napok: szabadsagNapok,
        szabadsag_orak: szabadsagOrak,
        tulora_orak: tuloraOrak,
        // muszakpotlek_orak már nem használt - a műszakpótlék a havibéres időbér alapján számolódik
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
        // Egyéb jövedelmek mentése
        additional_incomes: JSON.stringify(additionalIncomes),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('salary_calculations')
        .insert([calculationData])
        .select();

      if (error) {
        console.error('Error saving calculation:', error);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        console.error('Error message:', error.message);
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

  // Bevételi terv mentése a bérkalkulátor eredményei alapján
  const handleSaveAsIncomePlan = async () => {
    console.log('Save as income plan button clicked');
    console.log('Current state:', { familyMember, eredmény, calculationName });
    
    if (!familyMember || !eredmény || !calculationName.trim()) {
      alert('Kérjük válasszon családtagot, adjon nevet a kalkulációnak és számítsa ki a bért!');
      return;
    }

    try {
      const supabase = createClient();
      
      // Felhasználó lekérése
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Nincs bejelentkezett felhasználó!');
        return;
      }
      
      // A nettó bér mint havi alapjövedelem
      const monthlyIncome = eredmény.netto;
      
      // Egyéb jövedelmek átalakítása a megfelelő formátumra
      const formattedAdditionalIncomes = additionalIncomes.map(income => ({
        id: income.id,
        name: income.name,
        amount: income.amount
      }));
      
      // Teljes jövedelem számítása
      const totalIncome = monthlyIncome + additionalIncomes.reduce((sum, income) => sum + income.amount, 0);
      
      const incomePlanData = {
        user_id: user.id,
        name: calculationName + " (Bérkalkulátor)",
        description: `Automatikusan generált bevételi terv a bérkalkulátor alapján. Alapbér: ${formatCurrency(alapber)}, Nettó: ${formatCurrency(monthlyIncome)}`,
        monthly_income: monthlyIncome,
        additional_incomes: JSON.stringify(formattedAdditionalIncomes),
        total_income: totalIncome,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('income_plans')
        .insert([incomePlanData])
        .select();

      if (error) {
        console.error('Error saving income plan:', error);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        console.error('Error message:', error.message);
        alert('Hiba történt a bevételi terv mentésekor: ' + error.message);
      } else {
        console.log('Income plan saved:', data);
        
        // Az újonnan mentett tervet aktívként állítjuk be
        if (data && data[0]) {
          const savedPlanId = data[0].id;
          console.log('Setting active income plan:', { userId: user.id, planId: savedPlanId });
          const result = await setActiveIncomePlan(user.id, savedPlanId);
          console.log('Set active income plan result:', result);
          
          if (result.success) {
            alert('Bevételi terv sikeresen elmentve és aktívként beállítva!');
          } else {
            console.error('Failed to set active income plan:', result.error);
            alert(`Bevételi terv elmentve, de nem sikerült aktívként beállítani. Hiba: ${result.error || 'Ismeretlen hiba'}`);
          }
        } else {
          alert('Bevételi terv sikeresen elmentve!');
        }
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Hiba történt a bevételi terv mentésekor!');
    }
  };

  // Egyéb jövedelmi tételek kezelése
  const addAdditionalIncome = () => {
    const newIncome: AdditionalIncome = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      amount: 0
    }
    setAdditionalIncomes(prev => [...prev, newIncome])
  }

  const removeAdditionalIncome = (id: string) => {
    setAdditionalIncomes(prev => prev.filter(income => income.id !== id))
  }

  const updateAdditionalIncome = (id: string, field: 'name' | 'amount', value: string | number) => {
    setAdditionalIncomes(prev => prev.map(income => 
      income.id === id 
        ? { ...income, [field]: value }
        : income
    ))
  }

  // Teljes havi bevétel számítása (nettó bér + egyéb jövedelmek)
  const getTotalMonthlyIncome = useCallback(() => {
    const nettoSalary = eredmény?.netto || 0
    const additionalTotal = additionalIncomes.reduce((sum, income) => sum + income.amount, 0)
    return nettoSalary + additionalTotal
  }, [eredmény, additionalIncomes])

  return (
    <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-teal-50 to-emerald-50 p-3 sm:p-4 md:p-6 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/20 via-teal-500/20 to-emerald-500/20 animate-gradient"></div>
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-4 md:mb-6 bg-white/80 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/20">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3 md:mb-4">
            <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg animate-pulse-slow">
              <Calculator className="text-white" size={32} />
            </div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 bg-clip-text text-transparent tracking-tight leading-tight">
              Részletes Magyar Bérkalkulátor 2025
            </h1>
          </div>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 font-medium leading-relaxed">
            Számítsd ki a havi nettó bért és add hozzá a passzív jövedelmeket a teljes 
            jövedelem meghatározásához.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 md:gap-6">
          {/* Kalkulátor forma */}
          <div className="xl:col-span-2">
            <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 rounded-2xl">
              <CardContent className="p-3 sm:p-4 md:p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 mb-4 md:mb-6">
                  {/* Alapadatok */}
                  <div className="space-y-3 md:space-y-4">
                    <h3 className="text-base md:text-lg font-bold text-gray-900 flex items-center gap-2">
                      <div className="p-1.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                        <Info size={18} className="md:w-5 md:h-5 text-white" />
                      </div>
                      <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Alapadatok</span>
                    </h3>
                    
                    {/* Családtag */}
                    <div>
                      <Label htmlFor="family-member" className="text-xs md:text-sm font-semibold text-gray-700">
                        Családtag
                      </Label>
                      <Select value={familyMember} onValueChange={setFamilyMember}>
                        <SelectTrigger className="mt-1 h-9 md:h-10 text-sm border-2 border-gray-200 hover:border-emerald-400 focus:border-emerald-500 transition-colors duration-200 rounded-xl">
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

                    {/* Kalkuláció neve */}
                    <div>
                      <Label htmlFor="calculation-name" className="text-xs md:text-sm font-semibold text-gray-700">
                        Kalkuláció neve
                      </Label>
                      <Input
                        id="calculation-name"
                        type="text"
                        value={calculationName}
                        onChange={(e) => setCalculationName(e.target.value)}
                        placeholder="pl. December 2024 fizetés"
                        className="mt-1 h-9 md:h-10 text-sm border-2 border-gray-200 focus:border-emerald-400 transition-colors duration-200 rounded-xl"
                      />
                    </div>

                    <div>
                      <Label className="text-xs md:text-sm font-semibold text-gray-700">
                        Besorolási alapbér (Ft/hó)
                      </Label>
                      <div className="mt-1 relative">
                        <Input
                          type="number"
                          value={alapber || ''}
                          onChange={handleInputChange(setAlapber)}
                          onFocus={handleInputFocus}
                          placeholder="pl. 986400"
                          className="pr-8 h-9 md:h-10 text-sm border-2 border-gray-200 focus:border-emerald-400 transition-colors duration-200 rounded-xl font-mono"
                        />
                        <span className="absolute right-2 md:right-3 top-2 md:top-3 text-xs md:text-sm text-gray-500 font-medium">Ft</span>
                      </div>
                    </div>

                    <div>
                      <Label className="text-xs md:text-sm font-semibold text-gray-700">
                        Jutalom (eseti, Ft)
                      </Label>
                      <div className="mt-1 relative">
                        <Input
                          type="number"
                          value={jutalom || ''}
                          onChange={handleInputChange(setJutalom)}
                          onFocus={handleInputFocus}
                          placeholder="pl. 100000"
                          className="pr-8 h-9 md:h-10 text-sm border-2 border-gray-200 focus:border-emerald-400 transition-colors duration-200 rounded-xl font-mono"
                        />
                        <span className="absolute right-2 md:right-3 top-2 md:top-3 text-xs md:text-sm text-gray-500 font-medium">Ft</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 font-medium">Opcionális eseti jövedelem (prémium, jutalom, stb.)</p>
                    </div>
                    
                    <div>
                      <Label className="text-xs md:text-sm font-semibold text-gray-700">
                        Családi adókedvezmény (Ft/hó)
                      </Label>
                      <div className="mt-1 relative">
                        <Input
                          type="number"
                          value={családiAdókedvezmény || ''}
                          onChange={handleInputChange(setCsaládiAdókedvezmény)}
                          onFocus={handleInputFocus}
                          placeholder="pl. 333330"
                          className="pr-8 h-9 md:h-10 text-sm border-2 border-gray-200 focus:border-emerald-400 transition-colors duration-200 rounded-xl font-mono"
                        />
                        <span className="absolute right-2 md:right-3 top-2 md:top-3 text-xs md:text-sm text-gray-500 font-medium">Ft</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 font-medium">2 gyermek: 333.330 Ft</p>
                    </div>
                  </div>

                  {/* Munkaidő */}
                  <div className="space-y-3 md:space-y-4">
                    <h3 className="text-base md:text-lg font-bold text-gray-900 flex items-center gap-2">
                      <div className="p-1.5 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg">
                        <Clock size={18} className="md:w-5 md:h-5 text-white" />
                      </div>
                      <span className="bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">Munkaidő</span>
                    </h3>
                    
                    <div>
                      <Label className="text-xs md:text-sm font-semibold text-gray-700">
                        Munkarend szerinti napok
                      </Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={munkarendNapok || ''}
                        onChange={handleInputChange(setMunkarendNapok)}
                        onFocus={handleInputFocus}
                        placeholder="20"
                        className="mt-1 h-9 md:h-10 text-sm border-2 border-gray-200 focus:border-emerald-400 transition-colors duration-200 rounded-xl font-mono"
                      />
                      <p className="text-xs text-gray-500 mt-1 font-medium">
                        Munkarend szerinti órák: {munkarendSzerintiOrak.toFixed(1)} óra ({munkarendNapok} × 8,1)<br/>
                        <strong>Órabér számítás alapja: {formatCurrency(alapber / munkarendSzerintiOrak)}/óra</strong>
                      </p>
                    </div>
                    
                    <div>
                      <Label className="text-xs md:text-sm font-semibold text-gray-700">
                        Ledolgozott napok
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={ledolgozottNapok || ''}
                        readOnly
                        className="mt-1 h-9 md:h-10 text-sm bg-gray-50 cursor-not-allowed border-2 border-gray-200 rounded-xl font-mono"
                      />
                      <p className="text-xs text-gray-500 mt-1 font-medium">
                        Automatikusan számított: munkanapok ({munkarendNapok}) - szabadság ({szabadsagNapok}) = {ledolgozottNapok} nap
                      </p>
                      <p className="text-xs text-gray-500 font-medium">
                        Ledolgozott órák: {ledolgozottOrak.toFixed(2)} óra
                      </p>
                    </div>
                    
                    <div>
                      <Label className="text-xs md:text-sm font-semibold text-gray-700">
                        Fizetett szabadság (nap)
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={szabadsagNapok || ''}
                        onChange={handleInputChange(setSzabadsagNapok)}
                        onFocus={handleInputFocus}
                        placeholder="0"
                        className="mt-1 h-9 md:h-10 text-sm border-2 border-gray-200 focus:border-emerald-400 transition-colors duration-200 rounded-xl font-mono"
                      />
                      <p className="text-xs text-gray-500 mt-1 font-medium">
                        Szabadság órák: {szabadsagOrak.toFixed(2)} óra ({szabadsagNapok} × 8,1)
                      </p>
                    </div>
                    
                    <div>
                      <Label className="text-xs md:text-sm font-semibold text-gray-700">
                        Túlóra (óra)
                      </Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={tuloraOrak || ''}
                        onChange={handleInputChange(setTuloraOrak)}
                        onFocus={handleInputFocus}
                        placeholder="0"
                        className="mt-1 h-9 md:h-10 text-sm border-2 border-gray-200 focus:border-emerald-400 transition-colors duration-200 rounded-xl font-mono"
                      />
                      <p className="text-xs text-gray-500 mt-1 font-medium">+150% pótlék</p>
                    </div>
                    
                    <div>
                      <Label className="text-xs md:text-sm font-semibold text-gray-700">
                        Munkaszüneti munkavégzés (óra)
                      </Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={unnepnapiOrak || ''}
                        onChange={handleInputChange(setUnnepnapiOrak)}
                        onFocus={handleInputFocus}
                        placeholder="0"
                        className="mt-1 h-9 md:h-10 text-sm border-2 border-gray-200 focus:border-emerald-400 transition-colors duration-200 rounded-xl font-mono"
                      />
                      <p className="text-xs text-gray-500 mt-1 font-medium">+200% pótlék</p>
                    </div>
                  </div>

                  {/* Egyéb */}
                  <div className="space-y-3 md:space-y-4 md:col-span-2 xl:col-span-1">
                    <h3 className="text-base md:text-lg font-bold text-gray-900 flex items-center gap-2">
                      <div className="p-1.5 bg-gradient-to-br from-orange-500 to-red-600 rounded-lg">
                        <Plus size={18} className="md:w-5 md:h-5 text-white" />
                      </div>
                      <span className="bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">Egyéb</span>
                    </h3>
                    
                    <div>
                      <Label className="text-xs md:text-sm font-semibold text-gray-700">
                        Betegszabadság (nap)
                      </Label>
                      <Input
                        type="number"
                        value={betegszabadsagNapok || ''}
                        onChange={handleInputChange(setBetegszabadsagNapok)}
                        onFocus={handleInputFocus}
                        placeholder="0"
                        className="mt-1 h-9 md:h-10 text-sm border-2 border-gray-200 focus:border-emerald-400 transition-colors duration-200 rounded-xl font-mono"
                      />
                      <p className="text-xs text-gray-500 mt-1 font-medium">70% térítés</p>
                    </div>
                    
                    <div>
                      <Label className="text-xs md:text-sm font-semibold text-gray-700">
                        Kiküldetés (nap)
                      </Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={kikuldetesNapok || ''}
                        onChange={handleInputChange(setKikuldetesNapok)}
                        onFocus={handleInputFocus}
                        placeholder="0"
                        className="mt-1 h-9 md:h-10 text-sm border-2 border-gray-200 focus:border-emerald-400 transition-colors duration-200 rounded-xl font-mono"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-xs md:text-sm font-semibold text-gray-700">
                        GYED munkavégzés mellett (nap)
                      </Label>
                      <Input
                        type="number"
                        value={gyedMellett || ''}
                        onChange={handleInputChange(setGyedMellett)}
                        onFocus={handleInputFocus}
                        placeholder="0"
                        className="mt-1 h-9 md:h-10 text-sm border-2 border-gray-200 focus:border-emerald-400 transition-colors duration-200 rounded-xl font-mono"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-xs md:text-sm font-semibold text-gray-700">
                        Formaruha kompenzáció (Ft)
                      </Label>
                      <Input
                        type="number"
                        value={formaruhakompenzacio || ''}
                        onChange={handleInputChange(setFormaruhakompenzacio)}
                        onFocus={handleInputFocus}
                        placeholder="0"
                        className="mt-1 h-9 md:h-10 text-sm border-2 border-gray-200 focus:border-emerald-400 transition-colors duration-200 rounded-xl font-mono"
                      />
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-3 md:p-4 rounded-xl border-2 border-blue-200/50 shadow-sm">
                      <p className="text-xs md:text-sm font-bold text-blue-800 mb-2">Számított értékek:</p>
                      <div className="text-xs text-blue-600 space-y-1 font-medium">
                        <div>• Munkarend szerinti órák: {munkarendSzerintiOrak.toFixed(1)} óra</div>
                        <div><strong>• Órabér: {formatCurrency(alapber / munkarendSzerintiOrak)}/óra</strong></div>
                        <div>• Ledolgozott órák: {ledolgozottOrak.toFixed(2)} óra</div>
                        <div>• Szabadság órák: {szabadsagOrak.toFixed(2)} óra</div>
                        <div>• Túlóra alap: {tuloraOrak} óra</div>
                        <div>• Munkaszüneti munka: {unnepnapiOrak} óra</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Számítás és mentés gombok */}
                <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                  <Button onClick={calculateSalary} className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white py-2 md:py-3 text-sm md:text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 rounded-xl">
                    Számítás
                  </Button>
                  <Button 
                    onClick={handleSaveCalculation} 
                    className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white py-2 md:py-3 text-sm md:text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    disabled={!eredmény}
                  >
                    Mentés
                  </Button>
                  <Button 
                    onClick={handleSaveAsIncomePlan} 
                    className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-2 md:py-3 text-sm md:text-base font-semibold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    disabled={!eredmény}
                    title="Mentés bevételi tervként a költségvetéshez"
                  >
                    Bevételi terv
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Eredmény és korábbi kalkulációk */}
          <div className="space-y-4 md:space-y-6">
            {/* Eredmény */}
            {eredmény && (
              <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 rounded-2xl">
                <CardHeader className="pb-3 md:pb-6">
                  <CardTitle className="text-base md:text-lg font-bold text-gray-900 flex items-center gap-2">
                    <div className="p-1.5 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                      <TrendingUp className="text-white" size={18} />
                    </div>
                    <span className="bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">Eredmény</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 md:space-y-4 pt-0">
                  <div>
                    <p className="text-xs md:text-sm text-gray-600 font-semibold">Órabér</p>
                    <p className="text-base md:text-lg font-extrabold bg-gradient-to-r from-cyan-600 to-teal-600 bg-clip-text text-transparent">
                      {formatCurrency(eredmény.oraber)}/óra
                    </p>
                  </div>

                  {/* Részletes jövedelemi tételek */}
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-3 md:p-4 rounded-xl border-2 border-green-200/50 shadow-sm">
                    <p className="text-xs md:text-sm font-bold text-green-800 mb-2">Jövedelmi tételek:</p>
                    <div className="space-y-1 text-xs font-medium">
                      <div className="flex justify-between">
                        <span className="truncate pr-2">Havibéres időbér ({ledolgozottOrak.toFixed(2)} óra):</span>
                        <span className="font-semibold whitespace-nowrap">{formatCurrency(eredmény.haviberesIdober)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="truncate pr-2">Fizetett szabadság ({szabadsagOrak.toFixed(2)} óra):</span>
                        <span className="font-semibold whitespace-nowrap">{formatCurrency(eredmény.fizetettSzabadsag)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="truncate pr-2">Túlóra alap ({tuloraOrak} óra):</span>
                        <span className="font-semibold whitespace-nowrap">{formatCurrency(eredmény.tuloraAlapossszeg)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="truncate pr-2">Túlóra pótlék (150%):</span>
                        <span className="font-semibold whitespace-nowrap">{formatCurrency(eredmény.tuloraPotlek)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="truncate pr-2">Műszakpótlék (45%):</span>
                        <span className="font-semibold whitespace-nowrap">{formatCurrency(eredmény.muszakpotlek)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="truncate pr-2">Túlóra műszakpótlék:</span>
                        <span className="font-semibold whitespace-nowrap">{formatCurrency(eredmény.tuloraMuszakpotlek)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="truncate pr-2">Munkaszüneti munkavégzés:</span>
                        <span className="font-semibold whitespace-nowrap">{formatCurrency(eredmény.unnepnapiMunka)}</span>
                      </div>
                      {jutalom > 0 && (
                        <div className="flex justify-between">
                          <span className="truncate pr-2">Jutalom/prémium:</span>
                          <span className="font-semibold whitespace-nowrap">{formatCurrency(eredmény.jutalom)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs md:text-sm text-gray-600 font-semibold">Bruttó bér összesen</p>
                    <p className="text-lg md:text-xl font-extrabold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      {formatCurrency(eredmény.bruttoBer)}
                    </p>
                  </div>
                  
                  {/* Részletes levonások */}
                  <div className="bg-gradient-to-br from-red-50 to-orange-50 p-3 md:p-4 rounded-xl border-2 border-red-200/50 shadow-sm">
                    <p className="text-xs md:text-sm font-bold text-red-800 mb-2">Levonások:</p>
                    <div className="space-y-1 text-xs font-medium">
                      <div className="flex justify-between">
                        <span className="truncate pr-2">Adóelőleg (SZJA 15%):</span>
                        <span className="font-semibold whitespace-nowrap">{formatCurrency(eredmény.szja)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="truncate pr-2">TB járulék (18,5%):</span>
                        <span className="font-semibold whitespace-nowrap">{formatCurrency(eredmény.tbJarulék)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="truncate pr-2">Önkéntes nyugdíj (1,5%):</span>
                        <span className="font-semibold whitespace-nowrap">{formatCurrency(eredmény.onkentesNyugdij)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="truncate pr-2">MÉSZ tagdíj (0,7%):</span>
                        <span className="font-semibold whitespace-nowrap">{formatCurrency(eredmény.erdekKepvTagdij)}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <p className="text-xs md:text-sm text-gray-600 font-semibold">Összes levonás</p>
                    <p className="text-base md:text-lg font-extrabold bg-gradient-to-r from-red-600 to-orange-600 bg-clip-text text-transparent">
                      -{formatCurrency(eredmény.osszesLevonas)}
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      Levonások aránya: {eredmény.levonasArany}%
                    </p>
                  </div>

                  <div className="pt-2 md:pt-3 border-t-2 border-gray-200">
                    <p className="text-xs md:text-sm text-gray-600 font-semibold">Nettó fizetés</p>
                    <p className="text-xl md:text-2xl font-extrabold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      {formatCurrency(eredmény.netto)}
                    </p>
                    <p className="text-xs text-green-600 mt-1 font-medium">
                      Bérpapír szerint: 1.114.616 Ft
                    </p>
                  </div>

                  {/* Egyéb jövedelmi tételek */}
                  <div className="pt-2 md:pt-3 border-t-2 border-gray-200">
                    <div className="flex items-center justify-between mb-2 md:mb-3">
                      <p className="text-xs md:text-sm font-bold text-gray-700">Egyéb jövedelmek</p>
                      <Button
                        onClick={addAdditionalIncome}
                        size="sm"
                        variant="outline"
                        className="flex items-center gap-1 h-7 md:h-8 text-xs border-2 border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all duration-200 rounded-lg"
                      >
                        <Plus size={12} />
                        Hozzáad
                      </Button>
                    </div>
                    
                    {additionalIncomes.length > 0 && (
                      <div className="space-y-2 mb-2 md:mb-3">
                        {additionalIncomes.map((income) => (
                          <div key={income.id} className="flex items-center gap-2 p-2 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200">
                            <Input
                              placeholder="Jövedelem neve"
                              value={income.name}
                              onChange={(e) => updateAdditionalIncome(income.id, 'name', e.target.value)}
                              className="flex-1 h-8 text-xs border-2 border-gray-200 focus:border-emerald-400 transition-colors rounded-lg"
                            />
                            <Input
                              type="number"
                              placeholder="Összeg"
                              value={income.amount || ''}
                              onChange={(e) => updateAdditionalIncome(income.id, 'amount', parseInt(e.target.value) || 0)}
                              className="w-20 md:w-24 h-8 text-xs border-2 border-gray-200 focus:border-emerald-400 transition-colors rounded-lg font-mono"
                            />
                            <Button
                              onClick={() => removeAdditionalIncome(income.id)}
                              size="sm"
                              variant="outline"
                              className="px-2 h-8 text-xs border-2 border-red-200 hover:border-red-400 hover:bg-red-50 transition-all rounded-lg"
                            >
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {additionalIncomes.length > 0 && (
                      <div className="p-3 md:p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border-2 border-green-200/50 shadow-sm">
                        <p className="text-xs md:text-sm font-bold text-green-800 mb-1">Teljes havi bevétel:</p>
                        <p className="text-base md:text-lg font-extrabold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                          {formatCurrency(getTotalMonthlyIncome())}
                        </p>
                        <div className="text-xs text-green-600 mt-1 font-medium">
                          <div>Nettó bér: {formatCurrency(eredmény.netto)}</div>
                          <div>Egyéb jövedelem: {formatCurrency(additionalIncomes.reduce((sum, income) => sum + income.amount, 0))}</div>
                          <div className="mt-2 p-2 bg-blue-50 rounded-lg text-blue-700 border border-blue-200">
                            💡 <strong>Tipp:</strong> A &ldquo;Bevételi terv&rdquo; gombbal mentheted ezt az eredményt a költségvetés tervezéshez!
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 md:pt-3 border-t-2 bg-gradient-to-br from-orange-50 to-amber-50 p-3 md:p-4 rounded-xl border-2 border-orange-200/50 shadow-sm">
                    <p className="text-xs font-bold text-orange-800 mb-1">Munkáltatói terhek:</p>
                    <p className="text-xs text-orange-700 font-medium">
                      Szoc. hozzájárulás: {formatCurrency(eredmény.szocHozzjarulas)}
                    </p>
                    <p className="text-xs font-bold text-orange-800">
                      Teljes költség: {formatCurrency(eredmény.teljesMunkaltaroiKoltseg)}
                    </p>
                  </div>

                  {eredmény.gyedMunkavMellett > 0 && (
                    <div className="pt-2 md:pt-3 border-t-2 bg-gradient-to-br from-blue-50 to-indigo-50 p-3 md:p-4 rounded-xl border-2 border-blue-200/50 shadow-sm">
                      <p className="text-xs font-bold text-blue-800 mb-1">GYED munkavégzés mellett:</p>
                      <p className="text-xs text-blue-700 font-medium">
                        Összeg: {formatCurrency(eredmény.gyedMunkavMellett)}
                      </p>
                      <p className="text-xs text-blue-600 italic font-medium">
                        ✓ Adómentes juttatás (nem része az SZJA alapnak)
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Korábbi kalkulációk */}
            <Card className="bg-white/90 backdrop-blur-xl shadow-2xl border border-white/20 rounded-2xl">
              <CardHeader className="pb-3 md:pb-6">
                <CardTitle className="text-base md:text-lg font-bold text-gray-900 flex items-center gap-2">
                  <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                    <Clock className="text-white" size={18} />
                  </div>
                  <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">Korábbi kalkulációk</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 md:space-y-4 pt-0">
                {savedCalculations.length > 0 ? (
                  savedCalculations.map((calc) => (
                    <div key={calc.id} className="p-3 md:p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border-2 border-gray-200/50 shadow-sm hover:shadow-md transition-shadow duration-200">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 text-xs md:text-sm truncate">
                            {calc.name || `${users.find(u => u.id === calc.family_member_id)?.user_metadata?.full_name || 'Ismeretlen'} - ${new Date(calc.created_at).toLocaleDateString('hu-HU', { month: 'long' })}`}
                          </p>
                          <p className="text-xs text-gray-500 font-medium">
                            {new Date(calc.created_at).toLocaleDateString('hu-HU')}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            onClick={() => handleLoadCalculation(calc)}
                            size="sm"
                            variant="outline"
                            className="h-8 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-2 border-blue-200 hover:border-blue-400 transition-all rounded-lg text-xs font-semibold"
                            title="Kalkuláció betöltése módosításhoz"
                          >
                            Betöltés
                          </Button>
                          <Button
                            onClick={() => handleDeleteCalculation(calc.id)}
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 border-2 border-red-200 hover:border-red-400 transition-all rounded-lg"
                            title="Kalkuláció törlése"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-gray-600 truncate pr-2">Alapbér:</span>
                          <span className="font-bold text-gray-900 whitespace-nowrap">
                            {calc.alapber.toLocaleString()} Ft
                          </span>
                        </div>
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-gray-600 truncate pr-2">Ledolgozott napok:</span>
                          <span className="font-bold text-gray-900 whitespace-nowrap">
                            {calc.ledolgozott_napok} nap
                          </span>
                        </div>
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-gray-600 truncate pr-2">Bruttó bér:</span>
                          <span className="font-bold text-gray-900 whitespace-nowrap">
                            {calc.brutto_ber.toLocaleString()} Ft
                          </span>
                        </div>
                        <div className="flex justify-between text-xs font-medium">
                          <span className="text-gray-600 truncate pr-2">Nettó bér:</span>
                          <span className="font-bold text-green-600 whitespace-nowrap">
                            {calc.netto_ber.toLocaleString()} Ft
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-4 text-sm">
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
