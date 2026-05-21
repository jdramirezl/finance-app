# Directory Organization — Task Breakdown

## Execution Windows

| Window | Tasks | Can Parallel? |
|--------|-------|---------------|
| 1 | Task 1, Task 2, Task 3, Task 4 | Yes — all independent frontend moves |
| 2 | Task 5, Task 6 | Yes — backend is independent from frontend barrel exports |
| 3 | Task 7 | No — dead code deletion runs last to avoid conflicts |

## Task Details

### Task 1: Move UI primitives into `components/ui/`

- **Files touched** (8 moves + 1 new):
  - `frontend/src/components/Button.tsx` → `frontend/src/components/ui/Button.tsx`
  - `frontend/src/components/Card.tsx` → `frontend/src/components/ui/Card.tsx`
  - `frontend/src/components/Input.tsx` → `frontend/src/components/ui/Input.tsx`
  - `frontend/src/components/Select.tsx` → `frontend/src/components/ui/Select.tsx`
  - `frontend/src/components/Modal.tsx` → `frontend/src/components/ui/Modal.tsx`
  - `frontend/src/components/Skeleton.tsx` → `frontend/src/components/ui/Skeleton.tsx`
  - `frontend/src/components/EmptyState.tsx` → `frontend/src/components/ui/EmptyState.tsx`
  - `frontend/src/components/FloatingPanel.tsx` → `frontend/src/components/ui/FloatingPanel.tsx`
  - Create `frontend/src/components/ui/index.ts` barrel export

- **What to do**:
  1. Create `frontend/src/components/ui/` directory
  2. Move the 8 files listed above into it
  3. Create `frontend/src/components/ui/index.ts` that re-exports all components
  4. Update all import paths across the codebase (pages, App.tsx, hooks, other components)
  5. Move co-located test files: `Modal.test.tsx` → `ui/Modal.test.tsx`

- **Acceptance criteria**:
  - All 8 files live in `components/ui/`
  - `components/ui/index.ts` exports all of them
  - Zero broken imports — `npm run build` passes
  - No files remain at old paths

- **Dependencies**: none

---

### Task 2: Move remaining UI primitives and display components into `components/ui/`

- **Files touched** (8 moves, update barrel):
  - `frontend/src/components/PageHeader.tsx` → `frontend/src/components/ui/PageHeader.tsx`
  - `frontend/src/components/ProgressBar.tsx` → `frontend/src/components/ui/ProgressBar.tsx`
  - `frontend/src/components/AnimatedCounter.tsx` → `frontend/src/components/ui/AnimatedCounter.tsx`
  - `frontend/src/components/AnimatedProgressBar.tsx` → `frontend/src/components/ui/AnimatedProgressBar.tsx`
  - `frontend/src/components/CollapsibleSection.tsx` → `frontend/src/components/ui/CollapsibleSection.tsx`
  - `frontend/src/components/SelectableValue.tsx` → `frontend/src/components/ui/SelectableValue.tsx`
  - `frontend/src/components/SortableItem.tsx` → `frontend/src/components/ui/SortableItem.tsx`
  - `frontend/src/components/SortableList.tsx` → `frontend/src/components/ui/SortableList.tsx`

- **What to do**:
  1. Move the 8 files into `components/ui/`
  2. Add them to `components/ui/index.ts` barrel export
  3. Update all import paths across the codebase

- **Acceptance criteria**:
  - All 8 files live in `components/ui/`
  - Barrel export updated to include them
  - Zero broken imports — `npm run build` passes

- **Dependencies**: none (can run parallel with Task 1 if different agent, but touches same barrel file — safer to run in same window sequentially after Task 1)

---

### Task 3: Move layout, feedback, and misplaced components

- **Files touched** (8 moves + 2 barrel files):
  - `frontend/src/components/Layout.tsx` → `frontend/src/components/layout/Layout.tsx`
  - `frontend/src/components/ProtectedRoute.tsx` → `frontend/src/components/layout/ProtectedRoute.tsx`
  - `frontend/src/components/ThemeProvider.tsx` → `frontend/src/components/layout/ThemeProvider.tsx`
  - `frontend/src/components/ThemeProvider.test.tsx` → `frontend/src/components/layout/ThemeProvider.test.tsx`
  - `frontend/src/components/Toast.tsx` → `frontend/src/components/feedback/Toast.tsx`
  - `frontend/src/components/ToastContainer.tsx` → `frontend/src/components/feedback/ToastContainer.tsx`
  - `frontend/src/components/ConfirmDialog.tsx` → `frontend/src/components/feedback/ConfirmDialog.tsx`
  - `frontend/src/components/ErrorBoundary.tsx` → `frontend/src/components/feedback/ErrorBoundary.tsx`
  - Create `frontend/src/components/layout/index.ts`
  - Create `frontend/src/components/feedback/index.ts`

- **What to do**:
  1. Move Layout, ProtectedRoute, ThemeProvider (+ test) into existing `components/layout/` (which already has BottomNav, Sidebar, QuickActionsFAB)
  2. Create `components/feedback/` and move Toast, ToastContainer, ConfirmDialog, ErrorBoundary into it
  3. Create barrel exports for both directories
  4. Update imports in: `App.tsx`, `main.tsx`, `contexts/ConfirmDialogContext.tsx`, `hooks/useToast.ts`

- **Acceptance criteria**:
  - `components/layout/` contains Layout, ProtectedRoute, ThemeProvider, BottomNav, Sidebar, QuickActionsFAB + barrel
  - `components/feedback/` contains Toast, ToastContainer, ConfirmDialog, ErrorBoundary + barrel
  - `App.tsx` imports from `./components/layout` and `./components/feedback`
  - `main.tsx` imports ThemeProvider from `./components/layout`
  - `npm run build` passes

- **Dependencies**: none

---

### Task 4: Move misplaced files (BatchMovementForm, selectors, calendar, utils→constants, AppError)

- **Files touched** (7 moves + 2 new files):
  - `frontend/src/components/BatchMovementForm.tsx` → `frontend/src/components/movements/BatchMovementForm.tsx`
  - `frontend/src/components/selectors/AccountPocketSelector.tsx` → `frontend/src/components/movements/AccountPocketSelector.tsx`
  - `frontend/src/components/selectors/MovementTypeSelect.tsx` → `frontend/src/components/movements/MovementTypeSelect.tsx`
  - `frontend/src/components/calendar/FinancialCalendarWidget.tsx` → `frontend/src/components/summary/FinancialCalendarWidget.tsx`
  - `frontend/src/components/calendar/FinancialCalendarWidget.test.tsx` → `frontend/src/components/summary/FinancialCalendarWidget.test.tsx`
  - `frontend/src/utils/movementTypes.ts` → `frontend/src/constants/movementTypes.ts`
  - `frontend/src/utils/smartIcons.ts` → `frontend/src/constants/smartIcons.ts`
  - `frontend/src/utils/AppError.ts` → `frontend/src/errors/AppError.ts` (create `errors/` dir)
  - Update `frontend/src/constants/index.ts` to re-export movementTypes and smartIcons

- **What to do**:
  1. Move BatchMovementForm into `components/movements/` and update its barrel export
  2. Move both selectors into `components/movements/` (they're only used by movement-related code) and update the movements barrel export
  3. Move calendar widget + test into `components/summary/` and update summary barrel export
  4. Move `movementTypes.ts` and `smartIcons.ts` from `utils/` to `constants/` and update `constants/index.ts`
  5. Create `errors/` directory, move `AppError.ts` there
  6. Update all import paths (8 files import BatchMovementForm, 6 import selectors, 5 import movementTypes, 1 imports smartIcons, 1 imports AppError)
  7. Delete empty `components/selectors/` and `components/calendar/` directories

- **Acceptance criteria**:
  - `components/selectors/` directory no longer exists
  - `components/calendar/` directory no longer exists
  - BatchMovementForm is in `components/movements/`
  - `constants/index.ts` re-exports movementTypes and smartIcons
  - `errors/AppError.ts` exists
  - `npm run build` passes

- **Dependencies**: none

---

### Task 5: Add barrel exports to frontend directories + group hooks

- **Files touched** (7 new files + hook moves):
  - Create `frontend/src/hooks/index.ts`
  - Create `frontend/src/hooks/actions/index.ts`
  - Create `frontend/src/contexts/index.ts`
  - Create `frontend/src/lib/index.ts`
  - Create `frontend/src/pages/index.ts`
  - Create `frontend/src/services/index.ts`
  - Create `frontend/src/store/index.ts`
  - Move action hooks into `frontend/src/hooks/actions/`:
    - `useAccountActions.ts`
    - `useBudgetActions.ts`
    - `useFixedExpenseActions.ts`
    - `useMovementSubmit.ts`
    - `useMovementRowActions.ts`
    - `useMovementBulkActions.ts`
    - `usePocketActions.ts`
    - `useReminderActions.ts`
    - `useSettingsActions.ts`

- **What to do**:
  1. Create `hooks/actions/` directory and move the 9 action hooks into it
  2. Create `hooks/actions/index.ts` barrel export
  3. Create barrel exports for: `hooks/`, `contexts/`, `lib/`, `pages/`, `services/`, `store/`
  4. Update all imports that reference the moved action hooks (pages, other hooks, components)
  5. Barrel exports should re-export from subdirectories (e.g., `hooks/index.ts` re-exports from `./actions` and `./queries`)

- **Acceptance criteria**:
  - Every top-level frontend directory has an `index.ts`
  - Action hooks live in `hooks/actions/`
  - All barrel exports are functional (importing from them works)
  - `npm run build` passes

- **Dependencies**: Tasks 1-4 (runs in Window 2 after file moves are done, so barrel exports reference correct paths)

---

### Task 6: Standardize backend net-worth and reminders modules

- **Files touched** (6 moves + 4 new barrel files):
  - `backend/src/modules/net-worth/interfaces/INetWorthSnapshotRepository.ts` → `backend/src/modules/net-worth/infrastructure/INetWorthSnapshotRepository.ts`
  - `backend/src/modules/net-worth/interfaces/NetWorthSnapshotController.ts` → `backend/src/modules/net-worth/presentation/NetWorthSnapshotController.ts`
  - `backend/src/modules/reminders/interfaces/IReminderRepository.ts` → `backend/src/modules/reminders/infrastructure/IReminderRepository.ts`
  - `backend/src/modules/reminders/interfaces/ReminderController.ts` → `backend/src/modules/reminders/presentation/ReminderController.ts`
  - Delete empty `net-worth/interfaces/` directory
  - Delete empty `reminders/interfaces/` directory
  - Create `backend/src/modules/net-worth/infrastructure/index.ts`
  - Create `backend/src/modules/net-worth/presentation/index.ts`
  - Create `backend/src/modules/reminders/infrastructure/index.ts`
  - Create `backend/src/modules/reminders/presentation/index.ts`

- **What to do**:
  1. Move `INetWorthSnapshotRepository.ts` from `interfaces/` to `infrastructure/` (where all other modules keep their repository interfaces)
  2. Move `NetWorthSnapshotController.ts` from `interfaces/` to `presentation/` (where all other modules keep controllers)
  3. Same for reminders: move `IReminderRepository.ts` to `infrastructure/`, `ReminderController.ts` to `presentation/`
  4. Update import paths in:
     - `net-worth/application/NetWorthSnapshotService.ts` (imports INetWorthSnapshotRepository)
     - `net-worth/presentation/routes.ts` (imports NetWorthSnapshotController)
     - `reminders/application/ReminderService.ts` (imports IReminderRepository)
     - `reminders/presentation/routes.ts` (imports ReminderController)
     - `reminders/infrastructure/SupabaseReminderRepository.ts` (may import IReminderRepository)
     - `net-worth/infrastructure/SupabaseNetWorthSnapshotRepository.ts` (may import INetWorthSnapshotRepository)
  5. Delete the now-empty `interfaces/` directories
  6. Create barrel exports for the affected directories

- **Acceptance criteria**:
  - No `interfaces/` directory exists in net-worth or reminders modules
  - Repository interfaces live in `infrastructure/` (matching accounts, pockets, movements, sub-pockets, settings)
  - Controllers live in `presentation/` (matching all other modules)
  - `npm run test` passes in backend (or `npm run build` if no test script)
  - Import paths are consistent with the rest of the codebase

- **Dependencies**: none (backend is independent from frontend tasks)

---

### Task 7: Delete dead code and clean up

- **Files to delete**:
  - `shared/package.json`
  - `shared/types/index.ts`
  - `shared/types/index.js`
  - `shared/types/index.js.map`
  - `shared/types/index.d.ts`
  - `shared/types/index.d.ts.map`
  - `frontend/src/assets/react.svg`
  - `frontend/src/App.css`

- **What to do**:
  1. Delete the entire `shared/` directory at the monorepo root (confirmed: nothing imports from it)
  2. Delete `frontend/src/assets/react.svg` (confirmed: not imported anywhere)
  3. Delete `frontend/src/App.css` (confirmed: not imported anywhere)
  4. Remove `shared` workspace reference from root `package.json` if it exists in the workspaces array
  5. Verify no tsconfig paths reference the shared package
  6. Run build to confirm nothing breaks

- **Acceptance criteria**:
  - `shared/` directory does not exist
  - `assets/react.svg` does not exist
  - `App.css` does not exist
  - Root `package.json` has no reference to shared workspace
  - `npm run build` passes in frontend
  - `npm run build` passes in backend

- **Dependencies**: Tasks 1-6 (runs last to avoid any conflicts with file moves)

---

## Verification Checklist (Post-Execution)

After all tasks complete, the following must be true:

1. `frontend/src/components/` root contains ZERO `.tsx` files (only subdirectories)
2. Every subdirectory under `components/` has an `index.ts`
3. `hooks/actions/` contains all 9 action hooks
4. `hooks/queries/` is unchanged (already organized)
5. Backend `net-worth/` and `reminders/` follow the same `domain/infrastructure/application/presentation` pattern as other modules
6. No `interfaces/` directory exists in any backend module
7. `shared/` root directory is gone
8. `npm run build` passes in both frontend and backend
9. No dead files remain (`react.svg`, `App.css`)
