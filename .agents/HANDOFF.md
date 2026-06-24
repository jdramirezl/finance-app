# Agent Handoff Document — Finance App

## Project Overview

**What**: Personal finance management web app (github.com/jdramirezl/finance-app)
**Owner**: jdrami (single user, personal project)
**Stack**: React 19 + TypeScript + Vite (frontend), Express + TypeScript (backend), Supabase PostgreSQL (database), Vercel (hosting)
**Cost**: $0/month (all free tier)
**Branch**: `master` (always work from master, create feature branches)

## What Was Done (This Conversation — May/Jun 2026)

### Major Features Built
1. **Net Worth ECharts widget** — full rewrite from Recharts to ECharts with minimap, variation mode, hierarchical time axis, zoom snapping
2. **Historical data import** — uploaded 34 net worth snapshots (2023-2025) from Excel files, seeded 5 years of VOO prices + exchange rate history
3. **Archive redesign** — soft-delete for accounts AND pockets, archived section on accounts page
4. **Supabase direct reads migration** — frontend reads bypass backend (direct Supabase queries), writes still go through backend
5. **Investment refresh UX** — single-click = cached check, triple-click = force refresh (API token), next-refresh-time display
6. **Google Sheets sync** — one-click backup to Google Sheet (multi-tab, formatted, service account auth with base64 key for Vercel)
7. **Budget persist to DB** — moved allocations/scenarios from localStorage to Supabase
8. **Allocation scenarios CRUD** — multiple named allocation sets, select one for generation
9. **Transfer UX rethink** — dedicated TransferModal, transfer_pair_id linking, combined indigo card in movements list, balance previews
10. **Phantom live net worth point** — toggle shows current calculated value as green diamond without saving
11. **CD Release** — one-click release of matured CD funds to destination account
12. **Account panel improvements** — auto-scroll to selected, sub-pocket highlight + detail
13. **Batch modal animations** — row enter/exit animations, live delta updates on typing
14. **Per-currency snapshot editing** — click chart point to edit individual COP/USD/MXN values
15. **Manual snapshot capture** — Settings button to take/overwrite snapshots
16. **Fixed expense mandatory sub-pocket** — form validation prevents missing sub-pocket
17. **Removed categories/tags** from all movement modals
18. **Force refresh buttons** in Settings for exchange rates and stock prices
19. **Budget donut chart** — includes fixed expenses, percentages, blue tonality allocations, orange expenses

### Bugs Fixed
- TanStack Query invalidation not triggering re-renders (Chrome DevTools-dependent behavior)
- Chart Y-axis not rescaling to visible window
- Chart date range gaps (removed hardcoded xAxis min/max)
- Exchange rate history 365-day limit (raised to 1825)
- Batch endpoint not recalculating sub-pocket balances (missing subPocketId)
- Auto-snapshot empty breakdown race condition (guard added, but still occurs occasionally)
- Flaky e2e settings currency test (robust selector + longer waits)
- Multiple display_order null constraint errors

### Key Decisions Made
- **Keep old visual style** (standard Tailwind dark mode) — Settings page is the ONLY exception with new design
- **ECharts over Recharts** for the net worth chart (better for time-series with zoom)
- **Direct Supabase reads** for frontend (bypasses backend latency issues)
- **No chart overlay lines** — attempted exchange rate/VOO overlays on net worth chart, user rejected it
- **Transfers are separate** — dedicated modal, not a type in the movement form

## Architecture & Key Files

### Frontend
- `frontend/src/pages/` — route pages (SummaryPage, MovementsPage, AccountsPage, UnifiedBudgetPage, SettingsPage)
- `frontend/src/components/` — feature-organized components
- `frontend/src/hooks/queries/` — TanStack Query hooks (read from Supabase directly)
- `frontend/src/hooks/actions/` — action hooks (useBudgetActions, useCDRelease, useMovementSubmit)
- `frontend/src/services/` — API client + Supabase service layer
- `frontend/src/lib/supabase.ts` — Supabase client instance
- `frontend/src/lib/queryClient.ts` — TanStack Query client (staleTime: 0)

### Backend
- `backend/src/modules/` — domain modules (accounts, movements, pockets, settings, sync, etc.)
- `backend/src/modules/sync/` — Google Sheets sync feature
- `backend/src/shared/` — middleware, DI container, error handling
- `backend/src/server.ts` — Express app with route registration

### Database
- Supabase project: `fzndohawryghtzcqbrmz`
- RPC functions: `create_transfer`, `batch_create_movements`
- Key tables: accounts, pockets, sub_pockets, movements, net_worth_snapshots, settings, budget_planning, exchange_rate_history, stock_price_history, exchange_rates, stock_prices

## Common Problems & Solutions

| Problem | Solution |
|---------|----------|
| Supabase CLI can't login from dev desktop | Use `--token` flag or Management API with bearer token |
| Vercel env vars with `\n` in private key | Base64-encode the JSON, use `GOOGLE_SERVICE_ACCOUNT_KEY_BASE64` |
| Vercel function timeout (10s limit) | Skip formatting in sync on Vercel (`!process.env.VERCEL`) |
| TanStack Query not refetching after mutation | Use `refetchType: 'all'` for inactive queries; the real fix was direct Supabase reads |
| Auto-snapshot with empty breakdown | Race condition — `isConsolidatedReady` fires before `totalsByCurrency` populated. Guard exists but isn't bulletproof. |
| Chart gaps on short ranges | Removed `xAxis.min/max`, snap zoom to nearest data points |
| DB functions failing with type mismatch | Supabase JS sends strings; use `TEXT` params with `::DATE` cast in RPC |
| Build errors after adding new hooks | Update test mocks to include new hook exports |

## DOs and DON'Ts

### DOs
- Always create feature branches from master
- Run `npm run build` (not just `tsc --noEmit`) to verify
- Run frontend tests locally before pushing
- Use research subagents BEFORE coder subagents for medium+ tasks
- Keep coder agent tasks small (1-3 files, single responsibility)
- Use the Supabase Management API for DDL: `curl -X POST "https://api.supabase.com/v1/projects/fzndohawryghtzcqbrmz/database/query" -H "Authorization: Bearer TOKEN"`
- Wait for CI then merge (user's preferred flow)
- Squash merge with `--delete-branch`

### DON'Ts
- Don't send coder agents to research (they waste 10+ minutes reading files)
- Don't use `xAxis.min/max` on the ECharts time-series chart
- Don't use `navigator.locks` workarounds for Supabase auth
- Don't auto-publish CRs
- Don't add categories/tags to movement modals (removed intentionally)
- Don't change the visual style (keep old Tailwind dark mode)
- Don't commit secrets to git (`.env` is gitignored)
- Don't force push to remote branches that have been shared
- Don't create chart overlay lines (user rejected that feature)

## How We Work

1. **Research first**: Spawn `gpu-research` subagent(s) to investigate code, understand patterns, produce task breakdown
2. **Task breakdown**: Max medium-sized tasks, 2-3 files each, organized into parallel waves
3. **Coder execution**: Spawn `gpu-coder` subagent(s) with focused, explicit prompts (no research needed)
4. **Build & test**: Verify with `npm run build` + relevant tests
5. **Push & PR**: Create PR, wait for CI (all green), squash merge
6. **Max 6 subagents** per spawn call

### CI Pipeline
- lint, test-backend, test-frontend, test-integration, test-e2e (Playwright)
- Vercel deploys automatically on push
- E2e settings currency test was flaky (fixed with robust selectors)

## Known Weaknesses / Pending Work

### Bugs
- **Auto-snapshot empty breakdown** — race condition still occurs; the guard (`Object.keys(breakdown).length === 0`) helps but doesn't fully prevent it
- **PR #73** (snapshot fix + capture button) — may not be merged yet, check

### Pending Features
- Budget: manual input (set % OR amount, other auto-calculates)
- Movements pagination (year tabs + month rows + load-more)
- Movement inline editing in the list
- Reminders: hide done/paid by default
- Budget: conversion legend (subtle converted amounts)
- Clean up research .md files from master root
- Investigate reminder-movement relation (Pay Now not always marking as paid)

## User Preferences

- Concise, human-like language (no emojis, no AI-speak)
- English only for all written output
- Prefers subagent delegation over doing everything inline
- Wants research before code (never send coder to research)
- Tests required for all new features
- Simple, minimal code over complex conditional logic
- Dark mode Tailwind styling (keep existing visual style)
- Settings page keeps its new design (left nav + right content)
- Ask for Stitch designs if unsure how something should look visually
