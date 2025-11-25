import { StorageService } from '../services/storageService';
import type { Movement } from '../types';

/**
 * Migration utility to convert old investment movement types to standard types
 * 
 * Old types:
 * - InvestmentIngreso → IngresoNormal
 * - InvestmentShares → IngresoNormal
 * 
 * The pocket selection now determines what gets updated (Invested Money vs Shares)
 */
export async function migrateInvestmentMovements(): Promise<{
  migrated: number;
  skipped: number;
  errors: string[];
}> {
  const results = {
    migrated: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    const movements = await StorageService.getMovements();
    
    for (const movement of movements) {
      // Check if this is an old investment movement type
      if (movement.type === 'InvestmentIngreso' || movement.type === 'InvestmentShares') {
        try {
          // Convert to IngresoNormal (income to the pocket)
          const updatedMovement: Movement = {
            ...movement,
            type: 'IngresoNormal',
          };

          await StorageService.updateMovement(movement.id, { type: 'IngresoNormal' });
          results.migrated++;
          
          console.log(`✅ Migrated movement ${movement.id}: ${movement.type} → IngresoNormal`);
        } catch (error) {
          const errorMsg = `Failed to migrate movement ${movement.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          results.errors.push(errorMsg);
          console.error(errorMsg);
        }
      } else {
        results.skipped++;
      }
    }

    console.log(`
🎉 Migration complete!
   Migrated: ${results.migrated}
   Skipped: ${results.skipped}
   Errors: ${results.errors.length}
    `);

    return results;
  } catch (error) {
    const errorMsg = `Migration failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
    results.errors.push(errorMsg);
    console.error(errorMsg);
    return results;
  }
}

// Expose to window for manual execution in console
if (import.meta.env.DEV) {
  (window as any).migrateInvestmentMovements = migrateInvestmentMovements;
}
