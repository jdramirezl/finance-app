# Refactor Progress Tracker

## Pending Manual Actions
- [ ] Run migration `011_atomic_operations.sql` on Supabase (`supabase db push` or SQL editor)
- [ ] Wire `delete_account_cascade` RPC to frontend `deleteAccountCascadeDirect` (deferred from task-02)

## Task Status

### Step 01 — Critical Bugs
- [x] task-01: Eliminate dual balance management — `e6c4a5f`
- [x] task-02: Fix non-atomic operations — `23afe7f`
- [x] task-03: Fix sequential batch operations — `05fd26e`
- [x] task-04: Fix broken reminder widget — `401630b`
- [x] task-05: Fix SummaryPage race conditions — `27efea1`

### Step 02 — Architecture
- [ ] task-01: Remove direct Supabase access and dual-mode pattern
- [ ] task-02: Eliminate circular deps, break god-services

### Step 03 — Refactor
- [ ] task-01: Decompose god-page components
- [ ] task-02: Fix data layer (schema, types, queries)

### Step 04 — Performance & UX
- [ ] task-01: Performance and UX improvements

### Step 05 — Code Quality
- [ ] task-01: Code quality cleanup
