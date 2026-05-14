// Price History Helper Functions
// Termékek árváltozásainak követése és elemzése

import { createClient } from '@/lib/utils/supabase/client';
import { ProductPriceHistory, PriceChange, PriceStatistics, InflationData } from '../types/enhanced';

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

    // Csoportosítás termékenként (dátum-növekvő sorrendben)
    const productGroups: { [key: string]: ProductPriceHistory[] } = {};
    data.forEach(record => {
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

      // Termékenként csak a legfrissebb ablak-előtti rekordot vesszük
      const prevByProduct: { [name: string]: ProductPriceHistory } = {};
      prevData?.forEach(record => {
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
    const history = await getProductPriceHistory(userId, productName, 1000);
    
    if (history.length === 0) return null;

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

    // Csoportosítás hónaponként
    const monthlyData: { [period: string]: { [productName: string]: ProductPriceHistory[] } } = {};
    
    data.forEach(record => {
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