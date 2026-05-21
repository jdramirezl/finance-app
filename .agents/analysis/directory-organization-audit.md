# Directory Organization Audit

## Executive Summary

The codebase has a reasonable high-level structure but suffers from **inconsistent architectural patterns between modules** (backend), **30 loose files in the components root** (frontend), **zero barrel exports at top-level directories**, and a **dead shared workspace** that nobody imports from. The backend has two modules (`net-worth`, `reminders`) using a completely different internal structure than the other four modules.

**Severity ranking**:
1. Backend structural inconsistency (high) — two different architectures coexist
2. Frontend components root dumping ground (high) — 30 files with no grouping
3. Missing barrel exports (medium) — 10 top-level directories lack `index.ts`
4. Shared workspace is dead code (medium) — types duplicated in frontend and backend
5. Naming convention inconsistency (low) — `AppError.ts` in utils, camelCase routes in backend

---

## 1. Files in Wrong Directories

### Frontend

| File | Current Location | Should Be |
|------|-----------------|-----------|
| `BatchMovementForm.tsx` | `components/` (root) | `components/movements/` |
| `Layout.tsx` | `components/` (root) | `components/layout/` |
| `ThemeProvider.tsx` | `components/` (root) | `components/layout/` or `contexts/` |
| `ProtectedRoute.tsx` | `components/` (root) | `components/layout/` or `components/auth/` |
| `Toast.tsx` + `ToastContainer.tsx` | `components/` (root) | `components/feedback/` or `components/ui/` |
| `ConfirmDialog.tsx` | `components/` (root) | `components/feedback/` or `components/ui/` |
| `AppError.ts` | `utils/` | `lib/` or `errors/` (it's a class, not a utility function) |
| `movementTypes.ts` | `utils/` | `constants/` (it defines type metadata/options, not utility logic) |
| `smartIcons.ts` | `utils/` | `constants/` or `config/` (it's a static mapping, not a utility) |

### Backend

| File | Current Location | Should Be |
|------|-----------------|-----------|
| `INetWorthSnapshotRepository.ts` | `net-worth/interfaces/` | `net-worth/infrastructure/` (where all other modules put interfaces) |
| `NetWorthSnapshotController.ts` | `net-worth/interfaces/` | `net-worth/presentation/` (where all other modules put controllers) |
| `IReminderRepository.ts` | `reminders/interfaces/` | `reminders/infrastructure/` |
| `ReminderController.ts` | `reminders/interfaces/` | `reminders/presentation/` |

---

## 2. Naming Convention Inconsistencies

### Frontend

**Convention**: Components use PascalCase, services/hooks/utils use camelCase. This is **mostly consistent** with one exception:

| File | Convention Used | Expected |
|------|---------------|----------|
| `AppError.ts` (in utils/) | PascalCase | camelCase (it's in utils, not components) |

The `utils/` directory is otherwise consistently camelCase. `AppError.ts` is PascalCase because it's a class — this suggests it doesn't belong in `utils/`.

### Backend

**Convention**: Domain entities and controllers use PascalCase, routes and utilities use camelCase. Mostly consistent, but:

| File | Convention Used | Expected |
|------|---------------|----------|
| `currencyRoutes.ts` | camelCase | Consistent with other routes (`routes.ts`) — but inconsistent with `investmentRoutes.ts`, `settingsRoutes.ts`, `subPocketRoutes.ts`, `groupRoutes.ts`, `templateRoutes.ts` |

Route files use two patterns:
- Generic: `routes.ts` (accounts, pockets, movements, net-worth, reminders)
- Prefixed: `investmentRoutes.ts`, `settingsRoutes.ts`, `currencyRoutes.ts`, `subPocketRoutes.ts`, `groupRoutes.ts`, `templateRoutes.ts`

This is because some modules have multiple route files. The naming is internally consistent (all camelCase) but the **pattern** is inconsistent — some modules split routes, others don't.

### Directory Names

Frontend uses **kebab-case** for directories (`fixed-expenses`, `net-worth`) — this is consistent.
Backend uses **kebab-case** for module directories (`sub-pockets`, `net-worth`) — also consistent.

**No issues here.**

---

## 3. Dead Files

### Confirmed Dead: `shared/` Workspace

The `shared/` workspace package (`finance-app-shared`) is **never imported by the frontend**. The backend imports from `@shared-backend/*` which maps to `backend/src/shared/`, not the root `shared/` directory.

```
shared/
├── package.json          # Dead
├── types/index.ts        # Dead — duplicated in frontend/src/types/ and backend/src/shared/types/
├── types/index.js        # Dead compiled output
├── types/index.js.map    # Dead
├── types/index.d.ts      # Dead
└── types/index.d.ts.map  # Dead
```

The frontend has its own `types/index.ts` (200 lines, more complete), and the backend has its own `shared/types/index.ts`. The root `shared/` package is vestigial.

### Confirmed Dead: `assets/react.svg`

Not imported anywhere in the codebase. Leftover from Vite project scaffolding.

### Confirmed Dead: `App.css`

Not imported by any file (checked with grep). Likely replaced by Tailwind CSS.

### Potentially Dead: `frontend/src/test/` Directory

- `integration.test.ts` — only imported by test runner, not by source code (this is fine)
- `mockData.ts` — need to verify if test files import it
- `testUtils.tsx` — imported by test files (confirmed used)

---

## 4. Missing or Inconsistent Barrel Exports

### Frontend — Missing `index.ts` at Top-Level Directories

| Directory | Files | Has `index.ts` |
|-----------|-------|----------------|
| `components/` | 30 files at root | **NO** |
| `contexts/` | 3 files | **NO** |
| `hooks/` | 23 files at root | **NO** |
| `lib/` | 2 files | **NO** |
| `pages/` | 9 files | **NO** |
| `services/` | 14 files | **NO** |
| `store/` | 2 files | **NO** |
| `utils/` | 9 files | **NO** |
| `assets/` | 1 file | **NO** (acceptable) |
| `test/` | 3 files | **NO** (acceptable) |

**Has barrel exports** (good):
- `components/accounts/index.ts` ✓
- `components/budget/index.ts` ✓
- `components/fixed-expenses/index.ts` ✓
- `components/movements/index.ts` ✓
- `components/net-worth/index.ts` ✓
- `components/reminders/index.ts` ✓
- `components/settings/index.ts` ✓
- `components/summary/index.ts` ✓
- `hooks/queries/index.ts` ✓
- `constants/index.ts` ✓
- `types/index.ts` ✓

**Missing barrel exports** (inconsistent):
- `components/layout/` — no index.ts
- `components/calendar/` — no index.ts
- `components/selectors/` — no index.ts

### Backend — Almost No Barrel Exports

Only 2 barrel exports exist in the entire backend:
- `shared/container/index.ts`
- `shared/types/index.ts`

Every module directory (`domain/`, `infrastructure/`, `application/useCases/`, `presentation/`) lacks barrel exports. This forces verbose import paths like:
```typescript
import { CreateAccountUseCase } from '../application/useCases/CreateAccountUseCase';
```

---

## 5. Depth Issues (Too Deep vs Too Flat)

### Too Flat: Frontend `components/` Root

**30 files** sit directly in `components/` with no subdirectory grouping:

```
components/
├── ActionButtons.tsx        # UI primitive
├── AnimatedCounter.tsx      # UI primitive
├── AnimatedProgressBar.tsx  # UI primitive
├── BatchMovementForm.tsx    # WRONG: belongs in movements/
├── Button.tsx               # UI primitive
├── Card.tsx                 # UI primitive
├── CollapsibleSection.tsx   # UI primitive
├── ColorPickerModal.tsx     # UI primitive
├── ColorSelector.tsx        # UI primitive
├── ConfirmDialog.tsx        # Feedback
├── CurrencyAmount.tsx       # Display
├── EmptyState.tsx           # UI primitive
├── ErrorBoundary.tsx        # Layout/error handling
├── FloatingPanel.tsx        # UI primitive
├── Input.tsx                # UI primitive
├── Layout.tsx               # WRONG: belongs in layout/
├── Modal.tsx                # UI primitive
├── PageHeader.tsx           # UI primitive
├── ProgressBar.tsx          # UI primitive
├── ProtectedRoute.tsx       # WRONG: belongs in layout/ or auth/
├── Select.tsx               # UI primitive
├── SelectableValue.tsx      # UI primitive
├── Skeleton.tsx             # UI primitive
├── SortableItem.tsx         # UI primitive
├── SortableList.tsx         # UI primitive
├── ThemeProvider.tsx        # WRONG: belongs in layout/ or contexts/
├── Toast.tsx                # Feedback
├── ToastContainer.tsx       # Feedback
├── Modal.test.tsx           # Test
└── ThemeProvider.test.tsx   # Test
```

These should be grouped into a `components/ui/` or `components/common/` directory.

### Too Flat: Frontend `hooks/` Root

**23 files** at the hooks root level. The `queries/` subdirectory exists but other hooks aren't grouped:

```
hooks/
├── queries/              # Good: 17 query hooks grouped
├── useAccountActions.ts  # Could be in hooks/actions/
├── useBudgetActions.ts   # Could be in hooks/actions/
├── useFixedExpenseActions.ts
├── useMovementSubmit.ts
├── useMovementRowActions.ts
├── useMovementBulkActions.ts
├── usePocketActions.ts
├── useReminderActions.ts
├── useSettingsActions.ts
├── useBalanceDeltas.ts   # Could be in hooks/computed/
├── useConsolidatedTotal.ts
├── useNetWorthChartData.ts
├── useInvestmentPrices.ts
├── useMovementsFilter.ts
├── useMovementsSort.ts
├── useBulkSelection.ts
├── useMovementFormState.ts
├── useOrphanedRestore.ts
├── useBudgetPersistence.ts
├── useAutoNetWorthSnapshot.ts
├── useConfirm.ts
├── useToast.ts
└── useURLActions.ts
```

### Acceptable Depth: Backend Module Structure

```
modules/accounts/application/useCases/CreateAccountUseCase.ts
```

4 levels deep is standard for clean architecture. Not a problem.

---

## 6. Logical Grouping Issues

### Backend: Two Incompatible Module Architectures

**Modules using UseCase pattern** (accounts, pockets, sub-pockets, movements, settings):
```
module/
├── domain/           # Entities + domain services
├── infrastructure/   # Repository interfaces + implementations
├── application/
│   ├── useCases/    # Individual use case classes
│   ├── mappers/     # DTO mappers
│   └── dtos/        # Data transfer objects
└── presentation/    # Controllers + routes
```

**Modules using Service pattern** (net-worth, reminders):
```
module/
├── domain/           # Entities
├── interfaces/       # Repository interfaces + controllers (MIXED!)
├── infrastructure/   # Repository implementations only
├── application/      # Single service class + dtos
└── presentation/     # Routes only
```

The `interfaces/` directory in net-worth and reminders **mixes two concerns**: repository interfaces (infrastructure concern) and controllers (presentation concern). This is architecturally confused.

### Frontend: `selectors/` Directory is Orphaned

`components/selectors/` contains only 2 files (`AccountPocketSelector.tsx`, `MovementTypeSelect.tsx`). These are form-related components that could live in:
- `components/ui/` (as generic form selectors)
- `components/movements/` (since they're primarily used in movement forms)

### Frontend: `calendar/` Directory Has Only 1 Component + Test

`components/calendar/` contains just `FinancialCalendarWidget.tsx` and its test. A single-file directory is over-organized. It could live in `components/summary/` since it's a widget shown on the summary page.

---

## 7. Duplicate Functionality

### `idGenerator` — Duplicated Across Frontend and Backend

| Location | Implementation |
|----------|---------------|
| `frontend/src/utils/idGenerator.ts` | `crypto.randomUUID()` with browser fallback |
| `backend/src/shared/utils/idGenerator.ts` | `crypto.randomUUID()` (Node.js) |

Both do the same thing. Could live in the (currently dead) `shared/` package.

### `AppError` — Duplicated Across Frontend and Backend

| Location | Purpose |
|----------|---------|
| `frontend/src/utils/AppError.ts` | Error class with statusCode |
| `backend/src/shared/errors/AppError.ts` | Error class with statusCode + subclasses |

Different implementations for different contexts (browser vs server), so this duplication is **acceptable** — but the frontend version should not be in `utils/`.

### `formatCurrency` vs `CurrencyAmount`

| Location | Purpose |
|----------|---------|
| `utils/formatCurrency.ts` | Pure function returning formatted string |
| `components/CurrencyAmount.tsx` | React component using `Intl.NumberFormat` |

These are **not duplicates** — the component uses `Intl.NumberFormat` (more correct) while the utility uses manual formatting. However, both are imported across the codebase (20 files reference `formatCurrency`). The utility should probably be deprecated in favor of the component's exported `formatCurrencyAmount` helper.

### Type Definitions — Triplicated

| Location | Status |
|----------|--------|
| `shared/types/index.ts` | Dead, outdated (missing InvestmentType, CD types) |
| `frontend/src/types/index.ts` | Active, most complete (200 lines) |
| `backend/src/shared/types/index.ts` | Active, minimal (Currency, PocketType, MovementType only) |

The frontend types are the source of truth. The shared package is stale. The backend only uses `Currency` from its own copy.

---

## 8. Test File Organization

### Frontend: Mixed Strategy (Inconsistent)

| Pattern | Files | Location |
|---------|-------|----------|
| Co-located with source | 8 files | `services/*.test.ts`, `utils/*.test.ts`, `store/*.test.ts`, `components/Modal.test.tsx`, `components/ThemeProvider.test.tsx`, `components/calendar/FinancialCalendarWidget.test.tsx` |
| Separate test directory | 3 files | `test/integration.test.ts`, `test/mockData.ts`, `test/testUtils.tsx` |

**13 total test files** for 200 source files = **6.5% test coverage by file count**. Very low.

The co-located pattern is fine, but the `test/` directory creates ambiguity about where new tests should go.

### Backend: Consistent Co-location (Good)

**68 test files** for 206 source files = **33% test coverage by file count**. Much better.

All tests are co-located with their source files:
- `Account.test.ts` next to `Account.ts`
- `CreateAccountUseCase.property.test.ts` next to `CreateAccountUseCase.ts`
- `AccountController.integration.test.ts` next to `AccountController.ts`

Test naming convention is consistent:
- `*.test.ts` — unit tests
- `*.property.test.ts` — property-based tests
- `*.integration.test.ts` — integration tests

Two `test-setup.ts` files exist in `accounts/presentation/` and `pockets/presentation/` for shared integration test setup. These could be in a shared test utilities location.

---

## 9. Recommended Directory Structure

### Frontend — Proposed

```
frontend/src/
├── app/                          # App shell
│   ├── App.tsx
│   ├── main.tsx
│   └── routes.tsx                # (extract from App.tsx)
├── components/
│   ├── ui/                       # Generic UI primitives (NEW)
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Select.tsx
│   │   ├── Modal.tsx
│   │   ├── Skeleton.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── AnimatedCounter.tsx
│   │   ├── AnimatedProgressBar.tsx
│   │   ├── CollapsibleSection.tsx
│   │   ├── EmptyState.tsx
│   │   ├── FloatingPanel.tsx
│   │   ├── PageHeader.tsx
│   │   ├── SelectableValue.tsx
│   │   ├── SortableItem.tsx
│   │   ├── SortableList.tsx
│   │   ├── ColorSelector.tsx
│   │   ├── ColorPickerModal.tsx
│   │   ├── ActionButtons.tsx
│   │   ├── CurrencyAmount.tsx
│   │   └── index.ts
│   ├── feedback/                 # Toast, Confirm, Error (NEW)
│   │   ├── Toast.tsx
│   │   ├── ToastContainer.tsx
│   │   ├── ConfirmDialog.tsx
│   │   ├── ErrorBoundary.tsx
│   │   └── index.ts
│   ├── layout/                   # App shell components
│   │   ├── Layout.tsx            # MOVED from root
│   │   ├── ProtectedRoute.tsx    # MOVED from root
│   │   ├── ThemeProvider.tsx     # MOVED from root
│   │   ├── BottomNav.tsx
│   │   ├── Sidebar.tsx
│   │   ├── QuickActionsFAB.tsx
│   │   └── index.ts
│   ├── accounts/                 # (unchanged)
│   ├── budget/                   # (unchanged)
│   ├── fixed-expenses/           # (unchanged)
│   ├── movements/
│   │   ├── BatchMovementForm.tsx # MOVED from root
│   │   ├── ... (existing)
│   │   └── index.ts
│   ├── net-worth/                # (unchanged)
│   ├── reminders/                # (unchanged)
│   ├── selectors/                # MERGE into ui/ or keep
│   ├── settings/                 # (unchanged)
│   └── summary/
│       ├── FinancialCalendarWidget.tsx  # MOVED from calendar/
│       ├── ... (existing)
│       └── index.ts
├── hooks/
│   ├── queries/                  # (unchanged, has index.ts)
│   ├── actions/                  # NEW grouping
│   │   ├── useAccountActions.ts
│   │   ├── useBudgetActions.ts
│   │   ├── useFixedExpenseActions.ts
│   │   ├── useMovementSubmit.ts
│   │   ├── useMovementRowActions.ts
│   │   ├── useMovementBulkActions.ts
│   │   ├── usePocketActions.ts
│   │   ├── useReminderActions.ts
│   │   └── useSettingsActions.ts
│   ├── useToast.ts               # Standalone utility hooks
│   ├── useConfirm.ts
│   ├── useBulkSelection.ts
│   ├── useURLActions.ts
│   └── index.ts                  # NEW
├── contexts/                     # (unchanged, add index.ts)
├── constants/                    # (unchanged)
│   ├── currencies.ts
│   ├── movementTypes.ts          # MOVED from utils/
│   ├── smartIcons.ts             # MOVED from utils/
│   └── index.ts
├── lib/                          # Infrastructure/config
│   ├── queryClient.ts
│   ├── supabase.ts
│   └── index.ts                  # NEW
├── errors/                       # NEW
│   └── AppError.ts               # MOVED from utils/
├── pages/                        # (unchanged, add index.ts)
├── services/                     # (unchanged, add index.ts)
├── store/                        # (unchanged)
├── types/                        # (unchanged)
├── utils/                        # Only pure utility functions remain
│   ├── dateUtils.ts
│   ├── formatCurrency.ts
│   ├── fixedExpenseUtils.ts
│   ├── reminderProjections.ts
│   └── idGenerator.ts
└── test/                         # (unchanged)
```

### Backend — Proposed Changes

1. **Standardize all modules to the UseCase pattern**:
   - `net-worth/interfaces/` → split into `infrastructure/` (for `INetWorthSnapshotRepository`) and `presentation/` (for controller)
   - `reminders/interfaces/` → same split
   - Convert `ReminderService` and `NetWorthSnapshotService` into individual use cases for consistency

2. **Add barrel exports** to all `useCases/`, `presentation/`, `domain/`, and `infrastructure/` directories.

3. **Consolidate test-setup files** into `shared/test/` or a top-level `test-utils/` directory.

---

## Summary of Action Items

| Priority | Issue | Effort |
|----------|-------|--------|
| **High** | Standardize backend net-worth and reminders modules to match other modules | Medium |
| **High** | Create `components/ui/` and move 20+ UI primitives out of components root | Low |
| **High** | Move `Layout.tsx`, `ThemeProvider.tsx`, `ProtectedRoute.tsx` to `components/layout/` | Low |
| **Medium** | Add barrel exports to all top-level frontend directories | Low |
| **Medium** | Move `BatchMovementForm.tsx` to `components/movements/` | Low |
| **Medium** | Move `movementTypes.ts` and `smartIcons.ts` from `utils/` to `constants/` | Low |
| **Medium** | Move `AppError.ts` from `utils/` to new `errors/` directory | Low |
| **Medium** | Delete dead `shared/` workspace or wire it up properly | Low |
| **Medium** | Delete `assets/react.svg` and `App.css` | Trivial |
| **Low** | Add barrel exports to backend module directories | Low |
| **Low** | Group frontend hooks into `actions/` subdirectory | Low |
| **Low** | Merge `calendar/` into `summary/` (single-file directory) | Trivial |
| **Low** | Consolidate backend `test-setup.ts` files | Low |
| **Low** | Deprecate `utils/formatCurrency.ts` in favor of `CurrencyAmount` exports | Medium |
