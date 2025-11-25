import type { SubPocket } from '../types';
import { SupabaseStorageService } from './supabaseStorageService';
import { generateId } from '../utils/idGenerator';

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
  // Get all sub-pockets
  async getAllSubPockets(): Promise<SubPocket[]> {
    return await SupabaseStorageService.getSubPockets();
  }

  // Get sub-pocket by ID
  async getSubPocket(id: string): Promise<SubPocket | null> {
    const subPockets = await this.getAllSubPockets();
    return subPockets.find(sp => sp.id === id) || null;
  }

  // Get sub-pockets by pocket (fixed expenses pocket)
  async getSubPocketsByPocket(pocketId: string): Promise<SubPocket[]> {
    const subPockets = await this.getAllSubPockets();
    return subPockets.filter(sp => sp.pocketId === pocketId);
  }

  // Calculate monthly contribution (aporteMensual)
  calculateAporteMensual(valueTotal: number, periodicityMonths: number): number {
    if (periodicityMonths <= 0) return 0;
    return valueTotal / periodicityMonths;
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
      .reduce((sum, sp) => sum + this.calculateAporteMensual(sp.valueTotal, sp.periodicityMonths), 0);
  }

  // Calculate next payment for a sub-pocket (handles negative balance and near completion)
  async calculateNextPayment(subPocketId: string): Promise<number> {
    const subPocket = await this.getSubPocket(subPocketId);
    if (!subPocket) return 0;

    const aporteMensual = this.calculateAporteMensual(subPocket.valueTotal, subPocket.periodicityMonths);
    const remaining = subPocket.valueTotal - subPocket.balance;

    // Case 1: Negative balance - compensate + normal payment
    if (subPocket.balance < 0) {
      return aporteMensual + Math.abs(subPocket.balance);
    }

    // Case 2: Near completion - min of remaining or normal payment
    if (remaining < aporteMensual) {
      return remaining;
    }

    // Normal case
    return aporteMensual;
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
  async createSubPocket(pocketId: string, name: string, valueTotal: number, periodicityMonths: number): Promise<SubPocket> {
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

    const subPocket: SubPocket = {
      id: generateId(),
      pocketId,
      name: trimmedName,
      valueTotal,
      periodicityMonths,
      balance: 0,
      enabled: true,
    };

    const subPockets = await this.getAllSubPockets();
    subPockets.push(subPocket);
    await SupabaseStorageService.saveSubPockets(subPockets);

    // Recalculate pocket balance
    await pocketService.updatePocket(pocketId, {});

    return subPocket;
  }

  // Update sub-pocket
  async updateSubPocket(id: string, updates: Partial<Pick<SubPocket, 'name' | 'valueTotal' | 'periodicityMonths'>>): Promise<SubPocket> {
    const subPockets = await this.getAllSubPockets();
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

    subPockets[index] = updatedSubPocket;
    await SupabaseStorageService.saveSubPockets(subPockets);

    // Recalculate pocket balance
    const pocketService = await getPocketService();
    await pocketService.updatePocket(subPocket.pocketId, {});

    return updatedSubPocket;
  }

  // Delete sub-pocket
  async deleteSubPocket(id: string): Promise<void> {
    const subPockets = await this.getAllSubPockets();
    const index = subPockets.findIndex(sp => sp.id === id);

    if (index === -1) {
      throw new Error(`Sub-pocket with id "${id}" not found.`);
    }

    const subPocket = subPockets[index];
    subPockets.splice(index, 1);
    await SupabaseStorageService.saveSubPockets(subPockets);

    // Recalculate pocket balance
    const pocketService = await getPocketService();
    await pocketService.updatePocket(subPocket.pocketId, {});
  }

  // Toggle enabled state
  async toggleSubPocketEnabled(id: string): Promise<SubPocket> {
    const subPocket = await this.getSubPocket(id);
    if (!subPocket) {
      throw new Error(`Sub-pocket with id "${id}" not found.`);
    }

    const allSubPockets = await this.getAllSubPockets();
    const updated = { ...subPocket, enabled: !subPocket.enabled };
    await SupabaseStorageService.saveSubPockets(
      allSubPockets.map((sp: SubPocket) => (sp.id === id ? updated : sp))
    );
    return updated;
  }
}

export const subPocketService = new SubPocketService();

