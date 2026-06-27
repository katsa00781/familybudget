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
  tizenket_oras_muszak?: number;
  szabadnapi_tulora_orak?: number;
  pihenonapi_tulora_orak?: number;
  munkaszuneti_tulora_orak?: number;
  unnepnapi_orak?: number;
  betegszabadsag_napok?: number;
  kikuldes_napok?: number;
  gyed_mellett?: number;
  formaruha_kompenzacio?: number;
  formaruha_ak?: number;
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

// 2026-os kulcsok a bérpapír alapján (konstansként a komponens kívül)
const KULCSOK = {
  // TB és járulékok
  TB_JARULÉK: 0.185, // 18.5% (a TB járulékalapra — bruttó + formaruha + vállalati pénztári befizetések)
  SZJA_KULCS: 0.15, // 15% (adóelőleg)
  ÖNKÉNTES_NYUGDIJ: 0.015, // 1.5% (dolgozói önk. nyugdíjpénztári befizetés — levonás)
  ÖNK_NYUGDIJ_VALLALATI: 0.054, // 5.4% a bruttó bérből — vállalati önk. nyugdíjpénztári befizetés (TB-alap része)
  ÖNK_EGESZSEG_VALLALATI_FIX: 20600, // fix vállalati önk. egészségpénztári befizetés (TB-alap része)
  MÉSZ_TAGDIJ: 0.007, // 0.7%
  SZOCIALIS_HOZZAJARULAS: 0.13, // 13% munkáltatói teher

  // Munkaidő konstansok
  HAVI_ÓRASZÁM: 174, // havi teljes munkaidő (általános)
  NAPI_ÓRASZÁM: 8.17, // napi munkaidő (műszakos munkarend)
  // Műszakos munkarend éves átlagóraszám: 1884 óra / 12 = 157 h/hó
  // Ezt használja az MVM a túlóra és ünnepnapi alap órabér számításhoz
  TULORA_OSZTÓ: 157,

  // Pótlékok (a bérpapír alapján, 2026 április)
  MUSZAKPOTLEK: 0.45, // 45% műszakpótlék (minden ledolgozott + TÓ + munkaszüneti órára)
  MUSZAKPOTLEK_SZAZALEK: 0.45,
  // Sávos napi túlóra (KSZ): napi rendes munkaidőt meghaladó pótlék
  //   első 2 óra: +50%, 3-4. óra: +70%, 4 óra felett: +100%
  // Egy 12 órás műszak = 4 túlóra-óra → fixen 2ó @50% + 2ó @70% sávozva.
  TULORA_SAV_1: 0.50, // 0-2. óra
  TULORA_SAV_2: 0.70, // 3-4. óra
  TULORA_SAV_3: 1.00, // 4 óra felett
  ORAK_PER_MUSZAK: 4, // egy 12 órás műszakra eső túlóra-órák (12 - 8)
  // Szabadnapi túlóra: +100% pótlék (fix, nem sávos — bérjegyzék "TÓ szabadnapon")
  TULORA_SZABADNAPON: 1.00,
  // Pihenőnapi túlóra: +125% pótlék (nem sávos, MVM KSz)
  TULORA_PIHENONAPON: 1.25,
  // Munkaszüneti napon végzett túlóra: +225% pótlék (KSZ)
  MUNKASZUNETI_TULORA: 2.25,
  // Rostán lévő munkaszüneti munkavégzés: +100% ünnepnapi pótlék + külön +45% műszakpótlék
  MUNKASZUNETI_POTLEK: 1.00, // +100% munkaszüneti pótlék

  // Egyéb konstansok
  GYEREKEK_UTAN_KEDVEZMENY: 333330, // 2 gyermek utáni adókedvezmény
  BETEGSZABADSAG_SZAZALEK: 0.70, // 70% betegszabadság
  GYED_NAPI: 13570, // GYED napi összeg
  KIKULDETESI_POTLEK: 6710, // kiküldetési pótlék napi
  NYUGDIJJARULÉK: 0.10 // nyugdíjjárulék nagyobb bérekeknél
};

export default function BerkalkulatorPage() {
  // Állapotok a bérpapír adatok alapján
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [familyMember, setFamilyMember] = useState("");
  const [calculationName, setCalculationName] = useState(""); // Kalkuláció neve
  const [alapber, setAlapber] = useState(1055600); // Alapbér a bérpapírból
  const [jutalom, setJutalom] = useState(0); // Jutalom (eseti jövedelem)
  const [munkarendNapok, setMunkarendNapok] = useState(20); // Munkarend szerinti napok
  const [szabadsagNapok, setSzabadsagNapok] = useState(0); // Fizetett szabadság: 0 nap (default)
  const [tizenketOrasMuszak, setTizenketOrasMuszak] = useState(0); // 12 órás műszakok száma (db) — sávos túlóra
  const [szabadnapiTuloraOrak, setSzabadnapiTuloraOrak] = useState(0); // Szabadnapi túlóra (óra) — +100% fix
  const [pihenonapiTuloraOrak, setPihenonapiTuloraOrak] = useState(0); // Pihenőnapi túlóra (óra) — +125%
  const [munkaszunetiTuloraOrak, setMunkaszunetiTuloraOrak] = useState(0); // Munkaszüneti túlóra (óra) — +225%
  const [unnepnapiOrak, setUnnepnapiOrak] = useState(0); // Munkaszüneti munkavégzés (rostán): 0 óra (default)
  const [fizTavollétOrak, setFizTavollétOrak] = useState(0); // Fizetett távollét (állami kötelezettség)
  const [additionalIncomes, setAdditionalIncomes] = useState<AdditionalIncome[]>([]);

  // Számított értékek a munkarend alapján (8.17 óra/nap a műszakos munkarendben)
  // A fizetett szabadság ÉS a fizetett (állami) távollét is csökkenti a ledolgozott időt
  // (a bérjegyzéken: munkarend = ledolgozott + szabadság + egésznapos távollét)
  const fizTavollétNapok = fizTavollétOrak / KULCSOK.NAPI_ÓRASZÁM;
  const ledolgozottNapok = munkarendNapok - szabadsagNapok - fizTavollétNapok;
  const munkarendSzerintiOrak = munkarendNapok * KULCSOK.NAPI_ÓRASZÁM;
  const ledolgozottOrak = ledolgozottNapok * KULCSOK.NAPI_ÓRASZÁM;
  const szabadsagOrak = szabadsagNapok * KULCSOK.NAPI_ÓRASZÁM;
  // 12 órás műszakból eredő túlóra-órák (sávos elszámoláshoz)
  const muszakTuloraOrak = tizenketOrasMuszak * KULCSOK.ORAK_PER_MUSZAK;
  const [betegszabadsagNapok, setBetegszabadsagNapok] = useState(0);
  const [kikuldetesNapok, setKikuldetesNapok] = useState(0);
  const [gyedMellett, setGyedMellett] = useState(0); // GYED munkavégzés mellett: 0 nap (default)
  const [formaruhakompenzacio, setFormaruhakompenzacio] = useState(0);
  const [formaruhaAK, setFormaruhaAK] = useState(0); // Formaruha AK (adóköteles, nem kifizetendő) — TB-alap része, évente 1×
  const [családiAdókedvezmény, setCsaládiAdókedvezmény] = useState(800000); // Családi adókedvezmény: 500,000 Ft (default)
  interface SalaryResult {
    alapber: number;
    jutalom: number;
    oraber: number;
    tuloraOraber: number;
    haviberesIdober: number;
    fizetettSzabadsag: number;
    fizTavollét: number;
    tuloraAlapossszeg: number;
    savPotlek: number;
    szabadnapiPotlek: number;
    pihenonapiPotlek: number;
    munkaszunetiTuloraPotlek: number;
    muszakpotlek: number;
    tuloraMuszakpotlek: number;
    unnepnapiMunka: number;
    unnepnapiMuszakpotlek: number;
    betegszabadsag: number;
    kikuldetesTobblet: number;
    gyedMunkavMellett: number;
    formaruhakompenzacio: number;
    formaruhaAK: number;
    bruttoBer: number;
    osszesJarandsag: number;
    tbAlap: number;
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
  const [atlagOrabErAuto, setAtlagOrabErAuto] = useState<number | null>(null);
  const [atlagOrabErManual, setAtlagOrabErManual] = useState('');

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
      tizenketOrasMuszak,
      pihenonapiTuloraOrak,
      munkaszunetiTuloraOrak,
      unnepnapiOrak
    });
    console.log('calculateSalary called with alapber:', alapber);
    console.log('munkarendSzerintiOrak:', munkarendSzerintiOrak);
    console.log('ledolgozottOrak:', ledolgozottOrak);
    
    // Rendes órabér: alapbér / munkarend szerinti havi órák (tényleges havi szintű)
    const oraber = alapber / munkarendSzerintiOrak;

    // Túlóra/ünnepnapi alap-órabér: alapbér / éves átlag (157 h/hó = 1884 h/év műszakosoknak)
    // Az MVM és hasonló váltásos munkarendű vállalatok ezt az osztót alkalmazzák a pótlékok alapjához
    const tuloraOraber = alapber / KULCSOK.TULORA_OSZTÓ;

    // Havibéres időbér: ténylegesen ledolgozott órák × rendes órabér
    // (a fizetett szabadság és az állami távollét már levonva a ledolgozottOrak-ból,
    //  azok külön tételként kerülnek elszámolásra)
    const haviberesIdober = Math.round(ledolgozottOrak * oraber);

    // Fizetett szabadság: távolléti díj (Mt. 151.§) × szabadság-órák
    // Távolléti díj alapja = alapbér-órabér + rendszeres műszakpótlék (45%).
    // A pontos érték a 6 havi pótlékátlagot is tartalmazza (~+5-6%) — ez kézzel felülírható.
    const tavolletiAlap = oraber * (1 + KULCSOK.MUSZAKPOTLEK);
    const tavolleti = atlagOrabErManual ? Number(atlagOrabErManual) : (atlagOrabErAuto || tavolletiAlap);
    const fizetettSzabadsag = Math.round(szabadsagOrak * tavolleti);

    // Fizetett távollét állami kötelezettség (pl. veszélyelhárítás, behívó stb.) – távolléti díj
    const fizTavollét = Math.round(fizTavollétOrak * tavolleti);

    // Összes túlóra-óra (100% alap minden túlóra-órára jár, a Túlóraalap sorban)
    const osszTuloraOra = muszakTuloraOrak + szabadnapiTuloraOrak + pihenonapiTuloraOrak + munkaszunetiTuloraOrak;
    const tuloraAlapossszeg = Math.round(osszTuloraOra * tuloraOraber);

    // Túlóra pótlékok (KSZ szerint, a 100% alap fölött):
    //   12 órás műszak (4 TÓ-óra): sávos → 2ó @+50% + 2ó @+70% = műszakonként 2,4× órabér
    //   szabadnapi túlóra: +100% (fix, bérjegyzék "TÓ szabadnapon")
    //   pihenőnapi túlóra: +125% (nem sávos)
    //   munkaszüneti túlóra: +225%
    const savPotlek = Math.round(
      tizenketOrasMuszak * (2 * KULCSOK.TULORA_SAV_1 + 2 * KULCSOK.TULORA_SAV_2) * tuloraOraber
    );
    const szabadnapiPotlek = Math.round(szabadnapiTuloraOrak * tuloraOraber * KULCSOK.TULORA_SZABADNAPON);
    const pihenonapiPotlek = Math.round(pihenonapiTuloraOrak * tuloraOraber * KULCSOK.TULORA_PIHENONAPON);
    const munkaszunetiTuloraPotlek = Math.round(munkaszunetiTuloraOrak * tuloraOraber * KULCSOK.MUNKASZUNETI_TULORA);

    // Műszakpótlék 45%: a havibéres időbér 45%-a
    const muszakpotlek = Math.round(haviberesIdober * KULCSOK.MUSZAKPOTLEK);

    // Túlóra műszakpótlék 45%: az összes túlóra-alap 45%-a
    const tuloraMuszakpotlek = Math.round(tuloraAlapossszeg * KULCSOK.MUSZAKPOTLEK);

    // Munkaszüneti munkavégzés: +100% ünnepnapi pótlék (külön sor)
    const unnepnapiMunka = Math.round(unnepnapiOrak * oraber * KULCSOK.MUNKASZUNETI_POTLEK);

    // Munkaszüneti műszakpótlék (+45%): a munkaszüneti napokra is jár a műszakpótlék
    const unnepnapiMuszakpotlek = Math.round(unnepnapiOrak * oraber * KULCSOK.MUSZAKPOTLEK);

    // Betegszabadság, kiküldetés, GYED
    const betegszabadsag = Math.round(betegszabadsagNapok * (oraber * 8) * KULCSOK.BETEGSZABADSAG_SZAZALEK);
    const kikuldetesTobblet = Math.round(kikuldetesNapok * KULCSOK.KIKULDETESI_POTLEK);
    const gyedMunkavMellett = Math.round(gyedMellett * KULCSOK.GYED_NAPI);

    // Bruttó bér összesen
    const bruttoBer = haviberesIdober + fizetettSzabadsag + fizTavollét +
                     tuloraAlapossszeg + savPotlek + szabadnapiPotlek + pihenonapiPotlek + munkaszunetiTuloraPotlek +
                     muszakpotlek + tuloraMuszakpotlek + unnepnapiMunka + unnepnapiMuszakpotlek +
                     betegszabadsag + kikuldetesTobblet + jutalom;
    
    // Összes járandóság (bruttó + GYED + formaruha)
    const osszesJarandsag = bruttoBer + gyedMunkavMellett + formaruhakompenzacio;
    
    // Levonások a bérpapír szerint:
    // Adóelőleg: 165 433 Ft
    // TB járulék: 298 624 Ft  
    // Önkéntes nyugdíj: 24 213 Ft
    // MÉSZ: 11 299 Ft
    
    // TB járulékalap: bruttó bér + formaruha (kompenzáció + AK) + vállalati önkéntes pénztári befizetések.
    //   Vállalati önk. nyugdíj: 5,4% a bruttó bérből; vállalati önk. egészség: fix 20.600 Ft.
    //   (A SZÉP béren kívüli juttatás NEM része a TB-alapnak.)
    const onkNyugdijVallalati = Math.round(bruttoBer * KULCSOK.ÖNK_NYUGDIJ_VALLALATI);
    const onkEgesszegVallalati = KULCSOK.ÖNK_EGESZSEG_VALLALATI_FIX;
    const tbAlap = bruttoBer + formaruhakompenzacio + formaruhaAK + onkNyugdijVallalati + onkEgesszegVallalati;

    // TB járulék: 18.5% a TB járulékalapból
    const tbJarulék = Math.round(tbAlap * KULCSOK.TB_JARULÉK);
    
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
      tuloraOraber: Math.round(tuloraOraber),
      haviberesIdober,
      fizetettSzabadsag,
      fizTavollét,
      tuloraAlapossszeg,
      savPotlek,
      szabadnapiPotlek,
      pihenonapiPotlek,
      munkaszunetiTuloraPotlek,
      muszakpotlek,
      tuloraMuszakpotlek,
      unnepnapiMunka,
      unnepnapiMuszakpotlek,
      betegszabadsag,
      kikuldetesTobblet,
      gyedMunkavMellett,
      formaruhakompenzacio,
      formaruhaAK,
      bruttoBer,
      osszesJarandsag,
      tbAlap,
      tbJarulék,
      nyugdijJarulék: 0,
      onkentesNyugdij,
      erdekKepvTagdij: meszTagdij,
      szja,
      szjaAlap,
      kedvezményesAlap: szjaAlap,
      osszesLevonas,
      netto,
      szocHozzjarulas,
      teljesMunkaltaroiKoltseg,
      levonasArany: ((osszesLevonas / osszesJarandsag) * 100).toFixed(1),
      munkaltaroiTerhek: ((szocHozzjarulas / osszesJarandsag) * 100).toFixed(1)
    });
  }, [alapber, jutalom, munkarendNapok, szabadsagNapok, tizenketOrasMuszak, szabadnapiTuloraOrak, pihenonapiTuloraOrak,
      munkaszunetiTuloraOrak, muszakTuloraOrak, fizTavollétOrak, unnepnapiOrak, betegszabadsagNapok,
      kikuldetesNapok, gyedMellett, formaruhakompenzacio, formaruhaAK, családiAdókedvezmény,
      munkarendSzerintiOrak, ledolgozottOrak, szabadsagOrak,
      atlagOrabErAuto, atlagOrabErManual, setEredmény]);

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
  }, [alapber, munkarendNapok, szabadsagNapok, tizenketOrasMuszak, szabadnapiTuloraOrak, pihenonapiTuloraOrak,
      munkaszunetiTuloraOrak, fizTavollétOrak, unnepnapiOrak, betegszabadsagNapok, kikuldetesNapok,
      gyedMellett, formaruhakompenzacio, formaruhaAK, családiAdókedvezmény, additionalIncomes, calculateSalary]);

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
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching saved calculations:', error);
      } else {
        setSavedCalculations(data || []);
        // Távolléti átlagórabér számítása az utolsó ≤3 rekordból (Mt. 149.§)
        // átlagórabér = Σ(havibéres időbér + műszakpótlék) / Σ(ledolgozott órák)
        //             = Σ(ledOrak × oraber × 1.45) / Σ(ledOrak)
        const last3 = (data || []).slice(0, 3);
        if (last3.length > 0) {
          // Mt. 151.§ távolléti díj ≈ alapbér-órabér + rendszeres műszakpótlék (45%).
          // A bruttó bér NEM használható, mert tartalmazza az eseti túlórát/munkaszünetit is,
          // ami erősen felfelé torzítaná a szabadság- és távollét-elszámolást.
          let sumTavolleti = 0;
          let count = 0;
          last3.forEach(r => {
            const rMunkarendOrak = (r.munkarend_napok || 20) * KULCSOK.NAPI_ÓRASZÁM;
            if (rMunkarendOrak > 0) {
              sumTavolleti += (r.alapber / rMunkarendOrak) * (1 + KULCSOK.MUSZAKPOTLEK);
              count++;
            }
          });
          if (count > 0) setAtlagOrabErAuto(Math.round(sumTavolleti / count));
        } else {
          setAtlagOrabErAuto(null);
        }
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
    setTizenketOrasMuszak(calc.tizenket_oras_muszak || 0);
    setSzabadnapiTuloraOrak(calc.szabadnapi_tulora_orak || 0);
    setPihenonapiTuloraOrak(calc.pihenonapi_tulora_orak || 0);
    setMunkaszunetiTuloraOrak(calc.munkaszuneti_tulora_orak || 0);
    setUnnepnapiOrak(calc.unnepnapi_orak || 0);
    setBetegszabadsagNapok(calc.betegszabadsag_napok || 0);
    setKikuldetesNapok(calc.kikuldes_napok || 0);
    setGyedMellett(calc.gyed_mellett || 0);
    setFormaruhakompenzacio(calc.formaruha_kompenzacio || 0);
    setFormaruhaAK(calc.formaruha_ak || 0);
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
        tulora_orak: 0, // legacy oszlop — már nem használt
        muszakpotlek_orak: 0, // legacy oszlop — már nem használt
        tizenket_oras_muszak: tizenketOrasMuszak,
        szabadnapi_tulora_orak: szabadnapiTuloraOrak,
        pihenonapi_tulora_orak: pihenonapiTuloraOrak,
        munkaszuneti_tulora_orak: munkaszunetiTuloraOrak,
        unnepnapi_orak: unnepnapiOrak,
        betegszabadsag_napok: betegszabadsagNapok,
        kikuldes_napok: kikuldetesNapok,
        gyed_mellett: gyedMellett,
        formaruha_kompenzacio: formaruhakompenzacio,
        formaruha_ak: formaruhaAK,
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
              Részletes Magyar Bérkalkulátor 2026
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
                          placeholder="pl. 1055600"
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
                        Munkarend szerinti órák: {munkarendSzerintiOrak.toFixed(2)} óra ({munkarendNapok} × 8,17)<br/>
                        <strong>Rendes órabér: {formatCurrency(alapber / munkarendSzerintiOrak)}/óra</strong><br/>
                        <strong>Túlóra alap-órabér (157h osztó): {formatCurrency(alapber / KULCSOK.TULORA_OSZTÓ)}/óra</strong>
                      </p>
                    </div>
                    
                    <div>
                      <Label className="text-xs md:text-sm font-semibold text-gray-700">
                        Ledolgozott napok
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={ledolgozottNapok > 0 ? ledolgozottNapok.toFixed(2) : ''}
                        readOnly
                        className="mt-1 h-9 md:h-10 text-sm bg-gray-50 cursor-not-allowed border-2 border-gray-200 rounded-xl font-mono"
                      />
                      <p className="text-xs text-gray-500 mt-1 font-medium">
                        Automatikusan számított: munkanapok ({munkarendNapok}) - szabadság ({szabadsagNapok}) - távollét ({fizTavollétNapok.toFixed(2)}) = {ledolgozottNapok.toFixed(2)} nap
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
                        Szabadság órák: {szabadsagOrak.toFixed(2)} óra ({szabadsagNapok} × 8,17)
                      </p>
                    </div>

                    <div>
                      <Label className="text-xs md:text-sm font-semibold text-gray-700">
                        Távolléti átlagórabér (Ft/óra)
                      </Label>
                      <div className="mt-1 relative">
                        <Input
                          type="number"
                          value={atlagOrabErManual}
                          onChange={(e) => setAtlagOrabErManual(e.target.value)}
                          onFocus={handleInputFocus}
                          placeholder={atlagOrabErAuto ? String(atlagOrabErAuto) : String(Math.round((alapber / (munkarendNapok * KULCSOK.NAPI_ÓRASZÁM)) * (1 + KULCSOK.MUSZAKPOTLEK)))}
                          className="pr-8 h-9 md:h-10 text-sm border-2 border-gray-200 focus:border-emerald-400 transition-colors duration-200 rounded-xl font-mono"
                        />
                        <span className="absolute right-2 md:right-3 top-2 md:top-3 text-xs md:text-sm text-gray-500 font-medium">Ft</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1 font-medium">
                        {atlagOrabErAuto
                          ? `Auto (utolsó ≤3 hónap, alapbér + 45% műszakpótlék): ${atlagOrabErAuto.toLocaleString('hu-HU')} Ft/óra — felülírható`
                          : 'Nincs mentett adat — alapórabér + 45% műszakpótlék kerül alkalmazásra (a pontos 6 havi pótlékátlaghoz írd be kézzel)'}
                      </p>
                    </div>

                    <div>
                      <Label className="text-xs md:text-sm font-semibold text-gray-700">
                        12 órás műszak (db)
                      </Label>
                      <Input
                        type="number"
                        step="1"
                        value={tizenketOrasMuszak || ''}
                        onChange={handleInputChange(setTizenketOrasMuszak)}
                        onFocus={handleInputFocus}
                        placeholder="0"
                        className="mt-1 h-9 md:h-10 text-sm border-2 border-gray-200 focus:border-emerald-400 transition-colors duration-200 rounded-xl font-mono"
                      />
                      <p className="text-xs text-gray-500 mt-1 font-medium">
                        Műszakonként 4 túlóra-óra, sávosan: első 2 óra +50%, 3-4. óra +70%
                        {tizenketOrasMuszak > 0 && ` (összesen: ${muszakTuloraOrak} túlóra-óra)`}
                      </p>
                    </div>

                    <div>
                      <Label className="text-xs md:text-sm font-semibold text-gray-700">
                        Szabadnapi túlóra (óra)
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={szabadnapiTuloraOrak || ''}
                        onChange={handleInputChange(setSzabadnapiTuloraOrak)}
                        onFocus={handleInputFocus}
                        placeholder="0"
                        className="mt-1 h-9 md:h-10 text-sm border-2 border-gray-200 focus:border-emerald-400 transition-colors duration-200 rounded-xl font-mono"
                      />
                      <p className="text-xs text-gray-500 mt-1 font-medium">+100% alap + 100% pótlék (fix, bérjegyzék &bdquo;TÓ szabadnapon&rdquo;)</p>
                    </div>

                    <div>
                      <Label className="text-xs md:text-sm font-semibold text-gray-700">
                        Pihenőnapi túlóra (óra)
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={pihenonapiTuloraOrak || ''}
                        onChange={handleInputChange(setPihenonapiTuloraOrak)}
                        onFocus={handleInputFocus}
                        placeholder="0"
                        className="mt-1 h-9 md:h-10 text-sm border-2 border-gray-200 focus:border-emerald-400 transition-colors duration-200 rounded-xl font-mono"
                      />
                      <p className="text-xs text-gray-500 mt-1 font-medium">+100% alap + 125% pótlék (nem sávos, KSz)</p>
                    </div>

                    <div>
                      <Label className="text-xs md:text-sm font-semibold text-gray-700">
                        Munkaszüneti túlóra (óra)
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={munkaszunetiTuloraOrak || ''}
                        onChange={handleInputChange(setMunkaszunetiTuloraOrak)}
                        onFocus={handleInputFocus}
                        placeholder="0"
                        className="mt-1 h-9 md:h-10 text-sm border-2 border-gray-200 focus:border-emerald-400 transition-colors duration-200 rounded-xl font-mono"
                      />
                      <p className="text-xs text-gray-500 mt-1 font-medium">+100% alap + 225% pótlék (munkaszüneti napon végzett túlóra, KSz)</p>
                    </div>

                    <div>
                      <Label className="text-xs md:text-sm font-semibold text-gray-700">
                        Munkaszüneti munkavégzés (óra)
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={unnepnapiOrak || ''}
                        onChange={handleInputChange(setUnnepnapiOrak)}
                        onFocus={handleInputFocus}
                        placeholder="0"
                        className="mt-1 h-9 md:h-10 text-sm border-2 border-gray-200 focus:border-emerald-400 transition-colors duration-200 rounded-xl font-mono"
                      />
                      <p className="text-xs text-gray-500 mt-1 font-medium">+100% ünnepnapi + +45% műszakpótlék (külön soron)</p>
                    </div>

                    <div>
                      <Label className="text-xs md:text-sm font-semibold text-gray-700">
                        Fizetett táv. (állami köt., óra)
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={fizTavollétOrak || ''}
                        onChange={handleInputChange(setFizTavollétOrak)}
                        onFocus={handleInputFocus}
                        placeholder="0"
                        className="mt-1 h-9 md:h-10 text-sm border-2 border-gray-200 focus:border-emerald-400 transition-colors duration-200 rounded-xl font-mono"
                      />
                      <p className="text-xs text-gray-500 mt-1 font-medium">Távolléti díjon (pl. 8.17 = 1 nap)</p>
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

                    <div>
                      <Label className="text-xs md:text-sm font-semibold text-gray-700">
                        Formaruha AK (Ft)
                      </Label>
                      <Input
                        type="number"
                        value={formaruhaAK || ''}
                        onChange={handleInputChange(setFormaruhaAK)}
                        onFocus={handleInputFocus}
                        placeholder="0"
                        className="mt-1 h-9 md:h-10 text-sm border-2 border-gray-200 focus:border-emerald-400 transition-colors duration-200 rounded-xl font-mono"
                      />
                      <p className="mt-1 text-[10px] md:text-xs text-gray-500">Adóköteles formaruha-juttatás (TB-alap része, általában évente egyszer)</p>
                    </div>

                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-3 md:p-4 rounded-xl border-2 border-blue-200/50 shadow-sm">
                      <p className="text-xs md:text-sm font-bold text-blue-800 mb-2">Számított értékek:</p>
                      <div className="text-xs text-blue-600 space-y-1 font-medium">
                        <div>• Munkarend szerinti órák: {munkarendSzerintiOrak.toFixed(1)} óra</div>
                        <div><strong>• Órabér: {formatCurrency(alapber / munkarendSzerintiOrak)}/óra</strong></div>
                        <div>• Ledolgozott órák: {ledolgozottOrak.toFixed(2)} óra</div>
                        <div>• Szabadság órák: {szabadsagOrak.toFixed(2)} óra</div>
                        <div>• 12 órás műszak: {tizenketOrasMuszak} db ({muszakTuloraOrak} túlóra-óra)</div>
                        <div>• Szabadnapi túlóra: {szabadnapiTuloraOrak} óra</div>
                        <div>• Pihenőnapi túlóra: {pihenonapiTuloraOrak} óra</div>
                        <div>• Munkaszüneti túlóra: {munkaszunetiTuloraOrak} óra</div>
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
                    <p className="text-xs md:text-sm font-bold text-green-800 mb-1">Jövedelmi tételek:</p>
                    <p className="text-xs text-green-700 mb-2">Órabér: {formatCurrency(eredmény.oraber)}/h · Túlóra alap: {formatCurrency(eredmény.tuloraOraber)}/h</p>
                    <div className="space-y-1 text-xs font-medium">
                      <div className="flex justify-between">
                        <span className="truncate pr-2">Havibéres időbér ({ledolgozottOrak.toFixed(2)} óra):</span>
                        <span className="font-semibold whitespace-nowrap">{formatCurrency(eredmény.haviberesIdober)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="truncate pr-2">Fizetett szabadság ({szabadsagOrak.toFixed(2)} óra):</span>
                        <span className="font-semibold whitespace-nowrap">{formatCurrency(eredmény.fizetettSzabadsag)}</span>
                      </div>
                      {eredmény.fizTavollét > 0 && (
                        <div className="flex justify-between">
                          <span className="truncate pr-2">Fizetett táv. állam. ({fizTavollétOrak} óra):</span>
                          <span className="font-semibold whitespace-nowrap">{formatCurrency(eredmény.fizTavollét)}</span>
                        </div>
                      )}
                      {(muszakTuloraOrak + szabadnapiTuloraOrak + pihenonapiTuloraOrak + munkaszunetiTuloraOrak) > 0 && (
                        <div className="flex justify-between">
                          <span className="truncate pr-2">Túlóraalap ({(muszakTuloraOrak + szabadnapiTuloraOrak + pihenonapiTuloraOrak + munkaszunetiTuloraOrak).toFixed(2)} óra):</span>
                          <span className="font-semibold whitespace-nowrap">{formatCurrency(eredmény.tuloraAlapossszeg)}</span>
                        </div>
                      )}
                      {eredmény.savPotlek > 0 && (
                        <div className="flex justify-between">
                          <span className="truncate pr-2">12 órás műszak sáv-pótlék ({tizenketOrasMuszak} db, 50/70%):</span>
                          <span className="font-semibold whitespace-nowrap">{formatCurrency(eredmény.savPotlek)}</span>
                        </div>
                      )}
                      {eredmény.szabadnapiPotlek > 0 && (
                        <div className="flex justify-between">
                          <span className="truncate pr-2">Szabadnapi túlóra ({szabadnapiTuloraOrak} óra, +100%):</span>
                          <span className="font-semibold whitespace-nowrap">{formatCurrency(eredmény.szabadnapiPotlek)}</span>
                        </div>
                      )}
                      {eredmény.pihenonapiPotlek > 0 && (
                        <div className="flex justify-between">
                          <span className="truncate pr-2">Pihenőnapi túlóra ({pihenonapiTuloraOrak} óra, +125%):</span>
                          <span className="font-semibold whitespace-nowrap">{formatCurrency(eredmény.pihenonapiPotlek)}</span>
                        </div>
                      )}
                      {eredmény.munkaszunetiTuloraPotlek > 0 && (
                        <div className="flex justify-between">
                          <span className="truncate pr-2">Munkaszüneti túlóra ({munkaszunetiTuloraOrak} óra, +225%):</span>
                          <span className="font-semibold whitespace-nowrap">{formatCurrency(eredmény.munkaszunetiTuloraPotlek)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span className="truncate pr-2">Műszakpótlék 45%:</span>
                        <span className="font-semibold whitespace-nowrap">{formatCurrency(eredmény.muszakpotlek)}</span>
                      </div>
                      {eredmény.tuloraMuszakpotlek > 0 && (
                        <div className="flex justify-between">
                          <span className="truncate pr-2">Túlóra műszakpótlék 45%:</span>
                          <span className="font-semibold whitespace-nowrap">{formatCurrency(eredmény.tuloraMuszakpotlek)}</span>
                        </div>
                      )}
                      {unnepnapiOrak > 0 && (
                        <>
                          <div className="flex justify-between">
                            <span className="truncate pr-2">Munkaszüneti pótlék ({unnepnapiOrak} óra, +100%):</span>
                            <span className="font-semibold whitespace-nowrap">{formatCurrency(eredmény.unnepnapiMunka)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="truncate pr-2">Munkaszüneti műszakpótlék ({unnepnapiOrak} óra, +45%):</span>
                            <span className="font-semibold whitespace-nowrap">{formatCurrency(eredmény.unnepnapiMuszakpotlek)}</span>
                          </div>
                        </>
                      )}
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
                      <div className="flex justify-between text-[10px] text-red-500/80 -mt-0.5">
                        <span className="truncate pr-2 pl-2">↳ TB-alap:</span>
                        <span className="whitespace-nowrap">{formatCurrency(eredmény.tbAlap)}</span>
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
