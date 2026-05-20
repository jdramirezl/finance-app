# Refactor Progress Tracker

## Pending Manual Actions
- [ ] Run migration `011_atomic_operations.sql` on Supabase
- [ ] Run migration `012_enable_rls.sql` on Supabase
- [ ] Run migration `013_add_indexes.sql` on Supabase
- [ ] Add movement templates backend routes (CRUD) — done in f3d142e, needs deploy

## Task Status

### Step 01 — Critical Bugs (COMPLETE)
- [x] task-01: Eliminate dual balance management — `e6c4a5f`
- [x] task-02: Fix non-atomic operations — `23afe7f`
- [x] task-03: Fix sequential batch operations — `05fd26e`
- [x] task-04: Fix broken reminder widget — `401630b`
- [x] task-05: Fix SummaryPage race conditions — `27efea1`

### Step 02 — Architecture (COMPLETE)
- [x] task-01: Remove direct Supabase access and dual-mode pattern — `1db9f7d`
- [x] task-02: Eliminate circular deps — `954ea7c`

### Step 03 — Data Layer (COMPLETE)
- [x] task-02: Schema docs, RLS, indexes, movement templates backend, context merge — `f3d142e`
- [x] Page bug fixes (deletingId, form reset) — `c2b9478`

### Step 03-continued — Remaining Refactoring (IN PROGRESS)
- [ ] task-01: Wire cascade delete RPC + add bulk backend endpoints (remove last supabase from frontend)
- [ ] task-02: Delete dead code files (supabaseStorageService, storageService, no-ops)
- [ ] task-03: Fix remaining page bugs (restore orphans, budget pocketId, isSaving)
- [ ] task-04: Decompose MovementsPage (941 → <300 lines)
- [ ] task-05: Decompose AccountsPage (779 → <300 lines)
- [ ] task-06: Decompose remaining pages (FixedExpenses, Settings, Summary, Budget)

### Step 04 — Performance & UX
- [ ] task-01: Error boundaries, loading states, error feedback
- [ ] task-02: React.memo and memoization throughout
- [ ] task-03: Accessibility (aria-labels, keyboard nav, focus management)
- [ ] task-04: Standardize date handling (fix off-by-one bugs)

### Step 05 — Code Quality
- [ ] task-01: Remove all console.logs, fix all `any` types, remove eslint-disables
- [ ] task-02: Fix apiClient error handling (Axios patterns → proper fetch handling)

## Execution Order
1. step03-continued/task-01 → task-02 (sequential: task-02 deletes files task-01 makes obsolete)
2. step03-continued/task-03 (independent)
3. step03-continued/task-04 → task-05 → task-06 (sequential: same pattern, build on each other)
4. step04/task-01 + step05/task-02 (parallel: different files)
5. step04/task-02 + step04/task-03 (parallel: different files)
6. step04/task-04 + step05/task-01 (parallel: different concerns)
