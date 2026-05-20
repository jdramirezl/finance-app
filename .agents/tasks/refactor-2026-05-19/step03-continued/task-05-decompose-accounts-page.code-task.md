# Task: Decompose AccountsPage (779 lines → multiple components and hooks)

## Description
AccountsPage.tsx is 779 lines managing account CRUD, pocket management, CD accounts, cascade deletion, migration, and reordering. Break it into focused modules.

## Technical Requirements

### Extract components
Create in `frontend/src/components/accounts/`:
1. `AccountDetailPanel.tsx` — shows selected account details, pockets list, balance. Currently inline in the page.
2. `PocketManagementSection.tsx` — pocket CRUD within an account (create, edit, delete, reorder pockets)
3. `CDAccountManagement.tsx` — CD-specific creation form and details panel (currently CDAccountForm + CDDetailsPanel are already components, but the orchestration logic is in the page)
4. `CascadeDeleteDialog.tsx` — the cascade delete confirmation with options (delete movements vs orphan them)

### Extract hooks
Create in `frontend/src/hooks/`:
1. `useAccountActions.ts` — manages account CRUD operations: create, update, delete, cascade delete, reorder. Wraps the mutation hooks with proper error handling and toast feedback.
2. `usePocketActions.ts` — manages pocket CRUD: create, update, delete, reorder, migrate. Same pattern.

### Resulting AccountsPage structure
After extraction, AccountsPage should be ~200-250 lines:
- Account list (left panel)
- Account detail (right panel via AccountDetailPanel)
- Modals (forms, cascade delete dialog)
- High-level state: selectedAccountId, which modal is open

### Rules
- Same as MovementsPage decomposition: testable components, explicit types, no deep prop drilling

## Acceptance Criteria
1. AccountsPage.tsx is under 300 lines
2. All extracted components are properly typed
3. All functionality preserved
4. Frontend builds clean
