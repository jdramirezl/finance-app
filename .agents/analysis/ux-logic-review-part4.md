# UX/Logic Review Part 4: Competitive Analysis & Missing Features

## Executive Summary

The app has a solid foundation for manual personal finance tracking — accounts, pockets, movements, fixed expenses, budgets, reminders, net worth, and investments. However, it lacks the intelligence layer (auto-categorization, analytics, recurring automation) and power-user features (search, bulk ops, keyboard shortcuts) that separate a "good enough" tool from one that saves real time every month.

This document prioritizes improvements by impact-to-effort ratio for a single user managing personal finances.

---

## 1. Competitive Landscape: What Others Do Well

### YNAB (You Need A Budget)
| Feature | What they nail | Our equivalent | Gap |
|---------|---------------|----------------|-----|
| Envelope budgeting | Every dollar has a job, real-time allocation | Budget planning page with percentage distribution | No real-time "remaining to allocate" feedback as movements come in |
| Age of money | Shows how long money sits before being spent | None | No cash flow velocity metric |
| Goal tracking | Save $X by date Y with visual progress | Fixed expenses have progress bars | No general-purpose savings goals |
| Reconciliation | Match bank statements to entries | None | No reconciliation workflow |

### Mint (now Credit Karma)
| Feature | What they nail | Our equivalent | Gap |
|---------|---------------|----------------|-----|
| Auto-categorization | ML-based expense classification | Manual type selection (4 types only) | No categories beyond the 4 movement types |
| Bill tracking | Detects recurring bills, warns before due | Reminders exist but don't auto-create movements | Reminders are passive — require manual action |
| Spending trends | Month-over-month category breakdown | None | No analytics/reports page |
| Credit score | Integrated credit monitoring | N/A | Out of scope for personal tool |

### Copilot Money
| Feature | What they nail | Our equivalent | Gap |
|---------|---------------|----------------|-----|
| Clean UI | Minimal, fast, gesture-driven | Decent UI with dark mode | Missing swipe gestures, could be faster |
| Smart categorization | Auto-assigns categories with learning | None | No category system at all |
| Investment tracking | Portfolio view with allocation % | Investment cards with gain/loss | No allocation view, no portfolio-level metrics |
| Subscription tracking | Detects and groups recurring charges | Fixed expenses partially cover this | No auto-detection from movement patterns |

### Notion Finance Templates
| Feature | What they nail | Our equivalent | Gap |
|---------|---------------|----------------|-----|
| Flexibility | Custom views, formulas, relations | Fixed page structure | No custom views or dashboards |
| Multiple views | Table, calendar, kanban, timeline | List view only for movements | No calendar view of expenses |
| Custom properties | User-defined fields on any entry | Fixed schema | No tags/labels/custom fields |

---

## 2. Missing Features — Prioritized by Impact

### Tier 1: High Impact, Moderate Effort (Build Next)

#### 2.1 Categories/Tags for Movements
**Current state**: Movements only have 4 types (IngresoNormal, EgresoNormal, IngresoFijo, EgresoFijo) and a free-text `notes` field.

**What's needed**:
- A `categories` table (user-defined, with color and icon)
- A `tags` table (lightweight labels, many-to-many with movements)
- Category selector in the movement form
- Filter movements by category/tag in MovementFilters

**Why it matters**: Without categories, there's no way to answer "how much did I spend on food this month?" — the most basic personal finance question.

**Effort**: Medium (new DB table, form field, filter addition)

#### 2.2 Reports & Analytics Page
**Current state**: No spending analysis. The summary page shows balances but not trends.

**What's needed**:
- New `/reports` route
- Spending by category over time (bar chart, month-over-month)
- Income vs. expenses trend line
- Top spending categories (pie/donut chart)
- Month-over-month comparison table
- Date range selector

**Why it matters**: The whole point of tracking expenses is to understand patterns. Without reports, the data is just a ledger.

**Effort**: Medium-High (new page, chart components, data aggregation queries)

#### 2.3 Recurring Movements (Auto-Created from Reminders)
**Current state**: Reminders notify you but don't create movements. The user must manually add the movement and mark the reminder as paid.

**What's needed**:
- Option on reminder: "Auto-create movement when due"
- Link reminder to a movement template (already partially supported via `templateId`)
- Backend cron/trigger that creates movements from due reminders
- UI to review auto-created movements before they're applied

**Why it matters**: For a single user, the #1 time sink is manually entering the same bills every month. This eliminates that entirely.

**Effort**: Medium (backend logic, template linkage already exists)

#### 2.4 Savings Goals
**Current state**: Fixed expenses track "save X over Y months" but there's no general goal system.

**What's needed**:
- Goals entity: name, target amount, target date, linked pocket
- Progress calculation (current pocket balance / target)
- Visual progress on summary page
- Projected completion date based on contribution rate

**Why it matters**: "Save $5000 for vacation by December" is a universal personal finance need that the current pocket system almost supports but doesn't surface.

**Effort**: Low-Medium (mostly UI on top of existing pocket balances)

---

### Tier 2: High Impact, Low Effort (Quick Wins)

#### 2.5 Global Search
**Current state**: Movement filters have a `search` field that filters the notes column on the current page. No cross-entity search.

**What's needed**:
- Search bar in the top nav/header (or Cmd+K modal)
- Search across: movements (notes), accounts (name), reminders (title), templates (name)
- Results grouped by entity type
- Click result to navigate to that item

**Why it matters**: "Where did I record that payment to the dentist?" should be answerable in 2 seconds.

**Effort**: Low (Supabase full-text search + a modal component)

#### 2.6 CSV/Excel Export
**Current state**: JSON export only (full backup). No structured export for analysis.

**What's needed**:
- Export filtered movements as CSV
- Column selection (date, amount, type, account, pocket, notes, category)
- Date range filter applied to export
- Download button on movements page

**Why it matters**: Users need to share data with accountants, import into spreadsheets, or do custom analysis.

**Effort**: Low (client-side CSV generation from existing data)

#### 2.7 Keyboard Shortcuts
**Current state**: No keyboard shortcuts. Everything requires mouse/touch.

**What's needed**:
- `N` — New movement (from any page)
- `Cmd+K` / `Ctrl+K` — Global search
- `Esc` — Close modal/panel
- `1-7` — Navigate to pages (Summary, Accounts, etc.)
- `E` — Edit selected item
- `Delete` — Delete selected item (with confirm)

**Why it matters**: Power users (which a single-user finance app owner definitely is) expect keyboard-driven workflows.

**Effort**: Low (event listener hook + existing navigation)

#### 2.8 Undo Last Action
**Current state**: Delete is permanent (with confirm dialog). No undo.

**What's needed**:
- Toast with "Undo" button after destructive actions (delete movement, delete account)
- Soft-delete with 10-second grace period before hard delete
- Or: optimistic UI with delayed backend call

**Why it matters**: Reduces anxiety around destructive actions. "I accidentally deleted the wrong movement" is a real scenario.

**Effort**: Low-Medium (toast already exists, need delayed mutation pattern)

---

### Tier 3: Medium Impact, Medium Effort (Plan For Later)

#### 2.9 Automatic Categorization
**Current state**: No categories exist, so no auto-categorization possible.

**What's needed** (after categories are added):
- Pattern matching on `notes` field (e.g., "Uber" → Transport, "Netflix" → Subscriptions)
- User-defined rules: "If notes contains X, assign category Y"
- Suggestion system: show suggested category, user confirms or overrides
- Learning: remember user overrides for future suggestions

**Why it matters**: Reduces manual work per movement from "pick category" to "confirm suggestion."

**Effort**: Medium (depends on categories being built first)

#### 2.10 Split Transactions
**Current state**: One movement = one amount = one account/pocket.

**What's needed**:
- "Split" button on movement form
- Multiple line items: each with amount, category, pocket
- Parent movement with child splits
- Total must equal original amount

**Why it matters**: "I bought groceries ($80) and household items ($30) in one $110 purchase" is common.

**Effort**: Medium-High (schema change, form complexity)

#### 2.11 Bulk Edit Movements
**Current state**: `BulkActionsToolbar` exists with delete capability. No bulk edit.

**What's needed**:
- Select multiple movements → "Edit" action
- Change category, account, pocket, or type for all selected
- Confirmation showing what will change

**Why it matters**: "I miscategorized 20 movements as 'normal' that should be 'fixed'" happens.

**Effort**: Low-Medium (bulk selection already exists, need edit modal)

#### 2.12 Financial Calendar View
**Current state**: `FinancialCalendarWidget` exists on summary page showing upcoming reminders.

**What's needed**:
- Full calendar page showing movements by date
- Color-coded by type or category
- Click date to see/add movements for that day
- Monthly spending total per day

**Why it matters**: Visual people understand spending patterns better on a calendar than a list.

**Effort**: Medium (widget exists, needs full-page expansion)

---

### Tier 4: Nice-to-Have (Backlog)

| Feature | Description | Effort |
|---------|-------------|--------|
| Dark mode audit | Check all components for contrast issues | Low |
| Swipe gestures | Swipe left to delete, right to edit on mobile | Low-Medium |
| Home screen widget | PWA shortcut for quick-add expense | Medium |
| Multi-currency reports | Analytics broken down by currency | Medium |
| Budget vs. actual | Compare planned budget to real spending | Medium |
| Recurring movement detection | Analyze patterns to suggest new reminders | High |
| Receipt photo attachment | Attach image to movement | Medium |
| Shared accounts | Multiple users on same account | High |

---

## 3. Mobile-First Assessment

### Current Mobile UX

| Aspect | Status | Notes |
|--------|--------|-------|
| Quick-add expense | 2 taps (FAB → "New Movement") | Good — QuickActionsFAB provides this |
| Bottom navigation | Present | 5 items in bottom bar, full menu in drawer |
| Responsive layout | Yes | Sidebar on desktop, bottom nav on mobile |
| Touch targets | Adequate | Buttons are reasonably sized |
| Swipe gestures | None | No swipe-to-delete or swipe-to-edit |
| Pull-to-refresh | None | Standard browser refresh only |
| Offline support | None | Fails silently without connection |

### Mobile Improvements Needed

1. **Swipe actions on movement rows** — Swipe left for delete, right for edit. The `MovementList` component renders rows that could support touch gestures.

2. **Pull-to-refresh** — Invalidate TanStack Query cache on pull gesture. Gives tactile feedback that data is fresh.

3. **Quick-add from notification** — When a reminder fires, the notification should deep-link to a pre-filled movement form.

4. **Haptic feedback** — On successful save, delete, or transfer completion.

5. **PWA install prompt** — The app runs on Vercel and could be a PWA with offline-first reads and queued writes.

---

## 4. Prioritized Implementation Roadmap

### Phase 1: Foundation (enables everything else)
1. **Categories/Tags** — Required before reports, auto-categorization, or split transactions
2. **Global Search** — Quick win, immediately useful
3. **CSV Export** — Quick win, no dependencies

### Phase 2: Intelligence
4. **Reports & Analytics** — Requires categories
5. **Recurring Movements** — Template linkage already exists
6. **Savings Goals** — Builds on existing pocket system

### Phase 3: Power User
7. **Keyboard Shortcuts** — Quick win
8. **Undo Last Action** — Reduces friction
9. **Bulk Edit** — Infrastructure already exists
10. **Auto-categorization rules** — Requires categories + patterns

### Phase 4: Polish
11. **Split Transactions** — Schema change
12. **Calendar View** — Widget already exists
13. **Swipe Gestures** — Mobile polish
14. **PWA + Offline** — Infrastructure investment

---

## 5. Single Highest-Impact Change

If only one feature could be built next, it should be **Categories + Basic Reports**.

**Reasoning**:
- The app currently cannot answer "how much did I spend on food?" — the most fundamental personal finance question
- Categories unlock: reports, auto-categorization, budget-vs-actual, split transactions
- Without categories, the movement data is just a timestamped ledger with no analytical value
- Every competitor has this as table stakes
- The movement form already has space for it (between type and amount)
- The filter system already supports arbitrary field filtering

**Minimum viable implementation**:
- `categories` table: id, user_id, name, color, icon
- `category_id` column on movements table (nullable for backwards compat)
- Category dropdown in MovementForm
- Category filter in MovementFilters
- Simple "spending by category this month" donut chart on summary page

This single change transforms the app from "expense recorder" to "expense analyzer."
