# Task: Decompose God-Page Components Into Focused Modules

## Description
Page components are massive (MovementsPage: 941 lines/30+ state vars, AccountsPage: 779 lines/15+ state vars). They violate SRP by managing CRUD, forms, bulk actions, filtering, URL params, and rendering all in one file. Extract into focused components and custom hooks.

## Background
Key issues in pages:
- **MovementsPage** (941 lines): Movement CRUD, batch creation, template selection, orphaned movements, bulk selection/actions, month collapsing, filtering, sorting, form state, URL parameter handling, balance preview
- **AccountsPage** (779 lines): Account CRUD, pocket management, CD accounts, cascade deletion, migration, reordering
- **FixedExpensesPage** (561 lines): Group management, sub-pocket CRUD, toggle logic, consolidated view
- **SettingsPage** (492 lines): Export/import, sync, debug tools, settings CRUD
- **SummaryPage** (478 lines): Investment loading, currency conversion, triple-click refresh, account display
- **BudgetPlanningPage** (458 lines): Budget entries, scenarios, batch movement creation, localStorage persistence

Additional page-level bugs to fix during decomposition:
- MovementsPage: `deletingId` never resets on success (add `finally`)
- MovementsPage: Form resets before async completes (move reset to success path)
- MovementsPage: Dead "Restore" button (implement or remove)
- BudgetPlanningPage: Pocket matching by name instead of ID (use pocketId)
- AccountsPage: Redundant `isSaving` state (use mutation.isPending)

## Technical Requirements
1. **MovementsPage** → Extract:
   - `useMovementFormState` hook (form fields + handlers)
   - `useBulkActions` hook (selection, bulk apply/delete)
   - `useURLActions` hook (URL parameter handling)
   - `OrphanedMovementsPanel` component
   - `BulkActionsToolbar` component
   - Move form into `MovementFormModal` (use existing Modal component)

2. **AccountsPage** → Extract:
   - `AccountDetailPanel` component
   - `PocketManagement` component
   - `CDAccountSection` component
   - `useAccountActions` hook
   - `usePocketActions` hook

3. **Other pages** → Extract obvious sub-components:
   - SettingsPage: `ExportImportSection`, `DebugSection`, `PreferencesSection`
   - BudgetPlanningPage: `BudgetEntryList`, `ScenarioPanel`

4. Fix the bugs listed in Background during decomposition

## Dependencies
- `frontend/src/pages/MovementsPage.tsx`
- `frontend/src/pages/AccountsPage.tsx`
- `frontend/src/pages/FixedExpensesPage.tsx`
- `frontend/src/pages/SettingsPage.tsx`
- `frontend/src/pages/BudgetPlanningPage.tsx`
- All existing component directories

## Implementation Approach
1. Start with MovementsPage (worst offender)
2. Extract hooks first (state logic), then components (UI)
3. Fix the identified bugs as part of extraction (don't just move broken code)
4. Each extracted component should be <200 lines
5. Each page should be <200 lines after extraction (just composition + layout)
6. Add proper TypeScript interfaces for all props

## Acceptance Criteria

1. **No Page Exceeds 250 Lines**
   - Given all page files
   - When counting lines
   - Then no page file exceeds 250 lines (composition + layout only)

2. **No Component Has 30+ State Variables**
   - Given any component
   - When counting useState calls
   - Then no component has more than 8 useState calls (use hooks for the rest)

3. **Bugs Fixed During Decomposition**
   - Given MovementsPage
   - When deleting a movement successfully
   - Then `deletingId` is reset (finally block)
   - And form data is preserved on mutation error
   - And the "Restore" button either works or is removed

4. **Budget Matching Uses IDs**
   - Given a budget entry linked to a pocket
   - When the pocket is renamed
   - Then the budget entry still correctly references it (by ID, not name)

5. **Components Are Independently Testable**
   - Given any extracted component
   - When writing a unit test
   - Then it can be rendered in isolation with mock props

## Metadata
- **Complexity**: High
- **Labels**: Architecture, Pages, Components, Refactor, Bug Fix
- **Required Skills**: React component design, custom hooks, TypeScript
