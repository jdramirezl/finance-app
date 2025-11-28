# Fixed Pocket Migration Feature

## Overview

This feature allows users to migrate a fixed expenses pocket from one account to another while maintaining all associated data (sub-pockets, movements, and balances).

## Use Case

When users need to reorganize their accounts, they can now move their fixed expenses pocket to a different account without losing any transaction history or sub-pocket configurations.

## Implementation

### Service Layer

**pocketService.ts**
- `migrateFixedPocketToAccount(pocketId, targetAccountId)`: Migrates a fixed pocket to another account
  - Validates pocket exists and is of type 'fixed'
  - Validates target account exists and is not an investment account
  - Checks for name uniqueness in target account
  - Updates pocket's accountId and currency
  - Calls movementService to update all associated movements

**movementService.ts**
- `updateMovementsAccountForPocket(pocketId, newAccountId)`: Updates all movements for a pocket to reference the new account
  - Finds all movements associated with the pocket
  - Updates each movement's accountId
  - Returns count of updated movements

### Store Layer

**useFinanceStore.ts**
- `migrateFixedPocketToAccount(pocketId, targetAccountId)`: Store action that orchestrates the migration
  - Calls pocketService to perform migration
  - Reloads accounts and movements to reflect changes
  - Automatically selects the target account to show the migrated pocket

### UI Layer

**AccountsPage.tsx**
- Added migration button (ArrowRightLeft icon) next to fixed pockets
- Migration dialog with:
  - Information about what will happen during migration
  - Dropdown to select target account (excludes current account and investment accounts)
  - Confirmation buttons with loading states
- Success toast notification showing migration details

## Business Rules

1. Only fixed pockets can be migrated using this feature
2. Target account cannot be an investment account
3. Target account must not already have a pocket with the same name
4. All sub-pockets remain intact during migration
5. All movements are transferred to the new account
6. Balances are automatically recalculated for both source and target accounts
7. The pocket inherits the currency of the target account

## User Flow

1. User selects an account containing a fixed pocket
2. User clicks the migration button (⇄) on the fixed pocket
3. Migration dialog opens showing:
   - What will happen during migration
   - Dropdown to select target account
4. User selects target account and clicks "Migrate Pocket"
5. System performs migration and shows success message
6. UI automatically switches to show the target account with the migrated pocket

## Technical Notes

- Frontend-only implementation (no backend changes required)
- Uses existing localStorage/Supabase storage layer
- Maintains referential integrity by updating all related movements
- Optimistic UI updates with proper error handling and rollback
- All changes are atomic - either everything succeeds or nothing changes

## Future Enhancements

When backend is implemented:
- Add database transaction support for atomic migrations
- Add migration history/audit log
- Consider adding undo functionality
- Add batch migration support for multiple pockets
