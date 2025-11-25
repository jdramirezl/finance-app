# Investment Movement Migration Guide

## What Changed?

We've simplified investment movements by removing special movement types (`InvestmentIngreso` and `InvestmentShares`) and using standard types instead.

### Before (Old System)
- Investment accounts had special movement types:
  - `InvestmentIngreso` - Add money to investment
  - `InvestmentShares` - Add shares to investment
- These types only appeared after selecting an investment account
- Confusing UX with 6 different movement types

### After (New System)
- Investment accounts use the same types as normal accounts:
  - `IngresoNormal` - Income (add to pocket)
  - `EgresoNormal` - Expense (remove from pocket)
- Pocket selection determines what gets updated:
  - "Invested Money" pocket → updates `montoInvertido`
  - "Shares" pocket → updates `shares`
- Consistent UX with only 4 movement types

## Benefits

✅ Simpler, more intuitive UX
✅ No special cases in code
✅ Fixes 4 bugs at once (#9, #10, #11, #12)
✅ More flexible (can withdraw money or sell shares using Expense type)
✅ Less code to maintain

## Migration Steps

### For Existing Users

If you have existing investment movements, you need to migrate them:

1. **Open your app in the browser**
2. **Open the browser console** (F12 → Console tab)
3. **Run the migration**:
   ```javascript
   await window.migrateInvestmentMovements()
   ```
4. **Check the results**:
   ```
   🎉 Migration complete!
      Migrated: 15
      Skipped: 142
      Errors: 0
   ```

### What the Migration Does

- Finds all movements with type `InvestmentIngreso` or `InvestmentShares`
- Converts them to `IngresoNormal`
- Preserves all other data (amount, date, notes, pocket, etc.)
- The pocket selection already determines what gets updated, so no data loss

### After Migration

- All your investment movements will work exactly the same
- You can now use "Expense" type to withdraw money or sell shares
- More intuitive movement creation flow

## New User Flow

### Adding Money to Investment

1. Select account: "VOO Investment"
2. Select type: "Normal Income"
3. Select pocket: "Invested Money"
4. Enter amount: $1000
5. Result: Money added, `montoInvertido` updated

### Adding Shares

1. Select account: "VOO Investment"
2. Select type: "Normal Income"
3. Select pocket: "Shares"
4. Enter amount: 2.5
5. Result: Shares added, `shares` updated

### Withdrawing Money

1. Select account: "VOO Investment"
2. Select type: "Normal Expense"
3. Select pocket: "Invested Money"
4. Enter amount: $500
5. Result: Money removed, `montoInvertido` updated

### Selling Shares

1. Select account: "VOO Investment"
2. Select type: "Normal Expense"
3. Select pocket: "Shares"
4. Enter amount: 1.0
5. Result: Shares removed, `shares` updated

## Technical Details

### Code Changes

- **types/index.ts**: Removed `InvestmentIngreso` and `InvestmentShares` from `MovementType`
- **movementService.ts**: 
  - Removed special investment logic from create/update/delete
  - Added `syncInvestmentAccount()` to sync account fields from pocket balances
  - Simplified all movement operations
- **MovementsPage.tsx**: 
  - Removed conditional movement type rendering
  - Same movement types for all accounts
  - Removed investment-specific visual indicators

### Database Schema

No database schema changes required! The migration only updates the `type` field in existing movements.

### Rollback

If you need to rollback (not recommended):
1. Revert to previous commit
2. Your data is safe - pocket balances are the source of truth
3. Old movement types will work again

## Support

If you encounter any issues during migration:
1. Check browser console for error messages
2. Verify all movements migrated successfully
3. Test creating new investment movements
4. Check that balances are correct on Summary page

The migration is safe and non-destructive. Your investment data (amounts, shares, balances) remains unchanged.
