# Task: Performance Optimization and UX Improvements

## Description
The app has systemic performance issues (no React.memo anywhere, no memoization, inline closures in render, no virtualization for large lists) and UX gaps (no error boundaries, no optimistic updates, hidden actions inaccessible to keyboard users, inconsistent date handling causing off-by-one bugs).

## Background
Performance issues:
- Zero `React.memo` on any list item component (ReminderCard, MonthSection, BudgetEntryRow, movement rows)
- Inline arrow functions in event handlers throughout (`onClick={() => onEdit(reminder)}`)
- `BatchMovementForm` re-renders ALL rows on every keystroke
- No virtualization for movement lists (hundreds of DOM nodes)
- `BudgetPlanningPage` writes to localStorage on every keystroke (no debounce)
- `SummaryPage` recalculates `accountsByCurrency` and `sortedCurrencies` every render
- `FixedExpensesPage` `calculateTotalFijosMes` not memoized
- `MarkAsPaidModal` fetches ALL movements just to show ±15 days

UX issues:
- No React Error Boundaries — any render crash = white screen
- No optimistic updates — every mutation waits for server response
- Action buttons hidden behind hover (invisible to keyboard/touch users)
- `confirm()` and `alert()` used for destructive actions (blocks UI)
- Inconsistent date handling — mix of ISO strings and date-only strings causes off-by-one bugs in negative UTC offsets
- No loading states for the consolidated total (shows $0.00 then jumps)
- Triple-click force refresh is completely undiscoverable

## Technical Requirements
1. Add `React.memo` to all list item components with appropriate comparison
2. Use `useCallback` for handlers passed to memoized children
3. Add virtualization (`@tanstack/react-virtual`) to MovementList for large datasets
4. Debounce localStorage writes in BudgetPlanningPage (500ms)
5. Memoize all derived calculations (`useMemo`)
6. Add Error Boundaries around each route with fallback UI
7. Implement optimistic updates for common mutations (reorder, toggle, delete)
8. Make action buttons always visible (not hover-only) or at minimum focusable
9. Replace all `confirm()`/`alert()` with the existing `useConfirm` hook and toast system
10. Standardize date handling: use `parseISO` from date-fns, never `new Date(dateString)` for date-only strings
11. Add `aria-label` to all icon-only buttons
12. Add keyboard navigation for action buttons

## Dependencies
- All component files in `frontend/src/components/`
- All page files in `frontend/src/pages/`
- `frontend/src/hooks/useConfirm.ts`
- `frontend/src/App.tsx` (error boundaries)

## Implementation Approach
1. Create a shared `ErrorBoundary` component with retry capability
2. Add Error Boundaries in App.tsx around each route
3. Add `React.memo` to all list item components (start with most-rendered ones)
4. Standardize date handling with a `utils/dateUtils.ts` module
5. Replace `confirm()`/`alert()` with `useConfirm` hook
6. Add `aria-label` props to all icon buttons
7. Make hover-only buttons always visible (use subtler styling instead of hidden)
8. Add debounce to localStorage writes
9. Add optimistic updates to reorder and toggle mutations
10. Add virtualization to MovementList

## Acceptance Criteria

1. **No Unnecessary Re-renders**
   - Given a list of 50 movements
   - When typing in a search/filter input
   - Then only the filter component re-renders (not all 50 movement rows)

2. **Error Recovery**
   - Given a component that throws during render
   - When the error boundary catches it
   - Then a fallback UI is shown with a "Try Again" button (not a white screen)

3. **Accessible Actions**
   - Given any action button (edit, delete, toggle)
   - When navigating with keyboard (Tab)
   - Then the button is focusable and has an aria-label

4. **No Off-By-One Date Bugs**
   - Given a movement dated "2025-03-15" viewed in UTC-6 timezone
   - When displaying the date
   - Then it shows March 15 (not March 14)

5. **Debounced Persistence**
   - Given the budget planning page
   - When typing rapidly in the amount field
   - Then localStorage is written at most once per 500ms

6. **Optimistic Reorder**
   - Given a drag-and-drop reorder
   - When the user drops an item
   - Then the new order is shown immediately (before server confirms)

## Metadata
- **Complexity**: Medium
- **Labels**: Performance, UX, Accessibility, Components
- **Required Skills**: React.memo, useMemo, useCallback, react-virtual, Error Boundaries, ARIA
