# Archive Redesign — Task Breakdown

Replace hard-delete with soft-delete (archive) for accounts and pockets. Archived items appear in a collapsed section at the bottom of the Accounts page.

---

### Task 1: Database migration — add `archived_at` column

**Files**: `backend/migrations/031_archive_support.sql`

**What**: Add `archived_at TIMESTAMPTZ DEFAULT NULL` to both `accounts` and `pockets` tables. Add a partial index on `archived_at IS NULL` for both tables to keep the default "active only" queries fast. No data migration needed — all existing rows stay NULL (active).

**Verify**: Run `supabase db push` or apply locally. Confirm columns exist with `\d accounts` and `\d pockets`. Existing queries still work (NULL = not archived).

**Depends on**: none

---

### Task 2: Backend domain — add `archivedAt` to Account and Pocket entities

**Files**: `backend/src/modules/accounts/domain/Account.ts`, `backend/src/modules/pockets/domain/Pocket.ts`

**What**: Add optional `archivedAt?: Date` property to both entity classes. Add `isArchived(): boolean` helper method. Add `archive()` and `unarchive()` methods that set/clear the field. Update `toJSON()` to include `archivedAt`. No validation changes — archived accounts remain valid entities.

**Verify**: Existing domain unit tests still pass. New tests for `archive()`/`unarchive()`/`isArchived()` pass.

**Depends on**: Task 1

---

### Task 3: Backend mappers — persist and hydrate `archived_at`

**Files**: `backend/src/modules/accounts/application/mappers/AccountMapper.ts`, `backend/src/modules/pockets/application/mappers/PocketMapper.ts`

**What**: Update `toDomain()` to read `archived_at` from DB row and pass it to entity constructor. Update `toPersistence()` to write `archived_at` (as ISO string or null). Update `toDTO()` to include `archivedAt` in the response DTO.

**Verify**: Mapper unit tests pass with new field. Round-trip: domain → persistence → domain preserves archivedAt.

**Depends on**: Task 2

---

### Task 4: Backend repository — filter archived, archive/unarchive methods

**Files**: `backend/src/modules/accounts/infrastructure/IAccountRepository.ts`, `backend/src/modules/accounts/infrastructure/SupabaseAccountRepository.ts`, `backend/src/modules/pockets/infrastructure/IPocketRepository.ts`, `backend/src/modules/pockets/infrastructure/SupabasePocketRepository.ts`

**What**: 
- Add `includeArchived?: boolean` param to `findAllByUserId` (default false). When false, add `.is('archived_at', null)` filter.
- Add `archive(id, userId): Promise<void>` — sets `archived_at = NOW()`.
- Add `unarchive(id, userId): Promise<void>` — sets `archived_at = NULL`.
- Pocket repo: same changes to `findByAccountId` and `findAllByUserId`.

**Verify**: Integration tests: create account, archive it, `findAllByUserId()` excludes it, `findAllByUserId(includeArchived: true)` includes it, unarchive brings it back.

**Depends on**: Task 3

---

### Task 5: Backend use cases — ArchiveAccount, UnarchiveAccount, PermanentDelete (accounts)

**Files**: `backend/src/modules/accounts/application/useCases/ArchiveAccountUseCase.ts`, `backend/src/modules/accounts/application/useCases/UnarchiveAccountUseCase.ts`

**What**: 
- `ArchiveAccountUseCase`: find account by id, call `account.archive()`, persist via `repo.archive(id, userId)`. Also archive all pockets belonging to this account.
- `UnarchiveAccountUseCase`: find account (including archived), call `account.unarchive()`, persist via `repo.unarchive(id, userId)`. Also unarchive all pockets belonging to this account.
- Existing `DeleteAccountCascadeUseCase` already handles permanent delete — no changes needed there.
- Update `GetAllAccountsUseCase` to accept `includeArchived` param and pass it to repo.

**Verify**: Unit tests: archive sets timestamp, unarchive clears it, archived accounts excluded from default list, included when param is true.

**Depends on**: Task 4

---

### Task 6: Backend use cases — ArchivePocket, UnarchivePocket

**Files**: `backend/src/modules/pockets/application/useCases/ArchivePocketUseCase.ts`, `backend/src/modules/pockets/application/useCases/UnarchivePocketUseCase.ts`

**What**: 
- `ArchivePocketUseCase`: find pocket, archive it, persist.
- `UnarchivePocketUseCase`: find pocket (including archived), unarchive it, persist.
- Update `GetPocketsByAccountUseCase` to accept `includeArchived` param.

**Verify**: Unit tests for both use cases. Archived pockets excluded from default pocket list.

**Depends on**: Task 4

---

### Task 7: Backend routes & controller — archive/unarchive/permanent-delete endpoints

**Files**: `backend/src/modules/accounts/presentation/routes.ts`, `backend/src/modules/accounts/presentation/AccountController.ts`, `backend/src/modules/pockets/presentation/routes.ts`, `backend/src/modules/pockets/presentation/PocketController.ts`

**What**:
- Accounts: `POST /api/accounts/:id/archive`, `POST /api/accounts/:id/unarchive`. Add `?include_archived=true` query param to `GET /api/accounts`.
- Pockets: `POST /api/pockets/:id/archive`, `POST /api/pockets/:id/unarchive`. Add `?include_archived=true` to `GET /api/pockets`.
- Existing `DELETE /api/accounts/:id` and `POST /api/accounts/:id/cascade` remain as permanent delete.
- Register new use cases in DI container (`accounts.module.ts`, `pockets.module.ts`).

**Verify**: Integration tests: call archive endpoint → 200, call GET without param → account missing, call GET with `include_archived=true` → account present with `archivedAt` set.

**Depends on**: Tasks 5, 6

---

### Task 8: Frontend services — API client updates

**Files**: `frontend/src/services/accountService.ts`, `frontend/src/services/pocketService.ts`

**What**:
- `accountService`: add `archiveAccount(id)`, `unarchiveAccount(id)` methods (POST to new endpoints). Update `getAllAccounts` to accept optional `includeArchived` param.
- `pocketService`: add `archivePocket(id)`, `unarchivePocket(id)` methods. Update `getAllPockets`/`getPocketsByAccount` to accept `includeArchived`.
- Remove `deleteAccount` (simple delete) — only cascade delete and archive remain.

**Verify**: TypeScript compiles. Methods call correct endpoints.

**Depends on**: Task 7

---

### Task 9: Frontend hooks — queries and mutations for archive

**Files**: `frontend/src/hooks/queries/useAccountMutations.ts`, `frontend/src/hooks/queries/useAccountsQuery.ts`, `frontend/src/hooks/queries/usePocketMutations.ts`

**What**:
- Add `archiveAccount` and `unarchiveAccount` mutations that invalidate `['accounts']` query.
- Add `archivePocket` and `unarchivePocket` mutations that invalidate `['pockets']` query.
- Update `useAccountsQuery` to optionally pass `include_archived=true` (for the Accounts page).
- Remove `deleteAccount` mutation (replaced by archive).

**Verify**: TypeScript compiles. Hooks export new mutations.

**Depends on**: Task 8

---

### Task 10: Frontend AccountsPage — archived section UI

**Files**: `frontend/src/pages/AccountsPage.tsx`, `frontend/src/components/accounts/ArchivedAccountsSection.tsx`

**What**:
- Create `ArchivedAccountsSection` component: collapsed by default, shows "Archived (N)" header, expands to show greyed-out account cards with name, movement count, [Restore] and [Delete Permanently] buttons.
- Update `AccountsPage` to fetch accounts with `include_archived=true`, split into active vs archived lists, render `ArchivedAccountsSection` at the bottom.
- Archived accounts are excluded from the sortable list and reorder logic.
- Orphaned movements (existing `is_orphaned` data) also appear in this section with their `orphaned_account_name > orphaned_pocket_name`.

**Verify**: Manually archive an account → it disappears from main list, appears in collapsed section. Restore → returns to main list. Delete permanently → gone forever (uses existing cascade endpoint).

**Depends on**: Task 9

---

### Task 11: Frontend account/pocket options — Archive replaces Delete

**Files**: `frontend/src/components/accounts/AccountCard.tsx`, `frontend/src/hooks/actions/useAccountActions.ts`, `frontend/src/hooks/actions/usePocketActions.ts`

**What**:
- In `AccountCard` (and `CDAccountCard`): rename "Delete" action to "Archive". Wire to `archiveAccount` mutation instead of delete.
- In pocket actions: rename "Delete" to "Archive". Wire to `archivePocket` mutation.
- Keep cascade delete only accessible from the archived section's "Delete Permanently" button.
- Update confirmation dialog text: "Archive this account? You can restore it later."

**Verify**: Click Archive on an account → it moves to archived section. No more direct hard-delete from the main card UI.

**Depends on**: Tasks 9, 10

---

### Task 12: Frontend movement form — filter archived from selectors

**Files**: `frontend/src/components/movements/AccountPocketSelector.tsx`

**What**:
- The `AccountPocketSelector` already uses `useAccountsQuery` and `usePocketsQuery`. Since the default query now excludes archived items (backend filters them), no change needed IF the movement form uses the default query (no `include_archived`).
- Verify that the movement form's account/pocket dropdowns do NOT show archived accounts/pockets. If the accounts page query (with `include_archived=true`) is shared, add a filter in the selector to exclude items where `archivedAt` is set.
- In `MovementList`: movements linked to archived accounts/pockets show a subtle "(archived)" badge next to the account/pocket name.

**Verify**: Archive an account → it no longer appears in movement form dropdowns. Existing movements for that account show "(archived)" badge in the list.

**Depends on**: Tasks 9, 10
