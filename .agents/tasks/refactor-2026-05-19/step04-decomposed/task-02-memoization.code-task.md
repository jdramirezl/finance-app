# Task: Add React.memo and useMemo/useCallback Throughout

## Description
Zero list item components use React.memo. No expensive computations are memoized. Every parent re-render causes all children to re-render. Fix systematically.

## Technical Requirements

### Add React.memo to all list item components
These components render in lists and should skip re-renders when props haven't changed:
- `components/reminders/ReminderCard.tsx`
- `components/reminders/MonthSection.tsx`
- `components/movements/MovementList.tsx` (the individual movement row rendering)
- `components/accounts/AccountCard.tsx`
- `components/accounts/PocketCard.tsx`
- `components/accounts/CDAccountCard.tsx`
- `components/budget/BudgetEntryRow.tsx`
- `components/summary/AccountSummaryCard.tsx`
- `components/summary/InvestmentCard.tsx`
- `components/summary/CDSummaryCard.tsx`
- `components/FixedExpenseGroupCard.tsx`

### Add useMemo for expensive derived data
Find all places where arrays are filtered/mapped/reduced on every render without memoization. Key locations:
- Any `.filter()`, `.reduce()`, `.map()` on movements, accounts, pockets that produces derived data
- Any `Object.keys()`, `Object.entries()` on grouped data
- Currency conversion results

### Add useCallback for handlers passed to memoized children
When a parent passes `onClick={() => doSomething(id)}` to a memoized child, the child still re-renders because the function reference changes. Use `useCallback` for these.

### Debounce expensive operations
- BudgetPlanningPage localStorage writes: debounce 500ms
- Any search/filter inputs that trigger re-computation: debounce 300ms

## Acceptance Criteria
1. All list item components wrapped in React.memo
2. All expensive derived computations wrapped in useMemo
3. Handlers passed to memoized children use useCallback
4. localStorage writes are debounced
5. Frontend builds clean
6. No unnecessary re-renders when typing in inputs (verify with React DevTools Profiler description in comments)
