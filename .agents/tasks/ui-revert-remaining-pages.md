# UI Revert: Remaining Pages — Styling Revert Tasks

## Summary

Revert visual styling from custom design-system tokens back to standard Tailwind dark mode classes across 5 page groups. Keep all structural layouts intact.

## Global Token Mapping

Replace these custom tokens with standard Tailwind equivalents:

| Custom Token | Tailwind Replacement |
|---|---|
| `bg-surface-base` | `bg-gray-900` |
| `bg-surface-container-low` | `bg-gray-800/50` |
| `bg-surface-container` | `bg-gray-800` |
| `bg-surface-container/80` | `bg-gray-800/80` |
| `bg-surface-container-high` | `bg-gray-700` |
| `bg-surface-container-high/50` | `bg-gray-700/50` |
| `bg-surface-container-high/95` | `bg-gray-800` |
| `bg-surface-container-high/30` | `bg-gray-700/30` |
| `bg-surface-container-highest` | `bg-gray-600` |
| `bg-surface-container-lowest` | `bg-gray-900` |
| `bg-surface-container-low/30` | `bg-gray-800/30` |
| `bg-surface-bright/30` | `bg-gray-700/30` |
| `bg-surface-variant` | `bg-gray-700` |
| `text-on-surface` | `text-gray-100` |
| `text-on-surface-variant` | `text-gray-400` |
| `text-on-primary` | `text-white` |
| `text-primary` | `text-blue-400` |
| `text-secondary` | `text-blue-300` |
| `text-error` | `text-red-400` |
| `text-success` | `text-green-400` |
| `text-tertiary` | `text-amber-400` |
| `bg-primary` | `bg-blue-500` |
| `bg-primary/10` | `bg-blue-500/10` |
| `bg-primary/20` | `bg-blue-500/20` |
| `bg-primary/30` | `bg-blue-500/30` |
| `bg-primary-container` | `bg-blue-600` |
| `bg-primary-container/20` | `bg-blue-600/20` |
| `border-primary` | `border-blue-500` |
| `border-primary/20` | `border-blue-500/20` |
| `border-primary/30` | `border-blue-500/30` |
| `ring-primary` | `ring-blue-500` |
| `ring-primary/20` | `ring-blue-500/20` |
| `ring-primary/30` | `ring-blue-500/30` |
| `focus:border-primary` | `focus:border-blue-500` |
| `focus:ring-primary/20` | `focus:ring-blue-500/20` |
| `hover:text-primary` | `hover:text-blue-400` |
| `hover:bg-primary/10` | `hover:bg-blue-500/10` |
| `hover:bg-primary/30` | `hover:bg-blue-500/30` |
| `border-outline-variant` | `border-gray-600` |
| `border-outline` | `border-gray-500` |
| `border-white/[0.08]` | `border-gray-700` |
| `border-white/[0.06]` | `border-gray-700` |
| `border-white/[0.04]` | `border-gray-700/50` |
| `border-white/5` | `border-gray-700` |
| `border-white/10` | `border-gray-600` |
| `hover:bg-white/5` | `hover:bg-gray-700/50` |
| `hover:bg-white/10` | `hover:bg-gray-700` |
| `bg-white/5` | `bg-gray-700/50` |
| `bg-black/60` | `bg-black/60` (keep) |
| `text-[#ffb4ab]` | `text-red-400` |
| `bg-[rgba(27,33,34,0.8)]` | `bg-gray-800` |
| `bg-[rgba(27,33,34,0.9)]` | `bg-gray-800` |
| `glass-card` | `bg-gray-800 border border-gray-700 rounded-xl` |
| `backdrop-blur-*` | REMOVE entirely |
| `backdrop-blur-sm` | REMOVE (on overlays keep `bg-black/60`) |
| `font-mono` (on numbers) | REMOVE (use default font) |
| `hover:bg-surface-container-high` | `hover:bg-gray-700` |
| `hover:bg-surface-container-highest` | `hover:bg-gray-600` |
| `hover:bg-surface-variant` | `hover:bg-gray-700` |
| `hover:text-on-surface` | `hover:text-gray-100` |
| `bg-error` | `bg-red-500` |
| `bg-success` | `bg-green-500` |

### Additional Rules

- `font-mono` on numeric values → remove (use regular font)
- `glass-card` class → replace with `bg-gray-800 border border-gray-700 rounded-xl`
- `glass-card-elevated` → replace with `bg-gray-800 border border-gray-600 rounded-2xl`
- Any `backdrop-blur-*` → remove
- `bg-surface-container-high/80 backdrop-blur-md` → `bg-gray-800`
- `bg-surface-container-high/95 backdrop-blur-xl` → `bg-gray-800`
- Keep all structural classes (grid, flex, gap, padding, margin, width, height, etc.)
- Keep all animation classes
- Keep responsive breakpoints (md:, lg:, etc.)

---

## Task 6: Movements Page Styling Revert

### Files to modify (8 files with custom tokens):

| File | Token Count |
|---|---|
| `frontend/src/pages/MovementsPage.tsx` | 2 |
| `frontend/src/components/movements/MovementList.tsx` | 30 |
| `frontend/src/components/movements/MovementFilters.tsx` | 14 |
| `frontend/src/components/movements/QuickAddMovement.tsx` | 12 |
| `frontend/src/components/movements/MovementFormPanel.tsx` | 11 |
| `frontend/src/components/movements/CategorySelector.tsx` | 4 |
| `frontend/src/components/movements/TagInput.tsx` | 6 |
| `frontend/src/components/movements/BatchMovementForm.tsx` | 6 |
| `frontend/src/components/movements/BatchMovementRow.tsx` | 2 |
| `frontend/src/components/movements/QuickCalculator.tsx` | 3 (font-mono only) |

### Files already using standard Tailwind (NO changes needed):
- `MovementForm.tsx` — already uses `dark:bg-gray-800`, `dark:text-gray-300`, etc.
- `AccountContextPanel.tsx`
- `AccountPocketSelector.tsx`
- `BulkActionsToolbar.tsx`
- `MovementTemplateForm.tsx`
- `MovementTypeSelect.tsx`
- `OrphanedMovementsPanel.tsx`
- `RestoreOrphanedModal.tsx`
- `TemplateCard.tsx`

### Structural elements to PRESERVE:
- Table layout with sortable columns in MovementList
- Quick-add bar with inline type toggle, amount input, account/pocket selects
- Filter row with search, filter panel toggle, pending toggle
- Pagination controls at bottom of table
- Side panel form (MovementFormPanel) with overlay + slide-in
- Batch movement form modal
- Category autocomplete dropdown
- Tag input with pill badges

### Key replacements in this task:
- `glass-card` on QuickAddMovement and MovementList → `bg-gray-800 border border-gray-700 rounded-xl`
- `backdrop-blur-sm` on MovementFormPanel overlay → remove (keep `bg-black/60`)
- `backdrop-blur-xl` on panel container → remove
- `font-mono` on amount/date displays → remove
- `text-primary` / `bg-primary/20` on type toggles → `text-blue-400` / `bg-blue-500/20`
- `border-white/5` on table rows → `border-gray-700`
- `bg-surface-container-high/50` on table header → `bg-gray-700/50`

---

## Task 7: Budget Page Styling Revert

### Files to modify (10 files with custom tokens):

| File | Token Count |
|---|---|
| `frontend/src/pages/BudgetPlanningPage.tsx` | 2 |
| `frontend/src/components/budget/BudgetSummaryCard.tsx` | 14 |
| `frontend/src/components/budget/BudgetEntryRow.tsx` | 13 |
| `frontend/src/components/budget/ScenarioSection.tsx` | 11 |
| `frontend/src/components/budget/BudgetIncomeCard.tsx` | 9 |
| `frontend/src/components/budget/AllocationStrategy.tsx` | 8 |
| `frontend/src/components/budget/AllocationSliderRow.tsx` | 6 |
| `frontend/src/components/budget/BudgetStatsCards.tsx` | 6 |
| `frontend/src/components/budget/BudgetScenarioTabs.tsx` | 4 |
| `frontend/src/components/budget/PortfolioDonutChart.tsx` | 4 |
| `frontend/src/components/budget/BudgetDistribution.tsx` | 3 |

### Files already using standard Tailwind (NO changes needed):
- `BudgetIncomeSection.tsx`
- `BudgetSidebar.tsx`
- `DonutChart.tsx`
- `ScenarioForm.tsx`

### Structural elements to PRESERVE:
- Two-column layout (sidebar + main content)
- Income card with editable amount input
- Allocation sliders with percentage/amount dual-input
- Donut chart visualization
- Scenario tabs with add/delete
- Stats cards grid
- Distribution table with grid columns
- Budget entry rows with inline editing

### Key replacements in this task:
- `glass-card` on BudgetIncomeCard, AllocationStrategy, PortfolioDonutChart, BudgetScenarioTabs → `bg-gray-800 border border-gray-700 rounded-xl`
- `bg-[rgba(27,33,34,0.8)]` and `bg-[rgba(27,33,34,0.9)]` in BudgetSummaryCard → `bg-gray-800`
- `backdrop-blur-[12px]` / `backdrop-blur-xl` → remove
- `font-mono` on all monetary values and percentages → remove
- `text-primary` / `bg-primary/10` on active states → `text-blue-400` / `bg-blue-500/10`
- `text-[#ffb4ab]` → `text-red-400`
- `border-white/[0.06]` on distribution grid header → `border-gray-700`
- `bg-surface-container-low` on stats cards → `bg-gray-800/50`
- `bg-surface-container-highest` on inputs → `bg-gray-900`

---

## Task 8: Fixed Expenses Page Styling Revert

### Files to modify (2 files with custom tokens):

| File | Token Count |
|---|---|
| `frontend/src/components/fixed-expenses/FixedExpenseGroupCard.tsx` | 29 |
| `frontend/src/components/fixed-expenses/FixedExpensesHeader.tsx` | 9 |

### Files already using standard Tailwind (NO changes needed):
- `FixedExpensesPage.tsx` (no custom tokens)
- `FixedExpenseForm.tsx`
- `FixedExpenseGroupForm.tsx`
- `FixedExpensesList.tsx`

### Structural elements to PRESERVE:
- Group cards in grid layout
- Progress bars per sub-pocket
- Status badges (SETTLED, RECURRING, IN PROGRESS, OFF)
- Toggle enable/disable per expense
- Header with summary stats (total committed, total balance, percentage)
- Context menus (edit/delete) on groups and items
- Footer with group total

### Key replacements in this task:
- `bg-surface-container/80 backdrop-blur-[12px] border border-white/[0.08]` on group cards and header stats → `bg-gray-800 border border-gray-700`
- `font-mono` on amounts → remove
- `text-primary` on status badges and totals → `text-blue-400`
- `text-secondary` on balance amounts → `text-blue-300`
- `bg-primary/10 text-primary` on percentage badge → `bg-blue-500/10 text-blue-400`
- `text-on-surface-variant` on labels → `text-gray-400`
- `text-on-surface` on names/values → `text-gray-100`
- `border-white/5` on dividers → `border-gray-700`
- `bg-white/5` on footer → `bg-gray-700/50`
- `hover:bg-white/5` on menu items → `hover:bg-gray-700/50`
- `bg-surface-container-high` on dropdown menus → `bg-gray-700`
- `bg-surface-container-highest` on progress bar track → `bg-gray-600`
- `hover:text-primary` on action buttons → `hover:text-blue-400`
- `hover:text-error` on delete buttons → `hover:text-red-400`

---

## Task 9: Settings Page Styling Revert

### Files to modify (9 files with custom tokens):

| File | Token Count |
|---|---|
| `frontend/src/pages/SettingsPage.tsx` | 10 |
| `frontend/src/components/settings/PreferencesSection.tsx` | 19 |
| `frontend/src/components/settings/AboutSection.tsx` | 10 |
| `frontend/src/components/settings/DisplaySection.tsx` | 8 |
| `frontend/src/components/settings/DefaultAccountsSection.tsx` | 5 |
| `frontend/src/components/settings/DataPrivacySection.tsx` | 4 |
| `frontend/src/components/settings/ExportImportSection.tsx` | 4 |
| `frontend/src/components/settings/DebugExchangeRate.tsx` | 3 (font-mono only) |
| `frontend/src/components/settings/DebugStockPrice.tsx` | 3 (font-mono only) |
| `frontend/src/components/settings/DangerZoneSection.tsx` | 1 |

### Structural elements to PRESERVE:
- Left nav + right content panel layout (responsive: horizontal tabs on mobile, vertical nav on desktop)
- Section headings with descriptions
- Form inputs with labels
- Display mode radio cards
- Export/import action cards
- About section info rows with dividers

### Key replacements in this task:
- `bg-surface-container-low/30` on nav sidebar → `bg-gray-800/30`
- `bg-primary/10 text-primary` on active nav item → `bg-blue-500/10 text-blue-400`
- `text-on-surface-variant hover:bg-surface-bright/30` on inactive nav → `text-gray-400 hover:bg-gray-700/30`
- `bg-surface-container-lowest` on form inputs → `bg-gray-900`
- `border-white/10` on form inputs → `border-gray-600`
- `focus:border-primary` on inputs → `focus:border-blue-500`
- `text-on-surface` on headings/values → `text-gray-100`
- `text-on-surface-variant` on labels/descriptions → `text-gray-400`
- `border-white/[0.06]` on dividers → `border-gray-700`
- `border-white/5` on section dividers → `border-gray-700`
- `text-primary` on icons/accents → `text-blue-400`
- `text-secondary` on emoji-style icons → `text-blue-300`
- `bg-surface-container-high/50` on export card → `bg-gray-700/50`
- `border-primary bg-primary/10` on selected display mode → `border-blue-500 bg-blue-500/10`
- `border-outline-variant hover:bg-surface-container-high` on unselected → `border-gray-600 hover:bg-gray-700`
- `font-mono` in DebugExchangeRate/DebugStockPrice → keep (these are debug tools showing raw data, font-mono is appropriate here)
- `font-mono` in AboutSection version → remove

---

## Task 10: Reports + Login/Signup Styling Revert

### Files to modify (7 files with custom tokens):

**Reports:**

| File | Token Count |
|---|---|
| `frontend/src/pages/ReportsPage.tsx` | 3 |
| `frontend/src/components/reports/TopExpenses.tsx` | 10 |
| `frontend/src/components/reports/PeriodSelector.tsx` | 5 |
| `frontend/src/components/reports/SpendingByCategory.tsx` | 4 |
| `frontend/src/components/reports/CategoryTrend.tsx` | 4 |
| `frontend/src/components/reports/MonthlyTrend.tsx` | 1 |

**Login/Signup:**

| File | Token Count |
|---|---|
| `frontend/src/pages/LoginPage.tsx` | 7 |
| `frontend/src/pages/SignUpPage.tsx` | 10 |

### Structural elements to PRESERVE:
- Reports: tab navigation, period selector with presets + custom range, data tables, chart containers
- Login/Signup: centered card layout, form fields, navigation links

### Key replacements — Reports:
- `border-white/[0.06]` on tab border and table rows → `border-gray-700`
- `border-white/[0.04]` on inner rows → `border-gray-700/50`
- `border-primary text-primary` on active tab → `border-blue-500 text-blue-400`
- `border-transparent text-on-surface-variant hover:text-on-surface` on inactive tab → `border-transparent text-gray-400 hover:text-gray-100`
- `bg-primary-container text-on-primary` on active period button → `bg-blue-600 text-white`
- `bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest` on inactive period → `bg-gray-700 text-gray-400 hover:bg-gray-600`
- `bg-surface-container-highest text-on-surface` on date inputs → `bg-gray-900 text-gray-100`
- `border-outline-variant` on inputs/selects → `border-gray-600`
- `text-on-surface-variant` on empty states and labels → `text-gray-400`
- `text-[#ffb4ab]` on expense amounts → `text-red-400`
- `font-mono` on amounts/dates in TopExpenses → remove
- `bg-surface-container-high` on skeleton loaders → `bg-gray-700`

### Key replacements — Login/Signup:
- `bg-surface-base` on page background → `bg-gray-900`
- `bg-[rgba(27,33,34,0.8)] backdrop-blur-[12px] border border-white/[0.08]` on card → `bg-gray-800 border border-gray-700`
- `text-on-surface` on headings → `text-gray-100`
- `text-on-surface-variant` on descriptions → `text-gray-400`
- `text-primary` on links → `text-blue-400`

---

## Execution Notes

- Each task is independent and can run in parallel
- The `Card` UI component (`frontend/src/components/ui/Card.tsx`) also uses custom tokens — it should be reverted as a shared dependency (3 lines). Include this in whichever task runs first, or as a pre-step.
- After all tasks complete, the `@theme` block and `.glass-card` / `.glass-card-elevated` definitions in `frontend/src/index.css` can be removed (separate cleanup task)
- Files with 0 custom tokens listed as "NO changes needed" should NOT be touched
- `font-mono` in Debug sections (DebugExchangeRate, DebugStockPrice) is intentional for raw data display — keep it
- `font-mono` everywhere else (amounts, dates, percentages) should be removed
