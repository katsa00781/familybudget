// Product Price History Types
// Termékek árváltozásainak követése

export interface ProductPriceHistory {
  id: string;
  user_id: string;
  product_id?: string | null;
  product_name: string;
  product_category?: string | null;
  store_name?: string | null;
  unit: string;
  unit_price: number;
  quantity: number;
  total_price: number;
  price_date: string; // YYYY-MM-DD format
  source: 'ocr' | 'manual' | 'import' | 'list';
  created_at: string;
  updated_at: string;
}

// Shopping Statistics Types
// Bevásárlási statisztikák tárolása
export interface ShoppingStatistic {
  id: string;
  user_id: string;
  shopping_list_id?: string | null;
  shopping_date: string; // YYYY-MM-DD format
  product_name: string;
  product_category?: string | null;
  brand?: string | null;
  store_name?: string | null;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  source?: 'ocr' | 'manual' | 'list';
  created_at: string;
  updated_at: string;
}

export interface PriceChange {
  product_name: string;
  product_category?: string;
  old_price: number;
  new_price: number;
  price_difference: number;
  price_change_percent: number;
  old_date: string;
  new_date: string;
  store_name?: string;
  days_between: number;
}

export interface PriceStatistics {
  product_name: string;
  product_category?: string;
  min_price: number;
  max_price: number;
  avg_price: number;
  current_price: number;
  price_trend: 'increasing' | 'decreasing' | 'stable';
  total_records: number;
  first_seen: string;
  last_seen: string;
  stores: string[];
}

export interface InflationData {
  period: string; // 'YYYY-MM' format
  total_items: number;
  avg_price_change_percent: number;
  categories: {
    [category: string]: {
      avg_price_change: number;
      item_count: number;
    };
  };
}

// Receipt OCR Types
export interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price: number;
  category: string;
  checked: boolean;
}

export interface ReceiptData {
  items: ReceiptItem[];
  total: number;
  date?: string;
  store?: string;
}

// Family Members Types
export interface FamilyMember {
  id: string;
  family_id: string;
  user_id: string;
  email: string;
  full_name?: string;
  display_name?: string;
  avatar_url?: string;
  phone?: string;
  role: 'admin' | 'member' | 'viewer';
  status: 'active' | 'invited' | 'inactive';
  invited_by?: string;
  invited_at?: string;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

// Shopping Statistics Types
export interface ShoppingStatistics {
  id: string;
  user_id: string;
  period: string; // YYYY-MM format
  total_amount: number;
  total_items: number;
  shopping_frequency: number; // vásárlások száma a hónapban
  avg_basket_size: number;
  top_categories: {
    [category: string]: {
      amount: number;
      percentage: number;
      item_count: number;
    };
  };
  top_stores: {
    [store: string]: {
      amount: number;
      percentage: number;
      visit_count: number;
    };
  };
  budget_performance: {
    planned_amount: number;
    actual_amount: number;
    savings: number;
    savings_percentage: number;
  };
  created_at: string;
}

export interface ShoppingRecord {
  id: string;
  user_id: string;
  shopping_list_id?: string;
  product_name: string;
  product_category?: string;
  store_name?: string;
  unit: string;
  unit_price: number;
  quantity: number;
  total_price: number;
  shopping_date: string;
  source: 'ocr' | 'manual' | 'list';
  created_at: string;
}

export interface CategoryStats {
  category: string;
  totalAmount: number;
  itemCount: number;
  percentage: number;
}

export interface MonthlyStats {
  month: string;
  totalAmount: number;
  itemCount: number;
  averagePerDay: number;
}

export interface ProductStats {
  productName: string;
  totalAmount: number;
  quantity: number;
  unit: string;
  averagePrice: number;
  lastPurchase: string;
}

export interface StoreStats {
  storeName: string;
  totalAmount: number;
  visitCount: number;
  averageBasket: number;
}

// Enhanced Shopping List Types
export interface EnhancedShoppingList {
  id: string;
  user_id: string;
  name: string;
  items: ReceiptItem[] | string;
  total_amount: number;
  store_name?: string;
  completed: boolean;
  completed_at?: string;
  shared_with?: string[];
  list_type: 'shopping' | 'template' | 'recurring';
  recurrence_pattern?: string;
  created_at: string;
  updated_at: string;
}