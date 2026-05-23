# Backend Architecture — Task Breakdown

## Execution Windows

| Window | Tasks | Can Parallel? |
|--------|-------|---------------|
| 1 | Task 1 (Supabase Singleton) | Solo — foundational, everything depends on it |
| 2 | Task 2 (N+1 GetAllAccounts), Task 3 (N+1 DeleteAccountCascade) | Yes — independent use cases |
| 3 | Task 4 (Reminders → Pattern A), Task 5 (Net-Worth → Pattern A) | Yes — independent modules |
| 4 | Task 6 (Templates → Pattern A) | Solo — new module structure from scratch |
| 5 | Task 7 (Input Validation with Zod), Task 8 (Stale TODOs) | Yes — zod touches controllers, TODOs touch use cases |
| 6 | Task 9 (DI Container Split + Cleanup) | Solo — touches all module registrations |

## Overlap Check: Transfer Atomicity

**Status**: Already covered by `error-recovery-breakdown.md` → Task 1 ("Atomic Transfer & Batch Save via Supabase RPC"). That task rewrites `CreateTransferUseCase` to call the existing `create_transfer` RPC. The TODO at line 88 of `CreateTransferUseCase.ts` will be resolved by that task.

**Action here**: Task 8 (Stale TODOs) will note this TODO as "resolved by error-recovery Task 1" and skip it.

---

## Task Details

### Task 1: Supabase Client Singleton

- **Priority**: CRITICAL — must be done first, all other tasks depend on this
- **Files touched**:
  1. `backend/src/shared/infrastructure/supabaseClient.ts` (new)
  2. `backend/src/shared/container/index.ts` (register singleton)
  3. `backend/src/modules/accounts/infrastructure/SupabaseAccountRepository.ts`
  4. `backend/src/modules/accounts/infrastructure/SupabaseStockPriceRepository.ts`
  5. `backend/src/modules/pockets/infrastructure/SupabasePocketRepository.ts`
  6. `backend/src/modules/sub-pockets/infrastructure/SupabaseSubPocketRepository.ts`
  7. `backend/src/modules/sub-pockets/infrastructure/SupabaseFixedExpenseGroupRepository.ts`
  8. `backend/src/modules/movements/infrastructure/SupabaseMovementRepository.ts`

- **What to do**:

1. **Create `shared/infrastructure/supabaseClient.ts`** — a singleton factory:
```typescript
import { createClient, SupabaseClient } from '@supabase/supabase-js';

let instance: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (instance) return instance;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;

  if (!url || !key) {
    if (process.env.NODE_ENV === 'test') {
      throw new Error('Supabase client not configured in test — provide a mock');
    }
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  }

  instance = createClient(url, key);
  return instance;
}

/** For tests: reset the singleton so mocks can be injected */
export function resetSupabaseClient(): void {
  instance = null;
}
```

2. **Register in DI container** (`shared/container/index.ts`):
   - Add at the top of `initializeContainer()`:
   ```typescript
   container.registerInstance('SupabaseClient', getSupabaseClient());
   ```

3. **Refactor ALL Supabase repositories** — remove the constructor that calls `createClient()` and inject the client instead:
```typescript
@injectable()
export class SupabaseAccountRepository implements IAccountRepository {
  private supabase: SupabaseClient;

  constructor(@inject('SupabaseClient') supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  // Remove ensureClient() — just use this.supabase directly
}
```

4. **Also refactor these files** (same pattern — inject instead of create):
   - `backend/src/modules/settings/infrastructure/SupabaseSettingsRepository.ts`
   - `backend/src/modules/settings/infrastructure/SupabaseExchangeRateRepository.ts`
   - `backend/src/modules/net-worth/infrastructure/SupabaseNetWorthSnapshotRepository.ts`
   - `backend/src/modules/reminders/infrastructure/SupabaseReminderRepository.ts`
   - `backend/src/shared/middleware/authMiddleware.ts`

5. **For `authMiddleware.ts`** — since middleware isn't resolved via DI, import `getSupabaseClient()` directly instead of calling `createClient`.

6. **For `templateRoutes.ts`** — replace the module-level `createClient` call with `getSupabaseClient()` import. (Full refactoring of templateRoutes happens in Task 6.)

- **Acceptance criteria**:
  - `grep -r "createClient" backend/src/` returns ONLY `shared/infrastructure/supabaseClient.ts`
  - All existing tests pass (repositories get the client via DI)
  - Server starts without errors
  - Only 1 Supabase client instance exists at runtime (verified by adding a log in the factory)

- **Dependencies**: None

---

### Task 2: Fix N+1 in GetAllAccountsUseCase

- **Priority**: CRITICAL
- **Files touched**:
  1. `backend/src/modules/accounts/application/useCases/GetAllAccountsUseCase.ts`
  2. `backend/src/modules/pockets/infrastructure/IPocketRepository.ts`
  3. `backend/src/modules/pockets/infrastructure/SupabasePocketRepository.ts`

- **What to do**:

1. **Add `findAllByUserId` to `IPocketRepository`**:
```typescript
findAllByUserId(userId: string): Promise<Pocket[]>;
```

2. **Implement in `SupabasePocketRepository`**:
```typescript
async findAllByUserId(userId: string): Promise<Pocket[]> {
  const { data, error } = await this.supabase
    .from('pockets')
    .select('*')
    .eq('user_id', userId);

  if (error) throw new DatabaseError(error.message);
  return data.map(row => PocketMapper.toDomain(row));
}
```

3. **Rewrite `GetAllAccountsUseCase.execute()`** — batch-fetch all pockets once, group by accountId in memory:
```typescript
async execute(userId: string, skipInvestmentPrices = false): Promise<AccountResponseDTO[]> {
  const [accounts, allPockets] = await Promise.all([
    this.accountRepo.findAllByUserId(userId),
    this.pocketRepo.findAllByUserId(userId),
  ]);

  // Group pockets by accountId
  const pocketsByAccount = new Map<string, Array<{ id: string; accountId: string; balance: number }>>();
  for (const pocket of allPockets) {
    const list = pocketsByAccount.get(pocket.accountId) ?? [];
    list.push(pocket);
    pocketsByAccount.set(pocket.accountId, list);
  }

  // Calculate balances (no more per-account queries)
  const accountsWithBalances = await Promise.all(
    accounts.map(async (account) => {
      if (account.isCD()) {
        this.domainService.updateAccountBalance(account);
      } else if (account.isInvestment()) {
        if (!skipInvestmentPrices && account.stockSymbol) {
          try {
            const stockPrice = await this.stockPriceService.execute(account.stockSymbol);
            this.domainService.updateAccountBalance(account, undefined, stockPrice.price);
          } catch (error) {
            console.error(`Failed to fetch price for ${account.stockSymbol}:`, error);
          }
        }
      } else {
        const pockets = pocketsByAccount.get(account.id) ?? [];
        this.domainService.updateAccountBalance(account, pockets);
      }
      return account;
    })
  );

  const sorted = accountsWithBalances.sort((a, b) =>
    (a.displayOrder ?? Number.MAX_SAFE_INTEGER) - (b.displayOrder ?? Number.MAX_SAFE_INTEGER)
  );
  return sorted.map(account => AccountMapper.toDTO(account));
}
```

4. **Remove the local `IPocketRepository` interface** defined inside `GetAllAccountsUseCase.ts` — import the real one from `../../pockets/infrastructure/IPocketRepository` (or keep using the DI token `'PocketRepository'` which already resolves to the real implementation).

5. **Remove the local `IStockPriceService` interface** — import the real use case type or keep the DI token.

- **Acceptance criteria**:
  - For a user with N accounts, the use case makes exactly 2 queries (1 accounts + 1 all-pockets) plus stock price calls for investment accounts
  - No per-account pocket queries exist in the code
  - Existing account-related tests pass
  - The local interface re-definitions are gone

- **Dependencies**: Task 1 (Supabase singleton must be in place)

---

### Task 3: Fix N+1 in DeleteAccountCascadeUseCase

- **Priority**: CRITICAL
- **Files touched**:
  1. `backend/src/modules/accounts/application/useCases/DeleteAccountCascadeUseCase.ts`
  2. `backend/src/modules/pockets/infrastructure/IPocketRepository.ts`
  3. `backend/src/modules/pockets/infrastructure/SupabasePocketRepository.ts`
  4. `backend/src/modules/sub-pockets/infrastructure/ISubPocketRepository.ts`
  5. `backend/src/modules/sub-pockets/infrastructure/SupabaseSubPocketRepository.ts`

- **What to do**:

1. **Add bulk delete methods to `IPocketRepository`**:
```typescript
deleteByAccountId(accountId: string, userId: string): Promise<number>;
```

2. **Add bulk delete methods to `ISubPocketRepository`**:
```typescript
deleteByPocketIds(pocketIds: string[], userId: string): Promise<number>;
```

3. **Implement `deleteByAccountId` in `SupabasePocketRepository`**:
```typescript
async deleteByAccountId(accountId: string, userId: string): Promise<number> {
  const { error, count } = await this.supabase
    .from('pockets')
    .delete({ count: 'exact' })
    .eq('account_id', accountId)
    .eq('user_id', userId);

  if (error) throw new DatabaseError(error.message);
  return count ?? 0;
}
```

4. **Implement `deleteByPocketIds` in `SupabaseSubPocketRepository`**:
```typescript
async deleteByPocketIds(pocketIds: string[], userId: string): Promise<number> {
  if (pocketIds.length === 0) return 0;
  const { error, count } = await this.supabase
    .from('sub_pockets')
    .delete({ count: 'exact' })
    .in('pocket_id', pocketIds)
    .eq('user_id', userId);

  if (error) throw new DatabaseError(error.message);
  return count ?? 0;
}
```

5. **Rewrite `DeleteAccountCascadeUseCase.execute()`** — replace sequential loops with bulk operations:
```typescript
async execute(accountId: string, dto: DeleteAccountCascadeDTO, userId: string): Promise<CascadeDeleteResultDTO> {
  const account = await this.accountRepo.findById(accountId, userId);
  if (!account) throw new NotFoundError('Account not found');

  // Get pockets to count them and find fixed ones for sub-pocket deletion
  const pockets = await this.pocketRepo.findByAccountId(accountId, userId);
  const fixedPocketIds = pockets.filter(p => p.type === 'fixed').map(p => p.id);

  // Bulk delete sub-pockets for all fixed pockets (1 query instead of N)
  const subPocketsDeleted = await this.subPocketRepo.deleteByPocketIds(fixedPocketIds, userId);

  // Bulk delete all pockets for this account (1 query instead of N)
  const pocketsDeleted = await this.pocketRepo.deleteByAccountId(accountId, userId);

  // Handle movements (already bulk operations)
  let movementsAffected = 0;
  if (dto.deleteMovements) {
    movementsAffected = await this.movementRepo.deleteByAccountId(accountId, userId);
  } else {
    movementsAffected = await this.movementRepo.markAsOrphanedByAccountId(
      accountId, account.name, account.currency, userId
    );
  }

  await this.accountRepo.delete(accountId, userId);

  return {
    account: account.name,
    pockets: pocketsDeleted,
    subPockets: subPocketsDeleted,
    movements: movementsAffected,
  };
}
```

6. **Remove the local interface re-definitions** (`IPocketRepository`, `ISubPocketRepository`, `IMovementRepository`) from the use case file — import the real ones or rely on DI tokens.

- **Acceptance criteria**:
  - Deleting an account with 5 pockets (1 fixed with 3 sub-pockets) uses exactly 5 queries: 1 findById + 1 findByAccountId + 1 deleteByPocketIds + 1 deleteByAccountId + 1 movement operation + 1 account delete — instead of 15+
  - No `for` loops with `await` inside remain in the use case
  - Existing cascade delete tests pass
  - Local interface re-definitions are removed

- **Dependencies**: Task 1 (Supabase singleton)

---

### Task 4: Standardize Reminders Module (Pattern B → Pattern A)

- **Priority**: HIGH
- **Files touched**:
  1. `backend/src/modules/reminders/presentation/ReminderController.ts` (new — replaces `interfaces/ReminderController.ts`)
  2. `backend/src/modules/reminders/application/useCases/GetAllRemindersUseCase.ts` (new)
  3. `backend/src/modules/reminders/application/useCases/CreateReminderUseCase.ts` (new)
  4. `backend/src/modules/reminders/application/useCases/UpdateReminderUseCase.ts` (new)
  5. `backend/src/modules/reminders/application/useCases/DeleteReminderUseCase.ts` (new)
  6. `backend/src/modules/reminders/application/useCases/MarkReminderAsPaidUseCase.ts` (new)
  7. `backend/src/modules/reminders/application/useCases/CreateReminderExceptionUseCase.ts` (new)
  8. `backend/src/modules/reminders/application/useCases/SplitReminderSeriesUseCase.ts` (new)

- **What to do**:

1. **Create individual use cases** — extract each method from `ReminderService` into its own use case class following Pattern A:
```typescript
@injectable()
export class UpdateReminderUseCase {
  constructor(
    @inject('ReminderRepository') private repo: IReminderRepository
  ) {}

  async execute(id: string, dto: UpdateReminderDTO, userId: string): Promise<Reminder> {
    // CRITICAL: Verify ownership before updating
    const existing = await this.repo.findById(id);
    if (!existing) throw new NotFoundError('Reminder not found');
    if (existing.userId !== userId) throw new NotFoundError('Reminder not found'); // Don't leak existence
    return this.repo.update(id, dto);
  }
}
```

2. **Add userId ownership checks** to `UpdateReminderUseCase`, `DeleteReminderUseCase`, `MarkReminderAsPaidUseCase`, and `CreateReminderExceptionUseCase`. Each must:
   - Call `repo.findById(id)` first
   - Verify `existing.userId === userId`
   - Throw `NotFoundError` if not owned (don't reveal existence to other users)

3. **Create new `presentation/ReminderController.ts`** following Pattern A:
```typescript
@injectable()
export class ReminderController {
  constructor(
    @inject(GetAllRemindersUseCase) private getAllUseCase: GetAllRemindersUseCase,
    @inject(CreateReminderUseCase) private createUseCase: CreateReminderUseCase,
    // ... other use cases
  ) {}

  async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) { res.status(401).json({ error: 'Unauthorized' }); return; }
      const reminders = await this.getAllUseCase.execute(userId);
      res.json(reminders);
    } catch (error) {
      next(error); // Delegates to global error handler
    }
  }
  // ... same pattern for all methods
}
```

4. **Update `presentation/routes.ts`** — resolve the new controller from DI container (it already does this, just update the import path).

5. **Update `shared/container/index.ts`** — register all new use cases and the new controller. Remove the old `ReminderService` and `useFactory` registration.

6. **Delete old files**:
   - `interfaces/ReminderController.ts`
   - `application/ReminderService.ts`
   - The `interfaces/` directory (move `IReminderRepository.ts` to `infrastructure/`)

7. **Remove all `console.error` with emoji prefixes** — the global error handler logs errors.

- **Acceptance criteria**:
  - `reminders/interfaces/` directory no longer exists
  - `ReminderService.ts` no longer exists
  - All controller methods use `next(error)` pattern (no `res.status(500)` in catch blocks)
  - Every mutating operation (update, delete, markAsPaid, createException, splitSeries) verifies `userId` ownership
  - All existing reminder API behavior is preserved (same routes, same response shapes)
  - No `console.error` or emoji logging remains in the module

- **Dependencies**: Task 1 (Supabase singleton)

---

### Task 5: Standardize Net-Worth Module (Pattern B → Pattern A)

- **Priority**: HIGH
- **Files touched**:
  1. `backend/src/modules/net-worth/presentation/NetWorthController.ts` (new — replaces `interfaces/NetWorthSnapshotController.ts`)
  2. `backend/src/modules/net-worth/application/useCases/GetAllSnapshotsUseCase.ts` (new)
  3. `backend/src/modules/net-worth/application/useCases/GetLatestSnapshotUseCase.ts` (new)
  4. `backend/src/modules/net-worth/application/useCases/CreateSnapshotUseCase.ts` (new)
  5. `backend/src/modules/net-worth/application/useCases/UpdateSnapshotUseCase.ts` (new)
  6. `backend/src/modules/net-worth/application/useCases/DeleteSnapshotUseCase.ts` (new)
  7. `backend/src/modules/net-worth/presentation/routes.ts` (rewrite — use DI instead of manual instantiation)
  8. `backend/src/shared/container/index.ts` (register net-worth module)

- **What to do**:

1. **Create individual use cases** — same pattern as Task 4. Each use case is `@injectable()` with `@inject('NetWorthSnapshotRepository')`.

2. **Add userId ownership checks** to `UpdateSnapshotUseCase` and `DeleteSnapshotUseCase`:
```typescript
@injectable()
export class DeleteSnapshotUseCase {
  constructor(
    @inject('NetWorthSnapshotRepository') private repo: INetWorthSnapshotRepository
  ) {}

  async execute(id: string, userId: string): Promise<void> {
    // Add findById to repository interface first
    const existing = await this.repo.findById(id);
    if (!existing || existing.userId !== userId) {
      throw new NotFoundError('Snapshot not found');
    }
    return this.repo.delete(id);
  }
}
```

3. **Add `findById` to `INetWorthSnapshotRepository`** — it's currently missing:
```typescript
findById(id: string): Promise<NetWorthSnapshot | null>;
```
Implement in `SupabaseNetWorthSnapshotRepository`.

4. **Create `presentation/NetWorthController.ts`** following Pattern A (inject use cases, use `next(error)`, check `req.user?.id`).

5. **Rewrite `presentation/routes.ts`** — remove manual instantiation, resolve controller from DI:
```typescript
import { Router } from 'express';
import { container } from 'tsyringe';
import { NetWorthController } from './NetWorthController';
import { authMiddleware as requireAuth } from '../../../shared/middleware/authMiddleware';

const router = Router();
const controller = container.resolve(NetWorthController);

router.use(requireAuth);
router.get('/', (req, res, next) => controller.getAll(req, res, next));
router.get('/latest', (req, res, next) => controller.getLatest(req, res, next));
router.post('/', (req, res, next) => controller.create(req, res, next));
router.put('/:id', (req, res, next) => controller.update(req, res, next));
router.delete('/:id', (req, res, next) => controller.delete(req, res, next));

export default router;
```

6. **Register in DI container** — add `registerNetWorthModule()` function in `shared/container/index.ts`.

7. **Delete old files**:
   - `interfaces/NetWorthSnapshotController.ts`
   - `interfaces/INetWorthSnapshotRepository.ts` (move to `infrastructure/`)
   - `application/NetWorthSnapshotService.ts`
   - The `interfaces/` directory

8. **Move `INetWorthSnapshotRepository.ts`** from `interfaces/` to `infrastructure/` (consistent with all other modules).

- **Acceptance criteria**:
  - `net-worth/interfaces/` directory no longer exists
  - `NetWorthSnapshotService.ts` no longer exists
  - Routes file has zero `new` keywords (no manual instantiation)
  - All controller methods use `next(error)` pattern
  - `update` and `delete` verify userId ownership before operating
  - No `console.error` remains in the module
  - All existing net-worth API behavior preserved

- **Dependencies**: Task 1 (Supabase singleton)

---

### Task 6: Standardize Templates Module (Pattern C → Pattern A)

- **Priority**: HIGH
- **Files touched**:
  1. `backend/src/modules/movements/presentation/templateRoutes.ts` (rewrite to thin router)
  2. `backend/src/modules/movements/presentation/TemplateController.ts` (new)
  3. `backend/src/modules/movements/application/useCases/GetAllTemplatesUseCase.ts` (new)
  4. `backend/src/modules/movements/application/useCases/GetTemplateByIdUseCase.ts` (new)
  5. `backend/src/modules/movements/application/useCases/CreateTemplateUseCase.ts` (new)
  6. `backend/src/modules/movements/application/useCases/UpdateTemplateUseCase.ts` (new)
  7. `backend/src/modules/movements/application/useCases/DeleteTemplateUseCase.ts` (new)
  8. `backend/src/modules/movements/infrastructure/IMovementTemplateRepository.ts` (new)
  9. `backend/src/modules/movements/infrastructure/SupabaseMovementTemplateRepository.ts` (new)
  10. `backend/src/modules/movements/domain/MovementTemplate.ts` (new)
  11. `backend/src/shared/container/index.ts` (register template dependencies)

- **What to do**:

1. **Create domain entity** `MovementTemplate.ts`:
```typescript
export interface MovementTemplate {
  id: string;
  userId: string;
  name: string;
  type: string;
  accountId: string | null;
  pocketId: string | null;
  subPocketId: string | null;
  defaultAmount: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}
```

2. **Create repository interface** `IMovementTemplateRepository.ts`:
```typescript
export interface IMovementTemplateRepository {
  findAll(userId: string): Promise<MovementTemplate[]>;
  findById(id: string, userId: string): Promise<MovementTemplate | null>;
  create(userId: string, data: CreateTemplateDTO): Promise<MovementTemplate>;
  update(id: string, userId: string, data: UpdateTemplateDTO): Promise<MovementTemplate>;
  delete(id: string, userId: string): Promise<void>;
}
```

3. **Create `SupabaseMovementTemplateRepository`** — extract the Supabase queries from `templateRoutes.ts` into proper repository methods. Use the injected Supabase client (from Task 1). Include `user_id` filtering in ALL queries.

4. **Create use cases** — each one is thin (validate → call repo). Move the validation helpers (`requireString`, `optionalString`, `optionalNumber`) into the use cases or a shared validation util.

5. **Create `TemplateController.ts`** — Pattern A style with `@injectable()`, injected use cases, `next(error)` error handling.

6. **Rewrite `templateRoutes.ts`** to a thin router:
```typescript
import { Router } from 'express';
import { container } from 'tsyringe';
import { TemplateController } from './TemplateController';
import { authMiddleware } from '../../../shared/middleware/authMiddleware';

const router = Router();
const controller = container.resolve(TemplateController);

router.use(authMiddleware);
router.get('/', (req, res, next) => controller.getAll(req, res, next));
router.get('/:id', (req, res, next) => controller.getById(req, res, next));
router.post('/', (req, res, next) => controller.create(req, res, next));
router.put('/:id', (req, res, next) => controller.update(req, res, next));
router.delete('/:id', (req, res, next) => controller.delete(req, res, next));

export default router;
```

7. **Register in DI container** — add template repository and use cases to `registerMovementModule()`.

- **Acceptance criteria**:
  - `templateRoutes.ts` is under 30 lines (just route definitions)
  - No `createClient` or direct Supabase usage in the routes file
  - All template operations go through controller → use case → repository
  - Existing API behavior preserved (same routes, same response shapes, same validation errors)
  - The `ConflictError` on duplicate names still works (repository handles the 23505 error code)
  - userId scoping is maintained in all repository queries

- **Dependencies**: Task 1 (Supabase singleton)

---

### Task 7: Add Input Validation with Zod

- **Priority**: HIGH
- **Files touched**:
  1. `backend/package.json` (add `zod` dependency)
  2. `backend/src/shared/middleware/validate.ts` (new — validation middleware factory)
  3. `backend/src/modules/accounts/presentation/schemas.ts` (new)
  4. `backend/src/modules/accounts/presentation/routes.ts` (apply validation)
  5. `backend/src/modules/movements/presentation/schemas.ts` (new)
  6. `backend/src/modules/movements/presentation/routes.ts` (apply validation)
  7. `backend/src/modules/pockets/presentation/schemas.ts` (new)
  8. `backend/src/modules/pockets/presentation/routes.ts` (apply validation)

- **What to do**:

1. **Install zod**: Add `"zod": "^3.23.0"` to `backend/package.json` dependencies.

2. **Create validation middleware** `shared/middleware/validate.ts`:
```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../errors/AppError';

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const message = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
        next(new ValidationError(message));
      } else {
        next(error);
      }
    }
  };
}

export function validateParams(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.params = schema.parse(req.params) as any;
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(new ValidationError(error.errors[0].message));
      } else {
        next(error);
      }
    }
  };
}
```

3. **Create schemas per module**. Example `accounts/presentation/schemas.ts`:
```typescript
import { z } from 'zod';

export const createAccountSchema = z.object({
  name: z.string().min(1).max(100),
  currency: z.enum(['USD', 'MXN', 'COP', 'EUR', 'GBP']),
  type: z.enum(['normal', 'investment', 'cd']),
  color: z.string().optional(),
  stockSymbol: z.string().optional(),
  stockShares: z.number().positive().optional(),
  cdRate: z.number().min(0).max(1).optional(),
  cdTermMonths: z.number().int().positive().optional(),
  cdStartDate: z.string().optional(),
  cdInitialDeposit: z.number().positive().optional(),
}).strict(); // .strict() rejects extra fields (mass assignment protection)

export const updateAccountSchema = createAccountSchema.partial();

export const idParamSchema = z.object({
  id: z.string().uuid(),
});
```

4. **Apply to routes** — add `validateBody(schema)` middleware before the controller method:
```typescript
router.post('/', validateBody(createAccountSchema), (req, res, next) => controller.create(req, res, next));
router.put('/:id', validateParams(idParamSchema), validateBody(updateAccountSchema), (req, res, next) => controller.update(req, res, next));
```

5. **Create schemas for movements, pockets, sub-pockets, settings, reminders (if Task 4 is done), net-worth (if Task 5 is done), and templates (if Task 6 is done)**. If those tasks aren't merged yet, create the schemas anyway — they'll be wired in when the modules are standardized.

6. **Remove manual validation from use cases** — the validation middleware handles it before the request reaches the controller. Use cases can trust their inputs are well-formed. (Keep business rule validation like "source and target pockets must be different" in use cases — that's domain logic, not input shape validation.)

- **Acceptance criteria**:
  - `zod` is in `package.json` dependencies
  - Every POST and PUT route has a `validateBody()` middleware
  - Malformed requests return 400 with a clear error message listing which fields failed
  - Extra fields in request bodies are rejected (`.strict()`)
  - Existing valid requests still work unchanged
  - No `as` type casts on `req.body` remain in controllers

- **Dependencies**: Task 1 (Supabase singleton). Ideally after Tasks 4-6 so all modules have controllers to attach schemas to, but can proceed independently — schemas for Pattern B/C modules will be wired in when those modules are standardized.

---

### Task 8: Resolve Stale TODOs

- **Priority**: MEDIUM
- **Files touched**:
  1. `backend/src/modules/accounts/application/useCases/CreateAccountUseCase.ts`
  2. `backend/src/modules/pockets/application/useCases/GetPocketByIdUseCase.ts`
  3. `backend/src/modules/pockets/application/useCases/GetPocketsByAccountUseCase.ts`
  4. `backend/src/modules/sub-pockets/application/useCases/GetSubPocketsByPocketUseCase.ts`

- **What to do**:

1. **`CreateAccountUseCase.ts:96`** — TODO says "For investment accounts, create default pockets (will be implemented in Phase 2)". Phase 2 is done. Check if investment accounts already get default pockets created elsewhere. If yes, delete the TODO. If no, implement: after creating an investment account, create a default pocket named "Holdings" with type 'normal'.

2. **`GetPocketByIdUseCase.ts:38`** — TODO says "Calculate balance when Movement and SubPocket modules are implemented". Both modules exist. The balance calculation already happens in `GetAllAccountsUseCase` via `AccountDomainService`. For this single-pocket fetch, add balance calculation:
```typescript
// Fetch movements for this pocket and sum them
const movements = await this.movementRepo.findByPocketId(pocketId, userId);
const balance = movements.reduce((sum, m) => {
  return m.type.startsWith('Ingreso') ? sum + m.amount : sum - m.amount;
}, 0);
pocket.balance = balance;
```
Or if the pocket already stores a calculated balance field, just remove the TODO.

3. **`GetPocketsByAccountUseCase.ts:39`** — Same as above but for multiple pockets. Remove the TODO if balances are already calculated, or add the calculation.

4. **`GetSubPocketsByPocketUseCase.ts:43`** — TODO says "In Phase 4, fetch movements and calculate balances". Phase 4 is done. Same approach — check if sub-pocket balances are already calculated elsewhere and remove the TODO, or implement.

5. **`CreateTransferUseCase.ts:88`** — TODO says "Wrap in transaction if supported". **This is covered by error-recovery-breakdown Task 1** (Atomic Transfer via RPC). Mark as: `// Resolved: atomic transfer via create_transfer RPC (see error-recovery task)` — or simply delete the TODO since that task will rewrite this file entirely.

- **Acceptance criteria**:
  - `grep -r "// TODO:" backend/src/` returns 0 results
  - No functionality is broken by TODO resolution
  - If balance calculation was added, it produces correct results for existing test data

- **Dependencies**: Task 1 (Supabase singleton). Can run in parallel with Task 7.

---

### Task 9: Split DI Container + Cleanup

- **Priority**: LOW (but required)
- **Files touched**:
  1. `backend/src/shared/container/index.ts` (slim down to orchestrator)
  2. `backend/src/shared/container/accounts.module.ts` (new)
  3. `backend/src/shared/container/pockets.module.ts` (new)
  4. `backend/src/shared/container/subPockets.module.ts` (new)
  5. `backend/src/shared/container/movements.module.ts` (new)
  6. `backend/src/shared/container/settings.module.ts` (new)
  7. `backend/src/shared/container/reminders.module.ts` (new)
  8. `backend/src/shared/container/netWorth.module.ts` (new)

- **What to do**:

1. **Extract each `registerXxxModule()` function** into its own file with its own imports. The function signature stays the same.

Example `accounts.module.ts`:
```typescript
import { container } from 'tsyringe';
import { IAccountRepository } from '../../modules/accounts/infrastructure/IAccountRepository';
import { SupabaseAccountRepository } from '../../modules/accounts/infrastructure/SupabaseAccountRepository';
// ... all account imports

export function registerAccountModule(): void {
  container.register<IAccountRepository>('AccountRepository', { useClass: SupabaseAccountRepository });
  // ... rest of registrations
}
```

2. **Slim `index.ts`** down to:
```typescript
import 'reflect-metadata';
import { container } from 'tsyringe';
import { getSupabaseClient } from '../infrastructure/supabaseClient';
import { registerAccountModule } from './accounts.module';
import { registerPocketModule } from './pockets.module';
import { registerSubPocketModule } from './subPockets.module';
import { registerMovementModule } from './movements.module';
import { registerSettingsModule } from './settings.module';
import { registerReminderModule } from './reminders.module';
import { registerNetWorthModule } from './netWorth.module';

export function initializeContainer(): void {
  // Singleton infrastructure
  container.registerInstance('SupabaseClient', getSupabaseClient());

  // Module registrations
  registerAccountModule();
  registerPocketModule();
  registerSubPocketModule();
  registerMovementModule();
  registerSettingsModule();
  registerReminderModule();
  registerNetWorthModule();
}
```

3. **Remove the duplicate `DeleteGroupUseCase` registration** in `subPockets.module.ts` (line appears twice in current code).

4. **Remove the dual `GetCurrentStockPriceUseCase` / `'StockPriceService'` registration** — keep only the `'StockPriceService'` token (that's what `GetAllAccountsUseCase` injects). Remove the redundant `container.register(GetCurrentStockPriceUseCase, ...)` line since `InvestmentController` can inject via the token too.

5. **Standardize `registerReminderModule`** — remove `useFactory`, use `useClass` like all other modules (this depends on Task 4 being done first, since the new use cases will be `@injectable()`).

- **Acceptance criteria**:
  - `shared/container/index.ts` is under 30 lines
  - Each module file contains only its own registrations and imports
  - No duplicate registrations exist
  - `GetCurrentStockPriceUseCase` is registered once under one token
  - Server starts and all routes work
  - Existing container tests are updated to import from new file locations

- **Dependencies**: Tasks 4, 5, 6 (module standardization must be done first so the registrations reflect the new structure)

---

## Execution Summary

```
Window 1 (solo):      Task 1                    → Supabase singleton (FOUNDATION)
Window 2 (parallel):  Task 2 + Task 3           → N+1 query fixes
Window 3 (parallel):  Task 4 + Task 5           → Module standardization (reminders + net-worth)
Window 4 (solo):      Task 6                    → Template module extraction
Window 5 (parallel):  Task 7 + Task 8           → Zod validation + stale TODOs
Window 6 (solo):      Task 9                    → DI container split + cleanup
```

Total: 9 tasks covering all 12 audit findings.

## Coverage Matrix

| Audit Finding | Addressed In | Status |
|---------------|-------------|--------|
| 1. 12 Supabase client instances (CRITICAL) | Task 1 | Full fix |
| 2. N+1 in GetAllAccounts (CRITICAL) | Task 2 | Full fix |
| 3. N+1 in DeleteAccountCascade (CRITICAL) | Task 3 | Full fix |
| 4. Transfer atomicity (CRITICAL) | error-recovery Task 1 | Covered elsewhere |
| 5. Inconsistent module patterns (reminders) | Task 4 | Full fix |
| 5. Inconsistent module patterns (net-worth) | Task 5 | Full fix |
| 5. Inconsistent module patterns (templates) | Task 6 | Full fix |
| 6. No input validation library | Task 7 | Full fix |
| 7. Missing userId ownership checks | Tasks 4 + 5 | Full fix |
| 8. templateRoutes.ts god file | Task 6 | Full fix |
| 9. Stale TODOs | Task 8 | Full fix |
| 10. DI container god file | Task 9 | Full fix |
| 11. Duplicate DI registration | Task 9 | Full fix |
| 12. Inconsistent error handling (Pattern B) | Tasks 4 + 5 | Full fix |
