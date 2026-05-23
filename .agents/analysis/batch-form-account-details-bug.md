# Bug: Batch Form Account Details Panel Doesn't Update

## Summary

Two bugs in the batch movement form:
1. **Account Details panel stays empty** ("Select an account to view details") even when an account is selected
2. **Sub-Pocket dropdown shows unconditionally** regardless of movement type

---

## Bug 1: Account Details Panel Not Updating

### What the old code did (working)

The old `BatchMovementForm` (commit `08c090a`, pre-March 2026) used simple `useState`:

```tsx
const [rows, setRows] = useState<BatchMovementRow[]>([...]);

const updateRow = (id: string, updates: Partial<BatchMovementRow>) => {
  setRows(rows.map((row) => {
    if (row.id === id) { return { ...row, ...updates }; }
    return row;
  }));
};
```

**Crucially, the old batch form had NO side panel at all.** It was a simple modal without an `AccountContextPanel`. The account details panel was only used for the single movement form, where `selectedAccountId` was tracked directly via `useState` in `MovementsPage`.

### What the current code does (broken)

The refactored `BatchMovementForm` uses `react-hook-form` with `useFieldArray`. The mechanism to notify the parent about the focused row's account is:

```tsx
// BatchMovementForm.tsx
const watchedRows = watch('rows');

useEffect(() => {
  const idx = lastFocusedIndexRef.current;
  if (idx === null || idx >= watchedRows.length) return;
  onFocusRowRef.current?.(watchedRows[idx]);
}, [watchedRows]);  // <-- THIS IS THE BUG
```

**Root cause**: In react-hook-form v7.54.2 with `useFieldArray`, `watch('rows')` returns a reference to the internal form state array. When individual field values change (e.g., user selects an account), react-hook-form **mutates the existing array/objects in place** rather than creating new references. This means `watchedRows` has the same reference identity across renders, so the `useEffect` dependency `[watchedRows]` doesn't detect the change and the effect never re-fires.

The flow:
1. User opens batch form → `watchedRows[0].accountId = ''` → effect fires → sends empty accountId → panel shows "Select an account"
2. User selects "Banamex MXN" → react-hook-form updates internal state → component re-renders
3. `watchedRows` is the SAME reference → `useEffect` skips → `onFocusRow` never called → panel stays empty

### The exact fix

Replace the `useEffect` dependency with a serialized value that actually changes:

```tsx
// Option A: Watch the specific fields that matter for the side panel
const focusedIdx = lastFocusedIndexRef.current ?? 0;
const focusedAccountId = watch(`rows.${focusedIdx}.accountId`);
const focusedPocketId = watch(`rows.${focusedIdx}.pocketId`);

useEffect(() => {
  const idx = lastFocusedIndexRef.current;
  if (idx === null || idx >= watchedRows.length) return;
  onFocusRowRef.current?.(watchedRows[idx]);
}, [focusedAccountId, focusedPocketId]);
```

**However**, this approach has issues because `focusedIdx` changes when the user focuses a different row, and you can't dynamically change `watch()` paths.

**Better fix — Option B**: Use `useWatch` which returns new references:

```tsx
import { useWatch } from 'react-hook-form';

// Replace: const watchedRows = watch('rows');
const watchedRows = useWatch({ control, name: 'rows' });
```

`useWatch` returns a deep clone of the watched value on each change, ensuring the `useEffect` dependency detects updates.

**Simplest fix — Option C**: Serialize the dependency:

```tsx
const watchedRows = watch('rows');
const focusedRowKey = (() => {
  const idx = lastFocusedIndexRef.current;
  if (idx === null || idx >= watchedRows.length) return '';
  const r = watchedRows[idx];
  return `${r.accountId}|${r.pocketId}|${r.subPocketId || ''}`;
})();

useEffect(() => {
  const idx = lastFocusedIndexRef.current;
  if (idx === null || idx >= watchedRows.length) return;
  onFocusRowRef.current?.(watchedRows[idx]);
}, [focusedRowKey]);
```

**Recommended: Option B** (`useWatch`) — it's the idiomatic react-hook-form solution and handles all edge cases.

---

## Bug 2: Sub-Pocket Dropdown Shows When It Shouldn't

### What the old code did (working)

In the old `BatchMovementForm`, the sub-pocket dropdown was conditionally rendered:

```tsx
const isFixedExpense = row.type === 'IngresoFijo' || row.type === 'EgresoFijo';
const fixedPocket = availablePockets.find((p) => p.type === 'fixed');
const availableSubPockets = fixedPocket && isFixedExpense
  ? getSubPocketsByPocket(fixedPocket.id) : [];

{isFixedExpense && availableSubPockets.length > 0 && (
  <Select label="Sub-Pocket" ... />
)}
```

The dropdown only appeared when:
1. The movement type was a fixed type (`IngresoFijo` or `EgresoFijo`), AND
2. The account had a fixed pocket with sub-pockets

### What the current code does (broken)

In `AccountPocketSelector.tsx` (line 267):

```tsx
{showSubPocket && fixedPocket && availableSubPockets.length > 0 && (
  <Select label={subPocketLabel} ... />
)}
```

The condition checks `showSubPocket` (always `true` from `BatchMovementRow`) and whether a fixed pocket with sub-pockets exists, but **does NOT check `isFixedType`**. So if the user selects an account that has a fixed pocket with sub-pockets, the dropdown appears even for "Normal Income" or "Normal Expense" types.

### The exact fix

In `frontend/src/components/movements/AccountPocketSelector.tsx`, line 267, add `isFixedType` to the condition:

```tsx
// Before (broken):
{showSubPocket && fixedPocket && availableSubPockets.length > 0 && (

// After (fixed):
{showSubPocket && isFixedType && fixedPocket && availableSubPockets.length > 0 && (
```

This restores the old behavior where the sub-pocket dropdown only appears for fixed movement types.

---

## Files to Modify

| File | Change |
|------|--------|
| `frontend/src/components/movements/BatchMovementForm.tsx` | Replace `watch('rows')` with `useWatch({ control, name: 'rows' })` to get proper reference updates |
| `frontend/src/components/movements/AccountPocketSelector.tsx` | Add `isFixedType` to sub-pocket visibility condition (line 267) |
