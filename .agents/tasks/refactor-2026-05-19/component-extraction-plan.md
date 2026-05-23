# Component Extraction Task Plan

Based on the component structure audit. Each task is scoped to complete within one coder agent session (max ~10 file edits, typically 3-5).

---

## Phase 1: Shared Constants & Utilities (No dependencies, all parallelizable)

### Task 1A: Create `movementTypes.ts` utility

**What**: Extract duplicated movement type constants and helpers into a shared utility.

**Creates**:
- `frontend/src/utils/movementTypes.ts`

**Modifies**:
- `frontend/src/components/BatchMovementForm.tsx` (remove inline array, import from util)
- `frontend/src/components/movements/MovementForm.tsx` (remove inline array, import)
- `frontend/src/components/movements/MovementTemplateForm.tsx` (remove inline array, import)
- `frontend/src/pages/TemplatesPage.tsx` (remove label function, import)

**Dependencies**: None
**Parallel**: Yes (no file overlap with other Phase 1 tasks)
**Complexity**: 5 file edits

---

### Task 1B: Create `constants/currencies.ts`

**What**: Extract duplicated currency arrays and options into a shared constants file.

**Creates**:
- `frontend/src/constants/currencies.ts`

**Modifies**:
- `frontend/src/components/accounts/AccountForm.tsx` (import from constants)
- `frontend/src/components/accounts/CDAccountForm.tsx` (import from constants)
- `frontend/src/components/settings/PreferencesSection.tsx` (import from constants)
- `frontend/src/services/settingsService.ts` (import from constants)

**Dependencies**: None
**Parallel**: Yes (no file overlap with other Phase 1 tasks)
**Complexity**: 5 file edits

---

### Task 1C: Create `ConfirmDialogProvider` context

**What**: Create a context provider that renders a single `ConfirmDialog` at the app level, exposing a `useConfirmDialog()` hook. This eliminates ~50 lines of boilerplate per consumer.

**Creates**:
- `frontend/src/contexts/ConfirmDialogContext.tsx` (provider + hook)

**Modifies**:
- `frontend/src/App.tsx` (wrap with provider)

**Dependencies**: None
**Parallel**: Yes (no file overlap with other Phase 1 tasks)
**Complexity**: 2 file edits

---

### Task 1D: Migrate pages to `ConfirmDialogProvider` (batch 1)

**What**: Remove ConfirmDialog boilerplate from first batch of pages.

**Modifies**:
- `frontend/src/pages/AccountsPage.tsx` (remove useConfirm + ConfirmDialog JSX, use useConfirmDialog)
- `frontend/src/pages/FixedExpensesPage.tsx` (same)
- `frontend/src/pages/MovementsPage.tsx` (same)
- `frontend/src/pages/TemplatesPage.tsx` (same)

**Dependencies**: Task 1C
**Parallel**: No (shares TemplatesPage with 1A — run after 1A completes, or run 1A first)
**Complexity**: 4 file edits

---

### Task 1E: Migrate pages/widgets to `ConfirmDialogProvider` (batch 2)

**What**: Remove ConfirmDialog boilerplate from remaining consumers.

**Modifies**:
- `frontend/src/pages/BudgetPlanningPage.tsx` (remove useConfirm + ConfirmDialog JSX)
- `frontend/src/components/net-worth/NetWorthTimelineWidget.tsx` (same)
- `frontend/src/components/reminders/RemindersWidget.tsx` (same)

**Dependencies**: Task 1C
**Parallel**: Yes with 1D (no file overlap)
**Complexity**: 3 file edits

---

## Phase 2: Shared Components (Depends on Phase 1 constants)

### Task 2A: Create `AccountPocketSelector` component

**What**: Extract the cascading account → pocket → sub-pocket select pattern into a reusable component with built-in filtering logic.

**Creates**:
- `frontend/src/components/selectors/AccountPocketSelector.tsx`

**Modifies**:
- `frontend/src/components/movements/MovementForm.tsx` (replace inline selects with component)
- `frontend/src/components/movements/MovementTemplateForm.tsx` (same)

**Dependencies**: Task 1A (MovementForm is modified by 1A — must run after)
**Parallel**: No (shares MovementForm with 1A)
**Complexity**: 3 file edits

---

### Task 2B: Migrate `AccountPocketSelector` to remaining consumers

**What**: Wire the new selector into BatchMovementForm and RestoreOrphanedModal.

**Modifies**:
- `frontend/src/components/BatchMovementForm.tsx` (replace inline selects)
- `frontend/src/components/movements/RestoreOrphanedModal.tsx` (replace inline selects)

**Dependencies**: Task 2A, Task 1A (BatchMovementForm modified by 1A)
**Parallel**: Yes with 2C (no file overlap)
**Complexity**: 2 file edits

---

### Task 2C: Create `MovementTypeSelect` component

**What**: Extract the movement type dropdown into a reusable component that uses the shared `movementTypes.ts` constants.

**Creates**:
- `frontend/src/components/selectors/MovementTypeSelect.tsx`

**Modifies**:
- `frontend/src/components/movements/MovementFilters.tsx` (use new component)

**Dependencies**: Task 1A (needs movementTypes.ts to exist)
**Parallel**: Yes with 2B (no file overlap)
**Complexity**: 2 file edits

Note: MovementForm and BatchMovementForm already touched by 2A/2B — the type select in those files can be migrated in a follow-up or included in 2A/2B scope if agent has capacity.

---

### Task 2D: Create `CurrencyAmount` display component

**What**: Create a standardized currency display component and fix the local `formatCurrency` in NetWorthTimelineWidget.

**Creates**:
- `frontend/src/components/CurrencyAmount.tsx`

**Modifies**:
- `frontend/src/components/net-worth/NetWorthTimelineWidget.tsx` (remove local formatCurrency, use component)
- `frontend/src/components/FixedExpenseGroupCard.tsx` (replace toLocaleString with component)
- `frontend/src/components/movements/MovementList.tsx` (replace toLocaleString with component)

**Dependencies**: Task 1E (NetWorthTimelineWidget modified by 1E — must run after)
**Parallel**: No (shares NetWorthTimelineWidget with Phase 3)
**Complexity**: 4 file edits

---

## Phase 3: Large Component Decomposition

### Task 3A: Decompose `NetWorthTimelineWidget.tsx` (part 1 — extract hook + chart)

**What**: Extract data processing logic into a hook and the chart rendering into its own component.

**Creates**:
- `frontend/src/hooks/useNetWorthChartData.ts`
- `frontend/src/components/net-worth/NetWorthChart.tsx`

**Modifies**:
- `frontend/src/components/net-worth/NetWorthTimelineWidget.tsx` (import and use extracted pieces)

**Dependencies**: Task 1E and Task 2D (both modify this file)
**Parallel**: No (sole modifier of NetWorthTimelineWidget at this point)
**Complexity**: 3 file edits

---

### Task 3B: Decompose `NetWorthTimelineWidget.tsx` (part 2 — extract modal)

**What**: Extract the edit/delete modal into its own component.

**Creates**:
- `frontend/src/components/net-worth/NetWorthEditModal.tsx`

**Modifies**:
- `frontend/src/components/net-worth/NetWorthTimelineWidget.tsx` (remove modal JSX, import component)
- `frontend/src/components/net-worth/index.ts` (create barrel export)

**Dependencies**: Task 3A
**Parallel**: No (modifies same file as 3A)
**Complexity**: 3 file edits

---

### Task 3C: Extract `useReminderActions` hook from `RemindersWidget`

**What**: Pull all handler logic (create, update, delete, mark-as-paid, recurrence actions) into a dedicated hook.

**Creates**:
- `frontend/src/hooks/useReminderActions.ts`

**Modifies**:
- `frontend/src/components/reminders/RemindersWidget.tsx` (import hook, remove inline handlers)
- `frontend/src/components/reminders/index.ts` (create barrel export)

**Dependencies**: Task 1E (RemindersWidget modified by 1E)
**Parallel**: Yes with 3A (no file overlap)
**Complexity**: 3 file edits

---

### Task 3D: Decompose `Layout.tsx`

**What**: Extract Sidebar, BottomNav, and QuickActionsFAB into separate components.

**Creates**:
- `frontend/src/components/layout/Sidebar.tsx`
- `frontend/src/components/layout/BottomNav.tsx`
- `frontend/src/components/layout/QuickActionsFAB.tsx`

**Modifies**:
- `frontend/src/components/Layout.tsx` (import extracted components, remove inline JSX)

**Dependencies**: None (Layout.tsx not touched by any prior task)
**Parallel**: Yes with all Phase 3 tasks
**Complexity**: 4 file edits

---

### Task 3E: Extract `BatchMovementRow` from `BatchMovementForm`

**What**: Extract the per-row rendering into its own component.

**Creates**:
- `frontend/src/components/movements/BatchMovementRow.tsx`

**Modifies**:
- `frontend/src/components/BatchMovementForm.tsx` (import row component, remove inline JSX)

**Dependencies**: Task 2B (BatchMovementForm modified by 2B)
**Parallel**: Yes with 3A, 3C, 3D (no file overlap)
**Complexity**: 2 file edits

---

### Task 3F: Extract `TemplateCard` from `TemplatesPage`

**What**: Extract the inline template card rendering (~120 lines) into a dedicated component.

**Creates**:
- `frontend/src/components/movements/TemplateCard.tsx`

**Modifies**:
- `frontend/src/pages/TemplatesPage.tsx` (import component, remove inline JSX)

**Dependencies**: Task 1D (TemplatesPage modified by 1D)
**Parallel**: Yes with 3A-3E (no file overlap)
**Complexity**: 2 file edits

---

### Task 3G: Extract `CDPreviewSection` and `CDWarningsSection` from `CDAccountForm`

**What**: Break the 441-line form into the main form + extracted preview/warnings sections.

**Creates**:
- `frontend/src/components/accounts/CDPreviewSection.tsx`
- `frontend/src/components/accounts/CDWarningsSection.tsx`

**Modifies**:
- `frontend/src/components/accounts/CDAccountForm.tsx` (import components, remove inline JSX)

**Dependencies**: Task 1B (CDAccountForm modified by 1B)
**Parallel**: Yes with 3A-3F (no file overlap)
**Complexity**: 3 file edits

---

## Phase 4: Directory Cleanup & Barrel Exports

### Task 4A: Move `FixedExpenseGroupCard` + add barrel exports

**What**: Move misplaced component to correct directory, add missing barrel exports for movements and reminders.

**Modifies**:
- `frontend/src/components/FixedExpenseGroupCard.tsx` → move to `frontend/src/components/fixed-expenses/FixedExpenseGroupCard.tsx`
- `frontend/src/components/fixed-expenses/index.ts` (add re-export)
- `frontend/src/components/movements/index.ts` (create barrel export)
- `frontend/src/pages/FixedExpensesPage.tsx` (update import path)

**Dependencies**: Task 1D (FixedExpensesPage modified by 1D), Task 2D (FixedExpenseGroupCard modified by 2D)
**Parallel**: Yes with 4B
**Complexity**: 4 file edits (1 move + 3 modifications)

---

### Task 4B: Replace custom empty states with shared `EmptyState` component

**What**: Standardize empty state rendering across components that roll their own.

**Modifies**:
- `frontend/src/components/movements/MovementList.tsx` (use EmptyState)
- `frontend/src/components/budget/BudgetDistribution.tsx` (use EmptyState)
- `frontend/src/components/accounts/PocketManagementSection.tsx` (use EmptyState)

**Dependencies**: Task 2D (MovementList modified by 2D)
**Parallel**: Yes with 4A (no file overlap)
**Complexity**: 3 file edits

---

### Task 4C: Merge `mutations/` directory + hooks cleanup

**What**: Move `useSettingsMutations.ts` into `queries/`, delete empty `mutations/` dir.

**Modifies**:
- `frontend/src/hooks/mutations/useSettingsMutations.ts` → move to `frontend/src/hooks/queries/useSettingsMutations.ts`
- Any file importing from `mutations/useSettingsMutations` (update import path)

**Dependencies**: None
**Parallel**: Yes with all Phase 4 tasks
**Complexity**: 2 file edits

---

## Execution Order & Parallelism Map

```
Phase 1 (foundations):
  ┌─ 1A (movementTypes)     ─┐
  ├─ 1B (currencies)         ├─ all parallel
  ├─ 1C (ConfirmProvider)    ─┤
  └────────────────────────────┘
       │
       ▼
  ┌─ 1D (migrate confirm batch 1) ─── depends on 1C, runs after 1A (shares TemplatesPage)
  └─ 1E (migrate confirm batch 2) ─── depends on 1C, parallel with 1D

Phase 2 (shared components):
  ┌─ 2A (AccountPocketSelector)  ─── after 1A
  │    └─ 2B (migrate selector)  ─── after 2A
  ├─ 2C (MovementTypeSelect)     ─── after 1A, parallel with 2A/2B
  └─ 2D (CurrencyAmount)         ─── after 1E

Phase 3 (decomposition):
  ┌─ 3A (NetWorth hook+chart)    ─── after 2D
  │    └─ 3B (NetWorth modal)    ─── after 3A
  ├─ 3C (ReminderActions hook)   ─── after 1E, parallel with 3A
  ├─ 3D (Layout decompose)       ─── no deps, parallel with all
  ├─ 3E (BatchMovementRow)       ─── after 2B
  ├─ 3F (TemplateCard)           ─── after 1D
  └─ 3G (CDPreviewSection)       ─── after 1B, parallel with most

Phase 4 (cleanup):
  ┌─ 4A (move FixedExpenseGroupCard) ─── after 1D + 2D
  ├─ 4B (EmptyState migration)       ─── after 2D
  └─ 4C (hooks dir cleanup)          ─── no deps, parallel with all
```

---

## Parallel Execution Windows

These groups can run simultaneously:

**Window 1**: Tasks 1A, 1B, 1C (all independent)
**Window 2**: Tasks 1D, 1E (after 1C; parallel with each other since 1A done)
**Window 3**: Tasks 2A, 2C, 2D, 3D, 3G (after respective deps; no file overlap)
**Window 4**: Tasks 2B, 3C, 3F (after respective deps; no file overlap)
**Window 5**: Tasks 3A, 3E, 4A, 4B, 4C (after respective deps; no file overlap)
**Window 6**: Task 3B (after 3A)

---

## Summary Table

| Task | Name | Files | Deps | Parallel? | Edits |
|------|------|-------|------|-----------|-------|
| 1A | Create movementTypes.ts | 5 | None | Yes | 5 |
| 1B | Create currencies.ts | 5 | None | Yes | 5 |
| 1C | Create ConfirmDialogProvider | 2 | None | Yes | 2 |
| 1D | Migrate confirm (batch 1) | 4 | 1C, after 1A | With 1E | 4 |
| 1E | Migrate confirm (batch 2) | 3 | 1C | With 1D | 3 |
| 2A | AccountPocketSelector | 3 | 1A | With 2C | 3 |
| 2B | Migrate selector (batch 2) | 2 | 2A | With 2C, 3C | 2 |
| 2C | MovementTypeSelect | 2 | 1A | With 2A, 2B | 2 |
| 2D | CurrencyAmount component | 4 | 1E | With 2A, 3D | 4 |
| 3A | NetWorth hook + chart | 3 | 2D | With 3C, 3D | 3 |
| 3B | NetWorth edit modal | 3 | 3A | No | 3 |
| 3C | useReminderActions hook | 3 | 1E | With 3A, 3D | 3 |
| 3D | Layout decomposition | 4 | None | With all | 4 |
| 3E | BatchMovementRow | 2 | 2B | With 3A, 3C | 2 |
| 3F | TemplateCard extraction | 2 | 1D | With 3C, 3E | 2 |
| 3G | CDPreview/Warnings | 3 | 1B | With most | 3 |
| 4A | Move FixedExpenseGroupCard | 4 | 1D, 2D | With 4B, 4C | 4 |
| 4B | EmptyState migration | 3 | 2D | With 4A, 4C | 3 |
| 4C | Hooks dir cleanup | 2 | None | With all | 2 |

**Total**: 19 tasks, 59 file edits across all tasks
**Critical path**: 1A → 1D → 3F (or 1C → 1E → 2D → 3A → 3B)
**Max parallelism**: 3 agents in Window 1, up to 5 in Window 3
