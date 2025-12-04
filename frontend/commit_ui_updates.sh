#!/bin/bash

echo "Starting commit process for UI updates..."

# 1. UI Enhancement: Special Styles for Investment Accounts and Fixed Pockets
echo "Committing UI enhancements (special styles)..."
git add src/components/accounts/AccountCard.tsx src/components/accounts/PocketCard.tsx src/pages/AccountsPage.tsx
git commit -m "feat(ui): add special styles for investment accounts and fixed expense pockets

- Investment accounts: purple gradient, TrendingUp icon, badge
- Fixed pockets: blue theme with Lock icon
- Investment pockets: purple theme with PieChart/Banknote icons
- Improved visual hierarchy and distinction"

# 2. Bug Fix: Movement Sorting Logic
echo "Committing movement sorting fix..."
git add src/hooks/useMovementsSort.ts
git commit -m "fix(movements): change default sort to displayedDate desc with stable tie-breaker

- Changed from createdAt to displayedDate for more intuitive ordering
- Added createdAt as tie-breaker for stable sorting
- Persists sort preferences to localStorage"

# 3. Utility: Fixed Expense Calculations
echo "Committing utility additions..."
git add src/utils/fixedExpenseUtils.ts
git commit -m "feat(utils): add fixed expense calculation utilities

- Centralized logic for next payment calculations
- Handles negative balances and near-completion scenarios"

# 4. Minor: Card component update
echo "Committing Card component update..."
git add src/components/Card.tsx
git commit -m "refactor(components): update Card component for better flexibility"

# 5. Cleanup: Remove temporary files
echo "Cleaning up temporary files..."
rm -f temp_old_accounts.tsx old_AccountsPage.tsx
git status

echo "Done! All changes committed."
