# Task: Fix SummaryPage Race Conditions and Incorrect Total Calculation

## Description
The SummaryPage has race conditions in its async currency conversion that produce incorrect consolidated totals. Multiple useEffects with stale closures, missing cancellation, and sequential investment price fetching cause the total to flicker and display wrong values.

## Background
Issues identified:
1. `getTotalByCurrency` captures stale `investmentData` from closure. The async conversion can resolve out of order with no cancellation.
2. `getAccountBalance` for investment accounts reads from `investmentData` state that may not be loaded yet, falling back to `account.balance || 0`.
3. Investment price loading useEffect has no cleanup — rapid state changes spawn multiple concurrent async functions that all call `setInvestmentData`, with the last to finish winning (not necessarily the most recent).
4. `accountsByCurrency` and `sortedCurrencies` are not memoized — recalculated every render.
5. `error` variable is hardcoded to `null` — TanStack Query errors are never displayed.
6. Console.logs leak financial data to browser console in production.
7. Investment prices are fetched sequentially (one per account).

## Technical Requirements
1. Add ignore flag / AbortController pattern to all async useEffects
2. Make consolidated total calculation depend explicitly on `investmentData` being fully loaded (show loading state until ready)
3. Memoize `accountsByCurrency`, `sortedCurrencies`, and `getAccountBalance`
4. Fetch investment prices in parallel with `Promise.all()`
5. Extract `isError`/`error` from TanStack Query hooks and display error states
6. Remove all console.log statements
7. Show skeleton/loading state for the total until all data (including exchange rates) is ready

## Dependencies
- `frontend/src/pages/SummaryPage.tsx`
- `frontend/src/services/investmentService.ts`
- `frontend/src/services/currencyService.ts`

## Implementation Approach
1. Add `let ignore = false` pattern to investment loading useEffect with cleanup `return () => { ignore = true }`
2. Replace sequential investment price fetching with `Promise.all(investmentAccounts.map(...))`
3. Wrap `accountsByCurrency` in `useMemo(() => ..., [accounts])`
4. Wrap `sortedCurrencies` in `useMemo(() => ..., [accountsByCurrency])`
5. Add a `isDataReady` flag that checks all queries are loaded before calculating total
6. Replace hardcoded `error = null` with actual query error states
7. Remove all console.log/console.error statements

## Acceptance Criteria

1. **Correct Total After All Data Loads**
   - Given accounts in USD and MXN with investment accounts
   - When all prices and exchange rates are loaded
   - Then the consolidated total is correct and stable (no flickering)

2. **No Race Conditions**
   - Given rapid navigation away and back to the summary page
   - When investment prices are loading
   - Then stale results from previous loads are discarded (ignore flag)

3. **Loading State Shown**
   - Given the page is loading investment prices
   - When the total would be inaccurate
   - Then a skeleton/spinner is shown instead of "$0.00"

4. **Parallel Price Fetching**
   - Given 5 investment accounts
   - When prices are fetched
   - Then all 5 requests fire in parallel (not sequential)

5. **Error States Displayed**
   - Given a query failure (network error)
   - When the page renders
   - Then an error message is shown instead of empty data

## Metadata
- **Complexity**: Medium
- **Labels**: Critical Bug, Performance, Pages, Race Condition
- **Required Skills**: React useEffect cleanup, async patterns, useMemo, TanStack Query
