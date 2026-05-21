# Stitch Prompt — Finance App: "Warm Productivity" Direction

## App Overview

Design a complete personal finance management web application called "Finance App." It is a desktop-first (responsive to mobile) single-page app for tracking accounts, movements (transactions), budgets, fixed expenses, reminders, net worth, and investments. The user is a power user who values information density, keyboard shortcuts, and fast data entry. The app supports dark mode as the primary theme.

## Design Direction: Warm Productivity

**Vibe**: Friendly but serious. Warm tones. Productivity-focused. Modern and slightly futuristic without being cold or sterile.

**Color Palette (Dark Mode — Primary)**:
- Background: Dark brown-gray (#1a1816, #221f1c, #2a2622) — NOT blue-gray
- Surface/Cards: Warm dark (#2e2a26, #363230)
- Borders: Warm gray with low opacity (#4a4440)
- Primary text: Warm white (#f5f0eb)
- Secondary text: Warm gray (#a89f96)
- Accent primary: Warm amber/gold (#e5a84b, #d4943a) — used for CTAs, highlights, active states
- Accent secondary: Soft coral (#e07a5f) — used for expense indicators, warnings
- Success: Warm green (#7fb069)
- Danger: Muted red (#c44536)
- Income indicator: Warm teal (#5fa8a0)
- Expense indicator: Soft coral (#e07a5f)

**Color Palette (Light Mode)**:
- Background: Warm cream (#faf7f4, #f5f1ed)
- Surface/Cards: White with warm tint (#fffcf9)
- Borders: Sand (#e8e0d8)
- Primary text: Dark brown (#2a2420)
- Accent primary: Deep amber (#c4842e)
- Same accent logic as dark mode, slightly deeper

**Typography**:
- Font family: Inter (headings), Inter (body) — clean geometric sans-serif
- Headings: Semi-bold, tight letter-spacing (-0.02em)
- Body: Regular weight, comfortable line-height (1.6)
- Monospace for amounts: JetBrains Mono or SF Mono
- Size scale: 12px (caption), 14px (body), 16px (large body), 20px (h3), 24px (h2), 32px (h1)

**Border Radius**: 8px for cards, 6px for inputs/buttons, 12px for modals — rounded but not bubbly

**Shadows**: Minimal. Use subtle warm-toned shadows (rgba(30, 20, 10, 0.1)) instead of cool gray shadows

**Spacing**: 8px grid system. Dense but organized — 16px padding inside cards, 24px gaps between sections

**Inspiration**: Todoist's task density, Things 3's warmth and polish, Arc browser's sidebar navigation, Raycast's command palette aesthetic

---

## Global Layout

### Desktop (≥768px)

Fixed left sidebar (256px wide) + scrollable main content area with 32px padding.

**Sidebar**:
- Top: App logo (warm amber gradient icon) + app name "Finance App" in gradient text
- Theme toggle button (sun/moon icon) aligned right of logo
- Navigation: Vertical list of nav items with icons. Active item has warm amber gradient background with white text and subtle glow shadow. Inactive items are warm gray, hover shows warm surface highlight.
- Nav items: Summary (Home icon), Accounts (Wallet), Fixed Expenses (Target), Budget (Calendar), Movements (TrendingUp), Templates (FileText), Settings (Gear)
- Bottom: User email (truncated) + sign-out button

**Sidebar Active State**: Active nav item has a warm amber-to-gold gradient background, white text, slight scale(1.02), and a small pulsing dot indicator on the right.

### Mobile (<768px)

- No sidebar. Bottom navigation bar with 4 primary items (Home, Movements, Accounts, Budget) + a "More" hamburger that slides up a drawer with all nav items.
- Floating Action Button (bottom-right, above nav bar): Warm amber circle with "+" icon. Tap expands a small radial menu: "Quick Add" (lightning icon), "New Movement" (plus icon), "New Transfer" (arrows icon).
- Top: Minimal header with page title only.

### Quick-Add Modal (Global — Cmd+Shift+M)

A Raycast-style command palette overlay. Centered, 480px wide, dark surface with warm border glow.
- Single input field at top (auto-focused): type amount
- Below: movement type toggle (Income/Expense/Transfer) as segmented control with amber highlight on active
- Below: auto-selected account+pocket (last used, shown as small pill badges)
- "More options" link expands to full form
- "Save" button (amber) + keyboard hint "⌘+Enter"
- Appears with backdrop blur, dismisses on Escape

---

## Page: Summary (Dashboard)

The home page. Information-dense overview of financial health.

### Layout (Desktop)

Two-column grid (60/40 split on large screens, stacked on smaller).

**Left Column (Primary)**:

1. **Totals Summary Bar**: Horizontal card spanning full width. Shows:
   - Total balance (large, monospace, amber-highlighted number)
   - Per-currency breakdown as small pills (e.g., "USD $12,340" "MXN $45,000")
   - Consolidated total in primary currency with conversion indicator
   - Subtle warm gradient border on the card

2. **Spending Card**: Card with period toggle tabs (Today / This Week / This Month). Shows:
   - Total spent in selected period (large number)
   - Percentage change vs previous period (green arrow up = less spending, coral arrow down = more)
   - Comparison label ("vs last week")
   - Warm amber accent on the active tab

3. **Accounts by Currency**: Collapsible sections per currency. Each section header shows currency code + total. Inside: account cards in a grid.
   - **Account Card**: Shows account name, color dot, balance (monospace), pocket count badge. Hover reveals quick-action icons (edit, view). Investment accounts show stock ticker + gain/loss percentage. CD accounts show maturity date + interest rate.
   - Cards have subtle left border in the account's assigned color.

**Right Column (Secondary)**:

4. **Financial Calendar Widget**: Mini calendar showing days with upcoming reminders/movements marked with colored dots. Click a day to see details in a tooltip.

5. **Net Worth Timeline Widget**: Compact sparkline chart (Recharts) showing net worth over last 6 months. Hover shows exact value. "View Full" link.

6. **Reminders Widget**: Scrollable list (max 400px height) of upcoming reminders grouped by month. Each reminder shows: name, amount, due date, recurrence badge (monthly/weekly pill), and action buttons (Pay Now, Dismiss). Overdue items highlighted with coral left border.

7. **Fixed Expenses Summary**: Progress bars for each fixed expense sub-pocket showing contribution progress toward monthly target. Group headers with total/target. Amber fill on progress bars.

### Floating Stats Bar

Sticky bar at bottom of viewport (desktop only). Shows: total income this month, total expenses this month, net (income - expenses). Semi-transparent warm dark background with blur.

---

## Page: Accounts

### Layout

Page header: "Accounts" title + "Add Account" button (amber, with plus icon).

Grid of account cards (2-3 columns on desktop, 1 on mobile). Each card:
- Account color as left border (4px)
- Account name (bold), currency badge (small pill)
- Total balance (large, monospace)
- Pocket list below: each pocket as a row with name + balance. Fixed-type pockets have a "Fixed" badge.
- Hover: subtle elevation increase, action icons appear (Edit, Delete, Manage Pockets)
- Click: expands inline detail panel OR opens side panel

**Account Form Modal** (for create/edit):
- Fields: Name (text), Currency (select dropdown), Color (color picker grid — 12 preset warm-toned colors + custom), Type (normal/investment/CD)
- Investment accounts: additional fields for stock symbol, shares
- CD accounts: fields for principal, interest rate, term, maturity date
- Form has clear section grouping with subtle dividers

**Pocket Management** (within account detail):
- List of pockets with drag-to-reorder (grip handle icon)
- Each pocket row: name, balance, type badge, edit/delete icons
- "Add Pocket" button at bottom
- Pocket form: name input + type select (normal/fixed)

---

## Page: Movements (Transactions)

The most complex page. Dense data table with powerful filtering.

### Layout

**Top Section**:
- Page header: "Movements" + action buttons row
- Buttons: "Add Movement" (amber primary), "Batch Add" (secondary/outline), "Templates" (ghost)
- Quick-Add inline bar (collapsible): simplified 3-field entry (amount, type toggle, notes) that auto-assigns to last-used account

**Filter Bar** (below header, always visible):
- Horizontal row of filter controls:
  - Date range picker (preset: Today, This Week, This Month, Custom)
  - Type filter: segmented control (All / Income / Expense / Transfer)
  - Account dropdown (multi-select)
  - Category dropdown (multi-select with colored dots)
  - Tags input (autocomplete chips)
  - Search text input (searches notes)
  - Sort dropdown (Date desc, Date asc, Amount desc, Amount asc)
- Active filters shown as dismissible pills below the bar
- "Clear All" link when filters active

**Movement List** (main content):
- Virtualized/paginated table. Each row:
  - Date (formatted per user settings, warm gray)
  - Type indicator: colored dot or icon (green up-arrow for income, coral down-arrow for expense, blue arrows for transfer)
  - Amount (monospace, colored by type — green/coral/blue)
  - Account → Pocket path (as breadcrumb-style text: "Savings > Travel")
  - Category badge (colored pill with category name)
  - Tags (small gray pills)
  - Notes (truncated, tooltip on hover)
  - Pending badge (if pending movement — amber outline pill "Pending")
  - Actions column: inline edit icon, delete icon (appear on hover)
- **Inline Amount Editing**: Click the amount → transforms to input field with amber focus ring → Enter saves, Escape cancels
- **Bulk Selection**: Checkbox column on left. When items selected, a toolbar appears above the list: "X selected" + "Delete Selected" (red) + "Change Category" (secondary)
- **Orphaned Movements**: Separate collapsible section at bottom with warning styling (coral border). Shows movements from deleted accounts with "Restore" action.

**Load More**: Button at bottom of list ("Load more movements") for infinite scroll pagination.

**Movement Form** (slide-in panel from right, 480px wide):
- Fields: Type (segmented control), Amount (large input with currency symbol), Date (date picker), Account (dropdown), Pocket (dropdown, filtered by account), Sub-pocket (if fixed pocket selected), Category (dropdown with colored dots + "Add new" option), Tags (chip input with autocomplete), Notes (textarea), Pending toggle (switch)
- "Save as Template" checkbox at bottom
- Save button (amber) + Cancel (ghost)
- Keyboard shortcut hints next to buttons

**Batch Movement Form** (modal, wider):
- Spreadsheet-like rows. Each row: date, type, amount, account, pocket, category, notes
- "Add Row" button, "Remove" icon per row
- "Save All" button

---

## Page: Fixed Expenses

### Layout

Page header: "Fixed Expenses" + "Add Expense" button + "Add Group" button (secondary)

**Summary Header Card**: Total monthly fixed expenses, total contributed this month, remaining to contribute. Progress bar (amber fill).

**Groups**: Collapsible card sections. Each group:
- Group name header with edit/delete icons
- List of sub-pockets (fixed expenses) inside:
  - Each row: expense name, monthly target amount, current balance, progress bar, periodicity badge (monthly/biweekly/weekly), enabled/disabled toggle
  - Progress bar: amber fill, shows percentage toward monthly target
  - Hover: edit/delete icons appear
- "Generate Movements" button per group (creates batch movements for all expenses in group)

**Fixed Expense Form** (modal):
- Fields: Name, Target Amount, Periodicity (select: monthly/biweekly/weekly), Account (select), Pocket (select — only fixed-type pockets), Enabled toggle
- Clear field labels with helper text

---

## Page: Budget Planning

### Layout

Page header: "Budget Planning"

**Income Section** (top card):
- Large input: "Monthly Income" with currency symbol prefix
- Remembered from last session (localStorage)
- Account selector: "Generate movements to:" dropdown for target account+pocket

**Fixed Expenses Deduction** (auto-calculated card):
- Shows total fixed expenses being deducted
- "Income after fixed expenses: $X" (highlighted in amber)

**Distribution Section** (main area):
- List of budget entries. Each entry row:
  - Name (editable inline)
  - Percentage input (with % suffix)
  - Calculated amount (auto-computed, monospace, read-only)
  - Target account+pocket selector
  - Delete icon
- "Add Entry" button at bottom
- Total percentage indicator (should sum to 100% — warning if over/under)
- Donut chart visualization showing distribution (warm color palette)

**Budget Summary Card** (sticky sidebar on desktop):
- Total income
- Fixed expenses deducted
- Distributed amount
- Remaining (unallocated)
- "Generate All Movements" button (amber, creates movements for all entries)

**Scenarios Section** (collapsible):
- Save/load different budget scenarios (e.g., "Normal Month", "Holiday Month")
- Scenario cards with name, date saved, "Load" button

---

## Page: Templates

### Layout

Page header: "Templates" + "Create Template" button (amber)

Grid of template cards (2-3 columns). Each card:
- Template name (bold)
- Type badge (Income/Expense/Transfer — colored)
- Default amount (if set, monospace)
- Target: Account → Pocket path
- Notes preview (truncated)
- Action buttons: "Use" (creates movement from template), "Edit", "Delete"
- "Use" button is amber and prominent

**Template Form** (modal):
- Fields: Name, Type (segmented), Account, Pocket, Default Amount (optional), Notes (optional)

---

## Page: Settings

### Layout

Page header: "Settings" with subtitle "Manage your application preferences and data."

Two-column layout on desktop (stacked on mobile).

**Left Column**:

1. **Preferences Section** (card):
   - Primary Currency (select)
   - Default Currency for new accounts (select)
   - Date Format (select: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD)
   - Movements per page (number input)
   - Reminder advance warning days (number input)
   - Snapshot frequency (select: daily/weekly/monthly)
   - Account card display (select: compact/detailed per type)
   - Each setting as a labeled row with control on the right

2. **Default Accounts Section** (card):
   - Default account for expenses (account+pocket selector)
   - Default account for income (account+pocket selector)

**Right Column**:

3. **Export/Import Section** (card):
   - "Export All Data" button (downloads JSON)
   - Import section (file upload area with drag-drop)

4. **Danger Zone Section** (card with coral/red border):
   - "Delete All Data" button (red, requires confirmation dialog)
   - Warning text about irreversibility

---

## Page: Login / Sign Up

Centered card on warm dark background. Subtle gradient overlay.

**Login**:
- App logo (large, centered)
- Email input
- Password input
- "Sign In" button (amber, full-width)
- "Don't have an account? Sign Up" link below

**Sign Up**:
- Same layout
- Email, Password, Confirm Password inputs
- "Create Account" button (amber)
- "Already have an account? Sign In" link

---

## Shared Components & Patterns

### Cards
- Warm dark surface (#2e2a26 in dark mode)
- 8px border-radius
- 1px border (warm gray, low opacity)
- 16px internal padding
- No heavy shadows — use border for definition

### Buttons
- **Primary (amber)**: Warm amber background, dark text, 6px radius, medium font-weight. Hover: slightly lighter. Active: slightly darker.
- **Secondary/Outline**: Transparent background, warm border, warm text. Hover: warm surface fill.
- **Ghost**: No border, warm text. Hover: subtle warm background.
- **Danger**: Muted red background, white text.
- All buttons: 36px height (default), 32px (small), 40px (large)

### Inputs
- Warm dark background (slightly lighter than card surface)
- 1px warm border, 6px radius
- Amber focus ring (2px, with glow)
- Placeholder text in warm gray
- 36px height

### Modals
- Centered overlay with backdrop blur (8px)
- 12px border-radius
- Warm dark surface
- Subtle amber glow on border (1px)
- Header with title + close button
- Footer with action buttons (right-aligned)
- Max-width: 480px (forms), 640px (batch forms), 800px (complex)

### Toasts/Notifications
- Bottom-right positioned
- Warm surface with colored left border (green=success, coral=error, amber=warning, blue=info)
- Auto-dismiss after 4 seconds
- Dismiss button (X)

### Empty States
- Centered icon (warm gray, 48px)
- Title text (warm white)
- Description text (warm gray)
- Optional CTA button (amber)

### Loading States
- Skeleton placeholders with warm shimmer animation (dark-to-slightly-lighter pulse)
- Skeleton shapes match the content they replace

### Category Badges
- Small pills (20px height) with colored dot + category name
- Colors: Food (orange), Transport (blue), Bills (purple), Entertainment (pink), Shopping (teal), Health (green), Education (indigo), Other (gray)
- Rounded-full shape

### Tags
- Smaller than category badges (18px height)
- Warm gray background, warm text
- Rounded-full

### Progress Bars
- 6px height, rounded-full
- Track: warm dark gray
- Fill: amber gradient (left to right, slightly lighter at leading edge)
- Animated fill on mount

### Keyboard Shortcut Hints
- Small monospace text in warm gray
- Shown next to relevant actions: "⌘⇧M" for quick-add, "⌘Enter" for save
- Visible on desktop only

### Confirm Dialog
- Modal with warning icon
- Clear description of destructive action
- "Cancel" (ghost) + "Confirm" (red for destructive, amber for normal)

### Connection Banner
- Full-width bar at top of viewport
- Coral background for offline/error state
- Amber for slow connection
- Auto-dismisses when connection restored

### Session Expired Modal
- Centered modal, non-dismissible
- "Your session has expired" message
- "Sign In Again" button (amber)

---

## Interactions & Micro-animations

- **Page transitions**: Subtle fade-in (150ms) when navigating between pages
- **Card hover**: Slight translateY(-1px) + border color brightens
- **Button press**: Scale(0.98) on active
- **Modal open**: Fade in backdrop (200ms) + slide up content (200ms, ease-out)
- **Toast appear**: Slide in from right (200ms)
- **Progress bar fill**: Animate width from 0 to target (600ms, ease-out)
- **Number changes**: Counter animation for balance updates (AnimatedCounter component)
- **Sidebar active item**: Smooth background-color transition (200ms)
- **Quick-add modal**: Scale from 0.95 to 1.0 + fade in (150ms)
- **Inline edit**: Smooth border-color transition to amber on focus

---

## Responsive Behavior

- **≥1280px**: Full two-column layouts, sidebar visible, all widgets shown
- **768-1279px**: Sidebar visible, single-column main content, widgets stack vertically
- **<768px**: No sidebar, bottom nav bar, FAB for quick actions, cards go full-width, tables become card-based lists, modals become full-screen sheets sliding up from bottom

---

## Key Design Principles

1. **Information density over whitespace**: Show more data per viewport. Users want to see their finances at a glance, not scroll through sparse layouts.
2. **Warm, not cold**: Every gray has warm undertones. No pure blacks or blue-grays. The app should feel like a well-lit workspace, not a terminal.
3. **Power-user visible**: Keyboard shortcuts shown inline. Bulk actions available. Inline editing. No unnecessary confirmation steps for non-destructive actions.
4. **Visual hierarchy through weight, not size**: Use font-weight, color intensity, and spacing to create hierarchy rather than dramatically different font sizes.
5. **Amber as the action color**: Every interactive element that invites action uses the warm amber accent. It draws the eye without being aggressive.
6. **Progress is visible**: Financial goals, fixed expense contributions, budget allocation — all have visual progress indicators (bars, percentages, charts).
7. **Dark mode is the default**: Design dark-first, light mode is the adaptation.
