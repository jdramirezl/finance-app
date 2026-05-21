# UX/Logic Review — Part 1: Core Feature Analysis

## Executive Summary

The finance app has solid feature coverage but several UX friction points that slow down daily use. The biggest issues are: (1) the movement creation form is too heavy for the most common action (logging a quick expense), (2) the budget planning page requires too much manual setup with no memory of past months, and (3) the account/pocket hierarchy, while powerful, has naming and discoverability problems that confuse new users.

---

## 1. Accounts & Pockets Model

### Current Behavior

- **Hierarchy**: Account → Pocket → SubPocket (only inside "fixed" type pockets)
- **Account types**: normal, investment (stock/ETF), cd (certificate of deposit)
- **Pocket types**: "normal" and "fixed" — only one fixed pocket is allowed globally
- **SubPockets**: Only exist inside fixed-type pockets, represent individual recurring bills (rent, Netflix, etc.) with a target amount and periodicity
- **Balance rule**: Account balance = sum of pocket balances. Movements target pockets, never accounts directly.

### UX Friction Points

**1. "Pocket" is not an intuitive term** — Priority: Medium

The word "pocket" doesn't map to any real-world financial concept. Users coming from other finance apps expect "categories" (for expense tracking) or "envelopes" (for envelope budgeting). The current system is actually envelope budgeting, but the terminology doesn't signal that.

- A user seeing "Create a Pocket" for the first time has no idea what it means
- The form only asks for a name and type (normal/fixed) — no explanation of what a pocket does

**2. The fixed-expense pocket being a "special type" is confusing** — Priority: High

- Users must know to create a pocket with type "fixed" before they can use the Fixed Expenses page
- The Fixed Expenses page shows an empty state saying "Please create a fixed expenses pocket in the Accounts page first" — this is a dead end that requires navigating away
- There's no guidance on WHICH account should hold the fixed pocket
- The constraint "only one fixed pocket globally" is never explained to the user
- If a user creates a fixed pocket in the wrong account, they need to use the "migrate" feature (which is hidden behind a pocket card action menu)

**3. When would a user want multiple pockets per account?** — Priority: Low (already works well)

The multi-pocket model makes sense for:
- Separating savings goals within one bank account (vacation fund, emergency fund)
- Tracking investment shares separately from cash in a brokerage
- Isolating fixed-expense money from discretionary spending

This is actually well-designed. The problem is that the app doesn't explain WHY you'd want pockets. A first-time user might create one account with one pocket and never realize the organizational power.

**4. SubPocket naming collision** — Priority: Low

"SubPocket" appears in the code but never in the UI. Users see these as "fixed expenses" which is correct. No user-facing issue here.

### Proposed Improvements

| # | Improvement | Priority | Effort |
|---|---|---|---|
| 1 | Rename "Pocket" to "Envelope" or "Fund" in the UI — matches the mental model of envelope budgeting | Medium | Low |
| 2 | Auto-create a fixed envelope when user first visits Fixed Expenses page (prompt: "Which account should hold your fixed expenses fund?") | High | Medium |
| 3 | Add onboarding tooltip on Accounts page: "Envelopes let you divide money within an account for different purposes" | Medium | Low |
| 4 | Show a "Suggested setup" card for new users: "Most people create one envelope per savings goal" | Low | Low |

---

## 2. Movement Creation Flow

### Current Behavior

The movement form (opened via modal/panel) has these fields:
1. **Template selector** (dropdown of saved templates)
2. **Type** (IngresoNormal, EgresoNormal, IngresoFijo, EgresoFijo, Transfer)
3. **Date** (defaults to today)
4. **Account selector** (cascading: account → pocket → sub-pocket)
5. **Amount** (number input)
6. **Notes** (text input)
7. **Pending checkbox** (don't apply to balance yet)
8. **Save as Template** checkbox + template name field

Transfer mode adds: Target Account + Target Pocket selectors.

There's also a **Batch Add** mode for entering multiple movements at once, and a **QuickActionsFAB** on mobile that offers "New Movement" and "New Transfer" shortcuts.

### UX Friction Points

**1. Too many fields for a simple expense** — Priority: High

The most common action is: "I just spent $X on Y." That requires:
- Open form → select type (EgresoNormal) → select account → select pocket → enter amount → optionally add notes → submit

That's 4-5 interactions minimum for the simplest case. The type selector defaults to "EgresoNormal" which is good, but the account/pocket cascade is the real bottleneck — especially if you have multiple accounts.

**2. No "last used" or "default" pocket** — Priority: High

Every single movement requires manually selecting account + pocket. If 80% of your expenses go to the same pocket (e.g., "Daily Spending" in your checking account), you're repeating that selection dozens of times per month.

**3. The type names are in Spanish and non-obvious** — Priority: Medium

"IngresoNormal", "EgresoNormal", "IngresoFijo", "EgresoFijo" — these are internal identifiers leaking into the UI. The Select component maps them to labels, but the underlying concept of "fixed income" vs "normal income" isn't explained. When would a user choose "IngresoFijo" vs "IngresoNormal"? The distinction only matters for the fixed-expense pocket routing.

**4. Transfer flow is good but hidden** — Priority: Low

Transfer is a type option in the same dropdown as income/expense. This is actually fine — it reveals the target account/pocket fields contextually. The visual separation (gray background box) makes it clear.

**5. No recurring movements** — Priority: Medium

Users with regular expenses (monthly subscriptions, weekly groceries) must either:
- Create a template and manually apply it each time
- Use the "Mark as Paid" flow from reminders (which creates a movement)

There's no "auto-create this movement on the 1st of every month" feature. The reminder system partially fills this gap but requires manual confirmation each time.

**6. Batch mode is powerful but undiscoverable** — Priority: Low

The batch form is great for month-end entry of multiple expenses, but it's just a button labeled "Batch Add" with no explanation of when you'd use it.

### Proposed Improvements

| # | Improvement | Priority | Effort |
|---|---|---|---|
| 1 | **Quick-add mode**: Swipe-up or single-tap entry — just amount + notes, auto-assigns to a user-configured default pocket. Full form available via "More options" | High | Medium |
| 2 | **Remember last-used account/pocket** per movement type. Pre-fill the selectors with the most recently used combination | High | Low |
| 3 | **Rename movement types** in the UI to plain language: "Income", "Expense", "Fixed Income", "Fixed Expense" — drop the Spanish internal names from user-facing labels | Medium | Low |
| 4 | **Recurring movements**: Allow marking a template as "auto-create on day X of each month" — generates a pending movement that the user confirms or it auto-applies | Medium | High |
| 5 | **Inline amount edit**: On the movement list, tap the amount to edit it directly without opening the full form (known bug/request) | Medium | Medium |

---

## 3. Dashboard/Summary Page

### Current Behavior

The summary page layout (top to bottom, left to right on desktop):

**Top**: Net Worth hero card + per-currency total cards (grid)

**Left column**: Currency breakdown → Account cards grouped by currency (detailed or compact mode, configurable in settings)

**Right column** (stacked):
1. Financial Calendar Widget (heatmap-style monthly calendar showing income/expense bars per day)
2. Net Worth Timeline Widget (line chart of historical net worth)
3. Reminders Widget (upcoming payments, scrollable, 400px fixed height)
4. Fixed Expenses Summary (progress bars for each sub-pocket)

**Floating**: Stats bar at bottom (appears when user selects values — shows count, sum, average)

### UX Friction Points

**1. No "today's spending" or "this week" quick view** — Priority: High

The most common question when opening a finance app is "how much have I spent today/this week?" The current summary shows:
- Total net worth (useful but not actionable daily)
- Account balances (static, doesn't answer "what changed?")
- Calendar (requires clicking a specific day to see details)

There's no at-a-glance answer to "am I on track today?"

**2. The calendar widget is information-dense but not actionable** — Priority: Medium

The calendar shows tiny income/expense bars per day, but:
- You can't see actual amounts without clicking (tooltip is sr-only)
- The bars are relative to the month's max, so a $5 expense on a day with no other spending looks the same as a $500 expense on a heavy day
- Clicking a day navigates away to the movements page (loses context)

**3. Widget priority order doesn't match daily-use importance** — Priority: Medium

Current right-column order: Calendar → Net Worth → Reminders → Fixed Expenses

For daily use, the priority should be:
1. **Reminders** (actionable: "pay this bill today")
2. **Recent spending summary** (informational: "you've spent $X this week")
3. **Calendar** (contextual: "what happened on which days")
4. **Fixed Expenses** (monthly check-in, not daily)
5. **Net Worth** (long-term, check weekly/monthly)

**4. Account cards take up too much space** — Priority: Low

In "detailed" mode, each account card is large. If you have 5+ accounts across 2-3 currencies, the left column becomes very long and pushes the right-column widgets below the fold. The "compact" mode exists but isn't the default.

**5. No spending velocity indicator** — Priority: Medium

Users want to know: "At this rate, will I run out of budget before month-end?" The app has all the data (movements + budget) but doesn't surface this insight.

### Proposed Improvements

| # | Improvement | Priority | Effort |
|---|---|---|---|
| 1 | **Add a "This Week" spending card** at the top of the right column: total spent this week, daily average, comparison to last week | High | Medium |
| 2 | **Reorder right column**: Reminders → This Week card → Calendar → Fixed Expenses → Net Worth | Medium | Low |
| 3 | **Calendar hover tooltips**: Show actual amounts on hover/long-press instead of requiring navigation | Medium | Low |
| 4 | **Default to compact mode** for account cards, with a "Show details" toggle | Low | Low |
| 5 | **Spending pace indicator**: "You've spent 60% of your budget with 40% of the month remaining" — shown in the budget summary or as a floating badge | Medium | Medium |

---

## 4. Budget Planning

### Current Behavior

The budget planning page flow:
1. **Enter initial amount** (manual number input — "your salary or amount to distribute")
2. **Scenarios section**: Create named subsets of fixed expenses (e.g., "Bare Minimum", "Ideal") — toggle which scenario is active
3. **Summary card**: Shows initial amount → fixed expenses deduction → "Safe to Spend" remaining
4. **Distribution section**: Add named entries with percentages, optionally linked to a pocket. Shows donut chart + table with amounts calculated from remaining.
5. **"Create Movements" button**: Generates batch movements from the distribution entries

State is persisted in localStorage (survives page refreshes but not cross-device).

### UX Friction Points

**1. "Initial Amount" has no memory** — Priority: High

Every month, the user must manually type their income. If your salary is the same every month, this is pure friction. There's no "use last month's amount" or "my salary is $X" setting.

**2. The relationship between fixed expenses and the budget page is unclear** — Priority: High

The budget page auto-deducts fixed expenses from the initial amount, but:
- It's not obvious WHERE the fixed expense total comes from (it's calculated from enabled sub-pockets)
- If you haven't set up fixed expenses yet, the budget page just shows "No fixed expenses pocket found" — another dead end
- The scenarios feature lets you override which expenses are included, but the default behavior (use all enabled expenses) isn't explained

**3. Distribution entries don't persist month-to-month in a useful way** — Priority: Medium

The entries persist in localStorage, which means:
- They survive page refreshes (good)
- They don't sync across devices (bad for a cloud app)
- They don't reset monthly (so last month's distribution stays until manually cleared)
- There's no "apply same distribution as last month" action

**4. "Money left to allocate" is shown as a warning, not a primary metric** — Priority: Medium

The total percentage warning ("85.0% — 15.0% unallocated") appears at the bottom of the distribution table. It should be the FIRST thing you see — "You have $X left to allocate" — prominently displayed above the entries.

**5. Variable income handling is manual** — Priority: Low

If your income varies (freelancer, bonuses), you just type a different number each month. This works but there's no:
- History of past months' income
- "Average of last 3 months" helper
- Multiple income sources that sum automatically

**6. The "Create Movements" button is powerful but scary** — Priority: Medium

Clicking it generates batch movements from the distribution. But:
- There's no preview of what will be created
- It's not clear if this is idempotent (can I click it twice?)
- The button is always visible even when distribution is empty or percentages don't add up

### Proposed Improvements

| # | Improvement | Priority | Effort |
|---|---|---|---|
| 1 | **Save income as a setting** with "Use saved income" button. Allow override for months with bonuses/variation | High | Low |
| 2 | **Show "Remaining to allocate" prominently** above the distribution table as a large number, not just a percentage warning at the bottom | Medium | Low |
| 3 | **Monthly reset flow**: At month start, show "Start new month?" prompt that carries forward distribution entries but resets amounts. Archive previous month's plan. | Medium | Medium |
| 4 | **Disable "Create Movements"** when total percentage is 0% or exceeds 100%. Show a confirmation dialog with a preview of what will be created. | Medium | Low |
| 5 | **Sync budget state to database** instead of localStorage — enables cross-device access and historical tracking | Medium | High |
| 6 | **Auto-suggest distribution** based on last month's actual spending patterns: "Last month you spent 30% on groceries, 20% on transport..." | Low | High |

---

## Priority Summary

### High Priority (daily-use impact, should fix first)

1. **Quick-add mode for movements** — The #1 daily action is too slow
2. **Remember last-used account/pocket** — Eliminates repetitive selection
3. **"This Week" spending card on summary** — Answers the most common daily question
4. **Auto-create fixed expense pocket** — Removes a confusing dead-end for new users
5. **Save income amount in settings** — Eliminates monthly re-entry friction

### Medium Priority (weekly-use impact, quality of life)

6. Rename "Pocket" to "Envelope" or "Fund"
7. Rename movement types to plain English
8. Reorder summary widgets by daily-use priority
9. Show "Remaining to allocate" prominently in budget
10. Recurring movements (auto-create from templates)
11. Calendar hover tooltips
12. Spending pace indicator
13. Disable/preview for "Create Movements" button
14. Inline amount editing on movement list

### Low Priority (nice-to-have, occasional use)

15. Onboarding tooltips for new users
16. Default to compact account cards
17. Sync budget state to database
18. Auto-suggest distribution from spending history
19. Multiple income sources in budget

---

## Architecture Notes

The app's component structure is well-organized for implementing these changes:
- Quick-add could be a new lightweight component alongside `MovementForm`
- "This Week" card fits naturally as a new component in `components/summary/`
- Budget persistence upgrade would move from `useBudgetPersistence` (localStorage hook) to a new TanStack Query + Supabase table
- Default pocket setting would extend the existing `Settings` type and `useSettingsQuery`

None of these improvements require architectural changes — they're all additive features or UI reorganization within the existing patterns.
