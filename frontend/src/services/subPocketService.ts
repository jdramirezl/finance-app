import type { SubPocket } from '../types';
import { apiClient } from './apiClient';
import { calculateAporteMensual } from '../utils/fixedExpenseUtils';

class SubPocketService {
  // Get all sub-pockets
  async getAllSubPockets(): Promise<SubPocket[]> {
    return apiClient.get<SubPocket[]>('/api/sub-pockets');
  }

  // Get sub-pocket by ID
  async getSubPocket(id: string): Promise<SubPocket | null> {
    return apiClient.get<SubPocket>(`/api/sub-pockets/${id}`);
  }

  // Get sub-pockets by pocket (fixed expenses pocket)
  async getSubPocketsByPocket(pocketId: string): Promise<SubPocket[]> {
    return apiClient.get<SubPocket[]>(`/api/sub-pockets?pocketId=${pocketId}`);
  }

  // Get sub-pockets by group
  async getSubPocketsByGroup(groupId: string): Promise<SubPocket[]> {
    return apiClient.get<SubPocket[]>(`/api/sub-pockets?groupId=${groupId}`);
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

  // Calculate total monthly fixed expenses (sum of enabled sub-pockets)
  async calculateTotalFijosMes(pocketId: string): Promise<number> {
    const subPockets = await this.getSubPocketsByPocket(pocketId);
    return subPockets
      .filter(sp => sp.enabled)
      .reduce((sum, sp) => {
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

  // Toggle enabled state
  async toggleSubPocketEnabled(id: string): Promise<SubPocket> {
    return apiClient.post<SubPocket>(`/api/sub-pockets/${id}/toggle`, {});
  }

  // Reorder sub-pockets within a pocket
  async reorderSubPockets(pocketId: string, subPocketIds: string[]): Promise<void> {
    await apiClient.post('/api/sub-pockets/reorder', { pocketId, subPocketIds });
  }

  // Move sub-pocket to a different group
  async moveToGroup(subPocketId: string, groupId: string): Promise<void> {
    await apiClient.post(`/api/sub-pockets/${subPocketId}/move`, { groupId });
  }

  // Toggle all sub-pockets in a group
  // Note: the backend endpoint flips enabled state for the whole group; the
  // `_enabled` parameter is preserved for caller compatibility but ignored.
  async toggleGroup(groupId: string, _enabled: boolean): Promise<void> {
    await apiClient.post(`/api/fixed-expense-groups/${groupId}/toggle`, {});
  }
}

export const subPocketService = new SubPocketService();
