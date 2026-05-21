# UI Audit — Remaining Issues, Broken Widgets, and Inconsistencies

**Date**: 2026-05-21  
**Scope**: Full frontend audit after partial UI overhaul

---

## Executive Summary

The UI overhaul successfully rebuilt the Summary, Accounts, Movements, and Budget pages with the new glass-card design system. However, significant issues remain:

- **5 broken/degraded widgets** on the Summary page
- **5 pages not yet restyled** (Fixed Expenses, Templates, Settings, Reports, Login/Signup)
- **51 files still using old `dark:`/`bg-white`/`bg-gray-*` patterns** (352 occurrences)
- **Form/modal inconsistencies** across the app
- **Critical information loss** in the FixedObligationsWidget vs old FixedExpensesSummary

---

## 1. BROKEN — Widgets That Don't Work Correctly

### 1.1 RemindersWidget — No Height Constraint (BROKEN)

**Problem**: The widget renders inside the Summary page's right column (`lg:col-span-5`) with no `max-height` or `overflow` constraint. It uses `flex-1` and `overflow-y-auto` internally, but the parent doesn't constrain it. If there are many reminders, it grows unbounded, pushing everything below it off-screen.

**Root cause**: The widget's outer `<div className="h-full flex flex-col">` relies on a parent with a fixed height. In the Summary page grid, the parent is a flex column with `space-y-8` — no height limit.

**Fix needed**: Add `max-h-[400px]` or similar constraint to the widget wrapper in SummaryPage, or add it to the Card component inside RemindersWidget.

---

### 1.2 FixedObligationsWidget — Shows Only Top 4 Groups (BROKEN / LOST INFO)

**Problem**: The widget explicitly slices to 4 groups: `groupSummaries.slice(0, 4)`. It shows:
- Group name
- Current vs target (monthly contribution)
- A progress bar

**What it DOESN'T show** (that the old `FixedExpensesSummary` did):
- Individual sub-pocket rows with name, contributed amount, target amount, progress
- Grouping by account (with account color dot and account total)
- Group totals per group
- Overall total in fixed expenses (big number at top)
- Enabled/disabled status per expense
- The full table with all expenses visible

**The old component** was a full table with: Name | Contributed | Target | Progress, grouped by Account → Group → Individual expenses. The new widget is a 4-line summary card.

**Fix needed**: Either expand FixedObligationsWidget to show all data, or render the old `FixedExpensesSummary` component (which still exists and is used on the FixedExpensesPage).

---

### 1.3 BudgetScenarioTabs — Single Selection Only (BROKEN)

**Problem**: The tabs use a single `activeId` state. Clicking a tab toggles it on/off (`tab.id === activeId ? null : tab.id`). There's no multi-select capability.

**User requirement**: Should allow selecting multiple scenarios simultaneously for comparison.

**Fix needed**: Change `activeId: string | null` to `activeIds: string[]` and update the toggle logic to add/remove from the array.

---

### 1.4 NetWorthTimelineWidget — Old Styling (NOT RESTYLED)

**Problem**: Uses old `dark:` prefix classes throughout (11 occurrences):
- `dark:bg-gray-800`, `dark:text-gray-100`, `dark:text-gray-300`, `dark:text-gray-400`, `dark:border-gray-700`, `dark:hover:bg-gray-700`
- Uses `bg-white`, `bg-blue-500`, `text-gray-*` patterns
- Does NOT use `glass-card`, `surface-container`, or the new design tokens

**Impact**: Visually inconsistent with the rest of the Summary page. Looks like it belongs to a different app.

---

### 1.5 FinancialCalendarWidget — Functional But Partially Styled

**Problem**: Uses the new design tokens (`text-on-surface`, `border-outline-variant`, `bg-surface-container-highest`) but wraps in a `Card` component rather than `glass-card`. It's mostly consistent but doesn't match the visual weight of other Summary widgets.

**Status**: Minor inconsistency, low priority.

---

## 2. LOST INFO — Data Previously Shown, Now Hidden

### 2.1 Summary Page — Missing Components

The OLD Summary page (based on the components that still exist but aren't rendered) showed:

| Component | Old Behavior | New Behavior |
|-----------|-------------|--------------|
| `TotalsSummary` | Grid of currency cards + consolidated total | Replaced by `NetWorthHero` (shows same data differently — OK) |
| `SpendingCard` | Today/week/month spending with comparison | **NOT rendered on Summary page** |
| `FixedExpensesSummary` | Full table of all expenses by account/group | Replaced by `FixedObligationsWidget` (4-line summary only) |
| `CurrencySection` / `CurrencyBreakdownSection` | Per-currency account breakdown | Replaced by `CapitalBreakdown` (shows all accounts, OK) |
| `AccountSummaryCard` / `AccountSummaryCardCompact` | Detailed per-account cards | Replaced by `AccountSummaryRow` (compact rows, OK) |
| `InvestmentCard` / `InvestmentCardCompact` | Investment details with gain/loss | Integrated into `AccountSummaryRow` via `investmentData` prop |
| `CDSummaryCard` / `CDSummaryCardCompact` | CD account details | Integrated into account rows |

**Critical losses**:
1. **SpendingCard** — Not rendered anywhere on Summary. The `LiquidityConsumptionCard` partially replaces it (shows today + week) but doesn't have the month view or the period toggle.
2. **FixedExpensesSummary detail** — Went from full table to 4-line summary. Massive information loss.

### 2.2 FixedObligationsWidget vs FixedExpensesSummary

| Feature | Old (FixedExpensesSummary) | New (FixedObligationsWidget) |
|---------|---------------------------|------------------------------|
| Shows all sub-pockets | Yes (every row) | No (only group summaries) |
| Shows individual balances | Yes | No |
| Shows individual targets | Yes | No |
| Shows per-account grouping | Yes (with account color) | No |
| Shows group totals | Yes | No (only overall %) |
| Shows overall total amount | Yes (big number) | No (only % reached) |
| Shows enabled/disabled state | Yes (strikethrough + OFF badge) | No (filters out disabled) |
| Shows progress per expense | Yes (individual progress bars) | No (only per-group bar) |
| Max items shown | All | 4 groups max |

---

## 3. INCONSISTENT — Different Patterns for Same Actions

### 3.1 Form Presentation Pattern

| Action | Current Pattern | Component Used |
|--------|----------------|----------------|
| Create Account | **Modal** | `<Modal>` wrapping `AccountForm` |
| Edit Account | **Modal** | `<Modal>` wrapping `AccountForm` |
| Create/Edit Pocket | **SidePanel** | `<SidePanel>` wrapping `PocketManagementSection` |
| Create/Edit Movement | **Custom fullscreen overlay** | `MovementFormPanel` (custom modal with side panels) |
| Batch Add Movements | **Custom fullscreen overlay** | Same `MovementFormPanel` |
| Create/Edit Reminder | **Modal** | `<Modal>` wrapping `ReminderForm` |
| Create/Edit Fixed Expense | **Modal** | `<Modal>` wrapping `FixedExpenseForm` |
| Create/Edit Fixed Expense Group | **Modal** | `<Modal>` wrapping `FixedExpenseGroupForm` |
| Create/Edit Template | **Modal** | `<Modal>` wrapping `MovementTemplateForm` |
| Create/Edit Budget Scenario | **Modal** | `<Modal>` wrapping `ScenarioForm` |
| Create CD Account | **Modal** | `<Modal>` wrapping `CDAccountForm` |

**Inconsistencies**:
1. Account creation = Modal, but Pocket creation = SidePanel (user flagged this)
2. Movement creation = Custom fullscreen overlay (neither Modal nor SidePanel)
3. User preference: **SidePanel for everything where possible**

**Recommendation**: Standardize on SidePanel for all create/edit forms. Reserve Modal for confirmations and small dialogs only. The Movement form's custom overlay could become a SidePanel with the calculator/context as a secondary panel.

---

## 4. NOT RESTYLED — Pages and Components Using Old Design

### 4.1 Pages Not Yet Rebuilt

| Page | Status | Issues |
|------|--------|--------|
| **FixedExpensesPage** | Functional but uses old `Card` + `Modal` patterns | Uses `FixedExpensesSummary` (old table style), no glass-card |
| **TemplatesPage** | Functional, basic styling | Uses `Card` component, no glass-card, no modern layout |
| **SettingsPage** | Functional, clean layout | Uses `Card`, reasonable styling but not glass-card |
| **ReportsPage** | Functional, tab-based | Uses `Card` + `PageHeader`, not restyled |
| **LoginPage** | Has glass-like styling already | Uses inline `bg-[rgba(27,33,34,0.8)] backdrop-blur-[12px]` — close to new style |
| **SignUpPage** | Same as LoginPage | Same inline glass styling |

### 4.2 Components With Most Old Styling (Top 15 by occurrence count)

| Component | `dark:`/`bg-white`/`bg-gray-*` count |
|-----------|--------------------------------------|
| `CDDetailsPanel.tsx` | 58 |
| `AccountContextPanel.tsx` | 22 |
| `ScenarioForm.tsx` | 20 |
| `MarkAsPaidModal.tsx` | 18 |
| `CDPreviewSection.tsx` | 16 |
| `ColorPickerModal.tsx` | 15 |
| `NetWorthTimelineWidget.tsx` | 11 |
| `TemplateCard.tsx` | 11 |
| `ConfirmDialog.tsx` | 11 |
| `ReminderForm.tsx` | 11 |
| `ProgressBar.tsx` | 10 |
| `Toast.tsx` | 10 |
| `DebugExchangeRate.tsx` | 9 |
| `DebugStockPrice.tsx` | 9 |
| `QuickCalculator.tsx` | 9 |

**Total**: 51 files, 352 occurrences of old styling patterns.

### 4.3 Components Using New `glass-card` Pattern (13 files)

- AccountCard, CDAccountCard
- QuickAddMovement, MovementList
- NetWorthHero, AccountSummaryRow, LiquidityConsumptionCard, FixedObligationsWidget
- BudgetScenarioTabs, BudgetIncomeCard, AllocationStrategy, PortfolioDonutChart
- index.css (definition)

---

## 5. MISSING — Features That Should Exist But Don't

### 5.1 No Way to Open Pocket Management from Account Card

**Problem**: The AccountCard has an `onAddPocket` callback that opens the SidePanel, but there's no dedicated "Manage Pockets" button visible on the card. The only way to access pocket management is clicking the card itself (which calls `onSelect` → opens SidePanel). This is not discoverable.

**User reported**: "Account grid lost pocket management access (need a way to open pocket editing from the card)"

### 5.2 Budget Sliders — No Manual Input

**Problem**: `AllocationSliderRow` only has a slider. User wants the ability to type a percentage OR a dollar amount, with the other auto-calculating and the slider moving to match.

**User reported**: "Budget sliders should allow manual % or $ input that auto-calculates the other value + moves the slider"

### 5.3 No SpendingCard on Summary Page

The `SpendingCard` component exists and works, but it's not rendered on the new Summary page. The `LiquidityConsumptionCard` partially covers this but lacks the month view and period toggle.

---

## 6. Priority Fix Order

### Critical (User-reported, blocking)
1. **RemindersWidget height** — Add max-height constraint
2. **FixedObligationsWidget** — Expand to show all sub-pockets, amounts, totals per group, overall total
3. **Form consistency** — Standardize on SidePanel (Account creation should use SidePanel, not Modal)
4. **BudgetScenarioTabs** — Enable multi-selection
5. **Summary page info density** — Add SpendingCard back or merge its data into LiquidityConsumptionCard

### High (Visual inconsistency)
6. **NetWorthTimelineWidget** — Restyle to use new design tokens
7. **CDDetailsPanel** — Restyle (58 old-style occurrences)
8. **AccountContextPanel** — Restyle (22 old-style occurrences)
9. **ConfirmDialog** — Restyle (11 old-style occurrences, used everywhere)
10. **Toast** — Restyle (10 old-style occurrences, visible globally)

### Medium (Pages not rebuilt)
11. **FixedExpensesPage** — Full rebuild with glass-card design
12. **TemplatesPage** — Restyle with new design system
13. **ReportsPage** — Restyle with new design system
14. **SettingsPage** — Restyle with new design system

### Low (Polish)
15. **Login/SignUpPage** — Already close to new style, minor tweaks
16. **ProgressBar, ColorPickerModal, ScenarioForm** — Restyle
17. **Debug components** — Low priority, dev-only

---

## 7. Stitch Design References Needed

### Screens That Need Stitch Output

#### 7.1 Fixed Expenses Widget (Summary Page)

```
Stitch prompt:
"Design a compact fixed expenses summary widget for a dark-themed finance dashboard. 
It should show:
- Overall progress bar with total contributed vs total target
- Grouped sections (collapsible) with group name, group total, and progress
- Under each group: individual expense rows showing name, contributed amount, target amount, and a thin progress bar
- Color-coded by group
- Maximum height with scroll if content overflows
- Glass-morphism card style with subtle borders
- Monospace font for numbers
- Dark background (#1b2122), primary color teal/cyan
Style: modern, futuristic, clean. Similar to a Bloomberg terminal widget."
```

#### 7.2 Fixed Expenses Full Page

```
Stitch prompt:
"Design a full-page fixed expenses management view for a dark-themed finance app.
Layout:
- Header with stats (total monthly, enabled count, action buttons)
- Summary table showing all expenses grouped by account and expense group
- Below: draggable group cards with individual expense rows
- Each expense row: name, balance, target, progress bar, toggle, edit/delete actions
- Group headers with color dot, name, total, collapse toggle
- Glass-morphism cards, dark background (#1b2122), teal/cyan primary
- Monospace numbers, uppercase tracking labels
Style: modern futuristic dashboard, clean data density."
```

#### 7.3 Reminders Widget (Summary Page)

```
Stitch prompt:
"Design a compact reminders/upcoming payments widget for a dark finance dashboard.
Requirements:
- Fixed max height (400px) with internal scroll
- Month section headers (sticky)
- Reminder cards showing: name, amount, due date, status badge (overdue/upcoming/paid)
- Overdue items highlighted in red/amber
- Compact card layout, 2-3 lines per reminder max
- Action buttons on hover (pay, edit, delete)
- Glass-morphism card, dark background, teal primary
- Show/hide paid toggle in header
Style: clean, information-dense but not cluttered."
```

#### 7.4 Budget Planning — Multi-Select Scenarios + Manual Input Sliders

```
Stitch prompt:
"Design a budget planning interface with:
1. Scenario tabs that support multi-selection (chips with checkmarks, not radio buttons)
2. Allocation sliders where each row has:
   - Label (pocket name)
   - Slider
   - Percentage input field (editable, auto-syncs with slider)
   - Dollar amount field (editable, auto-calculates from percentage)
   - Color indicator
3. Dark theme, glass-morphism cards
4. Monospace numbers, clean layout
Style: modern financial planning tool, dark background (#1b2122), teal/cyan primary."
```

#### 7.5 Net Worth Timeline Widget (Restyled)

```
Stitch prompt:
"Design a net worth timeline chart widget for a dark finance dashboard.
Requirements:
- Line/area chart showing net worth over time
- View toggle: Total vs By Currency (stacked)
- Date range buttons: 30d, 6m, 1y, All
- Show variation % toggle
- Latest value display below chart
- Click-to-edit hint
- Glass-morphism card style, dark background (#1b2122)
- Chart colors: teal primary, muted secondary currencies
- No bg-white or light-mode patterns
Style: modern, futuristic, matches glass-card design system."
```

#### 7.6 Templates Page

```
Stitch prompt:
"Design a movement templates management page for a dark finance app.
Layout:
- Header with title, description, 'New Template' button
- Grid of template cards (3 columns on desktop)
- Each card shows: template name, type badge (income/expense), account, pocket, default amount
- Hover actions: edit, delete, use template
- Empty state with illustration
- Glass-morphism cards, dark background (#1b2122), teal primary
Style: clean card grid, modern dashboard aesthetic."
```

#### 7.7 Settings Page

```
Stitch prompt:
"Design a settings page for a dark-themed finance app.
Sections:
- Preferences (currency, display mode, date format, snapshot frequency)
- Default accounts (expense/income defaults)
- Export/Import data
- Danger zone (delete account)
Layout: two-column on desktop, single column on mobile
- Each section in a glass-morphism card
- Form controls: selects, toggles, number inputs
- Dark background (#1b2122), teal primary
Style: clean, spacious, modern settings panel."
```

#### 7.8 Reports Page

```
Stitch prompt:
"Design a reports/analytics page for a dark finance dashboard.
Features:
- Period selector (this month, last month, custom range)
- Tab navigation: By Category, Monthly Trend, Category Trend, Top Expenses
- Chart area (pie/donut for category, line for trends, bar for top expenses)
- Glass-morphism card containing the chart
- Dark background (#1b2122), teal primary
- Chart colors: varied but cohesive palette
Style: modern analytics dashboard, clean data visualization."
```

#### 7.9 Unified Form Pattern (SidePanel)

```
Stitch prompt:
"Design a side panel form pattern for a dark finance app.
The side panel slides in from the right and contains:
- Header with title and close button
- Form fields (inputs, selects, color pickers)
- Action buttons at bottom (Cancel, Save)
- Optional: secondary info panel below the form
Use cases: Create Account, Create Pocket, Edit Reminder, Create Template
- Width: ~480px on desktop
- Full height, scrollable content area
- Glass-morphism background, dark theme (#1b2122), teal primary
- Backdrop overlay on the rest of the page
Style: modern slide-over panel, clean form layout."
```

---

## 8. Summary of All Findings

| Category | Count | Priority |
|----------|-------|----------|
| BROKEN | 3 (RemindersWidget, FixedObligationsWidget, BudgetScenarioTabs) | Critical |
| LOST INFO | 2 (FixedExpenses detail, SpendingCard missing) | Critical |
| INCONSISTENT | 1 major (Modal vs SidePanel for forms) | Critical |
| NOT RESTYLED | 51 files / 5 pages | High-Medium |
| MISSING | 3 (pocket access, manual budget input, spending on summary) | High |

**Total effort estimate**: ~8-12 focused implementation tasks, best split across multiple coder waves.
