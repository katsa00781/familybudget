// Price History Helper Functions
// Termékek árváltozásainak követése és elemzése

import { createClient } from '@/lib/utils/supabase/client';
import { ProductPriceHistory, PriceChange, PriceStatistics, InflationData } from '../types/enhanced';

/**
 * Rendes (nem akciós) ár-e a rekord. A migráció (20261106_002) előtti sorokban
 * az `akcios` mező hiányzik → rendes árnak számít.
 */
export const isRegularPrice = (record: Pick<ProductPriceHistory, 'akcios'>): boolean =>
  !record.akcios;

/**
 * Új ár mentése a price history táblába
 */
export const savePriceHistory = async (
  userId: string,
  productName: string,
  unitPrice: number,
  options: {
    productId?: string;
    productCategory?: string;
    storeName?: string;
    unit?: string;
    quantity?: number;
    totalPrice?: number;
    priceDate?: string;
    source?: 'ocr' | 'manual' | 'import' | 'list';
  } = {}
): Promise<{ success: boolean; error?: string; data?: ProductPriceHistory }> => {
  try {
    const supabase = createClient();
    const priceData = {
      user_id: userId,
      product_id: options.productId || null,
      product_name: productName,
      product_category: options.productCategory || null,
      store_name: options.storeName || null,
      unit: options.unit || 'db',
      unit_price: unitPrice,
      quantity: options.quantity || 1,
      total_price: options.totalPrice || unitPrice * (options.quantity || 1),
      price_date: options.priceDate || new Date().toISOString().split('T')[0],
      source: options.source || 'manual'
    };

    const { data, error } = await supabase
      .from('product_price_history')
      .insert(priceData)
      .select()
      .single();

    if (error) {
      console.error('Error saving price history:', error);
      return { success: false, error: error.message };
    }

    return { success: true, data };
  } catch (error) {
    console.error('Exception in savePriceHistory:', error);
    return { success: false, error: (error as Error).message };
  }
};

/**
 * Termék árváltozásainak lekérése időrendben
 */
export const getProductPriceHistory = async (
  userId: string,
  productName: string,
  limit: number = 50
): Promise<ProductPriceHistory[]> => {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('product_price_history')
      .select('*')
      .eq('user_id', userId)
      .eq('product_name', productName)
      .order('price_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching price history:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Exception in getProductPriceHistory:', error);
    return [];
  }
};

/**
 * Árváltozások kimutatása (összehasonlítás az előző árral)
 */
export const getPriceChanges = async (
  userId: string,
  daysBack: number = 30
): Promise<PriceChange[]> => {
  try {
    const supabase = createClient();
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysBack);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

    console.log('🔍 Price changes query:', { userId, daysBack, cutoffDateStr });

    // Lekérjük az összes árat a megadott időszakból
    const { data, error } = await supabase
      .from('product_price_history')
      .select('*')
      .eq('user_id', userId)
      .gte('price_date', cutoffDateStr)
      .order('product_name', { ascending: true })
      .order('price_date', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('❌ Error fetching price changes:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('⚠️ No price history data found for price changes');
      return [];
    }

    console.log('✅ Found', data.length, 'price history records for changes');

    // Az akciós árak nem valódi árváltozások → kimaradnak az összehasonlításból
    const regularData = data.filter(isRegularPrice);

    // Csoportosítás termékenként (dátum-növekvő sorrendben)
    const productGroups: { [key: string]: ProductPriceHistory[] } = {};
    regularData.forEach(record => {
      if (!productGroups[record.product_name]) {
        productGroups[record.product_name] = [];
      }
      productGroups[record.product_name].push(record);
    });

    // Ha valamelyik terméknek csak 1 rekordja van az ablakban, keressük meg
    // a közvetlenül megelőző (ablak előtti) árát, hogy legyen mihez hasonlítani
    const singleRecordProducts = Object.entries(productGroups)
      .filter(([, recs]) => recs.length === 1)
      .map(([name]) => name);

    if (singleRecordProducts.length > 0) {
      const { data: prevData } = await supabase
        .from('product_price_history')
        .select('*')
        .eq('user_id', userId)
        .lt('price_date', cutoffDateStr)
        .in('product_name', singleRecordProducts)
        .order('product_name', { ascending: true })
        .order('price_date', { ascending: false })
        .order('created_at', { ascending: false });

      // Termékenként csak a legfrissebb ablak-előtti (nem akciós) rekordot vesszük
      const prevByProduct: { [name: string]: ProductPriceHistory } = {};
      prevData?.filter(isRegularPrice).forEach(record => {
        if (!prevByProduct[record.product_name]) {
          prevByProduct[record.product_name] = record;
        }
      });

      // Az ablak előtti rekordot az elejére szúrjuk (ez lesz az "old price")
      Object.entries(prevByProduct).forEach(([name, rec]) => {
        productGroups[name].unshift(rec);
      });
    }

    const priceChanges: PriceChange[] = [];

    Object.entries(productGroups).forEach(([productName, records]) => {
      if (records.length < 2) return;

      // Csak a legutóbbi változás: utolsó két rekord összehasonlítása
      const oldRecord = records[records.length - 2];
      const newRecord = records[records.length - 1];

      const priceDiff = newRecord.unit_price - oldRecord.unit_price;
      const priceChangePercent = oldRecord.unit_price > 0
        ? (priceDiff / oldRecord.unit_price) * 100
        : 0;

      // Csak ha van érdemi változás (több mint 1%)
      if (Math.abs(priceChangePercent) > 1) {
        const daysBetween = Math.floor(
          (new Date(newRecord.price_date).getTime() - new Date(oldRecord.price_date).getTime()) / (1000 * 60 * 60 * 24)
        );

        priceChanges.push({
          product_name: productName,
          product_category: newRecord.product_category || undefined,
          old_price: oldRecord.unit_price,
          new_price: newRecord.unit_price,
          price_difference: priceDiff,
          price_change_percent: priceChangePercent,
          old_date: oldRecord.price_date,
          new_date: newRecord.price_date,
          store_name: newRecord.store_name || undefined,
          days_between: daysBetween
        });
      }
    });

    return priceChanges;
  } catch (error) {
    console.error('Exception in getPriceChanges:', error);
    return [];
  }
};

/**
 * Termék árstatisztikák lekérése
 */
export const getPriceStatistics = async (
  userId: string,
  productName: string
): Promise<PriceStatistics | null> => {
  try {
    const allHistory = await getProductPriceHistory(userId, productName, 1000);

    if (allHistory.length === 0) return null;

    // Statisztika a rendes (nem akciós) árakból; ha csak akciós ár van, azokból
    const regular = allHistory.filter(isRegularPrice);
    const history = regular.length > 0 ? regular : allHistory;

    const prices = history.map(h => h.unit_price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const currentPrice = history[0].unit_price; // Legfrissebb ár

    // Trend meghatározása (utolsó 3 ár alapján)
    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (history.length >= 3) {
      const recentPrices = history.slice(0, 3).map(h => h.unit_price);
      const avgRecent = recentPrices.reduce((sum, p) => sum + p, 0) / recentPrices.length;
      const olderPrices = history.slice(3, 6).map(h => h.unit_price);
      const avgOlder = olderPrices.length > 0 
        ? olderPrices.reduce((sum, p) => sum + p, 0) / olderPrices.length 
        : avgRecent;
      
      const change = ((avgRecent - avgOlder) / avgOlder) * 100;
      if (change > 5) trend = 'increasing';
      else if (change < -5) trend = 'decreasing';
    }

    const stores = [...new Set(history.map(h => h.store_name).filter(Boolean))];

    return {
      product_name: productName,
      product_category: history[0].product_category || undefined,
      min_price: minPrice,
      max_price: maxPrice,
      avg_price: avgPrice,
      current_price: currentPrice,
      price_trend: trend,
      total_records: history.length,
      first_seen: history[history.length - 1].price_date,
      last_seen: history[0].price_date,
      stores: stores as string[]
    };
  } catch (error) {
    console.error('Exception in getPriceStatistics:', error);
    return null;
  }
};

/**
 * Személyes inflációs adatok kategóriánkánt és hónaponként
 */
export const getInflationData = async (
  userId: string,
  monthsBack: number = 12
): Promise<InflationData[]> => {
  try {
    const supabase = createClient();
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsBack);
    const cutoffDateStr = cutoffDate.toISOString().split('T')[0];

    console.log('🔍 Inflation data query:', { userId, monthsBack, cutoffDateStr });

    const { data, error } = await supabase
      .from('product_price_history')
      .select('*')
      .eq('user_id', userId)
      .gte('price_date', cutoffDateStr)
      .order('price_date', { ascending: true });

    if (error) {
      console.error('❌ Error fetching inflation data:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('⚠️ No price history data found for inflation calculation');
      return [];
    }

    console.log('✅ Found', data.length, 'price history records');

    // Csoportosítás hónaponként (akciós árak nélkül — azok nem valódi árváltozások)
    const monthlyData: { [period: string]: { [productName: string]: ProductPriceHistory[] } } = {};

    data.filter(isRegularPrice).forEach(record => {
      const period = record.price_date.substring(0, 7); // YYYY-MM
      if (!monthlyData[period]) {
        monthlyData[period] = {};
      }
      if (!monthlyData[period][record.product_name]) {
        monthlyData[period][record.product_name] = [];
      }
      monthlyData[period][record.product_name].push(record);
    });

    // Inflációs adatok számítása
    const inflationData: InflationData[] = [];
    const periods = Object.keys(monthlyData).sort();

    for (let i = 1; i < periods.length; i++) {
      const currentPeriod = periods[i];
      const previousPeriod = periods[i - 1];
      
      const currentProducts = monthlyData[currentPeriod];
      const previousProducts = monthlyData[previousPeriod];

      let totalPriceChange = 0;
      let productCount = 0;
      const categoryData: { [category: string]: { sum: number; count: number } } = {};

      Object.keys(currentProducts).forEach(productName => {
        if (previousProducts[productName]) {
          const currentAvg = currentProducts[productName].reduce((sum, p) => sum + p.unit_price, 0) / currentProducts[productName].length;
          const previousAvg = previousProducts[productName].reduce((sum, p) => sum + p.unit_price, 0) / previousProducts[productName].length;
          
          const priceChange = ((currentAvg - previousAvg) / previousAvg) * 100;
          totalPriceChange += priceChange;
          productCount++;

          const category = currentProducts[productName][0].product_category || 'Egyéb';
          if (!categoryData[category]) {
            categoryData[category] = { sum: 0, count: 0 };
          }
          categoryData[category].sum += priceChange;
          categoryData[category].count++;
        }
      });

      if (productCount > 0) {
        const categories: { [category: string]: { avg_price_change: number; item_count: number } } = {};
        Object.entries(categoryData).forEach(([category, data]) => {
          categories[category] = {
            avg_price_change: data.sum / data.count,
            item_count: data.count
          };
        });

        inflationData.push({
          period: currentPeriod,
          total_items: productCount,
          avg_price_change_percent: totalPriceChange / productCount,
          categories
        });
      }
    }

    return inflationData;
  } catch (error) {
    console.error('Exception in getInflationData:', error);
    return [];
  }
};

/**
 * Legutóbbi ár lekérése egy termékhez
 */
export const getLatestPrice = async (
  userId: string,
  productName: string
): Promise<{ price: number; date: string; store?: string } | null> => {
  try {
    const supabase = createClient();
    const { data, error} = await supabase
      .from('product_price_history')
      .select('unit_price, price_date, store_name')
      .eq('user_id', userId)
      .eq('product_name', productName)
      .order('price_date', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      price: data.unit_price,
      date: data.price_date,
      store: data.store_name
    };
  } catch (error) {
    console.error('Exception in getLatestPrice:', error);
    return null;
  }
};

/**
 * Ártörténet-bejegyzés szerkesztése (pl. hibás OCR ár javítása, akciós jelölés)
 */
export const updatePriceHistory = async (
  id: string,
  mezok: {
    unitPrice?: number;
    priceDate?: string;
    storeName?: string | null;
    akcios?: boolean;
  }
): Promise<{ success: boolean; error?: string; data?: ProductPriceHistory }> => {
  try {
    const supabase = createClient();
    const modositas: Record<string, unknown> = { updated_at: new Date().toISOString() };

    if (mezok.unitPrice !== undefined) {
      // Az összárat az egységár × mennyiség alapján újraszámoljuk
      const { data: regi, error: lekeresHiba } = await supabase
        .from('product_price_history')
        .select('quantity')
        .eq('id', id)
        .single();
      if (lekeresHiba) return { success: false, error: lekeresHiba.message };
      modositas.unit_price = mezok.unitPrice;
      modositas.total_price = mezok.unitPrice * (Number(regi?.quantity) || 1);
    }
    if (mezok.priceDate !== undefined) modositas.price_date = mezok.priceDate;
    if (mezok.storeName !== undefined) modositas.store_name = mezok.storeName || null;
    if (mezok.akcios !== undefined) modositas.akcios = mezok.akcios;

    const { data, error } = await supabase
      .from('product_price_history')
      .update(modositas)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating price history:', error);
      return { success: false, error: error.message };
    }
    return { success: true, data };
  } catch (error) {
    console.error('Exception in updatePriceHistory:', error);
    return { success: false, error: (error as Error).message };
  }
};

/**
 * Ártörténet-bejegyzés törlése (pl. teljesen hibás OCR sor)
 */
export const deletePriceHistory = async (
  id: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const supabase = createClient();
    const { error } = await supabase
      .from('product_price_history')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting price history:', error);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    console.error('Exception in deletePriceHistory:', error);
    return { success: false, error: (error as Error).message };
  }
};

/** Egy termék neve az ártörténetben és a hozzá tartozó bejegyzések száma */
export interface TermekNevDb {
  nev: string;
  db: number;
}

/**
 * Az ártörténetben szereplő összes terméknév (bejegyzésszámmal), ábécérendben
 */
export const getTermekNevek = async (userId: string): Promise<TermekNevDb[]> => {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('product_price_history')
      .select('product_name')
      .eq('user_id', userId)
      .limit(20000);

    if (error) {
      console.error('Error fetching product names:', error);
      return [];
    }

    const szamlalo = new Map<string, number>();
    (data ?? []).forEach((r: { product_name: string }) => {
      szamlalo.set(r.product_name, (szamlalo.get(r.product_name) ?? 0) + 1);
    });
    return [...szamlalo.entries()]
      .map(([nev, db]) => ({ nev, db }))
      .sort((a, b) => a.nev.localeCompare(b.nev, 'hu'));
  } catch (error) {
    console.error('Exception in getTermekNevek:', error);
    return [];
  }
};

/**
 * Termék(ek) átnevezése / összevonása: a `forrasNevek` minden ártörténet-bejegyzése
 * a `celNev` nevet kapja. Egy forrásnévvel ez sima átnevezés; ha a `celNev` már
 * létezik, a történetek összeolvadnak. A bejegyzések (ár, dátum, bolt, akciós jelölés,
 * product_id) változatlanok maradnak, csak a név módosul.
 *
 * `statisztikaIs` esetén a `shopping_statistics` tábla azonos nevű sorai is átnevezésre
 * kerülnek, hogy a Statisztika oldal is egyben lássa a terméket.
 */
export const termekekOsszevonasa = async (
  userId: string,
  forrasNevek: string[],
  celNev: string,
  opciok: { statisztikaIs?: boolean } = {}
): Promise<{ success: boolean; error?: string; arTortenetDb?: number; statisztikaDb?: number }> => {
  const ujNev = celNev.trim();
  const forrasok = [...new Set(forrasNevek)].filter((n) => n !== ujNev);
  if (!ujNev) return { success: false, error: 'Az új név nem lehet üres' };
  if (forrasok.length === 0) return { success: true, arTortenetDb: 0, statisztikaDb: 0 };

  try {
    const supabase = createClient();
    const { data: arSorok, error } = await supabase
      .from('product_price_history')
      .update({ product_name: ujNev, updated_at: new Date().toISOString() })
      .eq('user_id', userId)
      .in('product_name', forrasok)
      .select('id');

    if (error) {
      console.error('Error merging products (price history):', error);
      return { success: false, error: error.message };
    }

    let statisztikaDb = 0;
    if (opciok.statisztikaIs) {
      const { data: statSorok, error: statHiba } = await supabase
        .from('shopping_statistics')
        .update({ product_name: ujNev })
        .eq('user_id', userId)
        .in('product_name', forrasok)
        .select('id');
      if (statHiba) {
        // Az ártörténet már átnevezve — a hibát jelezzük, de nem görgetjük vissza
        console.error('Error merging products (shopping statistics):', statHiba);
        return {
          success: false,
          error: `Az ártörténet átnevezve, de a statisztika nem: ${statHiba.message}`,
          arTortenetDb: arSorok?.length ?? 0,
        };
      }
      statisztikaDb = statSorok?.length ?? 0;
    }

    return { success: true, arTortenetDb: arSorok?.length ?? 0, statisztikaDb };
  } catch (error) {
    console.error('Exception in termekekOsszevonasa:', error);
    return { success: false, error: (error as Error).message };
  }
};

/**
 * Terméknév normalizálása hasonlóság-kereséshez (kisbetű, ékezet és írásjelek nélkül)
 */
const normalizalNev = (nev: string): string =>
  nev
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/**
 * Két terméknév hasonlósága 0..1 között (szó-átfedés, közös előtag, karakter-bigram). Az OCR-ből
 * eltérő néven bekerült, valójában azonos termékek felajánlásához az összevonásnál.
 */
export const nevHasonlosag = (a: string, b: string): number => {
  const na = normalizalNev(a);
  const nb = normalizalNev(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;

  const szavakA = new Set(na.split(' '));
  const szavakB = new Set(nb.split(' '));
  const kozos = [...szavakA].filter((s) => szavakB.has(s)).length;
  const jaccard = kozos / new Set([...szavakA, ...szavakB]).size;

  let elotag = 0;
  while (elotag < na.length && elotag < nb.length && na[elotag] === nb[elotag]) elotag++;
  const elotagArany = elotag / Math.min(na.length, nb.length);

  const tartalmaz = na.includes(nb) || nb.includes(na) ? 0.8 : 0;

  // Karakter-bigram (Dice) hasonlóság — az OCR betűhibáit fogja meg (pl. „Trappista” / „Trapista”)
  const bigramok = (sz: string) => {
    const m = new Map<string, number>();
    for (let i = 0; i < sz.length - 1; i++) {
      const bg = sz.slice(i, i + 2);
      m.set(bg, (m.get(bg) ?? 0) + 1);
    }
    return m;
  };
  const bgA = bigramok(na);
  const bgB = bigramok(nb);
  let kozosBg = 0;
  bgA.forEach((db, bg) => { kozosBg += Math.min(db, bgB.get(bg) ?? 0); });
  const dice = (2 * kozosBg) / Math.max(1, na.length - 1 + nb.length - 1);

  return Math.max(jaccard, elotagArany * 0.9, tartalmaz, dice);
};
