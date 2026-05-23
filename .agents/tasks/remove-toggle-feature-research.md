# Remove Toggle Feature - Research Document

## Summary

The enable/disable toggle feature for fixed expenses (sub-pockets) and groups spans **18 files** across frontend components, hooks, services, backend use cases, controllers, routes, domain entities, and the database schema. The feature allows users to toggle individual expenses or entire groups on/off, which affects budget calculations and batch movement generation.

**Key insight**: After removal, all sub-pockets will be treated as always-enabled. Logic that filters by `sp.enabled` should either be removed (if it's the only purpose) or changed to include all sub-pockets unconditionally.

---

## Files by Layer

### Database / Migrations

| File | Lines | What it does | Action |
|------|-------|--------------|--------|
| `backend/migrations/000_initial_schema.sql` | 117 | Defines `enabled BOOLEAN NOT NULL DEFAULT TRUE` column on `sub_pockets` table | Create new migration to DROP the `enabled` column |

---

### Backend - Domain

| File | Lines | What it does | Action |
|------|-------|--------------|--------|
| `backend/src/modules/sub-pockets/domain/SubPocket.ts` | 17, 104-115, 137-140, 161 | `enabled` property, `toggleEnabled()`, `setEnabled()`, `isEnabled()` methods, serialization | Remove `enabled` property, remove `toggleEnabled()`, `setEnabled()`, `isEnabled()` methods, remove from `toJSON()` |
| `backend/src/modules/sub-pockets/domain/SubPocketDomainService.ts` | 84-93 | `calculateEnabledMonthlyContribution()` method that filters by `isEnabled()` | Remove entire method (or merge with `calculateMonthlyContribution` if callers need it) |

---

### Backend - Application (Use Cases, DTOs, Mappers)

| File | Lines | What it does | Action |
|------|-------|--------------|--------|
| `backend/src/modules/sub-pockets/application/useCases/ToggleSubPocketEnabledUseCase.ts` | entire file | Use case for toggling a single sub-pocket's enabled state | **Delete entire file** |
| `backend/src/modules/sub-pockets/application/useCases/ToggleGroupUseCase.ts` | entire file | Use case for toggling all sub-pockets in a group | **Delete entire file** |
| `backend/src/modules/sub-pockets/application/useCases/CreateSubPocketUseCase.ts` | 100 | Passes `true` as default enabled value to constructor | Remove the `enabled` argument from constructor call |
| `backend/src/modules/sub-pockets/application/mappers/SubPocketMapper.ts` | 25, 52, 75, 98 | Maps `enabled` field between DB rows, domain entities, and DTOs | Remove `enabled` from all mapping functions |
| `backend/src/modules/sub-pockets/application/dtos/SubPocketDTO.ts` | 28 | `enabled: boolean` field in DTO | Remove `enabled` field |

---

### Backend - Presentation (Controllers, Routes)

| File | Lines | What it does | Action |
|------|-------|--------------|--------|
| `backend/src/modules/sub-pockets/presentation/SubPocketController.ts` | 17, 38, 153-167 | Imports `ToggleSubPocketEnabledUseCase`, injects it, defines `toggle()` endpoint handler | Remove import, remove injection, remove `toggle()` method |
| `backend/src/modules/sub-pockets/presentation/subPocketRoutes.ts` | 73-81 | `POST /api/sub-pockets/:id/toggle` route definition | Remove the route |
| `backend/src/modules/sub-pockets/presentation/FixedExpenseGroupController.ts` | 16, 27, 125-138 | Imports `ToggleGroupUseCase`, injects it, defines `toggle()` endpoint handler | Remove import, remove injection, remove `toggle()` method |
| `backend/src/modules/sub-pockets/presentation/groupRoutes.ts` | 82-90 | `POST /api/fixed-expense-groups/:id/toggle` route definition | Remove the route |

---

### Backend - DI Container

| File | Lines | What it does | Action |
|------|-------|--------------|--------|
| `backend/src/shared/container/subPockets.module.ts` | 9, 19, 32, 45 | Imports and registers `ToggleSubPocketEnabledUseCase` and `ToggleGroupUseCase` | Remove imports and `container.register()` calls for both |

---

### Frontend - Types

| File | Lines | What it does | Action |
|------|-------|--------------|--------|
| `frontend/src/types/index.ts` | 78 | `enabled: boolean` field on `SubPocket` interface | Remove the field |

---

### Frontend - Services

| File | Lines | What it does | Action |
|------|-------|--------------|--------|
| `frontend/src/services/subPocketService.ts` | 37-41, 96-114 | `filter(sp => sp.enabled)` in monthly calc; `toggleSubPocketEnabled()` method; `toggleGroup()` method | Remove enabled filter (include all); delete `toggleSubPocketEnabled()` method; delete `toggleGroup()` method |

---

### Frontend - Hooks (Mutations)

| File | Lines | What it does | Action |
|------|-------|--------------|--------|
| `frontend/src/hooks/queries/useSubPocketMutations.ts` | 45-51, 79 | `toggleSubPocketEnabled` mutation definition and export | Remove mutation and its export |
| `frontend/src/hooks/queries/useFixedExpenseGroupMutations.ts` | 45-47, 71 | `toggleFixedExpenseGroup` mutation definition and export | Remove mutation and its export |

---

### Frontend - Hooks (Actions)

| File | Lines | What it does | Action |
|------|-------|--------------|--------|
| `frontend/src/hooks/actions/useFixedExpenseActions.ts` | 42, 46, 48, 52, 75, 77, 81-82, 110-120, 149-158, 170-176, 184-190, 239, 243, 245 | `togglingId`/`togglingGroupId` state; `handleToggleSubPocket`; `handleToggleGroup`; `toggleGroupCollapse` (UI collapse, KEEP); `prepareBatchFromEnabled` filters by `sp.enabled` | Remove `togglingId`, `togglingGroupId` state; remove `handleToggleSubPocket`; remove `handleToggleGroup`; KEEP `toggleGroupCollapse` (it's UI collapse, not enable/disable); change `prepareBatchFromEnabled` to include all sub-pockets |
| `frontend/src/hooks/actions/useBudgetActions.ts` | 97, 111 | Falls back to `fixedSubPockets.filter((sp) => sp.enabled)` when no scenarios | Remove `.filter((sp) => sp.enabled)` — use all sub-pockets |

---

### Frontend - Components (Fixed Expenses)

| File | Lines | What it does | Action |
|------|-------|--------------|--------|
| `frontend/src/components/fixed-expenses/FixedExpenseGroupCard.tsx` | 3, 16, 23-24, 29, 32, 48-50, 55, 58, 63-81, 97, 115, 144-161, 207-332 | Toggle icons (ToggleLeft/Right), `isToggling` prop, `onToggleGroup`/`onToggleExpense` callbacks, enabled count display, toggle buttons for group and individual expenses, opacity/line-through styling | Remove all toggle-related props, remove toggle buttons, remove enabled/disabled styling (opacity, line-through, OFF badge), remove `enabledCount` display, remove ToggleLeft/ToggleRight imports |
| `frontend/src/components/fixed-expenses/FixedExpensesList.tsx` | 15, 17, 19-20, 25, 40, 42, 44-45, 50, 99-101, 106, 109 | Props for `togglingGroupId`, `togglingId`, `onToggleCollapse`, `onToggleGroup`, `onToggleExpense`; passes them to FixedExpenseGroupCard | Remove toggle-related props and their pass-through (KEEP `onToggleCollapse` — it's UI collapse) |
| `frontend/src/components/fixed-expenses/StitchGroupCard.tsx` | 8-9, 26-27, 32-33, 55-56, 61-62, 68-79, 93, 103, 112-126, 162, 188-255 | Toggle icons, `onToggleGroup`/`onToggleExpense` props, `isTogglingGroup`, enabled count, toggle button, per-expense checkbox toggle, opacity/line-through styling | Remove all toggle-related props, buttons, checkbox, styling. KEEP collapse toggle |
| `frontend/src/components/fixed-expenses/StitchExpensesList.tsx` | 12-13, 18-19, 21, 39-40, 45-46, 48, 121-122, 126, 153-154, 159-160, 162 | Props for `onToggleCollapse`, `onToggleGroup`, `onToggleExpense`, `togglingGroupId`, `togglingId`; passes to StitchGroupCard | Remove toggle-related props and pass-through (KEEP `onToggleCollapse`) |

---

### Frontend - Components (Summary/Budget)

| File | Lines | What it does | Action |
|------|-------|--------------|--------|
| `frontend/src/components/summary/FixedObligationsWidget.tsx` | 51-54 | Line-through + "OFF" badge when `!sp.enabled` | Remove conditional styling — always show normally |
| `frontend/src/components/summary/FixedExpensesSummary.tsx` | 76-79 | Line-through + "OFF" badge when `!subPocket.enabled` | Remove conditional styling — always show normally |
| `frontend/src/components/budget/ObligationsHeader.tsx` | 2, 12, 22 | `enabledCount` prop displayed as `{enabledCount}/{totalCount}` | Change to just show `totalCount` or remove the count badge entirely |

---

### Frontend - Pages

| File | Lines | What it does | Action |
|------|-------|--------------|--------|
| `frontend/src/pages/UnifiedBudgetPage.tsx` | 123, 132, 196-234, 305, 325, 327-329, 334, 348 | `enabledCount` calculation, `handleToggleGroup`/`handleToggleExpense` callbacks, passes toggle props to child components | Remove `enabledCount` calc; remove `handleToggleGroup`/`handleToggleExpense`; remove toggle props from child component calls; update `enabledCount` prop on ObligationsHeader |

---

### NOT related (false positives to IGNORE)

| File | Lines | Why it's safe to ignore |
|------|-------|------------------------|
| `frontend/src/hooks/queries/usePocketsQuery.ts` | 22 | TanStack Query `enabled` option (conditional fetching) |
| `frontend/src/hooks/queries/useAccountsQuery.ts` | 22 | TanStack Query `enabled` option |
| `frontend/src/components/net-worth/ExchangeRateTrend.tsx` | 47 | TanStack Query `enabled` option |
| `frontend/src/components/ui/CollapsibleSection.tsx` | 8, 18, 26 | Generic UI collapse toggle (unrelated) |
| `frontend/src/components/movements/MovementList.tsx` | 64, 86, 114, 369 | Multi-select checkbox toggle (unrelated) |
| `frontend/src/components/budget/BudgetScenarioTabs.tsx` | 9, 25-26, 48, 92 | Scenario activation toggle (unrelated) |
| `frontend/src/components/budget/ScenarioForm.tsx` | 56, 66, 141, 167, 188, 210 | Scenario expense selection checkboxes (selecting which expenses belong to a scenario — unrelated to enable/disable) |
| `frontend/src/components/accounts/CDAccountForm.tsx` | 312 | Preview toggle (unrelated) |
| `frontend/src/components/accounts/CDPreviewSection.tsx` | 19, 32, 61 | Preview toggle (unrelated) |
| `frontend/src/hooks/actions/useFixedExpenseActions.ts` → `toggleGroupCollapse` | 170-176, 245 | UI collapse state (KEEP — not enable/disable) |
| `frontend/src/test/mockData.ts` | 68, 77, 86 | Test mock data — remove `enabled` field after type change |

---

## Recommended Execution Order

### Phase 1: Database Migration (do first, non-breaking)

1. **Create migration** to drop the `enabled` column from `sub_pockets` table
   - This should be done LAST in deployment but written first for planning
   - Until the column is dropped, the backend can still read/write it harmlessly

### Phase 2: Backend Changes (bottom-up)

1. **Domain**: Remove `enabled` from `SubPocket.ts` (property, methods)
2. **Domain Service**: Remove `calculateEnabledMonthlyContribution` from `SubPocketDomainService.ts`
3. **DTOs/Mappers**: Remove `enabled` from `SubPocketDTO.ts` and `SubPocketMapper.ts`
4. **Use Cases**: Delete `ToggleSubPocketEnabledUseCase.ts` and `ToggleGroupUseCase.ts`
5. **Use Cases**: Update `CreateSubPocketUseCase.ts` (remove enabled arg)
6. **Controllers**: Remove `toggle()` methods from both controllers
7. **Routes**: Remove `POST /:id/toggle` from both route files
8. **DI Container**: Remove registrations from `subPockets.module.ts`

### Phase 3: Frontend Changes (bottom-up)

1. **Types**: Remove `enabled` from `SubPocket` interface in `types/index.ts`
2. **Services**: Remove `toggleSubPocketEnabled()` and `toggleGroup()` from `subPocketService.ts`; remove `.filter(sp => sp.enabled)` from monthly calc
3. **Mutations**: Remove `toggleSubPocketEnabled` from `useSubPocketMutations.ts`; remove `toggleFixedExpenseGroup` from `useFixedExpenseGroupMutations.ts`
4. **Actions**: Clean up `useFixedExpenseActions.ts` (remove toggle state, handlers, update batch generation); clean up `useBudgetActions.ts` (remove enabled filter)
5. **Components**: Remove toggle UI from `FixedExpenseGroupCard.tsx`, `StitchGroupCard.tsx`, `FixedExpensesList.tsx`, `StitchExpensesList.tsx`
6. **Summary widgets**: Remove enabled styling from `FixedObligationsWidget.tsx`, `FixedExpensesSummary.tsx`
7. **Budget**: Update `ObligationsHeader.tsx` (remove enabledCount or repurpose)
8. **Page**: Clean up `UnifiedBudgetPage.tsx` (remove toggle handlers and props)

### Phase 4: Cleanup

1. **Test mocks**: Remove `enabled` field from `frontend/src/test/mockData.ts`
2. **Run migration** to drop the `enabled` column (after backend is deployed without reading it)

---

## Impact Analysis

### What changes functionally:
- All fixed expenses are always "active" — no way to temporarily disable one
- Budget calculations always include all expenses (unless filtered by scenario)
- Batch movement generation includes all expenses (not just enabled ones)
- No more "OFF" badges or line-through styling in summary views

### What stays the same:
- Group collapse/expand (UI-only, not enable/disable)
- Scenario-based expense selection (scenarios pick which expenses to include)
- Delete expense (permanent removal still works)
- All other CRUD operations on expenses and groups
