# Task: Fix Data Layer — Schema, Types, and Query Patterns

## Description
The data layer has critical issues: no base schema migration, missing RLS policies, missing foreign keys, divergent type definitions across 3 files, fake pagination (fetches all then slices), and no query invalidation granularity. Fix the schema, unify types, and implement proper data fetching.

## Background
Schema issues:
- No `000_initial_schema.sql` — tables were created manually in Supabase dashboard
- Only `net_worth_snapshots` has RLS enabled — all other tables are unprotected
- No foreign keys between movements→accounts, movements→pockets, pockets→accounts
- `InvestmentIngreso` type exists in trigger but not in TypeScript
- `maturity_date` uses TIMESTAMP instead of DATE
- No indexes on `movements.pocket_id` or `movements.account_id`

Type issues:
- 3 divergent type definitions: `frontend/src/types/index.ts`, `shared/types/index.ts`, `shared/types/index.d.ts`
- `shared/types` is completely outdated (missing CD, investment types, display settings)
- `any` types throughout services and hooks

Query issues:
- `useMovementsQuery` fetches ALL movements with no pagination
- Every `getMovement(id)` fetches ALL movements then filters
- Mutations invalidate `['movements']`, `['accounts']`, `['pockets']`, `['subPockets']` — 4 full refetches per operation
- No optimistic updates anywhere
- Duplicate context directories (`contexts/` and `context/`)

## Technical Requirements
1. Create `000_initial_schema.sql` documenting the full current schema
2. Create migration enabling RLS on all tables with user_id policies
3. Create migration adding foreign keys with appropriate ON DELETE behavior
4. Create migration adding indexes on frequently-queried columns
5. Unify types: make `shared/types/index.ts` the single source of truth, delete `index.d.ts`
6. Add `InvestmentIngreso`/`InvestmentEgreso` to TypeScript types (or remove from trigger)
7. Implement real server-side pagination for movements
8. Fix `getMovement(id)` to use direct query instead of fetch-all-then-filter
9. Add query key granularity (e.g., `['pockets', accountId]`)
10. Merge `context/` into `contexts/` directory
11. Remove duplicate `useSettingsQuery` export in hooks index

## Dependencies
- `backend/migrations/` (new migration files)
- `frontend/src/types/index.ts`
- `shared/types/index.ts`
- `frontend/src/hooks/queries/` (all files)
- `frontend/src/hooks/mutations/` (all files)
- `frontend/src/contexts/` and `frontend/src/context/`

## Implementation Approach
1. Document current schema by inspecting Supabase dashboard or inferring from code
2. Write `000_initial_schema.sql` as documentation (not to be run — tables exist)
3. Write new migrations for RLS, FKs, indexes
4. Unify type definitions into `shared/types/index.ts`
5. Update all imports to use shared types
6. Implement real pagination in movement queries (offset/limit at Supabase level)
7. Fix individual-record fetches to use `.eq('id', id).single()`
8. Consolidate context directories

## Acceptance Criteria

1. **RLS Enabled on All Tables**
   - Given any authenticated user
   - When querying any table
   - Then only their own data is returned (RLS enforced)

2. **Foreign Keys Prevent Orphans**
   - Given a pocket referencing an account
   - When the account is deleted without cascade
   - Then the database rejects the operation (FK constraint)

3. **Single Type Source of Truth**
   - Given the codebase
   - When searching for type definitions of `Account`, `Movement`, etc.
   - Then only one definition exists (in `shared/types/index.ts`)

4. **Real Pagination**
   - Given 1000 movements
   - When loading the movements page
   - Then only the first page (e.g., 50) is fetched from the database

5. **Efficient Single-Record Fetch**
   - Given a movement ID
   - When calling `getMovement(id)`
   - Then only 1 record is fetched (not all movements)

6. **No Duplicate Directories**
   - Given the frontend src
   - When listing directories
   - Then only `contexts/` exists (no `context/`)

## Metadata
- **Complexity**: High
- **Labels**: Schema, Database, Types, Architecture, Performance
- **Required Skills**: PostgreSQL, Supabase RLS, TypeScript, TanStack Query
