# Task: Standardize Date Handling (Fix Off-By-One Bugs)

## Description
The app mixes ISO strings (`2025-03-15T00:00:00.000Z`) and date-only strings (`2025-03-15`). `new Date("2025-03-15")` interprets date-only as UTC midnight, which shifts to the previous day in negative UTC offsets (US/Mexico timezones). This causes off-by-one-day bugs throughout.

## Technical Requirements

### Create a date utility module
Create `frontend/src/utils/dateUtils.ts` with:
```typescript
import { parseISO, format } from 'date-fns';

/** Parse any date string safely (handles both ISO and date-only) */
export function parseDate(dateStr: string): Date { ... }

/** Format a date to display string (locale-aware) */
export function formatDisplayDate(dateStr: string): string { ... }

/** Get a date-only string (YYYY-MM-DD) without timezone issues */
export function toDateOnly(dateStr: string): string { ... }

/** Get month key for grouping (YYYY-MM) */
export function toMonthKey(dateStr: string): string { ... }
```

### Replace all raw `new Date(dateString)` calls
Search the entire frontend for `new Date(` where the argument is a date string (not `Date.now()` or no args). Replace with the appropriate utility function.

Key locations:
- Movement date display and grouping
- Reminder due date comparisons
- Calendar widget date calculations
- Budget planning date handling
- Net worth snapshot dates

### Replace all `.split('T')[0]` patterns
These are fragile date-only extractions. Replace with `toDateOnly()`.

### Replace all `toISOString().split('T')[0]` for form defaults
This pattern creates today's date as a string. Replace with `format(new Date(), 'yyyy-MM-dd')`.

## Acceptance Criteria
1. `dateUtils.ts` exists with tested utility functions
2. No raw `new Date(dateString)` calls remain in the codebase (except for `new Date()` with no args)
3. No `.split('T')[0]` patterns remain
4. Dates display correctly in UTC-6 timezone (Mexico)
5. Frontend builds clean
