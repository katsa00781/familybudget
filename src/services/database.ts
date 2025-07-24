// Database utility functions
import { createClient } from '@/lib/utils/supabase/client';
import { SupabaseResponse, PaginationParams, SortParams, FilterParams } from '@/src/types';

export class DatabaseService {
  private supabase = createClient();

  /**
   * Generic function to get paginated data from any table
   */
  async getPaginatedData<T>(
    table: string,
    pagination?: PaginationParams,
    sort?: SortParams,
    filters?: FilterParams
  ): Promise<SupabaseResponse<T[]>> {
    let query = this.supabase.from(table).select('*', { count: 'exact' });

    // Apply filters
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          query = query.eq(key, value);
        }
      });
    }

    // Apply sorting
    if (sort) {
      query = query.order(sort.column, { ascending: sort.ascending ?? true });
    }

    // Apply pagination
    if (pagination) {
      const from = pagination.offset ?? ((pagination.page ?? 1) - 1) * (pagination.limit ?? 10);
      const to = from + (pagination.limit ?? 10) - 1;
      query = query.range(from, to);
    }

    const { data, error, count } = await query;

    return {
      data: data as T[],
      error,
      count: count ?? 0,
      status: error ? 400 : 200,
      statusText: error ? 'Error' : 'OK'
    };
  }

  /**
   * Generic function to create a record in any table
   */
  async createRecord<T>(table: string, record: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T> {
    const { data, error } = await this.supabase
      .from(table)
      .insert([record])
      .select()
      .single();

    if (error) throw error;
    return data as T;
  }

  /**
   * Generic function to update a record in any table
   */
  async updateRecord<T>(table: string, id: string, updates: Partial<T>): Promise<T> {
    const { data, error } = await this.supabase
      .from(table)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as T;
  }

  /**
   * Generic function to delete a record from any table
   */
  async deleteRecord(table: string, id: string): Promise<void> {
    const { error } = await this.supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Get record by ID from any table
   */
  async getRecordById<T>(table: string, id: string): Promise<T | null> {
    const { data, error } = await this.supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }

    return data as T;
  }

  /**
   * Execute a custom SQL function (RPC)
   */
  async executeFunction<T>(functionName: string, params?: Record<string, unknown>): Promise<T> {
    const { data, error } = await this.supabase.rpc(functionName, params);

    if (error) throw error;
    return data as T;
  }

  /**
   * Check if user has access to a resource (RLS helper)
   */
  async checkUserAccess(table: string, resourceId: string): Promise<boolean> {
    try {
      const { data, error } = await this.supabase
        .from(table)
        .select('id')
        .eq('id', resourceId)
        .single();

      return !error && !!data;
    } catch {
      return false;
    }
  }

  /**
   * Bulk insert records
   */
  async bulkInsert<T>(table: string, records: Omit<T, 'id' | 'created_at' | 'updated_at'>[]): Promise<T[]> {
    const { data, error } = await this.supabase
      .from(table)
      .insert(records)
      .select();

    if (error) throw error;
    return data as T[];
  }

  /**
   * Search records with full text search
   */
  async searchRecords<T>(
    table: string,
    column: string,
    query: string,
    limit?: number
  ): Promise<T[]> {
    let search = this.supabase
      .from(table)
      .select('*')
      .textSearch(column, query);

    if (limit) {
      search = search.limit(limit);
    }

    const { data, error } = await search;

    if (error) throw error;
    return data as T[];
  }
}
