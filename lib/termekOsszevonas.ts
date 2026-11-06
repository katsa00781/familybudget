// Termékadatbázis (products) – termékek összevonása
// A tényleges művelet a `termekek_osszevonasa` adatbázis-függvényben fut egy tranzakcióban
// (migráció 20261106_003). Itt csak a hívás és a kliensoldali előnézet van.

import { createClient } from '@/lib/utils/supabase/client';

/** Az összevonáshoz szükséges termékmezők */
export interface OsszevonhatoTermek {
  id: string;
  name: string;
  brand?: string | null;
  category: string;
  store_name?: string | null;
  price?: number | null;
  unit: string;
  barcode?: string | null;
  last_seen_at?: string | null;
  created_at?: string;
}

/** Egy forrás termék sorsa az összevonáskor */
export type OsszevonasModja = 'beolvad' | 'atnevezodik';

export interface OsszevonasEredmeny {
  cel_nev: string;
  /** Más bolt/egység miatt külön sorként megmaradt, csak átnevezett termékek */
  atnevezett: number;
  /** Azonos bolt + egység miatt beolvasztott (törölt) termékek */
  beolvasztott: number;
  /** Átnevezett ártörténet-bejegyzések */
  arelozmeny: number;
  /** Átnevezett bevásárlási statisztika sorok */
  statisztika: number;
}

/**
 * Előnézet: melyik forrás olvad be egy meglévő sorba (azonos bolt + egység a cél nevével),
 * és melyik csak átneveződik. Lépésről lépésre ugyanazt szimulálja, mint a
 * `termekek_osszevonasa` adatbázis-függvény (sorrend: legfrissebb `last_seen_at` előbb).
 */
export const osszevonasElonezet = (
  cel: OsszevonhatoTermek,
  forrasok: OsszevonhatoTermek[],
  osszesTermek: OsszevonhatoTermek[]
): Record<string, OsszevonasModja> => {
  const celNevKicsi = cel.name.toLowerCase();
  // A tábla szimulált állapota: id → (bolt, kisbetűs név, egység)
  const sorok = new Map(
    osszesTermek.map((t) => [t.id, { bolt: t.store_name ?? '', nev: t.name.toLowerCase(), egyseg: t.unit }])
  );

  const ido = (t: OsszevonhatoTermek, mezo: 'last_seen_at' | 'created_at') => {
    const ertek = t[mezo];
    return ertek ? Date.parse(ertek) : -Infinity;
  };
  const sorrend = forrasok
    .filter((f) => f.id !== cel.id)
    .sort((a, b) => ido(b, 'last_seen_at') - ido(a, 'last_seen_at') || ido(b, 'created_at') - ido(a, 'created_at'));

  const eredmeny: Record<string, OsszevonasModja> = {};
  sorrend.forEach((f) => {
    const bolt = f.store_name ?? '';
    const utkozik = [...sorok.entries()].some(
      ([id, s]) => id !== f.id && s.bolt === bolt && s.nev === celNevKicsi && s.egyseg === f.unit
    );
    if (utkozik) {
      eredmeny[f.id] = 'beolvad';
      sorok.delete(f.id);
    } else {
      eredmeny[f.id] = 'atnevezodik';
      sorok.set(f.id, { bolt, nev: celNevKicsi, egyseg: f.unit });
    }
  });
  return eredmeny;
};

/**
 * Termékek összevonása a `cel` termékbe (adatbázis-függvény, egy tranzakció)
 */
export const termekekOsszevonasaAdatbazisban = async (
  celId: string,
  forrasIdk: string[],
  opciok: { arelozmenyIs?: boolean; statisztikaIs?: boolean } = {}
): Promise<{ success: boolean; error?: string; data?: OsszevonasEredmeny }> => {
  try {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('termekek_osszevonasa', {
      cel_id: celId,
      forras_ids: forrasIdk,
      arelozmeny_atnevezes: opciok.arelozmenyIs ?? true,
      statisztika_atnevezes: opciok.statisztikaIs ?? true,
    });

    if (error) {
      console.error('Error merging products:', error);
      // PGRST202: a függvény nem létezik (a migráció még nem futott)
      const hianyzoFuggveny = error.code === 'PGRST202' || error.message?.includes('Could not find the function');
      return {
        success: false,
        error: hianyzoFuggveny
          ? 'Az összevonáshoz futtasd a 20261106_003 migrációt a Supabase SQL Editorban!'
          : error.message,
      };
    }
    return { success: true, data: data as OsszevonasEredmeny };
  } catch (error) {
    console.error('Exception in termekekOsszevonasaAdatbazisban:', error);
    return { success: false, error: (error as Error).message };
  }
};
