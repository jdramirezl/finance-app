# UI Fixes Wave 7 — Task Breakdown

## Task 1: Fixed Expenses Widget — Rename + Currency Fix

**Files to modify:**
- `frontend/src/components/summary/FixedObligationsWidget.tsx`
- `frontend/src/pages/SummaryPage.tsx`

**Current behavior:**
1. The widget header says "Fixed Commitments" (line ~72 in FixedObligationsWidget.tsx)
2. The widget receives `primaryCurrency` prop (user's global primary currency, e.g., COP) and uses it to format ALL amounts via `currencyService.formatCurrency(sp.balance, primaryCurrency)`
3. But fixed expenses live in a specific account with its own currency (e.g., MXN). The amounts are in that account's currency, NOT the primary currency.

**What it should do:**
1. Rename "Fixed Commitments" to "Fixed Expenses" in the header (line ~72)
2. The widget must display amounts in the **fixed expenses account's currency**, not the primary currency
3. In `SummaryPage.tsx`, derive the fixed expenses account currency: the fixed pockets already exist in `pockets.filter(p => p.type === 'fixed')` — each pocket has a `.currency` field inherited from its account. Pass `fixedExpensesCurrency` (from `fixedPockets[0]?.currency || primaryCurrency`) instead of `primaryCurrency` to the widget.
4. Rename the prop from `primaryCurrency` to `currency` in the widget interface to avoid confusion.

**Implementation:**
- In `SummaryPage.tsx` around line 115, `fixedPockets` is already computed. Add: `const fixedExpensesCurrency = fixedPockets[0]?.currency || primaryCurrency;`
- Pass `primaryCurrency={fixedExpensesCurrency}` to `<FixedObligationsWidget>` (or rename the prop)
- In `FixedObligationsWidget.tsx`, change the `<h3>` text from "Fixed Commitments" to "Fixed Expenses"

**Acceptance criteria:**
- Header reads "Fixed Expenses"
- All amounts in the widget display in the fixed expenses account's currency (e.g., MXN $500, not COP $500)
- No conversion is applied — raw values formatted with the correct currency symbol

**Dependencies:** None

---

## Task 2: Net Worth Timeline — Convert Breakdown to Primary Currency

**Files to modify:**
- `frontend/src/hooks/useNetWorthChartData.ts`

**Current behavior:**
In `breakdown` mode, the hook stores raw native-currency values per snapshot:
```ts
Object.entries(snapshot.breakdown).forEach(([currency, value]) => {
    data[currency] = value; // Native amount — no conversion
});
```
This means COP values (millions) and USD values (thousands) appear on the same Y-axis, making the chart unreadable.

**What it should do:**
In `breakdown` mode (non-variation), convert each currency's value to the primary currency before plotting. The chart should show "how much each currency contributes to my net worth in my primary currency."

**Implementation:**
1. Import `currencyService` from `../../services/currencyService`
2. In the `chartData` useMemo, when `viewMode === 'breakdown'` and `!showVariation`:
   - For each `snapshot.breakdown` entry, convert the value: `currencyService.convertAmount(value, currency, primaryCurrency)`
   - Store the converted value as `data[currency]`
   - Also store the original native value as `data[`${currency}_native`]` for tooltip display
3. Update the `tooltipFormatter` to show both: the converted amount AND the original native amount in parentheses, e.g., "COP $2,500,000 → USD $625"
4. When `showVariation` is true in breakdown mode, the percentage calculation should ALSO use converted values (so percentages reflect actual purchasing-power changes, not just nominal changes in each currency)

**Important:** The variation mode baseline calculation must also use converted values. Currently it uses raw values which makes the percentage meaningless across currencies.

**Acceptance criteria:**
- In "By Currency" mode without variation: all lines are on the same scale (primary currency), Y-axis shows primary currency values
- Tooltip shows: converted amount in primary currency + original native amount
- In "By Currency" mode with variation: percentages are calculated from converted values
- "Total" mode remains unchanged (it already uses `totalNetWorth` which is pre-converted)

**Dependencies:** None

---

## Task 3: Net Worth Timeline — Exchange Rate Fluctuation Tab

**Files to modify:**
- `frontend/src/components/net-worth/NetWorthTimelineWidget.tsx`
- `frontend/src/hooks/useNetWorthChartData.ts` (add new export or new hook)

**Current behavior:**
Only two view modes exist: "Total" and "By Currency". There is no way to see how exchange rates themselves have moved over time.

**What it should do:**
Add a third view mode button: "Exchange Rates" that shows how each foreign currency's exchange rate against the primary currency has changed over time.

**Implementation:**
1. Add a new `NetWorthViewMode` value: `'rates'` to the type in `useNetWorthChartData.ts`
2. In `NetWorthTimelineWidget.tsx`, add a third button "Rates" in the view mode toggle group
3. In the `useNetWorthChartData` hook, when `viewMode === 'rates'`:
   - For each snapshot, compute the implied exchange rate: `snapshot.breakdown[currency] / (snapshot.totalNetWorth * (snapshot.breakdown[currency] / totalNativeSum))` — OR simpler: use `currencyService.getHistoricalRate()` if available, otherwise derive from snapshot data: if we know the total in primary currency and the breakdown in native currencies, we can derive rates
   - **Simpler approach**: For each snapshot, the rate can be derived as: `totalNetWorth / sum(breakdown[c] for all c)` gives an average, but that's not per-currency. Better: store rates in snapshots OR compute from the ratio of consecutive snapshots.
   - **Simplest viable approach**: Use `currencyService.getExchangeRate(currency, primaryCurrency)` for current rate, and for historical, derive from snapshot data: if `snapshot.totalNetWorth` is the sum of all `breakdown[c] * rate[c→primary]`, and we know `breakdown[c]`, we can solve for rates IF there's only one foreign currency. With multiple currencies this is underdetermined.
   - **Recommended approach**: Since we can't reliably derive historical rates from snapshot data alone, add a `rates` field to `NetWorthSnapshot` that stores the exchange rates at snapshot time: `rates?: Record<string, number>`. The auto-snapshot hook should save current rates when creating a snapshot. For existing snapshots without rates, fall back to current rates (flat line for historical).
4. Chart in rates mode: one line per foreign currency showing its rate against primary currency over time. Y-axis = exchange rate value.

**Acceptance criteria:**
- Third "Rates" button appears in the view mode toggle
- When clicked, chart shows exchange rate lines (e.g., "1 USD = X COP" over time)
- For snapshots that don't have stored rates, show current rate as fallback
- New snapshots created going forward store the rates at time of creation

**Dependencies:** Task 2 (should be done first so the conversion logic is in place)

---

## Task 4: Fixed Expenses Toggle — Ensure Mutation Fires

**Files to modify:**
- `frontend/src/components/fixed-expenses/FixedExpenseGroupCard.tsx` (verify only)
- `frontend/src/hooks/queries/useSubPocketMutations.ts` (verify only)
- `frontend/src/hooks/actions/useFixedExpenseActions.ts` (verify only)
- `frontend/src/pages/FixedExpensesPage.tsx` (likely fix here)

**Current behavior:**
After reading the code, the toggle implementation appears CORRECT:
- `FixedExpenseGroupCard` calls `onToggleExpense(sp.id)` on click (line 193)
- `FixedExpensesPage` maps this to `actions.handleToggleSubPocket(id)` (line 110-111)
- `handleToggleSubPocket` calls `toggleSubPocketEnabled.mutateAsync(id)` (line 113)
- The mutation invalidates `['subPockets']` query on success (line 48 of useSubPocketMutations)

**Possible issue:** The `useCallback` wrapper in `FixedExpensesPage.tsx` line 110-111:
```ts
const handleToggleExpense = useCallback(
    (id: string) => { void actions.handleToggleSubPocket(id); },
    [actions]
);
```
The `void` keyword fires the async function without awaiting it, which is fine. But if `actions` reference is stale or the mutation isn't properly connected, the toggle won't work.

**Investigation needed:**
1. Check if `useFixedExpenseActions` hook is properly instantiated in `FixedExpensesPage`
2. Check if the `subPocketService.toggleSubPocketEnabled` actually hits the backend
3. Check if the query invalidation triggers a re-render

**Most likely root cause:** The `togglingId` state is set but the UI doesn't show a loading state, and if the mutation silently fails (e.g., network error swallowed), the user sees no change. OR the optimistic update isn't happening and the query invalidation response is slow.

**What it should do:**
- Toggle button click should immediately show optimistic state change (enabled ↔ disabled)
- After mutation completes, query invalidation confirms the state
- If mutation fails, revert the optimistic state and show error toast

**Implementation:**
1. Add `onMutate` optimistic update to `toggleSubPocketEnabled` mutation in `useSubPocketMutations.ts`:
   ```ts
   onMutate: async (id) => {
       await queryClient.cancelQueries({ queryKey: ['subPockets'] });
       const previous = queryClient.getQueryData(['subPockets']);
       queryClient.setQueryData(['subPockets'], (old: SubPocket[] | undefined) =>
           old?.map(sp => sp.id === id ? { ...sp, enabled: !sp.enabled } : sp)
       );
       return { previous };
   },
   onError: (_err, _id, context) => {
       if (context?.previous) queryClient.setQueryData(['subPockets'], context.previous);
   },
   onSettled: () => {
       queryClient.invalidateQueries({ queryKey: ['subPockets'] });
   },
   ```
2. Remove the separate `onSuccess` invalidation (moved to `onSettled`)

**Acceptance criteria:**
- Clicking toggle immediately flips the visual state (no waiting for server)
- If server confirms, state stays
- If server fails, state reverts and error toast appears
- No page refresh needed

**Dependencies:** None

---

## Task 5: Accounts Section (CapitalBreakdown) — Full Detail View

**Files to modify:**
- `frontend/src/components/summary/CapitalBreakdown.tsx` (major rewrite)
- `frontend/src/components/summary/AccountSummaryRow.tsx` (enhance)
- `frontend/src/pages/SummaryPage.tsx` (pass additional props if needed)

**Current behavior:**
`CapitalBreakdown.tsx` shows a compact list: each account is a single row with icon, name, subtitle, balance, and a small status badge. It does NOT show:
- Full investment details (total invested, shares, current price, gains amount)
- Full CD details (principal, net interest, maturity date, days to maturity, tax note)
- Pocket list under each account

`AccountSummaryRow.tsx` exists with MORE detail (investment info line, CD progress bar, pocket info) but is NOT used in the current `CapitalBreakdown` — it's a separate component.

**What it should do:**
Replace the compact row in `CapitalBreakdown` with `AccountSummaryRow` (or integrate its detail level). Each account card must show:

**Investment accounts:**
- Stock symbol + current share price + last updated timestamp
- Total invested (montoInvertido)
- Total shares
- Current total value
- Gains % and total money gained (gainsUSD)

**CD accounts:**
- APY (interestRate)
- Principal (total invested)
- Net interest earned (from cdCalculationService)
- Maturity date (exact date, not just "DUE IN Xd")
- Days to maturity
- Withholding tax rate note (if withholdingTaxRate exists)
- Maturity progress bar

**Normal accounts:**
- Name + currency
- List of ALL pockets with their individual balances shown below the account

**Layout:**
- Grouped by currency (already done)
- Each account is an expandable card (use `AccountSummaryRow` style with border-left color coding)
- Pockets listed as indented sub-items under each normal account

**Implementation:**
1. Replace the inline account rendering in `CapitalBreakdown.tsx` (the `groupAccounts.map(...)` block) with `<AccountSummaryRow>` component
2. Enhance `AccountSummaryRow` to also render the pocket list for normal accounts:
   - Accept `pockets` prop (already does)
   - After the main card content, render a list of pockets with name + balance for normal accounts
3. Enhance investment detail line to show ALL fields: symbol, price, invested, shares, gains %, gains amount, last updated
4. Enhance CD detail to show: APY, principal, net interest, exact maturity date, days to maturity, tax rate
5. Pass `investmentData` map to `AccountSummaryRow` (already accepts it as optional prop)

**Acceptance criteria:**
- Each account card shows full detail appropriate to its type
- Normal accounts show pocket list with individual balances
- Investment accounts show: symbol, current price, total invested, shares, gains %, total gained, last updated
- CD accounts show: APY, principal, net interest, maturity date, days to maturity, tax note (if applicable), progress bar
- Grouped by currency with currency headers
- No information is hidden or requires clicking to reveal

**Dependencies:** None

---

## Task 6: Calendar Widget — Reminder Heatmap (Replace Movement Calendar)

**Files to modify:**
- `frontend/src/components/summary/FinancialCalendarWidget.tsx` (major rewrite or new component)
- `frontend/src/components/reminders/RemindersWidget.tsx` (update calendar tab import)

**Current behavior:**
`FinancialCalendarWidget.tsx` shows a movement-based financial calendar:
- Fetches ALL movements via `useMovementsQuery()`
- Aggregates income/expenses per day
- Shows green/red intensity bars per day based on movement amounts
- Clicking a day navigates to `/movements?date=...`
- Legend shows "Income" and "Expenses"

The `RemindersWidget.tsx` calendar tab (line ~145) embeds this same `FinancialCalendarWidget` with `embedded` prop.

**What it should do:**
The calendar tab in RemindersWidget should show a **reminder occurrence heatmap**:
- Each day cell is colored based on how many reminder occurrences fall on that date
- Uses the reminder projection system (`generateProjectedOccurrences` from `utils/reminderProjections.ts`) to compute future dates
- Color intensity = number of reminders due that day (1 = light, 2+ = darker)
- Clicking a day could scroll to that reminder in the upcoming list (or just highlight it)
- No movement data involved at all

**Implementation:**
1. Create a new component: `frontend/src/components/reminders/ReminderCalendarHeatmap.tsx`
2. This component:
   - Accepts `reminders: Reminder[]` prop (from parent RemindersWidget which already has them)
   - Uses `generateProjectedOccurrences()` to get all occurrence dates for each reminder
   - Also includes the base `dueDate` of each reminder
   - Builds a `Map<string, { count: number; titles: string[] }>` keyed by `yyyy-MM-dd`
   - Renders a month grid (same navigation as current calendar: prev/next month)
   - Each day cell: background color intensity based on count (0 = transparent, 1 = light primary, 2 = medium, 3+ = strong)
   - Tooltip or title showing reminder names for that day
   - No income/expense bars, no movement queries
3. In `RemindersWidget.tsx`, replace the calendar tab content:
   - Remove `<FinancialCalendarWidget primaryCurrency={primaryCurrency} embedded />`
   - Replace with `<ReminderCalendarHeatmap reminders={reminders} />`
4. Keep `FinancialCalendarWidget` file intact (it may be used elsewhere or in the future)

**Acceptance criteria:**
- Calendar tab shows only reminder occurrence dates as colored cells
- No movement data is fetched or displayed in this tab
- Days with reminders show color intensity proportional to count
- Hovering/clicking a day shows which reminders are due
- Month navigation works (prev/next)
- Today is highlighted
- Days without reminders are plain/empty

**Dependencies:** None

---

## Execution Order

All tasks are independent and can run in parallel. Recommended grouping:

**Wave A (simple fixes):** Tasks 1, 4
**Wave B (medium complexity):** Tasks 2, 6
**Wave C (complex):** Tasks 3, 5

Task 3 benefits from Task 2 being done first (shared hook modifications), but can be done independently if the coder is careful about merge conflicts in `useNetWorthChartData.ts`.
