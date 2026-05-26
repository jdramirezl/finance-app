import type { SubPocket } from '../types';
import { apiClient } from './apiClient';
import { supabase } from '../lib/supabase';
import { mapSubPocketRow } from './mappers';
import { calculateAporteMensual } from '../utils/fixedExpenseUtils';

class SubPocketService {
  // Get all sub-pockets directly from Supabase
  async getAllSubPockets(): Promise<SubPocket[]> {
    const { data, error } = await supabase
      .from('sub_pockets')
      .select('*')
      .order('display_order', { ascending: true, nullsFirst: false });
    if (error) throw new Error(`Failed to fetch sub-pockets: ${error.message}`);
    return (data ?? []).map(mapSubPocketRow);
  }

  // Get sub-pocket by ID directly from Supabase
  async getSubPocket(id: string): Promise<SubPocket | null> {
    const { data, error } = await supabase
      .from('sub_pockets')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(error.message);
    }
    return data ? mapSubPocketRow(data) : null;
  }

  // Get sub-pockets by pocket (fixed expenses pocket) directly from Supabase
  async getSubPocketsByPocket(pocketId: string): Promise<SubPocket[]> {
    const { data, error } = await supabase
      .from('sub_pockets')
      .select('*')
      .eq('pocket_id', pocketId)
      .order('display_order', { ascending: true, nullsFirst: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapSubPocketRow);
  }

  // Get sub-pockets by group directly from Supabase
  async getSubPocketsByGroup(groupId: string): Promise<SubPocket[]> {
    const { data, error } = await supabase
      .from('sub_pockets')
      .select('*')
      .eq('group_id', groupId)
      .order('display_order', { ascending: true, nullsFirst: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapSubPocketRow);
  }

  // Calculate monthly contribution (aporteMensual)
  calculateAporteMensual(valueTotal: number, periodicityMonths: number, balance: number = 0): number {
    return calculateAporteMensual(valueTotal, periodicityMonths, balance);
  }

  // Calculate progress (progreso)
  calculateProgress(balance: number, valueTotal: number): number {
    if (valueTotal <= 0) return 0;
    return balance / valueTotal;
  }

  // Calculate total monthly fixed expenses (sum of all sub-pockets)
  async calculateTotalFijosMes(pocketId: string): Promise<number> {
    const subPockets = await this.getSubPocketsByPocket(pocketId);
    return subPockets.reduce((sum, sp) => {
      const contribution = calculateAporteMensual(sp.valueTotal, sp.periodicityMonths, sp.balance);
      // Add absolute value of negative balance if debt exists
      const debt = sp.balance < 0 ? Math.abs(sp.balance) : 0;
      return sum + contribution + debt;
    }, 0);
  }

  // Calculate next payment for a sub-pocket (handles negative balance and near completion)
  async calculateNextPayment(subPocketId: string): Promise<number> {
    const subPocket = await this.getSubPocket(subPocketId);
    if (!subPocket) return 0;

    // Use centralized logic which handles capping
    const payment = calculateAporteMensual(subPocket.valueTotal, subPocket.periodicityMonths, subPocket.balance);

    // Add debt repayment if balance is negative
    if (subPocket.balance < 0) {
      return payment + Math.abs(subPocket.balance);
    }

    return payment;
  }

  // Create new sub-pocket
  async createSubPocket(
    pocketId: string,
    name: string,
    valueTotal: number,
    periodicityMonths: number,
    groupId?: string
  ): Promise<SubPocket> {
    return apiClient.post<SubPocket>('/api/sub-pockets', {
      pocketId,
      name,
      valueTotal,
      periodicityMonths,
      groupId,
    });
  }

  // Update sub-pocket
  async updateSubPocket(
    id: string,
    updates: Partial<Pick<SubPocket, 'name' | 'valueTotal' | 'periodicityMonths'>>
  ): Promise<SubPocket> {
    return apiClient.put<SubPocket>(`/api/sub-pockets/${id}`, updates);
  }

  // Delete sub-pocket
  async deleteSubPocket(id: string): Promise<void> {
    await apiClient.delete(`/api/sub-pockets/${id}`);
  }

  // Reorder sub-pockets within a pocket
  async reorderSubPockets(pocketId: string, subPocketIds: string[]): Promise<void> {
    await apiClient.post('/api/sub-pockets/reorder', { pocketId, subPocketIds });
  }

  // Move sub-pocket to a different group. Pass `null` to ungroup
  // (i.e. clear the sub-pocket's groupId on the server).
  async moveToGroup(subPocketId: string, groupId: string | null): Promise<void> {
    await apiClient.post(`/api/sub-pockets/${subPocketId}/move-to-group`, { groupId });
  }
}

export const subPocketService = new SubPocketService();
