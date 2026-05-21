# Stitch Prompt — Direction 1: Clean Financial Dashboard

## App Overview

A personal finance management web application for tracking accounts, transactions, budgets, fixed expenses, reminders, investments, and net worth across multiple currencies. Single-user, desktop-primary with mobile responsiveness. The app is data-dense — users want to see everything at a glance without navigating away.

## Vibe / Adjectives

Professional, trustworthy, data-dense, modern-futuristic, clean, precise, calm authority. Think: a Bloomberg terminal had a baby with a premium banking app — powerful but not intimidating.

## Color Scheme

- **Mode**: Dark mode primary (with light mode toggle)
- **Background**: Deep charcoal/slate (`#0f1117` base, `#1a1d27` cards)
- **Surface layers**: Subtle elevation via slightly lighter grays with glass-morphism (frosted glass cards with `backdrop-blur`, faint white border at 5-8% opacity)
- **Accent primary**: Cool teal/cyan (`#06b6d4` → `#22d3ee` gradient)
- **Accent secondary**: Muted blue (`#3b82f6`)
- **Success/Income**: Emerald green (`#10b981`)
- **Expense/Danger**: Soft red (`#ef4444`)
- **Warning**: Amber (`#f59e0b`)
- **Text primary**: White at 90% opacity
- **Text secondary**: White at 55% opacity
- **Borders**: White at 6-8% opacity
- **Light mode**: Invert to white backgrounds, dark text, same accent colors but slightly deeper

## Typography

- **Headings**: Inter or SF Pro Display, semi-bold, clean sans-serif
- **Body**: Inter, regular weight
- **Financial numbers**: JetBrains Mono or SF Mono — monospace/tabular figures for all currency amounts, percentages, and numeric data. Right-aligned in tables.
- **Sizes**: Compact — body at 14px, small labels at 12px, large totals at 28-32px

## Navigation Structure

### Desktop (md+)
- **Fixed left sidebar** (width: 260px)
  - Top: App logo (abstract geometric dollar sign icon, teal gradient) + app name "Finance"
  - Theme toggle (sun/moon icon)
  - Navigation links (pill-shaped active state with teal gradient glow):
    - Summary (home icon)
    - Accounts (wallet icon)
    - Fixed Expenses (target icon)
    - Budget (calendar/pie icon)
    - Movements (trending-up icon)
    - Templates (file-text icon)
    - Settings (gear icon)
  - Bottom: User email + sign out button

### Mobile (<md)
- **Fixed top header**: Logo + theme toggle + hamburger menu
- **Slide-down drawer overlay**: Full navigation list when hamburger tapped
- **Fixed bottom tab bar** (4 shortcuts + Menu):
  - Home, Movements, Accounts, Budget, Menu (opens drawer)

### Quick Actions
- **Floating Action Button** (bottom-right on desktop, above bottom nav on mobile): "+" icon, opens quick-add movement modal
- **Keyboard shortcut**: Ctrl+Shift+M opens quick-add

---

## Pages

### 1. Summary / Dashboard (Home)

The command center. Maximum information density without clutter.

**Layout**: Single scrollable page with a grid system.

**Sections (top to bottom)**:

1. **Total Net Worth Banner**
   - Large monospace number showing consolidated total in primary currency
   - Subtitle: "across X accounts, Y currencies"
   - Small pill badges showing per-currency totals (e.g., "USD $12,340 | MXN $45,000 | COP $2,100,000")
   - Subtle up/down arrow with percentage change from last snapshot

2. **Spending Card** (full width)
   - "This Week" and "Today" spending totals
   - Comparison to last week ("+12% vs last week" in red/green)
   - Mini sparkline chart showing daily spending for the past 7 days

3. **Two-column grid** (desktop), single column (mobile):

   **Left column**:
   - **Currency Breakdown Section**: Grouped by currency, each showing account cards
     - Account cards: Glass-morphism card with colored left border (user-chosen color), account name, balance in monospace, mini pocket breakdown below
     - Investment accounts: Show stock symbol, shares, current price, gain/loss percentage with green/red coloring
     - CD accounts: Show maturity date, interest rate, progress bar to maturity

   **Right column**:
   - **Financial Calendar Widget**: Mini calendar showing upcoming movements/reminders as colored dots on dates. Click a date to see details.
   - **Net Worth Timeline Widget**: Small line chart (last 6 months) with teal gradient fill. "View Full" link.
   - **Reminders Widget**: Scrollable list of upcoming reminders with due dates, amounts, "Pay Now" and "Dismiss" buttons. Grouped by month.
   - **Fixed Expenses Summary**: Progress bars showing contribution status for each fixed expense. Overall progress percentage.

4. **Floating Stats Bar** (sticky at bottom of viewport on scroll): Compact bar showing key stats (total balance, today's spending, pending movements count)

---

### 2. Accounts Page

**Layout**: Grid of account cards with management capabilities.

**Header**: "Accounts" title + "Add Account" button (teal outline)

**Account Cards** (responsive grid: 1 col mobile, 2 col tablet, 3 col desktop):
- Glass card with colored top border (user-assigned color)
- Account name, currency badge, total balance (large monospace)
- Expandable pocket list below:
  - Each pocket: name + balance, inline editable
  - "Add Pocket" button at bottom
- Card actions: Edit (pencil), Delete (trash with confirmation dialog)
- Drag handle for reordering

**Account Form Modal**:
- Fields: Name, Currency (dropdown: USD/MXN/COP/EUR/GBP), Color (color picker grid), Account Type (normal/investment/CD)
- Investment fields: Stock symbol, shares owned
- CD fields: Principal, interest rate, start date, maturity date

**Pocket Management** (within account detail panel):
- List of pockets with balances
- Add/edit/delete pockets
- Pocket form: Name, type (normal/fixed)

---

### 3. Movements Page

The transaction ledger. Optimized for scanning and quick entry.

**Header**: "Movements" title + "Add Movement" button + "Batch Add" button

**Quick Add Strip** (always visible at top):
- Inline form: Amount input (large) + type toggle (income/expense/transfer) + account/pocket dropdowns + "Add" button
- Remembers last-used account/pocket
- "More options" expands to full form

**Filters Bar** (collapsible):
- Date range picker (presets: Today, This Week, This Month, Last Month, Custom)
- Type filter (Income/Expense/Transfer/All)
- Account filter (multi-select)
- Category filter (multi-select)
- Tag filter
- Search by notes
- "Pending only" toggle

**Movement List**:
- Table-like layout on desktop, card list on mobile
- Columns: Date, Type (colored icon), Amount (monospace, green for income, red for expense), Account → Pocket, Category badge, Notes (truncated), Tags
- Inline editable amount (click to edit, Enter to save)
- Row actions: Edit, Delete, Duplicate, Save as Template
- Bulk selection with toolbar: Delete selected, Change category
- Pending movements: Dashed border, muted opacity, "Convert to Actual" action
- Orphaned movements: Subtle warning indicator showing they belong to a deleted account

**Pagination**: "Load more" or infinite scroll with page size setting

**Full Movement Form** (slide-in panel from right):
- Type selector (income/expense/transfer)
- Amount input with currency display
- Account + Pocket cascading selectors (visual card-style picker)
- For transfers: "From" and "To" account/pocket selectors with arrow between
- Date picker (defaults to today)
- Category selector (grid of category icons/labels)
- Tags input (autocomplete from existing tags)
- Notes textarea
- "Pending" toggle
- "Save as Template" checkbox
- Quick calculator widget (expandable)

**Batch Movement Form**:
- Spreadsheet-like rows for entering multiple movements at once
- Add row button, remove row button per row
- Shared date/account fields with per-row override option
- "Save All" button

---

### 4. Budget Planning Page

Visual income distribution tool.

**Layout**: Top-to-bottom flow.

**Income Section**:
- Large input: "Monthly Income" (remembers last value)
- Currency display next to amount

**Fixed Expenses Deduction**:
- Auto-calculated total from Fixed Expenses page
- Shows as a subtraction: "Income - Fixed Expenses = Distributable"
- Distributable amount highlighted in teal

**Distribution Section**:
- List of budget entries (one per pocket/category)
- Each row: Label, percentage slider/input, calculated amount (monospace), color dot
- Percentages must sum to 100% — show remaining percentage
- Donut chart visualization on the side showing distribution
- "Generate Movements" button: Creates actual movements distributing money to pockets

**Scenario Section**:
- Save multiple budget scenarios (e.g., "Normal Month", "Holiday Month")
- Switch between scenarios
- Compare scenarios side-by-side

---

### 5. Fixed Expenses Page

Recurring bill tracking with contribution progress.

**Header**: "Fixed Expenses" + "Add Group" button

**Groups** (collapsible sections):
- Group card with name, total monthly amount, overall progress bar
- Inside each group: list of individual fixed expenses

**Individual Fixed Expense Card**:
- Name, target amount, periodicity (monthly/biweekly/weekly)
- Progress bar showing current contribution vs target (teal fill, animated)
- Monthly contribution amount (auto-calculated)
- Enable/disable toggle
- Edit/delete actions

**Fixed Expense Form Modal**:
- Fields: Name, Target Amount, Periodicity, Group assignment, Enabled toggle

---

### 6. Templates Page

Saved transaction patterns for quick reuse.

**Layout**: Grid of template cards.

**Template Card**:
- Glass card showing: Template name, type (income/expense), amount, target account/pocket
- "Use" button (creates a movement from template)
- Edit/delete actions

**Template Form**:
- Same fields as Movement Form but saved as a reusable pattern
- Name field for the template

---

### 7. Settings Page

Organized preferences with clear hierarchy.

**Sections** (vertical stack with dividers):

1. **Preferences**
   - Theme: Dark/Light/System toggle
   - Primary Currency: Dropdown
   - Date Format: Dropdown
   - Account Card Display: Compact/Detailed per type
   - Movements per page
   - Reminder advance warning days

2. **Default Accounts**
   - Default account for expenses
   - Default account for income
   - Account/pocket selectors

3. **Data Management**
   - Export data (CSV/JSON)
   - Import data

4. **Debug Tools** (collapsible, subtle)
   - Stock price checker
   - Exchange rate checker

5. **Danger Zone** (red-bordered section)
   - Delete all data
   - Sign out everywhere

---

## Key Components (Design System)

### Cards
- Glass-morphism: Semi-transparent background, backdrop-blur, subtle border (white 6% opacity)
- Rounded corners: 12-16px
- Subtle shadow in light mode, glow effect in dark mode
- Hover: Slight scale (1.01) + border brightens

### Buttons
- Primary: Teal gradient fill, white text, rounded-xl
- Secondary: Transparent with teal border, teal text
- Danger: Red fill or red outline
- Ghost: No border, text only, hover shows background
- All: Subtle hover scale animation (1.02)

### Forms
- Inputs: Dark background (`#1e2130`), subtle border, focus ring in teal
- Labels: Small, uppercase, muted text above inputs
- Selects: Custom styled dropdowns matching dark theme
- Validation: Red border + error message below

### Modals
- Centered overlay with backdrop blur
- Glass card style
- Slide-up animation on mobile, fade-in on desktop
- Close button (X) top-right + click-outside-to-close

### Progress Bars
- Rounded, thin (6-8px height)
- Teal gradient fill with subtle animation
- Background: dark gray track
- Optional: Animated shimmer on active progress

### Charts
- Line charts: Teal gradient fill below line, white line
- Donut charts: Segmented with gaps, teal/blue/purple palette
- Sparklines: Minimal, no axes, just the line
- All charts: Dark background, white/gray labels

### Currency Display
- Always monospace font
- Right-aligned in tables
- Currency symbol prefix ($ for USD/MXN/COP, € for EUR, £ for GBP)
- Thousands separator (comma)
- Green for positive/income, red for negative/expense
- Large amounts: 28-32px, regular amounts: 14-16px

### Empty States
- Centered icon (muted), title, description, CTA button
- Friendly but minimal

### Loading States
- Skeleton screens matching card/list shapes
- Subtle pulse animation
- No spinners — skeletons only

### Toasts/Notifications
- Bottom-right stack
- Glass card style with colored left border (green success, red error, amber warning)
- Auto-dismiss after 4 seconds

---

## Interactions & Micro-animations

- Page transitions: Subtle fade (no slide)
- Card hover: Scale 1.01 + border glow
- Button press: Scale 0.98
- Modal open: Backdrop fade + card slide-up
- Number changes: Animated counter (counts up/down to new value)
- Progress bars: Smooth width transition on value change
- Sidebar active item: Gradient pill with subtle glow shadow
- FAB: Pulse animation when idle, rotate icon on open
- Drag-and-drop: Lifted card shadow + placeholder ghost

---

## Mobile Responsiveness Notes

- **Breakpoint**: md (768px) is the primary split between mobile and desktop layouts
- **Desktop**: Sidebar + wide content area, multi-column grids, table layouts
- **Mobile**: Bottom nav + top header, single column, cards stack vertically, tables become card lists
- **Touch targets**: Minimum 44px tap targets on mobile
- **Bottom safe area**: Account for iOS home indicator (`pb-safe`)
- **Drawer navigation**: Full nav accessible via hamburger/menu button
- **Quick-add**: Full-screen modal on mobile, floating panel on desktop
- **Forms**: Full-width inputs on mobile, inline/side-panel on desktop
- **Charts**: Simplified on mobile (fewer data points, no hover tooltips — tap instead)

---

## Additional Design Notes

- All financial amounts use tabular/monospace figures for alignment
- Multi-currency support: Show currency code badge next to amounts when context is ambiguous
- Supported currencies: USD, MXN, COP, EUR, GBP
- Dark mode is the DEFAULT — light mode is the alternative
- No decorative illustrations — the data IS the visual interest
- Density over whitespace — users want to see more, not less
- Keyboard-friendly: All actions reachable via keyboard, visible focus rings
- The app should feel like a professional tool, not a toy — but approachable, not intimidating
