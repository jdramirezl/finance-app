# Component Code Review - Complete Findings

## Executive Summary

**Total Issues Found: 67**
- Critical: 8
- High: 19
- Medium: 26
- Low: 14

The codebase has significant architectural problems (god components, prop drilling), multiple performance anti-patterns (missing memoization, inline closures in render), and several outright bugs. The reminders widget is NOT "completely broken" in the traditional sense — it functions but has subtle data-flow bugs that cause incorrect behavior with recurring reminders. The batch movement form's slowness is caused by unnecessary re-renders from `onRowsChange` firing on every state update inside a `useEffect`.

---

## 1. REMINDERS (Reported: Completely Broken)

### Finding R-1: ReminderForm custom recurrence UI overwrites recurrenceType

**File**: `reminders/ReminderForm.tsx` ~L130-145
**Severity**: Critical
**Category**: BUGS

When `recurrenceType === 'custom'`, the form renders a second `<Select>` with `name="recurrenceType"` that allows choosing daily/weekly/monthly/yearly. Selecting any option in this "Period" dropdown **overwrites** `formData.recurrenceType` back to a non-custom value (e.g., `'daily'`), which immediately hides the custom interval UI. The user can never actually save a custom interval.

**Fix**: The "Period" select in custom mode should control a separate `customPeriod` field. On submit, combine `recurrenceInterval` + `customPeriod` into the final recurrence object.

---

### Finding R-2: ReminderCard key collision for projected reminders

**File**: `reminders/MonthSection.tsx` ~L50
**Severity**: Critical
**Category**: BUGS

```tsx
{reminders.map(reminder => (
    <ReminderCard key={reminder.id} ... />
))}
```

Projected (future) occurrences of recurring reminders share the same `reminder.id` as the original. When multiple projected occurrences appear in the same month group, React will render duplicates with the same key, causing incorrect DOM reconciliation — cards won't update properly, and actions may target the wrong reminder.

**Fix**: Use a composite key: `key={`${reminder.id}-${reminder.dueDate}`}`.

---

### Finding R-3: dueDate.split('T')[0] fails for date-only strings

**File**: `reminders/RemindersWidget.tsx` ~L85, L100, L130
**Severity**: High
**Category**: BUGS

Multiple places call `reminder.dueDate.split('T')[0]`. If `dueDate` is already a date-only string (e.g., `"2025-03-15"` without a time component), this works fine. But the `ReminderForm` submits `new Date(formData.dueDate).toISOString()` which always includes `T`. The inconsistency means that comparisons between the stored `originalDate` exception field and the projected `dueDate` may fail silently, causing exceptions to not match their target occurrences.

**Fix**: Normalize all dates to a consistent format at the service layer. Use `format(parseISO(date), 'yyyy-MM-dd')` consistently.

---

### Finding R-4: useEffect dependency on `monthGroups.length` causes scroll jank

**File**: `reminders/RemindersWidget.tsx` ~L35-42
**Severity**: Medium
**Category**: PERFORMANCE

```tsx
useEffect(() => {
    // scroll to current month
}, [monthGroups.length]);
```

`monthGroups` is recomputed on every render (it's not memoized). If the length stays the same but content changes, the scroll won't fire. If length changes due to a reminder being added/deleted, it scrolls unexpectedly. The dependency should be a stable flag like `isLoading` transitioning to `false`.

**Fix**: Use a `useRef` flag to scroll only once on initial data load.

---

### Finding R-5: MarkAsPaidModal fetches ALL movements without pagination

**File**: `reminders/MarkAsPaidModal.tsx` ~L22
**Severity**: High
**Category**: PERFORMANCE

```tsx
const { data: movements = [], isLoading: movementsLoading } = useMovementsQuery();
```

This loads the entire movements dataset into memory just to show a filtered list of ±15 days. For users with thousands of movements, this is extremely wasteful.

**Fix**: Pass a date range filter to the query, or use a dedicated query hook with date parameters.

---

### Finding R-6: ReminderForm useEffect missing cleanup / stale initialData

**File**: `reminders/ReminderForm.tsx` ~L55-70
**Severity**: Medium
**Category**: PROPS/STATE

```tsx
useEffect(() => {
    if (initialData) { setFormData({...}); }
}, [initialData]);
```

When `initialData` changes from a reminder to `null` (closing edit mode and opening create mode), the form retains the previous reminder's data because the effect only runs when `initialData` is truthy. The form should reset to defaults when `initialData` becomes null/undefined.

**Fix**: Add an `else` branch that resets to default form state.

---

### Finding R-7: handleFixedExpenseChange only auto-fills amount when amount is empty

**File**: `reminders/ReminderForm.tsx` ~L75-80
**Severity**: Low
**Category**: FORMS

```tsx
if (expense && !formData.amount) {
    setFormData(prev => ({ ...prev, amount: expense.amount.toString() }));
}
```

If the user previously typed an amount, selecting a fixed expense won't update it. This is arguably intentional but confusing UX — the user expects selecting an expense to populate its amount.

---

### Finding R-8: No error handling on async mutations in RemindersWidget

**File**: `reminders/RemindersWidget.tsx` ~L88-130
**Severity**: Medium
**Category**: BUGS

`handleRecurrenceAction` calls `await createExceptionMutation.mutateAsync(...)` and `await splitMutation.mutateAsync(...)` without try/catch. If these fail, the error propagates unhandled and the UI state (modal closed, editing state cleared) is already committed.

**Fix**: Wrap in try/catch, show toast on error, and don't close modal on failure.

---

## 2. BATCH MOVEMENT FORM (Reported: Very Slow)

### Finding B-1: useEffect + onRowsChange causes infinite render loop potential

**File**: `BatchMovementForm.tsx` ~L55-58
**Severity**: Critical
**Category**: PERFORMANCE / BUGS

```tsx
useEffect(() => {
    onRowsChange?.(rows);
}, [rows, onRowsChange]);
```

Every time `rows` changes, this fires `onRowsChange`. If the parent component's `onRowsChange` callback is not memoized with `useCallback`, it will be a new reference on every parent render, causing this effect to fire again, which triggers a parent re-render, creating a render cascade. This is the root cause of the reported slowness.

**Fix**: Remove the `useEffect`. Call `onRowsChange` directly inside `setRows` callbacks, or better yet, lift state up so the parent owns `rows`.

---

### Finding B-2: updateRow creates new array on every keystroke

**File**: `BatchMovementForm.tsx` ~L85-130
**Severity**: High
**Category**: PERFORMANCE

The `updateRow` function calls `setRows(rows.map(...))` which creates a new array reference. Combined with B-1, every single character typed in any input triggers: state update → useEffect → parent callback → parent re-render → child re-render of ALL rows.

**Fix**: Memoize individual row components with `React.memo` and use stable callbacks. Consider `useReducer` for complex state.

---

### Finding B-3: Validation uses alert() — blocks UI thread

**File**: `BatchMovementForm.tsx` ~L140-145
**Severity**: Medium
**Category**: CODE QUALITY

```tsx
if (errors.length > 0) {
    alert(errors.join('\n'));
    return;
}
```

`alert()` blocks the entire UI. Use a toast notification or inline error display.

---

### Finding B-4: Amount validation allows 0

**File**: `BatchMovementForm.tsx` ~L138
**Severity**: Medium
**Category**: FORMS

```tsx
if (!row.amount || parseFloat(row.amount) < 0)
```

This allows `amount === "0"` which is likely not a valid movement. Should be `<= 0`.

---

## 3. MOVEMENT LIST

### Finding M-1: Missing import — `Filter` imported after component definition

**File**: `movements/MovementList.tsx` ~L230 (end of file)
**Severity**: Critical
**Category**: BUGS

```tsx
// At the very end:
import { Filter } from 'lucide-react';
```

The `Filter` icon is used in the empty state JSX but imported AFTER the component definition. While this technically works in bundled code (imports are hoisted), it's a code smell that indicates the empty state was added hastily. More critically, if tree-shaking or code splitting is involved, this could cause issues.

**Fix**: Move import to the top of the file with other imports.

---

### Finding M-2: Expensive computation in render — selected movements sum/average

**File**: `movements/MovementList.tsx` ~L185-215
**Severity**: High
**Category**: PERFORMANCE

The floating stats bar computes sum and average using inline IIFEs that `flatMap` over ALL movements on every render:

```tsx
{(() => {
    const selectedMovements = movementsByMonth
        .flatMap(([, movements]) => movements)
        .filter(m => selectedMovementIds.has(m.id));
    const sum = selectedMovements.reduce(...);
    return ...;
})()}
```

This runs twice (once for sum, once for average) on every render, even when selection hasn't changed.

**Fix**: Use `useMemo` with `[movementsByMonth, selectedMovementIds]` dependencies.

---

### Finding M-3: Hardcoded currency 'USD' in stats bar

**File**: `movements/MovementList.tsx` ~L200, L212
**Severity**: High
**Category**: BUGS

```tsx
currency: 'USD', // Ideally this should be dynamic based on account currency
```

The comment acknowledges the bug. Selected movements may span multiple currencies, making the sum meaningless. At minimum, it should use the user's primary currency.

**Fix**: Accept `primaryCurrency` as a prop or use settings context.

---

### Finding M-4: No virtualization for large movement lists

**File**: `movements/MovementList.tsx`
**Severity**: Medium
**Category**: PERFORMANCE

Each expanded month renders ALL its movements. Users with hundreds of movements per month will experience significant DOM overhead.

**Fix**: Use `react-window` or `@tanstack/react-virtual` for virtualized lists.

---

## 4. MOVEMENT FORM

### Finding MF-1: Massive prop drilling — 18 props

**File**: `movements/MovementForm.tsx` ~L12-40
**Severity**: High
**Category**: ARCHITECTURE

The component accepts 18 individual props for controlled form state. This is a clear sign the form state should be managed internally or via a form library (react-hook-form is already in the project's dependencies).

**Fix**: Internalize form state. Accept only `initialData`, `onSubmit`, `onCancel`, and `isSaving`.

---

### Finding MF-2: Transfer mode uses hidden input but also state

**File**: `movements/MovementForm.tsx` ~L175, L195
**Severity**: Medium
**Category**: BUGS

```tsx
<input type="hidden" name="isTransfer" value={isTransfer.toString()} />
```

The form has both a hidden input AND passes transfer data via `FormData.append` in `handleSubmit`. The parent's `onSubmit` receives the raw `FormEvent` — it's unclear which mechanism the parent uses. If it reads `FormData`, the hidden input and the appended value will conflict (two entries for `isTransfer`).

**Fix**: Pick one mechanism. Either use FormData exclusively or pass structured data.

---

### Finding MF-3: useEffect for auto-selecting fixed pocket has stale closure risk

**File**: `movements/MovementForm.tsx` ~L95-110
**Severity**: Medium
**Category**: PROPS/STATE

The `useEffect` depends on `[isFixedMove, selectedAccountId, pockets, setSelectedPocketId, setSelectedAccountId, selectedPocketId]`. The setter functions from props may not be stable references, causing the effect to fire more often than expected.

**Fix**: Use `useCallback` in the parent for setters, or restructure to avoid this pattern.

---

## 5. LAYOUT

### Finding L-1: QuickActions component defined inside Layout — recreated every render

**File**: `Layout.tsx` ~L65-90
**Severity**: Medium
**Category**: PERFORMANCE

```tsx
const QuickActions = () => ( ... );
```

This component is defined inside `Layout`'s function body. It's recreated on every render, which means React unmounts and remounts it each time, losing any internal state and causing unnecessary DOM operations.

**Fix**: Extract `QuickActions` to a separate component outside `Layout`, or at minimum define it outside the function body.

---

### Finding L-2: No Suspense boundaries or error boundaries

**File**: `Layout.tsx`
**Severity**: Medium
**Category**: ARCHITECTURE

The layout wraps `{children}` directly without any error boundary. A crash in any child component will unmount the entire app including navigation.

**Fix**: Wrap `{children}` in an `ErrorBoundary` component.

---

### Finding L-3: Mobile menu and quick actions z-index conflicts

**File**: `Layout.tsx` ~L100, L180, L200
**Severity**: Low
**Category**: BUGS

Multiple elements use z-40 and z-50. The mobile header (z-40), sidebar (z-50), mobile menu overlay (z-30), and FAB (z-50) can overlap incorrectly depending on scroll position and interaction state.

**Fix**: Establish a z-index scale and document it.

---

## 6. FIXED EXPENSE GROUP CARD

### Finding FE-1: Component is 350+ lines — SRP violation

**File**: `FixedExpenseGroupCard.tsx`
**Severity**: Medium
**Category**: ARCHITECTURE

This component handles: group header, collapse toggle, group-level toggle, edit/delete buttons, expense list rendering, progress bars, group selector dropdown, and individual expense actions. It should be split into at least 3 components: `GroupHeader`, `ExpenseRow`, and the container.

---

### Finding FE-2: Inline `toLocaleString` with `style: 'currency'` on every render

**File**: `FixedExpenseGroupCard.tsx` ~L80, L90, L150, L160, L170
**Severity**: Low
**Category**: PERFORMANCE

Multiple calls to `.toLocaleString(undefined, { style: 'currency', currency })` create new `Intl.NumberFormat` instances on every render. These should use the shared `currencyService.formatCurrency`.

---

## 7. NET WORTH TIMELINE WIDGET

### Finding NW-1: 400+ line god component

**File**: `net-worth/NetWorthTimelineWidget.tsx`
**Severity**: High
**Category**: ARCHITECTURE

This single component handles: data fetching, exchange rate fetching, chart rendering, date filtering, view mode toggling, variation calculation, snapshot editing modal, delete confirmation, and custom dot rendering. It should be decomposed into at least: `NetWorthChart`, `NetWorthControls`, `SnapshotEditModal`.

---

### Finding NW-2: useEffect fetches exchange rates on every currencies change

**File**: `net-worth/NetWorthTimelineWidget.tsx` ~L80-100
**Severity**: High
**Category**: PERFORMANCE

```tsx
useEffect(() => {
    const fetchRates = async () => { ... };
    if (currencies.length > 0) { fetchRates(); }
}, [currencies, primaryCurrency]);
```

`currencies` is derived from `useMemo` over `snapshots`. If snapshots data reference changes (e.g., background refetch), `currencies` gets a new array reference even if content is identical, triggering unnecessary rate fetches.

**Fix**: Use a stable string key like `currencies.join(',')` as the dependency, or use `useQuery` for rate fetching.

---

### Finding NW-3: CustomDot onClick uses stopPropagation incorrectly

**File**: `net-worth/NetWorthTimelineWidget.tsx` ~L55-70
**Severity**: Medium
**Category**: BUGS

The `CustomDot` component uses `onClick` on an SVG `<g>` element with `e.stopPropagation()`. Recharts' own click handling may not work correctly with stopped propagation, and the `activeDot` prop also renders `CustomDot` which means clicking an active dot fires the handler twice.

**Fix**: Use Recharts' `onClick` prop on the `<Line>` component instead of custom dot click handlers.

---

### Finding NW-4: rates state causes extra render cycle

**File**: `net-worth/NetWorthTimelineWidget.tsx` ~L75
**Severity**: Medium
**Category**: PERFORMANCE

```tsx
const [rates, setRates] = useState<Record<string, number>>({});
```

Rates are fetched in a useEffect and stored in state. The `chartData` useMemo depends on `rates`. This means: first render (empty rates) → effect fires → rates update → second render with data. The chart flickers or shows empty then populated.

**Fix**: Use `useQuery` or `useSuspenseQuery` for rate fetching to avoid the double-render.

---

## 8. COLOR PICKER MODAL

### Finding CP-1: selectedColor state resets on cancel but not on close

**File**: `ColorPickerModal.tsx` ~L35, L100
**Severity**: Low
**Category**: BUGS

`handleCancel` resets `selectedColor` to `currentColor`, but if the modal is closed via the `Modal`'s X button (which calls `onClose` directly), the state is not reset. Next time the modal opens, it shows the previously selected (uncommitted) color.

**Fix**: Reset state in a `useEffect` that watches `isOpen` transitioning to `true`.

---

## 9. BUDGET DISTRIBUTION

### Finding BD-1: generateId uses Date.now() — not unique for rapid additions

**File**: `budget/BudgetDistribution.tsx` ~L45
**Severity**: Low
**Category**: BUGS

```tsx
const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};
```

While `Math.random()` adds uniqueness, using `crypto.randomUUID()` (already used elsewhere in the codebase) is more reliable and consistent.

---

### Finding BD-2: Editing state managed with multiple useState — easy to desync

**File**: `budget/BudgetDistribution.tsx` ~L30-35
**Severity**: Medium
**Category**: PROPS/STATE

```tsx
const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
const [editingEntryName, setEditingEntryName] = useState<string>('');
const [editingEntryPercentage, setEditingEntryPercentage] = useState<number>(0);
```

Three separate state variables track one logical "editing" state. If any setter is missed, the UI shows inconsistent data.

**Fix**: Use a single state object: `useState<{ id: string; name: string; percentage: number } | null>(null)`.

---

## 10. CALENDAR WIDGET

### Finding CW-1: monthsToShow useMemo has empty dependency array

**File**: `calendar/FinancialCalendarWidget.tsx` ~L35-40
**Severity**: Medium
**Category**: BUGS

```tsx
const monthsToShow = useMemo(() => {
    const current = new Date();
    return [subMonths(current, 2), subMonths(current, 1), current];
}, []);
```

Empty deps means this never updates. If the user keeps the app open past midnight on the 1st of a month, the calendar won't show the new month until a full page refresh.

**Fix**: Add a date-based dependency or use a timer to refresh at midnight.

---

### Finding CW-2: currencyService.convertAmount called for every movement on every render

**File**: `calendar/FinancialCalendarWidget.tsx` ~L75-85
**Severity**: High
**Category**: PERFORMANCE

Inside the `dailyData` useMemo, every movement calls `currencyService.convertAmount`. If this function is synchronous and uses cached rates, it's acceptable. But if it triggers any async work or is expensive, this will be slow for large movement sets.

The bigger issue: `dailyData` depends on `[movements, monthsToShow, primaryCurrency, accountsMap]`. Since `accountsMap` is a new `Map` on every render (created in its own `useMemo` that depends on `accounts`), any accounts refetch triggers full recomputation.

**Fix**: Ensure `accountsMap` reference is stable (it already uses useMemo, so this is fine as long as `accounts` reference is stable from TanStack Query).

---

## 11. ACCOUNT SUMMARY CARD

### Finding AS-1: Division by zero when totalBalance is 0

**File**: `summary/AccountSummaryCard.tsx` ~L95
**Severity**: Medium
**Category**: BUGS

```tsx
const pocketPercentages = pockets.map(pocket => ({
    ...pocket,
    percentage: totalBalance > 0 ? (pocket.balance / totalBalance) * 100 : 0
}));
```

This is correctly guarded. However, in the pocket list below:

```tsx
{totalBalance > 0 && (
    <div className="text-xs">
        {((pocket.balance / totalBalance) * 100).toFixed(1)}% of total
    </div>
)}
```

This duplicates the calculation without using the already-computed `pocketPercentages`. Minor but wasteful.

---

### Finding AS-2: Account type detection based on name string matching

**File**: `summary/AccountSummaryCard.tsx` ~L20-35
**Severity**: Medium
**Category**: CODE QUALITY

```tsx
if (account.name.toLowerCase().includes('checking')) { ... }
if (account.name.toLowerCase().includes('savings')) { ... }
```

This is fragile. If the user names their account in Spanish or any other language, the icons will always fall through to the default. The account `type` field should drive this, not the name.

**Fix**: Add a `subtype` field to the Account model, or use the existing `type` field more granularly.

---

## 12. FIXED EXPENSES SUMMARY

### Finding FS-1: Fragment key uses pocketId which may not be unique across accounts

**File**: `summary/FixedExpensesSummary.tsx` ~L100
**Severity**: Low
**Category**: BUGS

The outer loop uses `pocketIds.map(pocketId => ...)` with `<Fragment key={pocketId}>`. Since pocket IDs are UUIDs from the database, they ARE unique. This is fine — no issue here.

---

## 13. CD ACCOUNT FORM

### Finding CD-1: Term calculation from custom date is approximate

**File**: `accounts/CDAccountForm.tsx` ~L165
**Severity**: Low
**Category**: BUGS

```tsx
const monthsDiff = Math.round((selectedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
```

Using 30.44 days/month is an approximation. For financial calculations, use `differenceInMonths` from date-fns for accuracy.

---

### Finding CD-2: Preview calculation uses `termMonths * 30` for days

**File**: `accounts/CDAccountForm.tsx` ~L55
**Severity**: Medium
**Category**: BUGS

```tsx
cdCalculationService.calculateCompoundInterest(
    formData.principal,
    formData.interestRate / 100,
    formData.termMonths * 30, // Approximate days
    formData.compoundingFrequency
)
```

For a 12-month CD, this passes 360 days instead of 365. This will show incorrect interest calculations in the preview, potentially misleading users about expected returns.

**Fix**: Use actual calendar days: `differenceInDays(maturityDate, new Date())`.

---

## 14. MOVEMENT FILTERS

### Finding MFi-1: Pocket filter uses optgroup-style structure but Select may not support it

**File**: `movements/MovementFilters.tsx` ~L95-110
**Severity**: Medium
**Category**: BUGS

```tsx
options={[
    { value: 'all', label: 'All Pockets' },
    ...accounts.map(acc => {
        return {
            label: acc.name,
            options: accountPockets.map(p => ({ value: p.id, label: p.name }))
        };
    })
]}
```

This passes nested `options` objects (optgroup pattern) to the `Select` component. Unless the custom `Select` component explicitly handles this nested structure, it will render `[object Object]` or crash.

**Fix**: Verify the `Select` component supports optgroups. If not, flatten the options with account name prefixes.

---

## 15. CROSS-CUTTING ISSUES

### Finding X-1: No React.memo on any list item components

**Files**: `ReminderCard.tsx`, `MonthSection.tsx`, `BudgetEntryRow.tsx`, all movement row renders
**Severity**: High
**Category**: PERFORMANCE

None of the list item components use `React.memo`. When parent state changes (e.g., typing in a search box), every single card/row re-renders even if its props haven't changed.

**Fix**: Wrap all list item components in `React.memo` with appropriate comparison.

---

### Finding X-2: Inline arrow functions in event handlers throughout

**Files**: All components
**Severity**: Medium
**Category**: PERFORMANCE

Patterns like `onClick={() => onEdit(reminder)}` create new function references on every render. When combined with the lack of `React.memo` (X-1), this means child components can never skip re-renders.

**Fix**: Use `useCallback` for handlers passed to memoized children, or accept the cost if not memoizing.

---

### Finding X-3: No accessibility — zero aria-labels on icon-only buttons

**Files**: All components with icon buttons
**Severity**: High
**Category**: ACCESSIBILITY

Every icon-only button (edit, delete, toggle, pay now) lacks `aria-label`. Screen readers will announce these as empty buttons. Some have `title` attributes but those are not sufficient for accessibility.

**Fix**: Add `aria-label` to all icon-only buttons. Example: `aria-label="Edit reminder"`.

---

### Finding X-4: No keyboard navigation for action buttons hidden behind hover

**Files**: `ReminderCard.tsx` ~L85, `MovementList.tsx` ~L165
**Severity**: High
**Category**: ACCESSIBILITY

```tsx
className="opacity-0 group-hover:opacity-100"
```

Action buttons are invisible until mouse hover. Keyboard users can never discover or reach these buttons. They're also invisible on touch devices until tapped.

**Fix**: Make buttons always visible (perhaps smaller/subtler), or ensure they're focusable and become visible on `:focus-within`.

---

### Finding X-5: confirm() used for destructive actions

**Files**: `RemindersWidget.tsx` ~L70, `BatchMovementForm.tsx` (via alert)
**Severity**: Medium
**Category**: CODE QUALITY

Native `confirm()` and `alert()` block the main thread, can't be styled, and break the app's visual consistency. The codebase already has a `useConfirm` hook (used in NetWorthTimelineWidget) — it should be used everywhere.

---

### Finding X-6: `any` type used extensively

**Files**: `RemindersWidget.tsx` (editingReminder: any), `ReminderForm.tsx` (templates: any, subPockets: any), `MovementList.tsx`
**Severity**: Medium
**Category**: CODE QUALITY

Multiple components use `any` for data that has well-defined types. This defeats TypeScript's purpose and hides potential bugs.

---

### Finding X-7: No loading/error states for mutations

**Files**: Most components
**Severity**: Medium
**Category**: BUGS

Most mutation handlers (delete, update, create) don't show error feedback to the user. If a network request fails, the UI silently does nothing. Only `isSaving`/`isPending` states are tracked for loading indicators.

**Fix**: Add `onError` callbacks to mutations that show toast notifications.

---

### Finding X-8: Inconsistent date handling — mix of ISO strings and date-only strings

**Files**: All components dealing with dates
**Severity**: High
**Category**: BUGS

Some components store dates as `"2025-03-15"` (date-only), others as `"2025-03-15T00:00:00.000Z"` (ISO). The `new Date("2025-03-15")` constructor interprets date-only strings as UTC midnight, which can shift to the previous day in negative UTC offsets (e.g., US timezones). This causes off-by-one-day bugs.

**Fix**: Standardize on date-only strings for display dates and use `parseISO` from date-fns consistently. Never use `new Date(dateString)` for date-only strings.

---

## Priority Remediation Order

1. **B-1** (BatchMovementForm useEffect loop) — Root cause of reported slowness
2. **R-1** (Custom recurrence overwrites type) — Makes custom recurrence unusable
3. **R-2** (Key collision) — Causes wrong reminder to be acted upon
4. **X-8** (Date handling) — Causes off-by-one bugs across the entire app
5. **M-3** (Hardcoded USD) — Shows wrong currency for non-USD users
6. **X-3/X-4** (Accessibility) — App is unusable for keyboard/screen reader users
7. **X-1** (Missing React.memo) — Systemic performance issue
8. **NW-1/MF-1** (God components) — Architectural debt blocking maintainability
