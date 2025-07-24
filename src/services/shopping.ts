// Shopping List Service
import { createClient } from '@/lib/utils/supabase/client';
import { ShoppingList, ShoppingListItem } from '@/src/types';

export class ShoppingListService {
  private supabase = createClient();

  /**
   * Get all shopping lists for a family
   */
  async getShoppingLists(familyId: string): Promise<ShoppingList[]> {
    const { data, error } = await this.supabase
      .from('shopping_lists')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }

  /**
   * Get shopping list by ID
   */
  async getShoppingList(id: string): Promise<ShoppingList | null> {
    const { data, error } = await this.supabase
      .from('shopping_lists')
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
   * Create new shopping list
   */
  async createShoppingList(shoppingList: Omit<ShoppingList, 'id' | 'created_at' | 'updated_at'>): Promise<ShoppingList> {
    const { data, error } = await this.supabase
      .from('shopping_lists')
      .insert([shoppingList])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Update shopping list
   */
  async updateShoppingList(id: string, updates: Partial<ShoppingList>): Promise<ShoppingList> {
    const { data, error } = await this.supabase
      .from('shopping_lists')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Delete shopping list
   */
  async deleteShoppingList(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('shopping_lists')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Add item to shopping list
   */
  async addItemToList(listId: string, item: Omit<ShoppingListItem, 'id'>): Promise<ShoppingList> {
    // Get current shopping list
    const list = await this.getShoppingList(listId);
    if (!list) throw new Error('Shopping list not found');

    // Add new item
    const newItem: ShoppingListItem = {
      id: crypto.randomUUID(),
      ...item
    };

    const updatedItems = [...list.items, newItem];

    return this.updateShoppingList(listId, {
      items: updatedItems
    });
  }

  /**
   * Update item in shopping list
   */
  async updateItemInList(listId: string, itemId: string, updates: Partial<ShoppingListItem>): Promise<ShoppingList> {
    // Get current shopping list
    const list = await this.getShoppingList(listId);
    if (!list) throw new Error('Shopping list not found');

    // Update the specific item
    const updatedItems = list.items.map(item => 
      item.id === itemId ? { ...item, ...updates } : item
    );

    return this.updateShoppingList(listId, {
      items: updatedItems
    });
  }

  /**
   * Remove item from shopping list
   */
  async removeItemFromList(listId: string, itemId: string): Promise<ShoppingList> {
    // Get current shopping list
    const list = await this.getShoppingList(listId);
    if (!list) throw new Error('Shopping list not found');

    // Remove the item
    const updatedItems = list.items.filter(item => item.id !== itemId);

    return this.updateShoppingList(listId, {
      items: updatedItems
    });
  }

  /**
   * Mark item as purchased
   */
  async markItemPurchased(listId: string, itemId: string): Promise<ShoppingList> {
    return this.updateItemInList(listId, itemId, { purchased: true });
  }

  /**
   * Get active shopping lists
   */
  async getActiveShoppingLists(familyId: string): Promise<ShoppingList[]> {
    const { data, error } = await this.supabase
      .from('shopping_lists')
      .select('*')
      .eq('family_id', familyId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}
