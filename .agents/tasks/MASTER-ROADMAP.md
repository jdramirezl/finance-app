# Master Roadmap — Prioritized Features & Improvements

All features, UX improvements, and redesigns consolidated from:
- User-reported bugs and ideas (conversation history)
- UX research analysis (4 reports)
- FUTURE-FEATURES.md (prior brainstorming)

Organized by priority tier. Within each tier, items are roughly ordered by impact.

---

## Tier 1: Critical UX Fixes (daily-use friction, should do ASAP)

| # | Feature | Description | Scope |
|---|---------|-------------|-------|
| 1.1 | **Quick-add movement mode** | 3-tap expense entry: amount + type → auto-assigns to last-used account/pocket. Full form still available via "More options". | Frontend |
| 1.2 | **Categories/tags on movements** | Add a `category` field (Food, Transport, Bills, Entertainment, etc.) + free-form tags. Enables all reporting features. Requires DB migration + backend + frontend. | Full stack |
| 1.3 | **Remember last-used account/pocket** | Auto-select the most recently used account+pocket when opening the movement form. Store in localStorage. | Frontend |
| 1.4 | **"This week/month" spending card** | Dashboard widget showing total spent this week + today, with comparison to last week. | Frontend |
| 1.5 | **Fix: budget auto-generation picks random accounts** | Let user select which account to generate budget movements for. | Frontend |
| 1.6 | **Fix: no quick-edit for movement amounts** | Inline editable amount field in the movements list (click to edit, Enter to save). | Frontend |

---

## Tier 2: High-Impact Features (significant value, moderate effort)

| # | Feature | Description | Scope |
|---|---------|-------------|-------|
| 2.1 | **Full UI/Design overhaul** | Use Google Stitch (or similar) to generate 3-5 complete UI redesign proposals. User picks one, then implement. Covers layout, color system, typography, component style, navigation structure. Must be mobile-first. | Design → Frontend |
| 2.2 | **Unified Budget & Fixed Expenses page** | Merge into a single visual flow: income inputs → fixed expenses → percentage splits → per-pocket allocations. Visual structure (kanban/flow/nodes). Design first, implement second. | Design → Frontend |
| 2.3 | **Reports & Analytics page** | Spending by category over time, month-over-month comparison, top expense categories, income vs expenses trend. Requires categories (1.2) first. | Frontend |
| 2.4 | **Recurring movements** | Auto-create movements on a schedule (not just reminders). Link to reminders so "Pay Now" creates the actual movement. | Full stack |
| 2.5 | **Savings goals** | "Save $X by date Y" with progress tracking. Builds on pocket system — a goal is a pocket with a target amount and deadline. | Full stack |
| 2.6 | **Orphaned → Archive redesign** | Replace orphan system with soft-delete/archive. Movements still count, accounts just hide. One-click unarchive. | Full stack + migration |
| 2.7 | **Global search (Cmd+K)** | Search across movements, accounts, pockets, reminders, templates. Spotlight-style overlay. | Frontend |
| 2.8 | **Fixed Expenses + Reminders integration** | Link fixed expenses to reminders automatically. "Pay Now" on a reminder creates a movement AND updates the fixed expense contribution. | Full stack |

---

## Tier 3: Quality-of-Life Improvements (polish, moderate impact)

| # | Feature | Description | Scope |
|---|---------|-------------|-------|
| 3.1 | **Smart auto-suggest** | When typing notes, suggest account/pocket/category based on past entries with similar text. | Frontend |
| 3.2 | **Transfer flow redesign** | Replace 4 cascading dropdowns with visual "from → to" card selector. | Frontend |
| 3.3 | **CSV/Excel export** | Export movements (filtered or all) to CSV. Export net worth history. | Backend + Frontend |
| 3.4 | **Settings page redesign** | Proper hierarchy (Preferences, Data, Notifications, About). Remove debug tools. Centralize scattered settings. | Frontend |
| 3.5 | **Desktop quick-actions** | Keyboard shortcut (Cmd+N) for new movement. FAB equivalent for desktop. | Frontend |
| 3.6 | **Investment price service redesign** | Symbol-based caching, shared refresh across accounts, stale indicators, "Refresh All" button. | Full stack |
| 3.7 | **Inline amount editing** | Click amount in movements list → edit in place → Enter to save. No modal needed. | Frontend |
| 3.8 | **Budget: save income amount** | Remember last income so user doesn't retype every month. | Frontend (localStorage) |
| 3.9 | **Templates as tab within Movements** | Not a separate page — a tab/section within the movements page. | Frontend |
| 3.10 | **Net worth: manual snapshot button** | "Take Snapshot Now" button in addition to auto-snapshot. | Frontend |
| 3.11 | **Net worth: goal line** | "I want to reach $X by date Y" — shows as a target line on the chart. | Frontend |

---

## Tier 4: Future Vision (high effort, long-term)

| # | Feature | Description | Scope |
|---|---------|-------------|-------|
| 4.1 | **Telegram bot + AI** | n8n workflow: message → AI parses → creates movement via API. Natural language input. | External + Backend |
| 4.2 | **Google Sheets sync** | Two-way sync with a Google Sheet for backup/sharing. | Backend + External |
| 4.3 | **PWA + offline support** | Service worker, offline movement creation (queue + sync when online). | Frontend |
| 4.4 | **Receipt OCR** | Photo → extract amount + merchant → pre-fill movement form. | External + Frontend |
| 4.5 | **Split transactions** | One purchase, multiple categories (e.g., grocery trip: food + household). | Full stack |
| 4.6 | **Multi-user / shared accounts** | Share an account with a partner, see combined spending. | Full stack + Auth |
| 4.7 | **Swipe gestures (mobile)** | Swipe left to delete, swipe right to edit. Pull-to-refresh. | Frontend |
| 4.8 | **Monthly summary notification** | Email or push notification with spending summary at month end. | Backend + External |

---

## Execution Strategy

**Tier 1** → Fix immediately (next sprint). These are bugs and daily-friction items.

**Tier 2** → Plan and design first. Item 2.1 (UI overhaul) should happen BEFORE implementing 2.2-2.8, since the visual redesign will affect how all new features look.

**Tier 3** → Implement alongside or after Tier 2. These are polish items that improve existing features.

**Tier 4** → Backlog. Only after Tiers 1-3 are solid.

### Recommended order within Tier 2:
1. **2.1 UI overhaul** (design proposals) — sets the visual direction for everything else
2. **1.2 Categories** (from Tier 1) — enables 2.3 Reports
3. **2.3 Reports page** — highest user value after categories exist
4. **2.2 Unified budget page** — complex but high-value redesign
5. **2.4 Recurring movements** + **2.8 Fixed/Reminders integration** — do together
6. **2.5 Savings goals** — builds on pocket system
7. **2.6 Archive redesign** — removes technical debt
8. **2.7 Global search** — power-user feature

---

## Notes

- **UI Overhaul (2.1)**: Use Google Stitch or similar AI design tool to generate multiple complete proposals. Present 3-5 options covering: navigation layout, color palette, card/component style, mobile-first responsive design, dark/light mode. User picks one, then we implement it across the entire app.
- **Categories (1.2)**: This is the single most impactful feature for the app's core value proposition. Without categories, the app can't answer "how much did I spend on X?" — which is why people use finance apps.
- **All new features must respect**: Vercel free tier limits, mobile-first design, existing Tailwind/dark-mode system, single-user architecture.
