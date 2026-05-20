# Refactoring Completeness Audit

**Date**: 2026-05-20  
**Scope**: `frontend/src/` production code (excluding tests and node_modules)

## Summary

| # | Claim | Verdict | Details |
|---|-------|---------|---------|
| 1 | Zero direct Supabase in services (except auth) | **PASS (with note)** | Only `apiClient.ts` imports supabase — for JWT token extraction, not direct DB access |
| 2 | Zero console.log/error/warn | **PASS** | None found |
| 3 | Zero `any` types | **PASS** | None found |
| 4 | Zero eslint-disable comments | **PASS** | None found |
| 5 | All pages under 300 lines | **FAIL** | 2 pages exceed 300 lines |
| 6 | Storage service files deleted | **PASS** | Neither file exists |
| 7 | No alert()/confirm() calls | **PASS** | All confirm() calls use custom `useConfirm` hook |
| 8 | Error boundaries exist and wrap routes | **PASS** | Component exists and wraps all routes |
| 9 | dateUtils.ts exists and is used | **PARTIAL** | File exists but raw `new Date(...)` calls remain |
| 10 | React.memo on list components | **PASS** | All 10 components use memo() |

**Overall: 7 PASS, 1 PARTIAL, 1 FAIL, 1 PASS-with-note**

---

## Detailed Findings

### 1. Direct Supabase Access in Services

**Verdict: PASS (with note)**

Only one file imports supabase:

```
frontend/src/services/apiClient.ts:10: import { supabase } from '../lib/supabase';
```

This is the **centralized API client** that extracts the JWT token from the Supabase auth session to attach to backend requests. It does NOT call `supabase.from()` or `supabase.rpc()` — no direct database access. This is an acceptable architectural pattern (auth token extraction via the supabase client).

No other service file imports supabase directly.

---

### 2. Console Statements

**Verdict: PASS**

Zero `console.log`, `console.error`, `console.warn`, `console.info`, or `console.debug` calls found in production code.

---

### 3. `any` Types

**Verdict: PASS**

Zero occurrences of `: any`, `as any`, or `<any>` found in production code.

---

### 4. eslint-disable Comments

**Verdict: PASS**

Zero `eslint-disable` comments found.

---

### 5. Pages Under 300 Lines

**Verdict: FAIL — 2 violations**

| File | Lines | Over by |
|------|-------|---------|
| `FixedExpensesPage.tsx` | 316 | 16 lines |
| `AccountsPage.tsx` | 317 | 17 lines |

Other pages are within limits:
- `TemplatesPage.tsx`: 300 (exactly at limit)
- `MovementsPage.tsx`: 292
- `BudgetPlanningPage.tsx`: 219
- `SummaryPage.tsx`: 213
- `SignUpPage.tsx`: 149
- `LoginPage.tsx`: 95
- `SettingsPage.tsx`: 69

---

### 6. Storage Service Files Deleted

**Verdict: PASS**

Neither `supabaseStorageService.ts` nor `storageService.ts` exist anywhere under `frontend/src/`.

---

### 7. alert()/confirm() Calls

**Verdict: PASS**

All `confirm()` calls found are invocations of the custom `useConfirm` hook (not native `window.confirm`). Verified by checking imports:

- `TemplatesPage.tsx` — imports `useConfirm` from `'../hooks/useConfirm'`
- `usePocketActions.ts` — receives `confirm` as typed parameter from `useConfirm`
- `useBudgetActions.ts` — same pattern
- `useMovementRowActions.ts` — same pattern

The one `migration.confirm()` in `PocketManagementSection.tsx` is a method on a migration state object (UI confirmation step), not `window.confirm`.

No `alert()` or `window.confirm` calls found.

---

### 8. Error Boundaries

**Verdict: PASS**

- `frontend/src/components/ErrorBoundary.tsx` — exists
- `frontend/src/App.tsx` — imports and uses it:
  ```tsx
  import ErrorBoundary from './components/ErrorBoundary';
  const guard = (node: ReactNode) => <ErrorBoundary>{node}</ErrorBoundary>;
  ```
  All routes are wrapped via the `guard()` helper.

---

### 9. dateUtils.ts Usage

**Verdict: PARTIAL — raw Date calls remain**

`frontend/src/utils/dateUtils.ts` exists. However, several files still use raw `new Date(...)` with arguments instead of dateUtils:

| File | Line | Code |
|------|------|------|
| `utils/reminderProjections.ts` | 266 | `new Date(dueDate)` |
| `components/net-worth/NetWorthTimelineWidget.tsx` | 171 | `new Date(0)` — epoch sentinel, arguably acceptable |
| `hooks/useMovementsFilter.ts` | 30-34 | `new Date(now.getTime() - N * 24 * 60 * 60 * 1000)` (5 occurrences) |

**Notes**:
- `MovementForm.tsx:154` and `useMovementSubmit.ts:76` are **comments** explaining why they avoid `new Date(string)`, not actual calls.
- `useMovementsFilter.ts` uses arithmetic on `Date.getTime()` for relative date ranges — these are safe (no string parsing) but could be cleaner with a utility.
- `reminderProjections.ts:266` passes a variable `dueDate` to `new Date()` — this is a string-to-Date parse that should use dateUtils for timezone safety.

---

### 10. React.memo on List Components

**Verdict: PASS — all 10 components wrapped**

| Component | Status |
|-----------|--------|
| ReminderCard | PASS |
| MonthSection | PASS |
| AccountCard | PASS |
| PocketCard | PASS |
| CDAccountCard | PASS |
| BudgetEntryRow | PASS |
| AccountSummaryCard | PASS |
| InvestmentCard | PASS |
| CDSummaryCard | PASS |
| FixedExpenseGroupCard | PASS |

---

## Recommended Follow-ups

1. **FixedExpensesPage.tsx (316 lines)** and **AccountsPage.tsx (317 lines)** — extract ~20 lines each into sub-components or hooks to get under 300.
2. **reminderProjections.ts:266** — replace `new Date(dueDate)` with a dateUtils parse function.
3. **useMovementsFilter.ts** — consider a `subtractDays(date, n)` utility from dateUtils for the 5 relative-date calculations (low priority since these are arithmetic, not string parsing).
