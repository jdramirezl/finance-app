# Tasks: Inline Edit + SelectableValue on Movement Amounts

Implements Option 2 from `.agents/analysis/inline-edit-proposal.md`: amounts wrapped in `SelectableValue` (click = calculator fill), pencil icon on hover triggers inline edit.

---

## Task 1: Refactor `InlineEditableAmount` to support pencil-trigger mode

**File**: `frontend/src/components/ui/InlineEditableAmount.tsx`

### Current State

- Component renders amount as clickable text (`cursor-pointer hover:underline`)
- Single click calls `startEditing()` which replaces text with an `<input>`
- Props: `amount`, `isIncome`, `onSave`

### Requirements

Add a `triggerMode` prop:

```ts
interface InlineEditableAmountProps {
    amount: number;
    isIncome: boolean;
    onSave: (newAmount: number) => Promise<void>;
    triggerMode?: 'click' | 'icon'; // default 'click'
}
```

**When `triggerMode='click'` (default)**: Existing behavior unchanged. Amount text is clickable, triggers edit on click.

**When `triggerMode='icon'`**:
- Amount text is NOT clickable for edit (no `onClick`, no `cursor-pointer`, no `hover:underline`, no `role="button"`, no `tabIndex`, no keyboard handler)
- Amount text is rendered as a plain `<span>` with just the color class and font styling
- A small pencil icon (`Pencil` from lucide-react, `w-3.5 h-3.5`) appears to the right on hover
- Clicking the pencil calls `startEditing()`
- The pencil button must call `e.stopPropagation()` to prevent parent click handlers (SelectableValue) from firing
- Wrap the amount + pencil in a container with `group/edit` for hover targeting

**Pencil visibility rules**:
- Desktop: `opacity-0 group-hover/edit:opacity-60 hover:!opacity-100`
- Mobile fallback: always visible at `opacity-40` (use responsive: `opacity-40 sm:opacity-0 sm:group-hover/edit:opacity-60`)

**Editing state**: Identical for both modes — input replaces the amount text, Enter saves, Escape cancels, blur saves.

### Implementation Notes

- Import `Pencil` from `lucide-react`
- The outer wrapper in icon mode: `<span className="group/edit inline-flex items-center gap-1">`
- Pencil button: `<button onClick={...} className="..." aria-label="Edit amount"><Pencil .../></button>`
- Keep the component memoized

---

## Task 2: Wire into MovementList with SelectableValue

**File**: `frontend/src/components/movements/MovementList.tsx`

### Current State

In `MovementRow`, the amount is rendered as:
```tsx
<InlineEditableAmount
    amount={movement.amount}
    isIncome={isIncome}
    onSave={(newAmount) => onUpdateAmount(movement.id, newAmount)}
/>
```

This is inside a flex container alongside action buttons.

### Requirements

Replace the current `InlineEditableAmount` usage with a combined SelectableValue + InlineEditableAmount:

```tsx
<SelectableValue
    id={`movement-${movement.id}`}
    value={movement.amount}
>
    <InlineEditableAmount
        amount={movement.amount}
        isIncome={isIncome}
        onSave={(newAmount) => onUpdateAmount(movement.id, newAmount)}
        triggerMode="icon"
    />
</SelectableValue>
```

### Key Details

1. **Import** `SelectableValue` from `'../ui/SelectableValue'`
2. **SelectableValue wraps InlineEditableAmount** — click on the amount text triggers SelectableValue's `toggleSelection` (calculator fill). Click on the pencil icon triggers inline edit.
3. **stopPropagation on pencil** (handled in Task 1) ensures clicking the pencil doesn't also toggle selection.
4. **When InlineEditableAmount is in editing state** (showing the input), SelectableValue's click area is effectively replaced by the input — no conflict.
5. **No currency prop needed on SelectableValue** here since `InlineEditableAmount` handles its own formatting via `children`.
6. The `id` for SelectableValue should be `movement-${movement.id}` to avoid collisions with account/pocket selectable values in `AccountContextPanel`.

### What NOT to change

- The `MovementRow` props interface stays the same
- The `onUpdateAmount` callback stays the same
- Bulk selection (checkboxes) is completely independent — no changes needed
- The floating stats bar uses `selectedMovementIds` from checkboxes, not from SelectableValue context

---

## Verification

After both tasks:
1. Click an amount in the movement list → blue highlight (SelectableValue selected), value available in calculator
2. Hover over amount → pencil icon appears to the right
3. Click pencil → inline input opens, amount editable
4. Enter saves, Escape cancels, blur saves
5. Checkbox bulk selection still works independently
6. On mobile viewport: pencil icon visible at low opacity without hover
7. Existing `triggerMode='click'` behavior (if used elsewhere) unchanged
