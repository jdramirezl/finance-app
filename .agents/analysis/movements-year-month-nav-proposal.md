# Movements Page: Year/Month Navigation + Pagination Proposal

## Summary

Replace the current expandable month-by-month sections with a two-row navigation bar (years row + months row) and paginated movement list for the selected period. The backend already supports `?year=X&month=Y` filtering and paginated responses, so minimal backend changes are needed.

---

## Current State

### How it works today

1. **Data fetching**: `useInfiniteMovementsQuery` fetches ALL movements via `GET /api/movements?page=N&limit=50` (infinite scroll / "Load More" pattern)
2. **Client-side grouping**: `useMovementsSort` groups the flat array into `Map<monthKey, Movement[]>` and sorts within each group
3. **UI**: `MovementList` renders collapsible month sections with sticky headers showing month name + income/expense totals
4. **Filtering**: `useMovementsFilter` applies client-side filters (account, pocket, type, date range, search, amount range, pending status, category, tags)
5. **Pagination**: "Load More" button at the bottom fetches the next page of the infinite query

### Problems with current approach

- Fetches all movements regardless of which month the user cares about
- Client-side grouping is wasteful — groups data that's already available server-side
- Expandable sections are clunky for navigating across months/years
- No clear way to jump to a specific historical period
- "Load More" is unbounded — user doesn't know how many pages exist

---

## Proposed Design

### UI Mockup

```
┌─────────────────────────────────────────────────────────────────────┐
│  Movements                                    [Batch Add] [+ New]   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  [2023]  [2024]  [2025]  [2026]                             │    │
│  └─────────────────────────────────────────────────────────────┘    │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │  Jan  Feb  Mar  Apr  [May]  Jun  Jul  Aug  Sep  Oct  Nov  Dec│   │
│  └─────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─ Quick Add ─────────────────────────────────────────────────┐    │
│  │  ...                                                         │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─ Filters ───────────────────────────────────────────────────┐    │
│  │  [Search] [Account ▾] [Type ▾] [Pending ▾] [Amount range]  │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                     │
│  ┌─ Sort: [Date] [Amount] [Type] [Created] ───────────────────┐    │
│  │                                                              │    │
│  │  May 2026 — 47 movements  |  +$3,200  -$1,850              │    │
│  │                                                              │    │
│  │  ┌─ Movement Row ──────────────────────────────────────┐    │    │
│  │  │  [✓] 🛒 Groceries   Expense   May 21   Acc > Pocket │    │    │
│  │  │                                          -$85.00     │    │    │
│  │  └─────────────────────────────────────────────────────┘    │    │
│  │  ┌─ Movement Row ──────────────────────────────────────┐    │    │
│  │  │  ...                                                 │    │    │
│  │  └─────────────────────────────────────────────────────┘    │    │
│  │                                                              │    │
│  │  ┌─ Pagination ────────────────────────────────────────┐    │    │
│  │  │  [< Prev]  Page 1 of 3 (47 movements)  [Next >]    │    │    │
│  │  └─────────────────────────────────────────────────────┘    │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Year Row

- Horizontal row of pill buttons
- Shows only years that have movements (query backend for distinct years)
- Current/selected year is highlighted (filled pill)
- If many years, horizontally scrollable with overflow
- Default: current year selected on page load

### Month Row

- 12 abbreviated month buttons: `Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec`
- Selected month is highlighted
- Months with no movements in the selected year are dimmed/disabled (optional enhancement — can skip for v1)
- Default: current month selected on page load

### Period Summary Header

- Below the nav, show a summary line: `May 2026 — 47 movements | +$3,200 -$1,850`
- Gives immediate context about the selected period

### Movement List (flat, no grouping)

- Flat list of movements for the selected year+month
- No expandable sections — all movements visible
- Same `MovementRow` component as today (no change needed)
- Sort controls remain above the list

### Pagination

- Traditional page-based pagination (not infinite scroll)
- Controls at the bottom: `[< Prev] Page X of Y (N movements) [Next >]`
- Page size from settings (`movementsPerPage`, default 50)
- Changing year/month resets to page 1

### Range Selection Mode (future enhancement)

- Add a "Custom Range" option alongside the year/month pills
- When activated, shows date pickers (from/to) replacing the month row
- Reuses existing `filterDateFrom`/`filterDateTo` logic
- This can be a follow-up — the year/month nav covers 90% of use cases

---

## Data Fetching Strategy

### New approach

```
Selected: year=2026, month=5, page=1, limit=50
  → GET /api/movements?year=2026&month=5&page=1&limit=50
  ← { data: Movement[], total: 47, page: 1, limit: 50, hasMore: false }
```

### Changes needed

1. **Backend**: The `year+month` branch in `MovementController.getAll` currently returns `{ year, month, movements: [] }` (no pagination). Need to add pagination support to this branch.

2. **Frontend**: Replace `useInfiniteMovementsQuery` with a new `useMonthlyMovementsQuery` that uses standard `useQuery` with year/month/page/limit params.

3. **Available years endpoint**: Add `GET /api/movements/years` that returns distinct years with movement counts (for rendering the year row).

---

## Backend Changes

### 1. Add pagination to `GetMovementsByMonthUseCase`

Currently `findByMonth` returns all movements for a month. Need to:
- Accept `page` and `limit` params
- Return `{ data, total, page, limit, hasMore }` (same shape as `GetAllMovementsUseCase`)
- The repository's `findByMonth` already accepts `PaginationOptions` in the interface

### 2. Update controller routing for year+month

Change the `year+month` branch in `MovementController.getAll` to:
- Parse `page` and `limit` from query params
- Pass pagination to the use case
- Return paginated envelope instead of flat array

### 3. New endpoint: `GET /api/movements/years`

Returns distinct years that have movements for the authenticated user:

```typescript
// Response shape
interface MovementYearsResponse {
  years: { year: number; count: number }[];
}
```

Implementation: Simple SQL query:
```sql
SELECT EXTRACT(YEAR FROM displayed_date) as year, COUNT(*) as count
FROM movements
WHERE user_id = $1 AND is_orphaned = false
GROUP BY year
ORDER BY year DESC;
```

### 4. (Optional) Month counts for a year: `GET /api/movements/months?year=2026`

Returns per-month counts for dimming empty months:

```typescript
interface MovementMonthsResponse {
  months: { month: number; count: number }[];
}
```

This is optional for v1 — can be added later for the "dim empty months" enhancement.

---

## Frontend Changes

### New Components

#### `YearMonthNav.tsx`

```typescript
interface YearMonthNavProps {
  years: { year: number; count: number }[];
  selectedYear: number;
  selectedMonth: number;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
}
```

- Renders year pills row + month buttons row
- Handles selection state
- Emits changes upward

#### `PaginationControls.tsx`

```typescript
interface PaginationControlsProps {
  page: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  isLoading: boolean;
}
```

- Prev/Next buttons
- Page X of Y display
- Total count display

### New Hooks

#### `useMovementYearsQuery.ts`

```typescript
export const useMovementYearsQuery = () => {
  return useQuery({
    queryKey: ['movements', 'years'],
    queryFn: () => movementService.getMovementYears(),
    staleTime: 1000 * 60 * 10, // 10 min — years don't change often
  });
};
```

#### `useMonthlyMovementsQuery.ts`

```typescript
export const useMonthlyMovementsQuery = (
  year: number,
  month: number,
  page: number,
  limit: number,
  filters?: { category?: string; tags?: string[] }
) => {
  return useQuery({
    queryKey: ['movements', 'monthly', year, month, page, limit, filters],
    queryFn: () => movementService.getMovementsByMonthPaginated(year, month, page, limit, filters),
    placeholderData: keepPreviousData, // smooth transitions between pages
    staleTime: 1000 * 60 * 5,
  });
};
```

### Modified Components

#### `MovementsPage.tsx`

Major changes:
- Replace `useInfiniteMovementsQuery` with `useMonthlyMovementsQuery`
- Add `selectedYear` / `selectedMonth` / `currentPage` state
- Default to current year+month on mount
- Remove `expandedMonths` / `toggleMonth` state
- Remove "Load More" section
- Add `YearMonthNav` and `PaginationControls`
- Remove month grouping from `useMovementsSort` (movements are already for one month)

#### `MovementList.tsx`

Simplify:
- Remove `movementsByMonth` prop (now receives flat `Movement[]`)
- Remove `expandedMonths` / `toggleMonth` props
- Remove month header buttons and collapsible sections
- Keep sort controls and `MovementRow` rendering
- Keep selection stats floating bar

#### `MovementFilters.tsx`

- Remove the `dateRange` filter (year/month nav replaces it)
- Keep: search, account, pocket, type, pending, amount range, category, tags
- OR: keep `dateRange` as "Custom Range" mode that overrides year/month nav

### Service Changes

#### `movementService.ts`

Add methods:
```typescript
async getMovementYears(): Promise<{ years: { year: number; count: number }[] }> {
  return apiClient.get('/api/movements/years');
}

async getMovementsByMonthPaginated(
  year: number, month: number, page: number, limit: number,
  filters?: { category?: string; tags?: string[] }
): Promise<PaginatedResponse<Movement>> {
  const params = new URLSearchParams({
    year: String(year), month: String(month),
    page: String(page), limit: String(limit),
  });
  if (filters?.category) params.set('category', filters.category);
  if (filters?.tags?.length) params.set('tags', filters.tags.join(','));
  return apiClient.get(`/api/movements?${params}`);
}
```

---

## Interaction with Existing Filters

| Filter | Behavior with year/month nav |
|--------|------------------------------|
| Search (notes) | Client-side filter on the current page's movements |
| Account | Client-side filter (or pass to backend as query param) |
| Pocket | Client-side filter |
| Type | Client-side filter |
| Pending toggle | Client-side filter |
| Amount range | Client-side filter |
| Category | Passed to backend (already supported) |
| Tags | Passed to backend (already supported) |
| Date range (custom) | Overrides year/month nav — switches to "custom range" mode |

**Key decision**: Most filters remain client-side since a single month's data (typically <200 movements) is small enough. Category/tags go server-side since they're already wired up.

---

## State Management

```typescript
// In MovementsPage
const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());
const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
const [currentPage, setCurrentPage] = useState(1);

// Reset page when year/month changes
const handleYearChange = (year: number) => {
  setSelectedYear(year);
  setCurrentPage(1);
};
const handleMonthChange = (month: number) => {
  setSelectedMonth(month);
  setCurrentPage(1);
};
```

---

## Migration Path

1. **Phase 1**: Backend — add pagination to year+month endpoint, add `/years` endpoint
2. **Phase 2**: Frontend — create `YearMonthNav`, `PaginationControls`, new query hook
3. **Phase 3**: Frontend — refactor `MovementsPage` to use new nav, remove infinite scroll
4. **Phase 4**: Frontend — simplify `MovementList` (remove month grouping)
5. **Phase 5**: Polish — add "Custom Range" mode, dim empty months, URL sync

---

## URL Sync (Optional Enhancement)

Sync selected year/month/page to URL params for shareable links and browser back/forward:

```
/movements?year=2026&month=5&page=2
```

Use `useSearchParams` from react-router or a custom hook that reads/writes URL state.

---

## Performance Considerations

- **Reduced payload**: Fetching one month at a time (~50-200 movements) vs. all movements
- **Faster initial load**: Only current month's first page loads on mount
- **Cache-friendly**: TanStack Query caches each year+month+page combination independently
- **Smooth transitions**: `placeholderData: keepPreviousData` keeps old data visible while new page loads
- **Years query**: Cached for 10 minutes, very lightweight (single aggregate query)

---

## Summary of Changes

| Layer | File | Change |
|-------|------|--------|
| Backend | `routes.ts` | Add `GET /api/movements/years` route |
| Backend | `MovementController.ts` | Add `getYears` method; update `getAll` year+month branch for pagination |
| Backend | `GetMovementsByMonthUseCase.ts` | Accept pagination, return paginated envelope |
| Backend | New: `GetMovementYearsUseCase.ts` | Query distinct years with counts |
| Backend | `IMovementRepository.ts` | Add `getDistinctYears(userId)` method |
| Backend | `SupabaseMovementRepository.ts` | Implement `getDistinctYears` |
| Frontend | New: `YearMonthNav.tsx` | Year pills + month buttons component |
| Frontend | New: `PaginationControls.tsx` | Page navigation component |
| Frontend | New: `useMonthlyMovementsQuery.ts` | TanStack Query hook for paginated month data |
| Frontend | New: `useMovementYearsQuery.ts` | TanStack Query hook for available years |
| Frontend | `movementService.ts` | Add `getMovementYears`, `getMovementsByMonthPaginated` |
| Frontend | `MovementsPage.tsx` | Replace infinite scroll with year/month nav + pagination |
| Frontend | `MovementList.tsx` | Remove month grouping, accept flat `Movement[]` |
| Frontend | `MovementFilters.tsx` | Remove date range filter (replaced by nav) |
| Frontend | `useMovementsSort.ts` | Remove month grouping logic, sort flat array only |
