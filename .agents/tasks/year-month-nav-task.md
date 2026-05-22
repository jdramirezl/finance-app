# Task: Year/Month Navigation + Pagination

Replaces the current month-grouped infinite scroll on the Movements page with a year/month pill navigation and traditional pagination.

Reference: `.agents/analysis/movements-year-month-nav-proposal.md`

---

## Task 1: Backend — `GET /api/movements/years` endpoint

**Files to create:**
- `backend/src/modules/movements/application/useCases/GetMovementYearsUseCase.ts`

**Files to modify:**
- `backend/src/modules/movements/infrastructure/IMovementRepository.ts` — add `getDistinctYears(userId: string): Promise<{ year: number; count: number }[]>`
- `backend/src/modules/movements/infrastructure/SupabaseMovementRepository.ts` — implement `getDistinctYears`
- `backend/src/modules/movements/presentation/MovementController.ts` — add `getYears` method
- `backend/src/modules/movements/presentation/routes.ts` — add `GET /api/movements/years` route (before `/:id` routes)

**Implementation details:**

1. **Repository method** (`getDistinctYears`):
   ```sql
   SELECT EXTRACT(YEAR FROM displayed_date)::int AS year, COUNT(*)::int AS count
   FROM movements
   WHERE user_id = $1 AND is_orphaned = false
   GROUP BY year
   ORDER BY year DESC
   ```
   Use Supabase's `.rpc()` or raw query. If RPC isn't available, use the existing pattern of querying with `.select()` and aggregating in JS (select `displayed_date`, extract years, count). Prefer the SQL approach if possible via a Supabase function, otherwise do a lightweight JS aggregation on `displayed_date` column only.

2. **Use case** (`GetMovementYearsUseCase`):
   - Inject `MovementRepository`
   - Validate userId
   - Call `this.movementRepo.getDistinctYears(userId)`
   - Return `{ years: { year: number; count: number }[] }`

3. **Controller method** (`getYears`):
   - Extract userId from `req.user.id`
   - Call use case
   - Return 200 with result

4. **Route**: `router.get('/years', (req, res, next) => controller.getYears(req, res, next))` — place BEFORE the `/:id` param routes.

**Also update the year+month branch in `getAll`:**
- Pass `page` and `limit` query params through to `GetMovementsByMonthUseCase`
- The use case should return `PaginatedMovementsDTO` (same shape as `GetAllMovementsUseCase`: `{ data, total, page, limit, hasMore }`) instead of `{ year, month, movements }`.

5. **Modify `GetMovementsByMonthUseCase`**:
   - Add optional `page` and `limit` params (same validation as `GetAllMovementsUseCase`)
   - Use `this.movementRepo.findByMonth(year, month, userId, { limit, offset })` for the page
   - Use `this.movementRepo.count(userId, { year, month })` for total
   - Return `PaginatedMovementsDTO` with `data`, `total`, `page`, `limit`, `hasMore`
   - Keep the existing filters (accountId, pocketId, isPending) as optional post-fetch filters OR pass them to the repo if supported

6. **Update controller `getAll` year+month branch**:
   - Parse `page` and `limit` from query params
   - Pass them to `GetMovementsByMonthUseCase.execute()`
   - The response shape changes from `{ year, month, movements }` to `{ data, total, page, limit, hasMore }`

**Tests:**
- Unit test for `GetMovementYearsUseCase` (mock repo, verify output shape)
- Verify the updated `GetMovementsByMonthUseCase` returns paginated envelope

---

## Task 2: Frontend — `YearMonthNav` component

**Files to create:**
- `frontend/src/components/movements/YearMonthNav.tsx`

**Implementation details:**

```typescript
interface YearMonthNavProps {
  years: { year: number; count: number }[];
  selectedYear: number;
  selectedMonth: number; // 1-12
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
  isLoading?: boolean;
}
```

**UI structure:**
- Row 1: Year pills — horizontal row of buttons, one per year from the `years` prop. Selected year gets `bg-blue-600 text-white`, others get `bg-zinc-800 text-zinc-300 hover:bg-zinc-700`.
- Row 2: Month pills — 12 abbreviated month buttons (`Jan`, `Feb`, ..., `Dec`). Selected month highlighted same blue style. Future months in the current year can be dimmed (opacity-50) as a simple heuristic.
- Compact spacing, fits in a single horizontal band above the movement list.
- If `isLoading` is true, show a skeleton placeholder row.

**Styling:** Use existing Tailwind utility classes consistent with the app's dark theme (`bg-zinc-900`, `text-zinc-100`, etc.).

**No external dependencies needed.**

---

## Task 3: Frontend — Wire into MovementsPage

**Files to create:**
- `frontend/src/hooks/queries/useMovementYearsQuery.ts` — TanStack Query hook calling `movementService.getMovementYears()`
- `frontend/src/hooks/queries/useMonthlyMovementsQuery.ts` — TanStack Query hook calling `movementService.getMovementsByMonth(year, month, page, limit, filters?)`

**Files to modify:**
- `frontend/src/services/movementService.ts` — add `getMovementYears()` and `getMovementsByMonth()` methods
- `frontend/src/hooks/queries/index.ts` — export new hooks
- `frontend/src/pages/MovementsPage.tsx` — replace infinite scroll with year/month nav + pagination state

**Implementation details:**

1. **Service methods** (`movementService.ts`):
   ```typescript
   async getMovementYears(): Promise<{ years: { year: number; count: number }[] }>
   async getMovementsByMonth(year: number, month: number, page: number, limit: number, filters?: { category?: string; tags?: string[] }): Promise<PaginatedResponse<Movement>>
   ```
   The `getMovementsByMonth` calls `GET /api/movements?year=X&month=Y&page=P&limit=L`.

2. **Query hooks:**
   - `useMovementYearsQuery`: `queryKey: ['movements', 'years']`, `staleTime: 10 * 60 * 1000`
   - `useMonthlyMovementsQuery(year, month, page, limit, filters?)`: `queryKey: ['movements', 'monthly', year, month, page, limit, filters]`, uses `placeholderData: keepPreviousData` for smooth page transitions

3. **MovementsPage changes:**
   - Add state: `selectedYear` (default: current year), `selectedMonth` (default: current month), `currentPage` (default: 1)
   - Replace `useInfiniteMovementsQuery` with `useMonthlyMovementsQuery(selectedYear, selectedMonth, currentPage, limit, { category, tags })`
   - Add `useMovementYearsQuery()` for the year pills data
   - Render `<YearMonthNav>` above filters
   - When year/month changes, reset `currentPage` to 1
   - Remove `expandedMonths`, `toggleMonth`, `expandMonth` state and related logic
   - Remove "Load More" button and `hasNextPage`/`fetchNextPage` usage
   - Pass flat `data` array (from paginated response) to filter/sort hooks instead of flattened infinite pages
   - Keep `useMovementsFilter` and `useMovementsSort` but feed them the single-page array (no month grouping needed)

4. **Remove month grouping from `useMovementsSort`:**
   - The hook currently returns `sortedMovementsByMonth` (a Map). Change it to return a flat sorted `Movement[]` since all movements are already for one month.
   - Or: keep the hook but only use the flat sorted output, ignoring the month-grouped map.

5. **Update `MovementList`:**
   - Remove `movementsByMonth` / `expandedMonths` / `toggleMonth` props
   - Accept flat `movements: Movement[]` prop instead
   - Remove collapsible month section headers
   - Render a flat list of `MovementRow` components
   - Keep selection, sort controls, and all row interactions

---

## Task 4: Frontend — Pagination component at bottom

**Files to create:**
- `frontend/src/components/movements/PaginationControls.tsx`

**Implementation details:**

```typescript
interface PaginationControlsProps {
  page: number;
  totalPages: number;
  totalItems: number;
  limit: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
}
```

**UI:**
- Shows: `Showing X–Y of Z` text (e.g., "Showing 1–50 of 127")
- Previous / Next arrow buttons (disabled at boundaries)
- Page number display: `Page 1 of 3`
- Compact single row, centered or right-aligned
- Disabled state while loading (prevent double-clicks)

**Wire into MovementsPage:**
- Place below the `MovementList`
- `totalPages = Math.ceil(total / limit)`
- `onPageChange` updates `currentPage` state
- Pass `isLoading` from the query hook's `isFetching` state

---

## Execution Order

1. **Task 1** (backend) — no frontend dependency, can run first
2. **Task 2** (YearMonthNav component) — standalone component, can run in parallel with Task 1
3. **Task 4** (PaginationControls component) — standalone component, can run in parallel with Tasks 1 & 2
4. **Task 3** (wire everything together) — depends on Tasks 1, 2, and 4 being complete

**Parallelization:** Tasks 1, 2, and 4 can run simultaneously. Task 3 runs after all three complete.

---

## Testing Requirements

- **Task 1**: Unit test for `GetMovementYearsUseCase`, update integration test for the paginated year+month response
- **Task 2**: Unit test for `YearMonthNav` (renders years, highlights selected, calls callbacks)
- **Task 3**: Update `MovementsPage` tests to reflect new data flow (no infinite scroll, uses monthly query)
- **Task 4**: Unit test for `PaginationControls` (renders page info, disables at boundaries, calls onPageChange)

After all tasks: run full test suite (`npm run test` in frontend, `npm run test` in backend) to verify no regressions.
