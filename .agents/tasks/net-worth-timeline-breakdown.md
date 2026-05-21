# Net Worth Timeline — Task Breakdown

## Execution Windows

| Window | Tasks | Can Parallel? |
|--------|-------|---------------|
| 1 | Task 1: Snapshot race condition + readiness gate | No (must land first) |
| 2 | Task 2: Per-currency native graphs | Yes (independent of Task 1 at runtime, but Task 1 should merge first to avoid conflicts in shared files) |

---

## Task Details

### Task 1: Wire auto-snapshot to useConsolidatedTotal (fixes race condition + readiness gate)

- **Files touched**:
  1. `frontend/src/hooks/useAutoNetWorthSnapshot.ts` (rewrite)
  2. `frontend/src/pages/SummaryPage.tsx` (pass consolidated data to hook)

- **What to do**:

  **Step 1: Rewrite `useAutoNetWorthSnapshot.ts`**

  Replace the entire hook. The new version accepts the consolidated total as input instead of computing its own. It no longer calls `currencyService` at all.

  ```typescript
  /**
   * useAutoNetWorthSnapshot Hook
   *
   * Automatically takes a net worth snapshot on app load if:
   * 1. User has not set frequency to 'manual'
   * 2. Enough time has passed since the last snapshot
   * 3. The consolidated total is ready (all currency conversions settled)
   */

  import { useEffect, useRef } from 'react';
  import { useSettingsQuery } from './queries';
  import { useLatestSnapshotQuery, useNetWorthSnapshotMutations } from './queries/useNetWorthSnapshotQueries';
  import { parseDate } from '../utils/dateUtils';
  import type { Currency } from '../types';

  export interface UseAutoNetWorthSnapshotParams {
    consolidatedTotal: number;
    totalsByCurrency: Record<Currency, number>;
    isConsolidatedReady: boolean;
  }

  export const useAutoNetWorthSnapshot = ({
    consolidatedTotal,
    totalsByCurrency,
    isConsolidatedReady,
  }: UseAutoNetWorthSnapshotParams) => {
    const { data: settings } = useSettingsQuery();
    const { data: latestSnapshot, isLoading: loadingSnapshot } = useLatestSnapshotQuery();
    const { createMutation } = useNetWorthSnapshotMutations();
    const hasRun = useRef(false);

    useEffect(() => {
      if (hasRun.current) return;
      if (loadingSnapshot) return;
      if (!settings) return;
      if (!isConsolidatedReady) return;

      const frequency = settings.snapshotFrequency || 'weekly';
      if (frequency === 'manual') return;

      const shouldTakeSnapshot = (): boolean => {
        if (!latestSnapshot) return true;

        const lastDate = parseDate(latestSnapshot.snapshotDate);
        const now = new Date();
        const daysDiff = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

        switch (frequency) {
          case 'daily':
            return daysDiff >= 1;
          case 'weekly':
            return daysDiff >= 7;
          case 'monthly':
            return daysDiff >= 30;
          default:
            return false;
        }
      };

      if (shouldTakeSnapshot()) {
        const primaryCurrency = (settings.primaryCurrency || 'USD') as Currency;

        // Build breakdown from totalsByCurrency (native amounts per currency)
        const breakdown: Record<string, number> = {};
        for (const [currency, total] of Object.entries(totalsByCurrency)) {
          if (total !== 0) {
            breakdown[currency] = total;
          }
        }

        createMutation.mutate(
          {
            totalNetWorth: consolidatedTotal,
            baseCurrency: primaryCurrency,
            breakdown,
          },
          {
            onSuccess: () => {
              hasRun.current = true;
            },
            // On failure, hasRun stays false so the effect retries on next cycle
          }
        );
      }
    }, [
      settings,
      latestSnapshot,
      loadingSnapshot,
      isConsolidatedReady,
      consolidatedTotal,
      totalsByCurrency,
      createMutation,
    ]);
  };
  ```

  Key changes from original:
  - Removed `useAccountsQuery` — no longer fetches accounts independently
  - Removed all `currencyService` usage — no independent conversion
  - Accepts `consolidatedTotal`, `totalsByCurrency`, `isConsolidatedReady` as params
  - Gates on `isConsolidatedReady` before attempting snapshot
  - Sets `hasRun.current = true` only inside `onSuccess` callback, not before the mutation fires
  - Uses `totalsByCurrency` directly for the breakdown (these are already native amounts)

  **Step 2: Update `SummaryPage.tsx`**

  Change the `useAutoNetWorthSnapshot()` call to pass the consolidated data:

  Replace:
  ```typescript
  // Auto-snapshot on load
  useAutoNetWorthSnapshot();
  ```

  With:
  ```typescript
  // Auto-snapshot on load — gated on consolidated total readiness
  useAutoNetWorthSnapshot({
    consolidatedTotal,
    totalsByCurrency,
    isConsolidatedReady,
  });
  ```

  The hook call must remain AFTER the `useConsolidatedTotal` destructuring (which it already is positionally — `useConsolidatedTotal` is called at line ~89, and `useAutoNetWorthSnapshot` was at line ~72). Move the `useAutoNetWorthSnapshot` call to AFTER the `useConsolidatedTotal` call:

  ```typescript
  // Per-currency totals + consolidated total
  const {
    accountsByCurrency,
    sortedCurrencies,
    totalsByCurrency,
    consolidatedTotal,
    isConsolidatedReady,
  } = useConsolidatedTotal({ accounts, primaryCurrency, investmentData });

  // Auto-snapshot on load — gated on consolidated total readiness
  useAutoNetWorthSnapshot({
    consolidatedTotal,
    totalsByCurrency,
    isConsolidatedReady,
  });
  ```

  Remove the old `useAutoNetWorthSnapshot()` call from its current position (line 72, before `useConsolidatedTotal`).

- **Acceptance criteria**:
  1. `useAutoNetWorthSnapshot` no longer imports or calls `currencyService`
  2. `useAutoNetWorthSnapshot` accepts `{ consolidatedTotal, totalsByCurrency, isConsolidatedReady }` as its only parameter
  3. The snapshot is NOT attempted until `isConsolidatedReady === true`
  4. `hasRun.current` is only set to `true` inside the mutation's `onSuccess` callback
  5. The saved `totalNetWorth` is exactly the value from `useConsolidatedTotal` (same number the user sees on screen)
  6. The saved `breakdown` uses native currency amounts from `totalsByCurrency`
  7. If the mutation fails, the hook will retry on the next effect cycle (since `hasRun` stays false)
  8. No TypeScript errors; `npm run build` passes

- **Dependencies**: none

---

### Task 2: Per-currency native graphs in breakdown mode

- **Files touched**:
  1. `frontend/src/hooks/useNetWorthChartData.ts` (change breakdown data computation)
  2. `frontend/src/components/net-worth/NetWorthChart.tsx` (add dual Y-axis for native mode)
  3. `frontend/src/components/net-worth/NetWorthTimelineWidget.tsx` (default variation=true when breakdown selected)

- **What to do**:

  **Step 1: Fix breakdown mode in `useNetWorthChartData.ts`**

  In the `chartData` useMemo, find the breakdown data population block (around line ~170):

  Replace:
  ```typescript
  if (snapshot.breakdown) {
      Object.entries(snapshot.breakdown).forEach(([currency, value]) => {
          const rate = rates[currency] || 1;
          data[currency] =
              currency === primaryCurrency ? value : value * rate;
      });
  }
  ```

  With:
  ```typescript
  if (snapshot.breakdown) {
      Object.entries(snapshot.breakdown).forEach(([currency, value]) => {
          data[currency] = value; // Native amount — no conversion
      });
  }
  ```

  This single change makes breakdown mode show native currency values. The variation (%) calculation already works correctly with native values since it computes percentage change from baseline.

  **Step 2: Remove the rates dependency from breakdown mode**

  The `rates` state and the `useEffect` that fetches exchange rates are now only needed for the `total` line computation in breakdown+variation mode (where `total_original` needs the converted value). However, looking at the code more carefully: in breakdown mode, the `total` field on each datum is `snapshot.totalNetWorth` (already converted and stored). The rates were ONLY used to convert breakdown values. So the rates fetch can be removed entirely — it's dead code after Step 1.

  Remove the `hasForeignCurrency` early-return guard since breakdown no longer needs rates:

  Replace:
  ```typescript
  const hasForeignCurrency = currencies.some((c) => c !== primaryCurrency);
  if (hasForeignCurrency && Object.keys(rates).length === 0) return [];
  ```

  With:
  ```typescript
  // No rate-gating needed — breakdown uses native values directly
  ```

  Remove the `rates` state, the `useEffect` that fetches rates, and `rates` from the `chartData` useMemo dependency array. Also remove the `currencyService` import and the `getExchangeRate`/`getExchangeRateAsync` usage.

  The full cleanup:
  - Delete `const [rates, setRates] = useState<Record<string, number>>({});`
  - Delete the entire `useEffect` block that calls `fetchRates`
  - Remove `rates` from the `chartData` useMemo dependency array
  - Remove `import { currencyService } from '../services/currencyService';`
  - Remove `import type { Currency } from '../types';` (if no other usage remains — check first)

  **Step 3: Update tooltip formatter for breakdown mode**

  The tooltip in non-variation breakdown mode currently shows values formatted as the primary currency. Since values are now native, the tooltip should show the currency symbol matching the line name.

  In the `tooltipFormatter` useMemo, update the non-variation branch:

  Replace:
  ```typescript
  return [
      formatCurrencyAmount(
          numValue,
          primaryCurrency,
          CHART_CURRENCY_FORMAT_OPTIONS,
      ),
      displayName,
  ];
  ```

  With:
  ```typescript
  // In breakdown mode, displayName is the currency code (e.g. "MXN")
  // Use it for formatting if it's a valid currency, otherwise fall back to primaryCurrency
  const formatCurrency = currencies.includes(displayName) ? displayName : primaryCurrency;
  return [
      formatCurrencyAmount(
          numValue,
          formatCurrency,
          CHART_CURRENCY_FORMAT_OPTIONS,
      ),
      displayName,
  ];
  ```

  The `tooltipFormatter` useMemo needs `currencies` in its closure. Add `currencies` to its dependency array:
  ```typescript
  }, [showVariation, primaryCurrency, currencies]);
  ```

  **Step 4: Default to variation mode when switching to breakdown**

  In `NetWorthTimelineWidget.tsx`, auto-enable variation when the user selects breakdown mode (since native values have wildly different scales — e.g. 100,000 MXN vs 4,000 USD):

  Replace the breakdown button's onClick:
  ```typescript
  onClick={() => setViewMode('breakdown')}
  ```

  With:
  ```typescript
  onClick={() => {
      setViewMode('breakdown');
      setShowVariation(true);
  }}
  ```

  This ensures the user sees percentage-based Y-axis by default in breakdown mode, which normalizes the scale across currencies. They can still uncheck the variation toggle to see absolute native values.

  **Step 5: Fix YAxis in NetWorthChart for native breakdown without variation**

  When breakdown mode is active and variation is OFF, the Y-axis formatter should not assume a single currency. Since each line is a different currency with different scales, the Y-axis should show plain numbers (no currency symbol):

  In `NetWorthChart.tsx`, update the YAxis `tickFormatter`:

  Replace:
  ```typescript
  tickFormatter={(value) =>
      showVariation
          ? `${value.toFixed(0)}%`
          : formatCurrencyAmount(
                value,
                primaryCurrency,
                CHART_CURRENCY_FORMAT_OPTIONS,
            )
  }
  ```

  With:
  ```typescript
  tickFormatter={(value) => {
      if (showVariation) return `${value.toFixed(0)}%`;
      if (viewMode === 'breakdown') {
          // Native values in different currencies — show plain abbreviated numbers
          if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
          if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
          return value.toFixed(0);
      }
      return formatCurrencyAmount(value, primaryCurrency, CHART_CURRENCY_FORMAT_OPTIONS);
  }}
  ```

- **Acceptance criteria**:
  1. In breakdown mode, each currency line shows its native amount over time (MXN shows MXN values, USD shows USD values — no cross-currency conversion)
  2. The `currencyService` import is removed from `useNetWorthChartData.ts` — no rate fetching occurs in this hook
  3. Switching to breakdown mode auto-enables the variation (%) toggle
  4. The variation calculation still works correctly (percentage change from first datum in range)
  5. Tooltip in breakdown mode formats each currency with its own symbol (MXN line shows "$100,000" in MXN format, USD line shows "$4,000" in USD format)
  6. Y-axis in breakdown mode without variation shows abbreviated numbers (K/M) instead of a single currency format
  7. No TypeScript errors; `npm run build` passes

- **Dependencies**: none (can run in parallel with Task 1, but merge after Task 1 to avoid SummaryPage conflicts)
