# UI Rebuild: Movements Page — Stitch Design

## Summary

Structural rebuild of the Movements page to match the Stitch reference design. The current implementation uses card-based rows with month grouping, a modal form panel, and a basic inline quick-add. The target uses a flat table layout with explicit pagination, a slide-in side panel form with icon-grid category selection, and a compact filter bar with pending toggle.

## Structural Differences (Current vs Target)

| Aspect | Current | Target (Stitch) |
|--------|---------|-----------------|
| Movement list | Card rows grouped by month with expand/collapse | Flat `<table>` with columns: Date, Movement, Account→Pocket, Category, Amount, Actions |
| Quick-add | Inline bar: type toggle + amount + notes + submit | Inline bar: `$` amount input + type toggle (Expense/Income/Transfer) + account dropdown + pocket dropdown + send button |
| Form | Full-screen modal with side panels (AccountContext + Calculator) | Right slide-in side panel (`translate-x` animation, max-w-md) |
| Category selection | Text input with autocomplete dropdown | 4-column icon grid (Food, Shop, Trans, Bills, etc.) |
| Filters | Search input + expandable filter grid (8+ fields) | Compact row: search + "Last 30 Days" button + "More Filters" button + pending toggle switch |
| Pagination | Infinite scroll with "Load More" button | Explicit pagination bar: "Showing 1-25 of N" + page buttons |
| Sort controls | Button row above list (Date, Amount, Type, Created) | Column headers in table `<thead>` are clickable |
| Month grouping | Collapsible month sections with income/expense totals | None — flat chronological list |
| Row structure | Checkbox + icon + title/badges + metadata line + amount + actions | Date cell + icon+title+subtitle cell + account→pocket cell + category pill + colored amount + kebab menu |
| Pending rows | Opacity + dashed border badge | Dashed border row with primary color date, `bolt` icon, primary-tinted background |
| Bulk selection | Checkboxes + floating toolbar | Not shown in Stitch (can keep as enhancement) |

## Architecture Decisions

1. **Keep existing hooks and data layer** — `useInfiniteMovementsQuery`, `useMovementsFilter`, `useMovementsSort`, `useMovementFormState`, etc. remain unchanged. Only the rendering layer changes.
2. **Replace infinite scroll with offset pagination** — The backend already returns `total` count. Add `page`/`pageSize` params to the query hook.
3. **Side panel replaces modal** — `MovementFormPanel` becomes a fixed right-side panel with `translate-x` transition instead of a centered modal overlay.
4. **Category grid is a new component** — Replace `CategorySelector` (text autocomplete) with `CategoryIconGrid` (4-col button grid with Material icons).
5. **Table component replaces MovementRow cards** — New `MovementTable` component with proper `<table>` semantics.

---

## Task 1: Quick-Add Bar Rebuild

**File**: `frontend/src/components/movements/QuickAddMovement.tsx`

**Current state**: Inline bar with type toggle (Expense/Income) + number input + text input (notes) + check button + "More" expand link. Uses `resolveLastUsedPocket` for auto-selecting account/pocket.

**Target state**: Inline bar with:
- `$` prefixed amount input (text, not number — allows formatting)
- 3-button type toggle: Expense (active/red) | Income | Transfer
- Account `<select>` dropdown
- Pocket `<select>` dropdown (filtered by selected account)
- Circular send button (primary color)

**Changes required**:
1. Add `Transfer` as a third type option (currently only Expense/Income)
2. Replace notes input with account + pocket dropdowns (explicit selection instead of auto-resolve)
3. Change submit icon from checkmark to send arrow
4. Add `$` prefix to amount input
5. Style the type toggle as segmented control with `bg-error-container` for active expense
6. Remove "More" expand link (the side panel handles full form)
7. Keep keyboard submit (Enter) behavior

**Props interface** (unchanged externally):
```typescript
interface QuickAddMovementProps {
  variant: 'inline' | 'modal';
  onExpandToFull?: (prefill: { amount?: number; notes?: string; type?: MovementType }) => void;
  onClose?: () => void;
  onSuccess?: () => void;
}
```

**Styling reference** (from Stitch HTML):
```html
<div class="glass-card rounded-xl p-4 mb-6">
  <div class="flex flex-wrap items-center gap-4">
    <!-- $ amount input -->
    <!-- 3-button type toggle -->
    <!-- account select -->
    <!-- pocket select -->
    <!-- send button -->
  </div>
</div>
```

---

## Task 2: Movement Table Structure

**Files**:
- `frontend/src/components/movements/MovementList.tsx` — full rewrite
- `frontend/src/components/movements/MovementRow.tsx` — extract from MovementList (new file)
- `frontend/src/pages/MovementsPage.tsx` — update pagination logic

**Current state**: `MovementList` renders month-grouped collapsible sections, each containing card-style `MovementRow` divs with checkbox, icon, title+badges, metadata, amount, and action buttons.

**Target state**: Single `<table>` with:
- `<thead>`: DATE | MOVEMENT | ACCOUNT → POCKET | CATEGORY | AMOUNT | (actions)
- `<tbody>`: Flat rows, no month grouping
- Each row: date + relative time | icon + title + subtitle | account name + pocket name | category pill | colored amount (red expense, green income) | kebab menu
- Pending rows: dashed border, primary-tinted bg, bolt icon, primary-colored date
- Pagination footer: "Showing X-Y of Z movements" + prev/page numbers/next buttons

**Changes required**:
1. Remove month grouping logic (expandedMonths, toggleMonth, monthTotals)
2. Replace `<div>` card layout with semantic `<table>` / `<thead>` / `<tbody>` / `<tr>` / `<td>`
3. Move sort controls into column headers (clickable `<th>` elements)
4. Add pagination component at table footer
5. Replace checkbox bulk selection with row hover actions (kebab menu with Edit/Delete/Apply)
6. Keep `InlineEditableAmount` on the amount cell (hover to edit)
7. Add relative time display under date (e.g., "2 days ago", "2:45 PM")
8. Show account→pocket as two lines: account name (bold) + pocket name (muted)
9. Category as pill/badge (`px-2 py-1 bg-surface-container-highest text-[10px] rounded font-bold uppercase`)

**New pagination logic**:
```typescript
// Replace useInfiniteMovementsQuery with offset-based pagination
const [page, setPage] = useState(1);
const PAGE_SIZE = 25;
// Query with { offset: (page - 1) * PAGE_SIZE, limit: PAGE_SIZE }
```

**Pagination component** (new, at table footer):
```html
<div class="p-4 bg-surface-container-high/30 flex justify-between items-center">
  <span class="text-xs text-on-surface-variant">Showing 1-25 of 1,248 movements</span>
  <div class="flex gap-2">
    <!-- prev button -->
    <!-- page number buttons -->
    <!-- next button -->
  </div>
</div>
```

**Keep**: Sort controls (move to `<th>`), bulk selection (keep as opt-in, hidden by default), floating stats bar.

**Remove**: Month headers, expand/collapse, "Load More" button.

---

## Task 3: Side Panel Form

**Files**:
- `frontend/src/components/movements/MovementFormPanel.tsx` — full rewrite
- `frontend/src/components/movements/CategoryIconGrid.tsx` — new component
- `frontend/src/components/movements/MovementForm.tsx` — restructure layout

**Current state**: `MovementFormPanel` is a centered full-screen modal overlay with the form on the left and AccountContextPanel + QuickCalculator on the right. Form uses standard `<Select>` for type, `<Input>` fields, `CategorySelector` (text autocomplete), `TagInput`.

**Target state**: Right-side slide-in panel (`fixed inset-y-0 right-0 w-full max-w-md`) with:
- Header: "New Movement" title + close button
- Type selector: 3-column grid of icon buttons (Expense/Income/Transfer) with active state
- Amount: Large input with currency prefix + quick calc buttons (+10% VAT, Convert, Divide)
- Account + Pocket: 2-column grid of `<select>` dropdowns
- Category: 4-column icon grid (not text autocomplete)
- Notes: `<textarea>` (2 rows)
- Pending toggle: Switch with label
- Footer: Discard (secondary) + Confirm (primary gradient) buttons
- Backdrop overlay (black/60 + blur)

**New component — `CategoryIconGrid`**:
```typescript
interface CategoryIconGridProps {
  value: string;
  onChange: (category: string) => void;
}
// Renders a 4-col grid of icon buttons
// Each button: material icon + short label
// Active state: border-primary/50 text-primary bg-primary/10
// Inactive: bg-surface-container-high hover:bg-primary/20
```

**Category icon mapping** (extend as needed):
| Category | Icon | Label |
|----------|------|-------|
| Food | restaurant | Food |
| Shopping | shopping_bag | Shop |
| Transport | directions_car | Trans |
| Bills | bolt | Bills |
| Entertainment | sports_esports | Fun |
| Health | favorite | Health |
| Education | school | Edu |
| Other | more_horiz | Other |

**Quick calc buttons** (below amount input):
- "+10% VAT" — multiplies current amount by 1.10
- "Convert" — opens currency conversion (future feature, placeholder)
- "Divide (2)" — divides current amount by 2

**Panel animation**:
```css
/* Closed */
.translate-x-full
/* Open */
.translate-x-0
/* Transition */
transition-transform duration-300 ease-in-out
```

**Keep**: Template loading, transfer mode fields, save-as-template checkbox (move to "More options" collapsible).

---

## Task 4: Filter Bar

**File**: `frontend/src/components/movements/MovementFilters.tsx`

**Current state**: Search input + "Filters" button that expands a 4-column grid with 10+ filter fields (Status, Account, Pocket, Type, Date Range, custom dates, min/max amount, Category, Tags).

**Target state**: Single compact row:
1. Search input with search icon (left-aligned, flex-1)
2. "Last 30 Days" button with calendar icon (date range preset)
3. "More Filters" button with filter icon (opens expanded panel — keep existing grid)
4. Vertical divider
5. Pending toggle switch with "Pending only" label

**Changes required**:
1. Make the top-level bar always visible as a single row (no expand/collapse for the bar itself)
2. Move search to be the primary element (full-width flex-1)
3. Add a date range preset button that cycles through: All Time → Last 7 Days → Last 30 Days → Last 3 Months → Custom
4. "More Filters" button opens the existing expanded grid (keep current implementation)
5. Add inline pending toggle switch (replaces the Status dropdown for the common case)
6. Remove the active filter count badge from the button (move to inside the expanded panel)
7. Style the toggle as a proper switch (not checkbox)

**Layout reference** (from Stitch HTML):
```html
<div class="flex flex-wrap items-center gap-3 mb-6">
  <!-- search input with icon -->
  <!-- date range button -->
  <!-- more filters button -->
  <!-- vertical divider -->
  <!-- pending toggle -->
</div>
```

**Keep**: All existing filter logic, the expanded grid panel, clear filters button (inside expanded panel).

---

## Execution Order

1. **Task 4 (Filter Bar)** — smallest scope, no dependencies on other tasks
2. **Task 1 (Quick-Add Bar)** — self-contained component, no table dependency
3. **Task 2 (Movement Table)** — largest task, depends on pagination decision
4. **Task 3 (Side Panel Form)** — depends on Task 2 being done (page layout changes)

## Files Modified Per Task

| Task | Modified | Created | Deleted |
|------|----------|---------|---------|
| 1 | `QuickAddMovement.tsx` | — | — |
| 2 | `MovementList.tsx`, `MovementsPage.tsx` | `MovementTable.tsx`, `MovementTableRow.tsx`, `Pagination.tsx` | — |
| 3 | `MovementFormPanel.tsx`, `MovementForm.tsx` | `CategoryIconGrid.tsx` | — |
| 4 | `MovementFilters.tsx` | — | — |

## Notes

- **Bulk selection**: The Stitch design doesn't show checkboxes. Keep the existing bulk selection logic but hide checkboxes by default — show them only when a "Select" mode is activated (future enhancement).
- **Orphaned movements panel**: Keep as-is (separate concern, not part of table).
- **Batch form**: Keep as-is but render inside the side panel instead of the modal.
- **Mobile**: The table should become a card list on mobile (`<md` breakpoint). Use responsive classes to swap between table and card layouts.
- **Accessibility**: Table must use proper `<th scope="col">`, `aria-sort` on sortable columns, and keyboard navigation for pagination.
