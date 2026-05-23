# Finance App — Complete UI Design

## App Overview

A personal finance management web application for tracking accounts, movements (transactions), budgets, fixed expenses, reminders, net worth, and investments. Single-user, desktop-first with responsive mobile support. Supports multiple currencies (USD, MXN, COP, EUR, GBP) with real-time conversion. Dark mode and light mode required.

## Design Direction

Modern Minimal — calm, spacious, focused, futuristic-clean.

- Generous whitespace and breathing room between all elements
- Muted color palette: deep grays, warm whites, slate tones. One strong accent color (electric blue or violet) used sparingly for primary actions and active states
- Large, confident typography using a geometric sans-serif (Inter, Geist, or similar)
- Content-first: every screen has one clear primary action and a visual hierarchy that guides the eye
- Subtle micro-animations: fade-ins on mount, smooth transitions between states, gentle hover lifts on cards
- Dark mode uses deep grays (#0a0a0f, #111118, #1a1a24) — never pure black. Light mode uses warm whites (#fafaf9, #f5f5f4) — never sterile white
- Cards have very subtle borders (1px, low-opacity) or barely-there shadows — never heavy drop shadows
- Inspired by: Linear, Vercel dashboard, Notion, the Stitch website itself
- Rounded corners: medium (12px for cards, 8px for inputs, 20px for pills/badges)
- Icon style: Lucide icons, 20px, stroke-width 1.5, muted until active

## Navigation Structure

### Desktop (md+ breakpoint, 768px+)

Collapsible left sidebar, 240px expanded / 64px collapsed (icon-only mode).

Sidebar contents (top to bottom):
1. **App logo**: Minimal geometric mark + "Finance" wordmark in the expanded state. Just the mark when collapsed.
2. **Navigation links** (vertical list, pill-shaped active indicator):
   - Summary (home icon)
   - Accounts (wallet icon)
   - Movements (trending-up icon)
   - Fixed Expenses (target icon)
   - Budget (calendar icon)
   - Templates (file-text icon)
   - Settings (gear icon)
3. **Collapse toggle button** at the bottom of the nav list (chevron icon)
4. **Footer**: User email (truncated) + sign-out icon button

Active state: The active nav item has a subtle filled background in the accent color at 10% opacity with the accent color on the icon and text. No heavy gradients.

### Mobile (below md)

- **Top header bar**: App logo left, theme toggle right. Fixed position.
- **Bottom navigation bar**: 4 shortcut icons (Summary, Movements, Accounts, Budget) + a "More" hamburger that opens a full-screen drawer with all nav items.
- **Floating Action Button (FAB)**: Bottom-right, above the nav bar. Accent-colored circle with a "+" icon. Tapping expands a radial/vertical menu with: Quick Add, New Movement, New Transfer.

## Global Components

### Quick Add Modal (Cmd+Shift+M or FAB → Quick Add)

A centered overlay modal with backdrop blur. Compact form:
- Type toggle: two pill buttons — "Expense" (muted red when active) / "Income" (muted green when active)
- Amount input: large, monospace-style font, auto-focused
- Notes input: single line, placeholder "What for?"
- Submit button: accent-colored circle with checkmark icon
- "More options →" link that navigates to the full movement form
- Below the form: small muted text showing the auto-selected destination "→ Account / Pocket"

### Toast Notifications

Minimal bottom-right toasts. Thin accent-colored left border. Auto-dismiss after 3 seconds. Types: success (green), error (red), info (blue).

### Confirm Dialog

Centered modal, small (max-w-sm). Clear title, description, two buttons: Cancel (ghost) and Confirm (filled, red for destructive actions).

### Theme Toggle

Icon button: sun/moon icon. Smooth crossfade transition between icons.

### Connection Banner

Thin bar at the very top of the viewport when offline. Muted amber background, small text: "You're offline — changes will sync when reconnected."

---

## Page: Summary (Dashboard)

The home screen. A single-column layout on mobile, two-column grid on desktop (left column wider).

### Sections (top to bottom):

**1. Page Header**
- Title: "Summary" in large bold text (32px)
- No action buttons on this page

**2. Totals Summary**
- A prominent card showing the consolidated net worth in the primary currency
- Large number (40px, bold, monospace feel)
- Below it: a row of smaller per-currency totals as subtle pills (e.g., "$12,340 USD · $45,000 MXN · €2,100 EUR")
- If conversion is still loading, show a subtle shimmer skeleton

**3. Spending Card**
- Compact card with period toggle pills: "Today" / "This Week" / "This Month"
- Primary number: total spent in the selected period (large, bold)
- Secondary line (when viewing week/month): "Today: $XX"
- Comparison badge: percentage change vs previous period. Green with down-arrow if spending decreased, red with up-arrow if increased. Muted text: "vs last week"

**4. Two-Column Grid (desktop) / Stacked (mobile)**

Left column:
- **Currency Breakdown Section**: For each currency the user has accounts in, show a collapsible section with account cards. Each account card shows:
  - Account name + color dot
  - Balance (large)
  - List of pockets with individual balances (compact rows)
  - Investment accounts show: shares, current price, gain/loss percentage badge
  - CD (Certificate of Deposit) accounts show: principal, maturity date, interest rate

Right column (stacked widgets):
- **Financial Calendar Widget**: A small monthly calendar grid. Days with upcoming reminders or scheduled movements are dot-indicated. Clicking a day shows a popover with that day's items.
- **Net Worth Timeline Widget**: A minimal sparkline/area chart showing net worth over time. Muted fill, accent-colored line. Below: "Last 6 months" label and a "View All" link.
- **Reminders Widget**: A compact list of upcoming reminders (next 7 days). Each row: due date, reminder name, amount, "Pay" button. Max 5 shown, "View All" link at bottom. Past/done reminders hidden by default.
- **Fixed Expenses Summary**: Progress bars for each fixed expense sub-pocket showing contribution progress toward monthly target. Group headers for expense groups. Compact layout.

**5. Floating Stats Bar**
- A thin floating bar at the bottom of the page (above mobile nav) showing key stats: total income this month, total expenses this month, net this month. Subtle glassmorphism background.

---

## Page: Accounts

### Layout

**Header row**: "Accounts" title + "Add Account" button (accent, with plus icon)

**Account cards grid**: 1 column mobile, 2 columns tablet, 3 columns desktop. Each card:
- Top: colored accent bar (user-chosen color for the account)
- Account name (bold) + currency badge (pill)
- Total balance (large number)
- Pocket list: each pocket as a row with name and balance. Fixed-type pockets have a small "Fixed" badge.
- Card actions (on hover or via "..." menu): Edit, Delete, Reorder

**Account types**:
- Normal accounts: standard card as described
- Investment accounts: additional row showing stock symbol, shares, current price, gain/loss
- CD accounts: show principal, interest rate, maturity date, projected value

### Interactions

- Click "Add Account" → slide-in panel from the right (not a modal) with the account form
- Account form fields: Name, Currency (dropdown), Color (color picker grid), Type (Normal/Investment/CD)
- Pocket management: within the account edit panel, a section to add/edit/delete/reorder pockets
- Drag-and-drop reordering of accounts (subtle grab handle on left of each card)
- Delete account → confirm dialog warning about orphaned movements

---

## Page: Movements

The most complex page. Three-panel layout on desktop: filters sidebar (left, collapsible), movement list (center), form panel (right, contextual).

### Top Section

- "Movements" title
- **Quick Add bar** (inline variant): always visible at the top. Type toggle + amount + notes + submit. Compact single row.
- **Action buttons row**: "New Movement" button, "Batch Add" button, filter toggle (mobile)

### Filters Panel (left sidebar on desktop, slide-over on mobile)

- Date range: preset pills (Today, This Week, This Month, Last Month, Custom) + date picker for custom
- Type filter: pills for All, Income, Expense, Transfer
- Account filter: multi-select dropdown
- Pocket filter: multi-select dropdown (filtered by selected accounts)
- Category filter: dropdown with category options (Food, Transport, Bills, Entertainment, Health, Shopping, Education, Other)
- Tags filter: tag input with autocomplete
- Pending toggle: show/hide pending movements
- Clear all filters button

### Movement List (center)

- Grouped by date (section headers: "Today", "Yesterday", "May 19, 2026", etc.)
- Each movement row:
  - Left: type indicator (colored dot or icon — green for income, red for expense, blue for transfer)
  - Center: notes/description (primary text) + account → pocket path (secondary muted text) + category badge (small colored pill)
  - Right: amount (bold, colored by type) + inline-editable on click (turns into input, Enter to save, Escape to cancel)
  - Tags shown as tiny muted pills below the description
  - Pending movements: dashed border or reduced opacity with "Pending" badge
  - Orphaned movements: subtle warning indicator (amber dot) with tooltip "From deleted account"
- **Bulk selection**: checkbox on each row (appears on hover). When any are selected, a floating toolbar appears at the bottom: "X selected" + Delete button + Deselect All
- **Infinite scroll**: "Load More" button at the bottom (not auto-loading)

### Form Panel (right side on desktop, full-screen modal on mobile)

Slides in when creating/editing a movement. Fields:
- Type selector: visual toggle (Income / Expense / Transfer)
- Amount: large input with currency symbol
- Account selector: dropdown with account color dots
- Pocket selector: dropdown (filtered by selected account)
- For transfers: "From" account/pocket + "To" account/pocket (visual arrow between them)
- Date: date picker, defaults to today
- Notes: text input
- Category: dropdown selector with colored dot indicators
- Tags: tag input with autocomplete from existing tags
- Pending toggle: switch
- "Save as Template" checkbox
- Submit button + Cancel

### Templates Tab

Accessible via the "Templates" nav item. Grid of template cards:
- Template name
- Type badge + amount + account/pocket path
- "Use" button (creates a movement from the template)
- Edit/Delete actions

---

## Page: Fixed Expenses

### Layout

**Header**: "Fixed Expenses" title + "Add Group" button + "Add Expense" button + "Generate Movements" button

**Summary card** at top: total monthly fixed expenses, number of active expenses, overall progress bar

**Expense Groups**: Collapsible sections, each group is a card:
- Group name (bold) + edit/delete icons
- List of sub-pockets (fixed expenses) within the group:
  - Expense name + target amount + periodicity badge (monthly/biweekly/weekly)
  - Progress bar showing current balance vs target (accent color fill)
  - Monthly contribution amount (calculated)
  - Enable/disable toggle
  - Edit/delete actions

### Interactions

- Add/Edit expense → modal form with fields: Name, Target Amount, Periodicity, Group assignment, Enabled toggle
- Add/Edit group → small modal with just a name field
- "Generate Movements" → opens a batch movement form pre-filled with all active fixed expense contributions
- Drag-and-drop reordering within groups

---

## Page: Budget Planning

### Layout

**Header**: "Budget Planning" title + Default Account/Pocket selector (dropdown) + "Create Movements" button

**Income Section**: Single large input for total monthly income. Clean, prominent.

**Scenarios Section**: Horizontal scrollable row of scenario cards. Each scenario:
- Name + active toggle
- List of included/excluded fixed expenses
- "Edit" and "Delete" actions
- "New Scenario" card with dashed border and plus icon

**Summary Card** (appears when income > 0):
- Three-column layout: Total Income | Fixed Expenses | Remaining
- Visual flow: income → minus fixed → equals remaining
- Large numbers, muted labels

**Distribution Section** (appears when remaining > 0):
- Table/list of distribution entries. Each row:
  - Pocket name (linked to an account/pocket)
  - Percentage input (editable)
  - Calculated amount (auto-computed from percentage × remaining)
  - If pocket currency differs from budget currency: converted amount shown
- Add entry button
- Donut chart visualization showing the percentage split
- Total percentage indicator (should sum to 100%)

### Interactions

- "Create Movements" → opens batch movement form pre-filled with all distribution entries as individual movements
- Scenario form → modal with: name, checkboxes for each fixed expense to include/exclude
- All values persist in localStorage so the user doesn't re-enter monthly

---

## Page: Settings

### Layout

Two-column grid on desktop, single column on mobile. Clean section separation with generous spacing.

**Left Column:**

**Preferences Section**:
- Primary Currency: dropdown
- Default Currency for New Accounts: dropdown
- Account Card Display: compact/detailed toggle per account type (normal, investment, CD)
- Net Worth Snapshot Frequency: dropdown (daily, weekly, monthly)
- Date Format: dropdown (MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD)
- Movements Per Page: number input
- Reminder Advance Warning: number input (days)

**Default Accounts Section**:
- Default Expense Account/Pocket: dropdown selectors
- Default Income Account/Pocket: dropdown selectors

**Right Column:**

**Export/Import Section**:
- "Export All Data" button (downloads JSON)
- Import section (file upload area with drag-and-drop)

**Danger Zone Section**:
- Red-bordered card
- "Delete All Data" button with confirmation dialog
- "Reset Settings" button

---

## Page: Net Worth (Widget on Summary, expandable)

When the user clicks "View All" on the net worth widget, show a full-page view:

- Large area chart showing net worth over time (6 months default, expandable to all time)
- Below chart: list of snapshots as a timeline. Each entry: date, total amount, per-currency breakdown
- "Take Snapshot Now" button
- "Edit" action on each snapshot (modal to adjust values)
- Goal line: dashed horizontal line at the user's target net worth (if set)

---

## Shared UI Patterns

### Cards
- Background: white (light) / gray-900 (dark)
- Border: 1px solid gray-200 (light) / gray-800 (dark)
- Border-radius: 12px
- Padding: 20px-24px
- Shadow: none or barely-there (0 1px 2px rgba(0,0,0,0.04))
- Hover state (interactive cards): subtle lift (translateY -1px) + slightly stronger shadow

### Buttons
- Primary: accent color background, white text, medium weight, 8px radius, subtle shadow on hover
- Secondary: transparent background, accent color text, 1px accent border
- Ghost: no background, no border, muted text, hover shows subtle background
- Destructive: red variant of primary
- All buttons: 40px height, 16px horizontal padding, 14px font

### Inputs
- Height: 40px
- Border: 1px solid gray-300 (light) / gray-700 (dark)
- Border-radius: 8px
- Focus: accent-colored ring (2px), no border color change
- Background: white (light) / gray-800 (dark)
- Placeholder: gray-400

### Badges/Pills
- Small: 6px vertical padding, 10px horizontal, 12px font, rounded-full
- Category badges: each category has a muted color (food=amber, transport=blue, bills=purple, entertainment=pink, health=green, shopping=orange, education=indigo, other=gray)
- Currency badges: neutral gray background

### Modals
- Centered, max-width varies (sm: 384px, md: 448px, lg: 512px, xl: 640px)
- Backdrop: dark overlay with backdrop-blur-sm
- Border-radius: 16px
- Smooth scale-in animation on open

### Slide-in Panels
- From right edge, 400px wide on desktop
- Smooth translateX animation
- Subtle shadow on the left edge
- Close button (X) top-right + click-outside to close

### Empty States
- Centered in the available space
- Muted icon (48px, gray-400)
- Title (16px, medium weight)
- Description (14px, gray-500)
- Optional action button below

### Skeleton Loading
- Rounded rectangles matching the layout of the content they replace
- Subtle pulse animation (opacity 0.4 → 0.7)
- Match the exact dimensions of the real content

### Inline Editable Fields
- Display as normal text
- On click: transform into an input with the current value selected
- Enter to save, Escape to cancel
- Subtle blue underline while editing
- Brief green flash on successful save

### Progress Bars
- Height: 6px, rounded-full
- Background: gray-200 (light) / gray-700 (dark)
- Fill: accent color, with subtle gradient
- Animated fill on mount (width transition 0.6s ease-out)

---

## Color System

### Light Mode
- Background: #fafaf9 (warm white)
- Surface (cards): #ffffff
- Border: #e5e5e5
- Text primary: #171717
- Text secondary: #525252
- Text muted: #a3a3a3
- Accent: #6366f1 (indigo-500) or #3b82f6 (blue-500)

### Dark Mode
- Background: #0a0a0f (deep navy-black)
- Surface (cards): #111118
- Border: #1f1f2e
- Text primary: #f5f5f5
- Text secondary: #a1a1aa
- Text muted: #52525b
- Accent: #818cf8 (indigo-400) or #60a5fa (blue-400)

### Semantic Colors
- Income/positive: #22c55e (green-500) / #4ade80 (green-400 dark)
- Expense/negative: #ef4444 (red-500) / #f87171 (red-400 dark)
- Transfer/neutral: #3b82f6 (blue-500) / #60a5fa (blue-400 dark)
- Warning: #f59e0b (amber-500)
- Pending: dashed borders + 60% opacity

---

## Typography

- Font family: Inter (or Geist Sans)
- Page titles: 32px, font-weight 700, tracking -0.02em
- Section headers: 20px, font-weight 600
- Card titles: 16px, font-weight 600
- Body text: 14px, font-weight 400
- Small/caption: 12px, font-weight 400-500
- Monospace numbers (amounts): tabular-nums, font-variant-numeric
- Large amounts (totals): 40px, font-weight 700, tracking -0.03em

---

## Responsive Behavior

- **Desktop (1024px+)**: Full sidebar, multi-column layouts, slide-in panels, hover states
- **Tablet (768px-1023px)**: Collapsed sidebar (icon-only), 2-column grids become 1-column, panels become modals
- **Mobile (<768px)**: No sidebar, top header + bottom nav + FAB, single column, full-screen modals, touch-optimized tap targets (min 44px)

---

## Animations & Transitions

- Page transitions: subtle fade-in (opacity 0→1, 150ms)
- Card hover: translateY(-1px), 150ms ease
- Modal open: scale(0.95)→scale(1) + opacity, 200ms ease-out
- Sidebar collapse: width transition 200ms ease
- Progress bar fill: width transition 600ms ease-out on mount
- Toast enter: translateX(100%)→0, 200ms ease-out
- Skeleton pulse: opacity 0.4↔0.7, 1.5s infinite
- Success flash: brief green background pulse (300ms)
- Number changes: animated counter (count up/down over 400ms)

---

## Accessibility

- All interactive elements have visible focus rings (accent color, 2px offset)
- Color is never the only indicator — always paired with icons or text
- Minimum contrast ratio: 4.5:1 for text, 3:1 for large text and UI components
- All images/icons have aria-labels or are marked aria-hidden
- Keyboard navigable: Tab through all interactive elements, Enter/Space to activate
- Screen reader announcements for toasts and status changes
- Reduced motion: respect prefers-reduced-motion by disabling animations
