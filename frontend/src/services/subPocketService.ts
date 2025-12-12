import type { SubPocket } from '../types';
import { SupabaseStorageService } from './supabaseStorageService';
import { generateId } from '../utils/idGenerator';
import { apiClient } from './apiClient';
import { calculateAporteMensual } from '../utils/fixedExpenseUtils';

// Lazy getter to avoid circular dependency - using dynamic import
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pocketServiceCache: any = null;
const getPocketService = async () => {
  if (!pocketServiceCache) {
    const module = await import('./pocketService');
    pocketServiceCache = module.pocketService;
  }
  return pocketServiceCache;
};

class SubPocketService {
  // Feature flag to control backend usage
  private useBackend = import.meta.env.VITE_USE_BACKEND_SUBPOCKETS === 'true';

  constructor() {
    // Log which mode we're in
    if (this.useBackend) {
      console.log('🚀 SubPocketService: Using BACKEND API at', import.meta.env.VITE_API_URL);
    } else {
      console.log('📦 SubPocketService: Using DIRECT Supabase calls');
    }
  }
  // Get all sub-pockets
  async getAllSubPockets(): Promise<SubPocket[]> {
    // Note: Backend doesn't have a "get all sub-pockets" endpoint
    // This is only used internally, so we always use direct Supabase
    return await this.getAllSubPocketsDirect();
  }

  // Direct Supabase implementation (fallback)
  private async getAllSubPocketsDirect(): Promise<SubPocket[]> {
    return await SupabaseStorageService.getSubPockets();
  }

  // Get sub-pocket by ID
  async getSubPocket(id: string): Promise<SubPocket | null> {
    if (this.useBackend) {
      try {
        return await apiClient.get<SubPocket>(`/api/sub-pockets/${id}`);
      } catch (error) {
        console.error('❌ Backend API failed, falling back to Supabase:', error);
        return await this.getSubPocketDirect(id);
      }
    }
    return await this.getSubPocketDirect(id);
  }

  // Direct Supabase implementation (fallback)
  private async getSubPocketDirect(id: string): Promise<SubPocket | null> {
    const subPockets = await this.getAllSubPocketsDirect();
    return subPockets.find(sp => sp.id === id) || null;
  }

  // Get sub-pockets by pocket (fixed expenses pocket)
  async getSubPocketsByPocket(pocketId: string): Promise<SubPocket[]> {
    if (this.useBackend) {
      try {
        return await apiClient.get<SubPocket[]>(`/api/sub-pockets?pocketId=${pocketId}`);
      } catch (error) {
        console.error('❌ Backend API failed, falling back to Supabase:', error);
        return await this.getSubPocketsByPocketDirect(pocketId);
      }
    }
    return await this.getSubPocketsByPocketDirect(pocketId);
  }

  // Direct Supabase implementation (fallback)
  private async getSubPocketsByPocketDirect(pocketId: string): Promise<SubPocket[]> {
    const subPockets = await this.getAllSubPocketsDirect();
    return subPockets.filter(sp => sp.pocketId === pocketId);
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

  // Validate sub-pocket uniqueness within a pocket
  async validateSubPocketUniqueness(pocketId: string, name: string, excludeId?: string): Promise<boolean> {
    const subPockets = await this.getSubPocketsByPocket(pocketId);
    const existing = subPockets.find(
      sp => sp.name.trim().toLowerCase() === name.trim().toLowerCase() && sp.id !== excludeId
    );
    return !existing; // Returns true if unique
  }

  // Create new sub-pocket
  async createSubPocket(
    pocketId: string,
    name: string,
    valueTotal: number,
    periodicityMonths: number,
    groupId?: string
  ): Promise<SubPocket> {
    if (this.useBackend) {
      try {
        return await apiClient.post<SubPocket>('/api/sub-pockets', {
          pocketId,
          name,
          valueTotal,
          periodicityMonths,
          groupId,
        });
      } catch (error) {
        console.error('❌ Backend API failed, falling back to Supabase:', error);
        return await this.createSubPocketDirect(pocketId, name, valueTotal, periodicityMonths, groupId);
      }
    }
    return await this.createSubPocketDirect(pocketId, name, valueTotal, periodicityMonths, groupId);
  }

  // Direct Supabase implementation (fallback)
  private async createSubPocketDirect(
    pocketId: string,
    name: string,
    valueTotal: number,
    periodicityMonths: number,
    groupId?: string
  ): Promise<SubPocket> {
    // Validate pocket exists and is fixed type (dynamic import to avoid circular dependency)
    const pocketService = await getPocketService();
    const pocket = await pocketService.getPocket(pocketId);
    if (!pocket) {
      throw new Error(`Pocket with id "${pocketId}" not found.`);
    }
    if (pocket.type !== 'fixed') {
      throw new Error('Sub-pockets can only be created for fixed expenses pockets.');
    }

    // Validate input
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Sub-pocket name cannot be empty.');
    }
    if (valueTotal <= 0) {
      throw new Error('Sub-pocket total value must be greater than zero.');
    }
    if (periodicityMonths <= 0) {
      throw new Error('Sub-pocket periodicity must be greater than zero.');
    }

    // Validate uniqueness
    if (!this.validateSubPocketUniqueness(pocketId, trimmedName)) {
      throw new Error(`A sub-pocket with name "${trimmedName}" already exists in this pocket.`);
    }

    // CRITICAL FIX: Ensure user has a default group, create if needed
    let finalGroupId = groupId;

    if (!finalGroupId) {
      // No group specified - find or create user's default group
      const { fixedExpenseGroupService } = await import('./fixedExpenseGroupService');
      const allGroups = await fixedExpenseGroupService.getAll();
      let defaultGroup = allGroups.find(g => g.name === 'Default');

      if (!defaultGroup) {
        // Create default group for this user
        defaultGroup = await fixedExpenseGroupService.create('Default', '#6B7280');
      }

      finalGroupId = defaultGroup.id;
    }

    const subPocket: SubPocket = {
      id: generateId(),
      pocketId,
      name: trimmedName,
      valueTotal,
      periodicityMonths,
      balance: 0,
      enabled: true,
      groupId: finalGroupId, // Always assign to a group (user's default if not specified)
    };

    // Insert directly - much faster than fetch-all-save-all
    await SupabaseStorageService.insertSubPocket(subPocket);

    // Note: Pocket balance will be recalculated by the store when it reloads
    // No need to trigger updatePocket here

    return subPocket;
  }

  // Update sub-pocket
  async updateSubPocket(id: string, updates: Partial<Pick<SubPocket, 'name' | 'valueTotal' | 'periodicityMonths'>>): Promise<SubPocket> {
    if (this.useBackend) {
      try {
        return await apiClient.put<SubPocket>(`/api/sub-pockets/${id}`, updates);
      } catch (error) {
        console.error('❌ Backend API failed, falling back to Supabase:', error);
        return await this.updateSubPocketDirect(id, updates);
      }
    }
    return await this.updateSubPocketDirect(id, updates);
  }

  // Direct Supabase implementation (fallback)
  private async updateSubPocketDirect(id: string, updates: Partial<Pick<SubPocket, 'name' | 'valueTotal' | 'periodicityMonths'>>): Promise<SubPocket> {
    const subPockets = await this.getAllSubPocketsDirect();
    const index = subPockets.findIndex(sp => sp.id === id);

    if (index === -1) {
      throw new Error(`Sub-pocket with id "${id}" not found.`);
    }

    const subPocket = subPockets[index];

    // Validate updates
    if (updates.name !== undefined) {
      const trimmedName = updates.name.trim();
      if (!trimmedName) {
        throw new Error('Sub-pocket name cannot be empty.');
      }
      // Validate uniqueness if name changed
      if (trimmedName.toLowerCase() !== subPocket.name.toLowerCase()) {
        if (!(await this.validateSubPocketUniqueness(subPocket.pocketId, trimmedName, id))) {
          throw new Error(`A sub-pocket with name "${trimmedName}" already exists in this pocket.`);
        }
      }
      updates.name = trimmedName;
    }
    if (updates.valueTotal !== undefined && updates.valueTotal <= 0) {
      throw new Error('Sub-pocket total value must be greater than zero.');
    }
    if (updates.periodicityMonths !== undefined && updates.periodicityMonths <= 0) {
      throw new Error('Sub-pocket periodicity must be greater than zero.');
    }

    const updatedSubPocket = { ...subPocket, ...updates };

    // Update directly - much faster
    await SupabaseStorageService.updateSubPocket(id, updates);

    return updatedSubPocket;
  }

  // Delete sub-pocket
  async deleteSubPocket(id: string): Promise<void> {
    if (this.useBackend) {
      try {
        await apiClient.delete(`/api/sub-pockets/${id}`);
        return;
      } catch (error) {
        console.error('❌ Backend API failed, falling back to Supabase:', error);
        return await this.deleteSubPocketDirect(id);
      }
    }
    return await this.deleteSubPocketDirect(id);
  }

  // Direct Supabase implementation (fallback)
  private async deleteSubPocketDirect(id: string): Promise<void> {
    const subPockets = await this.getAllSubPocketsDirect();
    const index = subPockets.findIndex(sp => sp.id === id);

    if (index === -1) {
      throw new Error(`Sub-pocket with id "${id}" not found.`);
    }

    // Delete directly - much faster
    await SupabaseStorageService.deleteSubPocket(id);
  }

  // Toggle enabled state
  async toggleSubPocketEnabled(id: string): Promise<SubPocket> {
    if (this.useBackend) {
      try {
        return await apiClient.post<SubPocket>(`/api/sub-pockets/${id}/toggle`);
      } catch (error) {
        console.error('❌ Backend API failed, falling back to Supabase:', error);
        return await this.toggleSubPocketEnabledDirect(id);
      }
    }
    return await this.toggleSubPocketEnabledDirect(id);
  }

  // Direct Supabase implementation (fallback)
  private async toggleSubPocketEnabledDirect(id: string): Promise<SubPocket> {
    const subPocket = await this.getSubPocketDirect(id);
    if (!subPocket) {
      throw new Error(`Sub-pocket with id "${id}" not found.`);
    }

    const allSubPockets = await this.getAllSubPocketsDirect();
    const updated = { ...subPocket, enabled: !subPocket.enabled };
    await SupabaseStorageService.saveSubPockets(
      allSubPockets.map((sp: SubPocket) => (sp.id === id ? updated : sp))
    );
    return updated;
  }

  // Move sub-pocket to a different group
  async moveToGroup(subPocketId: string, groupId: string): Promise<void> {
    if (this.useBackend) {
      try {
        await apiClient.post(`/api/sub-pockets/${subPocketId}/move-to-group`, { groupId });
        return;
      } catch (error) {
        console.error('❌ Backend API failed, falling back to Supabase:', error);
        return await this.moveToGroupDirect(subPocketId, groupId);
      }
    }
    return await this.moveToGroupDirect(subPocketId, groupId);
  }

  // Direct Supabase implementation (fallback)
  private async moveToGroupDirect(subPocketId: string, groupId: string): Promise<void> {
    const subPocket = await this.getSubPocketDirect(subPocketId);
    if (!subPocket) {
      throw new Error(`Sub-pocket with id "${subPocketId}" not found.`);
    }

    await SupabaseStorageService.updateSubPocket(subPocketId, { groupId });
  }

  // Toggle all sub-pockets in a group
  async toggleGroup(groupId: string, enabled: boolean): Promise<void> {
    // Note: This is called by fixedExpenseGroupService, not directly exposed
    // Always use direct Supabase for now
    return await this.toggleGroupDirect(groupId, enabled);
  }

  // Direct Supabase implementation (fallback)
  private async toggleGroupDirect(groupId: string, enabled: boolean): Promise<void> {
    const allSubPockets = await this.getAllSubPocketsDirect();
    const groupSubPockets = allSubPockets.filter(sp => sp.groupId === groupId);

    if (groupSubPockets.length === 0) return;

    // Update all sub-pockets in the group
    const updated = allSubPockets.map(sp =>
      sp.groupId === groupId ? { ...sp, enabled } : sp
    );

    await SupabaseStorageService.saveSubPockets(updated);
  }

  // Get sub-pockets by group
  async getSubPocketsByGroup(groupId: string): Promise<SubPocket[]> {
    if (this.useBackend) {
      try {
        return await apiClient.get<SubPocket[]>(`/api/sub-pockets?groupId=${groupId}`);
      } catch (error) {
        console.error('❌ Backend API failed, falling back to Supabase:', error);
        return await this.getSubPocketsByGroupDirect(groupId);
      }
    }
    return await this.getSubPocketsByGroupDirect(groupId);
  }

  // Direct Supabase implementation (fallback)
  private async getSubPocketsByGroupDirect(groupId: string): Promise<SubPocket[]> {
    const subPockets = await this.getAllSubPocketsDirect();
    return subPockets.filter(sp => sp.groupId === groupId);
  }
}

export const subPocketService = new SubPocketService();

