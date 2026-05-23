# Task: Decompose MovementsPage (941 lines → multiple components and hooks)

## Description
MovementsPage.tsx is 941 lines with 30+ state variables managing movement CRUD, batch creation, template selection, orphaned movements, bulk selection/actions, month collapsing, filtering, sorting, form state, and URL parameter handling. Break it into focused modules.

## Technical Requirements

### Extract hooks
Create in `frontend/src/hooks/`:
1. `useURLActions.ts` — handles reading URL params (`action=new`, `templateId`, `reminderId`) and auto-opening forms. Move the two useEffects that read `location.search`.
2. `useMovementFormState.ts` — manages form state: `showForm`, `editingMovement`, `selectedType`, `selectedAccountId`, `selectedPocketId`, `selectedSubPocketId`, `amount`, `notes`, `displayedDate`, `isPending`. Expose `resetFormState`, `openEditForm`, `openNewForm`.
3. `useBulkSelection.ts` — manages `selectedMovementIds`, `selectAll`, `deselectAll`, `toggleSelection`. The bulk action handlers (apply, markPending, delete) stay in the page but use this hook for state.

### Extract components
Create in `frontend/src/components/movements/`:
1. `OrphanedMovementsPanel.tsx` — the orphaned movements section with its grouping logic and restore functionality (from task-03 above)
2. `BulkActionsToolbar.tsx` — the toolbar that appears when movements are selected, with Apply/MarkPending/Delete buttons
3. `MovementFormPanel.tsx` — wraps the existing MovementForm with the page-level state (show/hide, edit mode, template prefill)

### Resulting MovementsPage structure
After extraction, MovementsPage should be ~200-250 lines of composition:
- Import and use the hooks
- Import and render the components
- Handle the high-level layout and data flow between them

### Rules
- Each extracted component must be independently testable (accept props, no global state)
- Each hook must have a clear single responsibility
- No prop drilling deeper than 2 levels — if needed, use a context
- All TypeScript types must be explicit (no `any`)

## Acceptance Criteria
1. MovementsPage.tsx is under 300 lines
2. All extracted hooks are in `frontend/src/hooks/`
3. All extracted components are in `frontend/src/components/movements/`
4. No functionality is lost — all features work as before
5. Frontend builds clean
6. Each extracted module has proper TypeScript interfaces for its props/return types
