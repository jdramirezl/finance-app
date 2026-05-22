# Agent Handoff Document — Finance App

## Project Overview

**What**: Personal finance management web app (github.com/jdramirezl/finance-app)
**Owner**: jdrami (single user, personal project)
**Stack**: React 19 + TypeScript + Vite (frontend), Express + TypeScript (backend), Supabase PostgreSQL (database), Vercel (hosting)
**Cost**: $0/month (all free tier)
**Branch**: `refactor/full-codebase-cleanup` on `refactor/supabase-singleton` local branch

## What Was Done (Conversation History)

### Phase 1-7: Full Backend + Frontend Refactoring
The app was entirely "vibe-coded" with terrible practices. We did a complete refactoring:

1. **Backend**: Clean architecture (use cases, DI with tsyringe, Zod validation, atomic transfers via RPC, N+1 fixes, Supabase singleton)
2. **Frontend**: react-hook-form on all forms, TanStack Query, proper component decomposition, hooks extraction
3. **Database**: 30 migrations applied (triggers, constraints, indexes, RLS, RPC functions)
4. **Testing**: 720+ backend tests, 323+ frontend tests, CI pipeline, Playwright E2E setup
5. **Features added**: Categories/tags, quick-add (Ctrl+Shift+M), inline editing, spending summary, exchange rate history, reminders calendar heatmap, bulk selection, year/month navigation

### UI Overhaul Attempt + Revert
We attempted a full UI redesign using Google Stitch (design tool). The user rejected it and reverted to the original visual style. Key lesson: **the user wants the OLD visual appearance** (standard Tailwind dark mode) with new features integrated into the old layout.

**Settings page is the ONLY page that keeps the new design** (left nav + right content).

### Current State
- All pages restored to original visual style from commit `5199ad3`
- New features wired into old layouts (year/month nav, inline edit, bulk selection, etc.)
- Reports page was removed entirely (user doesn't want it)
- Financial Calendar was removed (user rejected it)

---

## Architecture

### Backend (`/backend/src/`)
```
modules/
├── accounts/     (domain, infrastructure, application/useCases, presentation)
├── movements/    (same pattern)
├── pockets/
├── sub-pockets/
├── settings/
├── reminders/
├── net-worth/
├── reports/      (exchange rate history endpoint only)
shared/
├── container/    (per-module DI registration files)
├── infrastructure/ (supabaseClient singleton)
├── middleware/   (auth, validate, error handler)
├── errors/
```

### Frontend (`/frontend/src/`)
```
pages/           (SummaryPage, AccountsPage, MovementsPage, BudgetPlanningPage, FixedExpensesPage, SettingsPage, TemplatesPage, LoginPage, SignUpPage)
components/
├── ui/          (Button, Card, Input, Select, Modal, SidePanel, InlineEditableAmount, etc.)
├── layout/      (Layout, Sidebar, BottomNav)
├── accounts/
├── movements/   (MovementList, MovementForm, QuickAddMovement, BatchMovementForm, YearMonthNav, PaginationControls, etc.)
├── budget/
├── fixed-expenses/
├── reminders/   (RemindersWidget, ReminderCalendarHeatmap)
├── net-worth/   (NetWorthTimelineWidget, ExchangeRateTrend)
├── summary/     (TotalsSummary, CurrencyBreakdownSection, FixedExpensesSummary, SpendingCard)
├── settings/    (NEW design: left nav + sections)
hooks/
├── queries/     (TanStack Query hooks)
├── actions/     (mutation wrappers)
services/        (API clients)
store/           (Zustand: theme, lastUsedPocket)
```

### Database (Supabase)
- Project ID: `fzndohawryghtzcqbrmz`
- 15 tables: accounts, pockets, sub_pockets, movements, settings, reminders, reminder_exceptions, exchange_rates, exchange_rate_history, net_worth_snapshots, budget_entries, movement_templates, fixed_expense_groups, stock_prices, investment_api_calls
- 30 migrations (014-030 + 028)
- RPC functions: create_transfer, batch_create_movements
- RLS on all tables

---

## How We Work

### Task Execution Pattern
1. **Research agent** (`gpu-research`) analyzes the problem, reads code, creates a task breakdown file in `.agents/tasks/`
2. **Coder agents** (`gpu-coder`) execute tasks in parallel waves (max 4 per spawn)
3. Each coder reads the task file + relevant source code, implements, verifies build, commits
4. After all waves: push to branch, user pulls and tests on Mac

### Key Commands
```bash
# Dev environment
npm run dev:all                    # Start both frontend (5173) + backend (3001)

# Building
cd backend && npm run build        # TypeScript compile
cd frontend && npx tsc --noEmit    # Type check without build
cd frontend && npm run build       # Full Vite build

# Testing
cd backend && npm run test:unit    # Jest (720+ tests)
cd frontend && npx vitest run --exclude 'e2e/**'  # Vitest (323+ tests)

# Supabase
export SUPABASE_ACCESS_TOKEN="<SUPABASE_TOKEN>"
supabase db query --linked "SQL HERE"
supabase db query --linked -f path/to/migration.sql
supabase db dump --linked -f backup.sql --password "<DB_PASSWORD>"

# Git
git push origin HEAD:refactor/full-codebase-cleanup --force
```

### User's Mac Setup
- Node 20 (via nvm)
- Pulls from `refactor/full-codebase-cleanup` branch
- Runs `npm run dev:all` locally
- Tests visually in browser

---

## DOs and DON'Ts

### DO
- Always verify build after changes (`npx tsc --noEmit`)
- Use `gpu-research` for task breakdowns before sending coders
- Run in parallel waves (max 4 agents per spawn)
- Keep the OLD visual style (standard Tailwind dark mode: `bg-gray-800`, `text-gray-100`, `border-gray-700`)
- Include tests with new features
- Back up DB before schema changes
- Use `git checkout 5199ad3 -- <file>` to restore old visual versions of files
- Ask the user to generate Stitch designs when unsure how something should look

### DON'T
- Don't use custom color tokens (no `bg-surface-container`, `text-on-surface`, etc.)
- Don't use glass-morphism, backdrop-blur, or JetBrains Mono
- Don't add the Reports page back (user removed it)
- Don't add the Financial Calendar back (user removed it)
- Don't change the Settings page (user likes the new design)
- Don't use modals for forms where a side panel works better
- Don't make widgets expand to full content height (use max-height + scroll)
- Don't assume how something should look — ask the user or check commit `5199ad3`
- Don't cut corners or leave TODOs

---

## Common Problems & Solutions

| Problem | Solution |
|---------|----------|
| Supabase CLI hangs | Use `--linked` flag, export `SUPABASE_ACCESS_TOKEN` env var |
| Frontend build fails on font imports | Fonts were removed; don't re-add them |
| `dark:` prefixes not working | Body needs `class="dark"` on `<html>` OR use media query |
| RPC "Not authorized" | Supabase RPC functions use `auth.uid()` which is NULL for service role; remove auth check from RPC |
| Movements infinite loop | `useAutoNetWorthSnapshot` had unstable deps; use refs for mutation objects |
| Currency mixing (millions vs thousands) | Always convert to primary currency before displaying; use `currencyService.convertBatch` |
| Component restored from old commit missing new features | Wire new imports/hooks into the old layout structure |
| `watch('rows')` in react-hook-form doesn't trigger useEffect | Use `useWatch({ control, name: 'rows' })` instead (returns new references) |

---

## Known Weaknesses / Pending Work

### Bugs
- Some test files may be broken after the visual restore (tests written for new UI components that were reverted)
- The `pending-bugs` memory entry has outdated items that were fixed

### Missing Features (Future Roadmap)
1. Unified Budget & Fixed Expenses page
2. Recurring movements (auto-create from reminders)
3. Savings goals (pocket with target + deadline)
4. Archive accounts (replace orphan system)
5. Global search (Cmd+K)
6. Light mode
7. English/Spanish i18n
8. Investment price service redesign (shared symbol refresh)
9. CSV export

### Technical Debt
- ~50 files still have inconsistent `dark:` prefix patterns
- Some old components (pre-refactor) still exist but aren't used
- E2E tests need a test user in Supabase to actually run
- Coverage thresholds are set but not enforced in CI

---

## Key Files to Read First

| File | Purpose |
|------|---------|
| `.agents/tasks/MASTER-ROADMAP.md` | Full prioritized feature list |
| `.agents/design/STYLE-GUIDE.md` | Design system (REJECTED — don't use) |
| `.agents/analysis/` | All research reports |
| `frontend/src/pages/SummaryPage.tsx` | Main dashboard |
| `frontend/src/pages/MovementsPage.tsx` | Most complex page |
| `backend/src/shared/container/index.ts` | DI entry point |
| `AGENTS.md` (root) | Project overview for AI agents |

---

## User Preferences Summary

- Desktop-first, mobile-compatible
- Prefers old visual style (NOT the Stitch redesign)
- Wants information density (show all data, don't hide things)
- Hates intrusive UI elements (orphaned trash icon, modals for simple actions)
- Loves: year/month navigation, inline editing, clickable amounts, bulk selection
- Delegates creative decisions but rejects results that lose information
- Tests on Mac, code lives on remote dev desktop
- Timezone: Mexico City (GMT-6)
