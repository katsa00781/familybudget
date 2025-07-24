// Product Management Types
export interface Product {
  id: string;
  name: string;
  category_id: string;
  price: number;
  unit: string;
  store_id?: string;
  barcode?: string;
  description?: string;
  brand?: string;
  package_size?: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  parent_category_id?: string;
  created_at: string;
}

export interface Store {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  type?: 'supermarket' | 'grocery' | 'pharmacy' | 'bakery' | 'butcher' | 'market' | 'online' | 'other';
  working_hours?: string;
  created_at: string;
}

export interface ProductPrice {
  id: string;
  product_id: string;
  store_id: string;
  price: number;
  promotion_price?: number;
  valid_from: string;
  valid_until?: string;
  created_at: string;
}

export interface ShoppingListItem {
  id: string;
  product_id: string;
  quantity: number;
  unit: string;
  purchased: boolean;
  notes?: string;
}

export interface ShoppingList {
  id: string;
  name: string;
  family_id: string;
  items: ShoppingListItem[];
  total_estimated_cost?: number;
  total_actual_cost?: number;
  status: 'draft' | 'active' | 'completed';
  created_at: string;
  updated_at: string;
}
