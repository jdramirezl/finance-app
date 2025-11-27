// Supabase storage service for cloud persistence with user isolation
// Replaces localStorage with Supabase database queries

import { supabase } from '../lib/supabase';
import type { Account, Pocket, SubPocket, Movement, Settings } from '../types';

interface BudgetEntry {
  id: string;
  user_id: string;
  name: string;
  amount: number;
  display_order?: number;
}

export class SupabaseStorageService {
  // Helper to get current user ID
  private static async getUserId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    return user.id;
  }

  // Accounts
  static async getAccounts(): Promise<Account[]> {
    const userId = await this.getUserId();
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    
    // Map snake_case to camelCase
    return (data || []).map(account => ({
      id: account.id,
      name: account.name,
      color: account.color,
      currency: account.currency,
      balance: parseFloat(account.balance || 0),
      type: account.type,
      stockSymbol: account.stock_symbol,
      montoInvertido: account.monto_invertido ? parseFloat(account.monto_invertido) : undefined,
      shares: account.shares ? parseFloat(account.shares) : undefined,
      displayOrder: account.display_order,
    }));
  }

  static async saveAccounts(accounts: Account[]): Promise<void> {
    const userId = await this.getUserId();
    
    // Use upsert to handle both insert and update
    if (accounts.length > 0) {
      const accountsToUpsert = accounts.map(account => ({
        id: account.id,
        user_id: userId,
        name: account.name,
        color: account.color,
        currency: account.currency,
        balance: account.balance,
        type: account.type || 'normal',
        stock_symbol: account.stockSymbol,
        monto_invertido: account.montoInvertido,
        shares: account.shares,
        display_order: account.displayOrder || 0,
      }));

      const { error } = await supabase
        .from('accounts')
        .upsert(accountsToUpsert, { onConflict: 'id' });
      if (error) throw error;
    }
  }

  // Insert single account (more efficient)
  static async insertAccount(account: Account): Promise<void> {
    const userId = await this.getUserId();
    
    const { error } = await supabase
      .from('accounts')
      .insert({
        id: account.id,
        user_id: userId,
        name: account.name,
        color: account.color,
        currency: account.currency,
        balance: account.balance,
        type: account.type || 'normal',
        stock_symbol: account.stockSymbol,
        monto_invertido: account.montoInvertido,
        shares: account.shares,
        display_order: account.displayOrder || 0,
      });
    
    if (error) throw error;
  }

  // Update single account (more efficient)
  static async updateAccount(id: string, updates: Partial<Account>): Promise<void> {
    const userId = await this.getUserId();
    
    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.color !== undefined) updateData.color = updates.color;
    if (updates.currency !== undefined) updateData.currency = updates.currency;
    if (updates.balance !== undefined) updateData.balance = updates.balance;
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.stockSymbol !== undefined) updateData.stock_symbol = updates.stockSymbol;
    if (updates.montoInvertido !== undefined) updateData.monto_invertido = updates.montoInvertido;
    if (updates.shares !== undefined) updateData.shares = updates.shares;
    if (updates.displayOrder !== undefined) updateData.display_order = updates.displayOrder;
    
    const { error } = await supabase
      .from('accounts')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) throw error;
  }

  // Delete single account
  static async deleteAccount(id: string): Promise<void> {
    const userId = await this.getUserId();
    
    const { error } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) throw error;
  }

  // Pockets
  static async getPockets(): Promise<Pocket[]> {
    const userId = await this.getUserId();
    const { data, error } = await supabase
      .from('pockets')
      .select('*')
      .eq('user_id', userId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    
    return (data || []).map(pocket => ({
      id: pocket.id,
      accountId: pocket.account_id,
      name: pocket.name,
      type: pocket.type,
      balance: parseFloat(pocket.balance || 0),
      currency: pocket.currency,
      displayOrder: pocket.display_order,
    }));
  }

  static async savePockets(pockets: Pocket[]): Promise<void> {
    const userId = await this.getUserId();
    
    if (pockets.length > 0) {
      const pocketsToUpsert = pockets.map(pocket => ({
        id: pocket.id,
        user_id: userId,
        account_id: pocket.accountId,
        name: pocket.name,
        type: pocket.type,
        balance: pocket.balance,
        currency: pocket.currency,
        display_order: pocket.displayOrder || 0,
      }));

      const { error } = await supabase
        .from('pockets')
        .upsert(pocketsToUpsert, { onConflict: 'id' });
      if (error) throw error;
    }
  }

  // Insert single pocket (more efficient)
  static async insertPocket(pocket: Pocket): Promise<void> {
    const userId = await this.getUserId();
    
    const { error } = await supabase
      .from('pockets')
      .insert({
        id: pocket.id,
        user_id: userId,
        account_id: pocket.accountId,
        name: pocket.name,
        type: pocket.type,
        balance: pocket.balance,
        currency: pocket.currency,
        display_order: pocket.displayOrder || 0,
      });
    
    if (error) throw error;
  }

  // Update single pocket (more efficient)
  static async updatePocket(id: string, updates: Partial<Pocket>): Promise<void> {
    const userId = await this.getUserId();
    
    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.balance !== undefined) updateData.balance = updates.balance;
    if (updates.displayOrder !== undefined) updateData.display_order = updates.displayOrder;
    
    const { error } = await supabase
      .from('pockets')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) throw error;
  }

  // Delete single pocket
  static async deletePocket(id: string): Promise<void> {
    const userId = await this.getUserId();
    
    const { error } = await supabase
      .from('pockets')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) throw error;
  }

  // SubPockets
  static async getSubPockets(): Promise<SubPocket[]> {
    const userId = await this.getUserId();
    const { data, error } = await supabase
      .from('sub_pockets')
      .select('*')
      .eq('user_id', userId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    
    return (data || []).map(subPocket => ({
      id: subPocket.id,
      pocketId: subPocket.pocket_id,
      name: subPocket.name,
      valueTotal: parseFloat(subPocket.value_total),
      periodicityMonths: subPocket.periodicity_months,
      balance: parseFloat(subPocket.balance || 0),
      enabled: subPocket.enabled,
      groupId: subPocket.group_id,
      displayOrder: subPocket.display_order,
    }));
  }

  static async saveSubPockets(subPockets: SubPocket[]): Promise<void> {
    const userId = await this.getUserId();
    
    if (subPockets.length > 0) {
      const subPocketsToUpsert = subPockets.map(subPocket => ({
        id: subPocket.id,
        user_id: userId,
        pocket_id: subPocket.pocketId,
        name: subPocket.name,
        value_total: subPocket.valueTotal,
        periodicity_months: subPocket.periodicityMonths,
        balance: subPocket.balance,
        enabled: subPocket.enabled,
        group_id: subPocket.groupId,
        display_order: subPocket.displayOrder || 0,
      }));

      const { error } = await supabase
        .from('sub_pockets')
        .upsert(subPocketsToUpsert, { onConflict: 'id' });
      if (error) throw error;
    }
  }

  // Insert single sub-pocket (more efficient than saveSubPockets)
  static async insertSubPocket(subPocket: SubPocket): Promise<void> {
    const userId = await this.getUserId();
    
    const { error } = await supabase
      .from('sub_pockets')
      .insert({
        id: subPocket.id,
        user_id: userId,
        pocket_id: subPocket.pocketId,
        name: subPocket.name,
        value_total: subPocket.valueTotal,
        periodicity_months: subPocket.periodicityMonths,
        balance: subPocket.balance,
        enabled: subPocket.enabled,
        group_id: subPocket.groupId,
        display_order: subPocket.displayOrder || 0,
      });
    
    if (error) throw error;
  }

  // Update single sub-pocket (more efficient)
  static async updateSubPocket(id: string, updates: Partial<SubPocket>): Promise<void> {
    const userId = await this.getUserId();
    
    const updateData: Record<string, unknown> = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.valueTotal !== undefined) updateData.value_total = updates.valueTotal;
    if (updates.periodicityMonths !== undefined) updateData.periodicity_months = updates.periodicityMonths;
    if (updates.balance !== undefined) updateData.balance = updates.balance;
    if (updates.enabled !== undefined) updateData.enabled = updates.enabled;
    if (updates.groupId !== undefined) updateData.group_id = updates.groupId;
    if (updates.displayOrder !== undefined) updateData.display_order = updates.displayOrder;
    
    const { error } = await supabase
      .from('sub_pockets')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) throw error;
  }

  // Delete single sub-pocket
  static async deleteSubPocket(id: string): Promise<void> {
    const userId = await this.getUserId();
    
    const { error } = await supabase
      .from('sub_pockets')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) throw error;
  }

  // Movements
  static async getMovements(): Promise<Movement[]> {
    const userId = await this.getUserId();
    const { data, error } = await supabase
      .from('movements')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    
    return (data || []).map(movement => ({
      id: movement.id,
      type: movement.type,
      accountId: movement.account_id,
      pocketId: movement.pocket_id,
      subPocketId: movement.sub_pocket_id,
      amount: parseFloat(movement.amount),
      notes: movement.notes,
      displayedDate: movement.displayed_date,
      createdAt: movement.created_at,
      isPending: movement.is_pending,
      isOrphaned: movement.is_orphaned || false,
      orphanedAccountName: movement.orphaned_account_name,
      orphanedAccountCurrency: movement.orphaned_account_currency,
      orphanedPocketName: movement.orphaned_pocket_name,
    }));
  }

  static async saveMovements(movements: Movement[]): Promise<void> {
    const userId = await this.getUserId();
    
    if (movements.length > 0) {
      const movementsToUpsert = movements.map(movement => ({
        id: movement.id,
        user_id: userId,
        type: movement.type,
        account_id: movement.accountId,
        pocket_id: movement.pocketId,
        sub_pocket_id: movement.subPocketId,
        amount: movement.amount,
        notes: movement.notes,
        displayed_date: movement.displayedDate,
        is_pending: movement.isPending || false,
        is_orphaned: movement.isOrphaned || false,
        created_at: movement.createdAt,
      }));

      const { error} = await supabase
        .from('movements')
        .upsert(movementsToUpsert, { onConflict: 'id' });
      if (error) throw error;
    }
  }

  // Insert single movement (more efficient)
  static async insertMovement(movement: Movement): Promise<void> {
    const userId = await this.getUserId();
    
    const { error } = await supabase
      .from('movements')
      .insert({
        id: movement.id,
        user_id: userId,
        type: movement.type,
        account_id: movement.accountId,
        pocket_id: movement.pocketId,
        sub_pocket_id: movement.subPocketId,
        amount: movement.amount,
        notes: movement.notes,
        displayed_date: movement.displayedDate,
        is_pending: movement.isPending || false,
        created_at: movement.createdAt,
      });
    
    if (error) throw error;
  }

  // Update single movement (more efficient)
  static async updateMovement(id: string, updates: Partial<Movement>): Promise<void> {
    const userId = await this.getUserId();
    
    const updateData: Record<string, unknown> = {};
    if (updates.type !== undefined) updateData.type = updates.type;
    if (updates.accountId !== undefined) updateData.account_id = updates.accountId;
    if (updates.pocketId !== undefined) updateData.pocket_id = updates.pocketId;
    if (updates.subPocketId !== undefined) updateData.sub_pocket_id = updates.subPocketId;
    if (updates.amount !== undefined) updateData.amount = updates.amount;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.displayedDate !== undefined) updateData.displayed_date = updates.displayedDate;
    if (updates.isPending !== undefined) updateData.is_pending = updates.isPending;
    if (updates.isOrphaned !== undefined) updateData.is_orphaned = updates.isOrphaned;
    if (updates.orphanedAccountName !== undefined) updateData.orphaned_account_name = updates.orphanedAccountName;
    if (updates.orphanedAccountCurrency !== undefined) updateData.orphaned_account_currency = updates.orphanedAccountCurrency;
    if (updates.orphanedPocketName !== undefined) updateData.orphaned_pocket_name = updates.orphanedPocketName;
    
    const { error } = await supabase
      .from('movements')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) throw error;
  }

  // Delete single movement
  static async deleteMovement(id: string): Promise<void> {
    const userId = await this.getUserId();
    
    const { error } = await supabase
      .from('movements')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);
    
    if (error) throw error;
  }

  // Settings
  static async getSettings(): Promise<Settings | null> {
    const userId = await this.getUserId();
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    if (!data) return null;
    
    return {
      primaryCurrency: data.primary_currency,
      alphaVantageApiKey: data.alpha_vantage_api_key,
    };
  }

  static async saveSettings(settings: Settings): Promise<void> {
    const userId = await this.getUserId();
    
    const { error } = await supabase
      .from('settings')
      .upsert({
        user_id: userId,
        primary_currency: settings.primaryCurrency,
        alpha_vantage_api_key: settings.alphaVantageApiKey,
      }, { onConflict: 'user_id' });

    if (error) throw error;
  }

  // Budget Entries
  static async getBudgetEntries(): Promise<BudgetEntry[]> {
    const userId = await this.getUserId();
    const { data, error } = await supabase
      .from('budget_entries')
      .select('*')
      .eq('user_id', userId)
      .order('display_order', { ascending: true });

    if (error) throw error;
    
    return (data || []).map(entry => ({
      id: entry.id,
      user_id: entry.user_id,
      name: entry.name,
      amount: parseFloat(entry.amount),
      display_order: entry.display_order,
    }));
  }

  static async saveBudgetEntries(entries: BudgetEntry[]): Promise<void> {
    const userId = await this.getUserId();
    
    await supabase.from('budget_entries').delete().eq('user_id', userId);
    
    if (entries.length > 0) {
      const entriesToInsert = entries.map(entry => ({
        id: entry.id,
        user_id: userId,
        name: entry.name,
        amount: entry.amount,
        display_order: entry.display_order || 0,
      }));

      const { error } = await supabase.from('budget_entries').insert(entriesToInsert);
      if (error) throw error;
    }
  }

  // Movement Templates
  static async getMovementTemplates(): Promise<import('../types').MovementTemplate[]> {
    const userId = await this.getUserId();
    const { data, error } = await supabase
      .from('movement_templates')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) throw error;

    return (data || []).map(template => ({
      id: template.id,
      name: template.name,
      type: template.type,
      accountId: template.account_id,
      pocketId: template.pocket_id,
      subPocketId: template.sub_pocket_id,
      defaultAmount: template.default_amount ? parseFloat(template.default_amount) : undefined,
      notes: template.notes,
      createdAt: template.created_at,
      updatedAt: template.updated_at,
    }));
  }

  static async insertMovementTemplate(template: import('../types').MovementTemplate): Promise<void> {
    const userId = await this.getUserId();

    const { error } = await supabase
      .from('movement_templates')
      .insert({
        id: template.id,
        user_id: userId,
        name: template.name,
        type: template.type,
        account_id: template.accountId,
        pocket_id: template.pocketId,
        sub_pocket_id: template.subPocketId,
        default_amount: template.defaultAmount,
        notes: template.notes,
        created_at: template.createdAt,
        updated_at: template.updatedAt,
      });

    if (error) throw error;
  }

  static async updateMovementTemplate(id: string, template: import('../types').MovementTemplate): Promise<void> {
    const userId = await this.getUserId();

    const { error } = await supabase
      .from('movement_templates')
      .update({
        name: template.name,
        type: template.type,
        account_id: template.accountId,
        pocket_id: template.pocketId,
        sub_pocket_id: template.subPocketId,
        default_amount: template.defaultAmount,
        notes: template.notes,
        updated_at: template.updatedAt,
      })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
  }

  static async deleteMovementTemplate(id: string): Promise<void> {
    const userId = await this.getUserId();

    const { error } = await supabase
      .from('movement_templates')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
  }
}
