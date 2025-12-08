/**
 * One-time utility to sync all investment account fields from pocket balances
 * 
 * Run this once to fix stale montoInvertido and shares values in the database.
 * After running, all investment accounts will have correct values synced from pockets.
 * 
 * Usage:
 * 1. Import in browser console: import { syncAllInvestmentAccounts } from './utils/syncInvestmentAccounts'
 * 2. Run: await syncAllInvestmentAccounts()
 * 3. Check console for results
 */

import { accountService } from '../services/accountService';
import { pocketService } from '../services/pocketService';
import { SupabaseStorageService } from '../services/supabaseStorageService';

export async function syncAllInvestmentAccounts(): Promise<void> {
  console.log('🔄 Starting investment account sync...');
  
  try {
    const accounts = await accountService.getAllAccounts();
    const investmentAccounts = accounts.filter(acc => acc.type === 'investment');
    
    console.log(`📊 Found ${investmentAccounts.length} investment account(s)`);
    
    for (const account of investmentAccounts) {
      const pockets = await pocketService.getPocketsByAccount(account.id);
      
      const investedPocket = pockets.find(p => p.name === 'Invested Money');
      const sharesPocket = pockets.find(p => p.name === 'Shares');
      
      const oldMontoInvertido = account.montoInvertido || 0;
      const oldShares = account.shares || 0;
      
      const newMontoInvertido = investedPocket?.balance || 0;
      const newShares = sharesPocket?.balance || 0;
      
      const changes: string[] = [];
      
      if (oldMontoInvertido !== newMontoInvertido) {
        changes.push(`montoInvertido: $${oldMontoInvertido} → $${newMontoInvertido}`);
      }
      
      if (oldShares !== newShares) {
        changes.push(`shares: ${oldShares} → ${newShares}`);
      }
      
      if (changes.length > 0) {
        console.log(`  📝 Syncing "${account.name}": ${changes.join(', ')}`);
        
        await SupabaseStorageService.updateAccount(account.id, {
          montoInvertido: newMontoInvertido,
          shares: newShares,
        });
        
        console.log(`  ✅ Synced "${account.name}"`);
      } else {
        console.log(`  ⏭️  "${account.name}" already in sync`);
      }
    }
    
    console.log('✅ Investment account sync complete!');
  } catch (error) {
    console.error('❌ Sync failed:', error);
    throw error;
  }
}

// Export for use in browser console or as a one-time script
if (typeof window !== 'undefined') {
  (window as any).syncAllInvestmentAccounts = syncAllInvestmentAccounts;
}
