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
        id: account.id, // Keep existing ID or let Supabase generate new one
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
        display_order: subPocket.displayOrder || 0,
      }));

      const { error } = await supabase
        .from('sub_pockets')
        .upsert(subPocketsToUpsert, { onConflict: 'id' });
      if (error) throw error;
    }
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
        created_at: movement.createdAt,
      }));

      const { error } = await supabase
        .from('movements')
        .upsert(movementsToUpsert, { onConflict: 'id' });
      if (error) throw error;
    }
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
}
