// Migration utility to mark existing orphaned movements
// Run this once to update existing data with isOrphaned flag

import { SupabaseStorageService } from '../services/supabaseStorageService';
import type { Account, Pocket } from '../types';

export async function migrateOrphanedMovements(): Promise<{
  total: number;
  marked: number;
}> {
  console.log('🔄 Starting orphaned movements migration...');
  
  // Load all data
  const movements = await SupabaseStorageService.getMovements();
  const accounts = await SupabaseStorageService.getAccounts();
  const pockets = await SupabaseStorageService.getPockets();
  
  // Create lookup sets
  const accountIds = new Set(accounts.map((a: Account) => a.id));
  const pocketIds = new Set(pockets.map((p: Pocket) => p.id));
  
  let markedCount = 0;
  
  // Check each movement
  for (const movement of movements) {
    const isOrphaned = !accountIds.has(movement.accountId) || !pocketIds.has(movement.pocketId);
    
    // Only update if status changed
    if (isOrphaned && !movement.isOrphaned) {
      await SupabaseStorageService.updateMovement(movement.id, { isOrphaned: true });
      markedCount++;
      console.log(`✅ Marked movement ${movement.id} as orphaned`);
    } else if (!isOrphaned && movement.isOrphaned) {
      // Un-orphan if account/pocket was recreated
      await SupabaseStorageService.updateMovement(movement.id, { isOrphaned: false });
      markedCount++;
      console.log(`✅ Un-orphaned movement ${movement.id}`);
    }
  }
  
  console.log(`✅ Migration complete: ${markedCount} movements updated out of ${movements.length} total`);
  
  return {
    total: movements.length,
    marked: markedCount,
  };
}
