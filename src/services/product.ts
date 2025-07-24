// Product Service
import { createClient } from '@/lib/utils/supabase/client';
import { Product, Category, Store } from '@/src/types';

export class ProductService {
  private supabase = createClient();

  /**
   * Get all products
   */
  async getProducts(): Promise<Product[]> {
    const { data, error } = await this.supabase
      .from('products')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  }

  /**
   * Search products by name or barcode
   */
  async searchProducts(query: string): Promise<Product[]> {
    const { data, error } = await this.supabase
      .from('products')
      .select('*')
      .or(`name.ilike.%${query}%,barcode.eq.${query}`)
      .order('name');

    if (error) throw error;
    return data || [];
  }

  /**
   * Get product by ID
   */
  async getProduct(id: string): Promise<Product | null> {
    const { data, error } = await this.supabase
      .from('products')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data;
  }

  /**
   * Create new product
   */
  async createProduct(product: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
    const { data, error } = await this.supabase
      .from('products')
      .insert([product])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update product
   */
  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    const { data, error } = await this.supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete product
   */
  async deleteProduct(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('products')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Get products by category
   */
  async getProductsByCategory(categoryId: string): Promise<Product[]> {
    const { data, error } = await this.supabase
      .from('products')
      .select('*')
      .eq('category_id', categoryId)
      .order('name');

    if (error) throw error;
    return data || [];
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<Category[]> {
    const { data, error } = await this.supabase
      .from('categories')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  }

  /**
   * Create new category
   */
  async createCategory(category: Omit<Category, 'id' | 'created_at'>): Promise<Category> {
    const { data, error } = await this.supabase
      .from('categories')
      .insert([category])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Get all stores
   */
  async getStores(): Promise<Store[]> {
    const { data, error } = await this.supabase
      .from('stores')
      .select('*')
      .order('name');

    if (error) throw error;
    return data || [];
  }

  /**
   * Create new store
   */
  async createStore(store: Omit<Store, 'id' | 'created_at'>): Promise<Store> {
    const { data, error } = await this.supabase
      .from('stores')
      .insert([store])
      .select()
      .single();

    if (error) throw error;
    return data;
  }
}
