# Fix Integration Test Compilation Errors

Post toggle-removal (commit af79633), integration tests have compilation errors due to stale constructor signatures and missing DTO fields.

## Errors by File

### 1. `src/modules/sub-pockets/infrastructure/SupabaseSubPocketRepository.integration.test.ts`

**Lines 148-150** — `error TS2554: Expected 6-8 arguments, but got 9.`

```ts
// Current (wrong) — 9 args including `enabled` (7th param):
new SubPocket('sp-sort-1', 'pocket-1', 'Third', 100, 1, 0, true, undefined, 2)
new SubPocket('sp-sort-2', 'pocket-1', 'First', 100, 1, 0, true, undefined, 0)
new SubPocket('sp-sort-3', 'pocket-1', 'Second', 100, 1, 0, true, undefined, 1)
```

**Fix**: Remove the `true` (enabled) argument. Correct signature is `(id, pocketId, name, valueTotal, periodicityMonths, balance, groupId?, displayOrder?)`:
```ts
new SubPocket('sp-sort-1', 'pocket-1', 'Third', 100, 1, 0, undefined, 2)
new SubPocket('sp-sort-2', 'pocket-1', 'First', 100, 1, 0, undefined, 0)
new SubPocket('sp-sort-3', 'pocket-1', 'Second', 100, 1, 0, undefined, 1)
```

**Lines 172-174** — `error TS2345: Argument of type 'boolean' is not assignable to parameter of type 'string'.`

```ts
// Current (wrong) — `true` in position 7 where `groupId: string | undefined` is expected:
new SubPocket('sp-g1-1', 'pocket-1', 'Rent', 1200, 1, 0, true, 'group-1')
new SubPocket('sp-g1-2', 'pocket-1', 'Utilities', 150, 1, 0, true, 'group-1')
new SubPocket('sp-g2-1', 'pocket-1', 'Other', 100, 1, 0, true, 'group-2')
```

**Fix**: Remove the `true` (enabled) argument. The `groupId` is the 7th param now:
```ts
new SubPocket('sp-g1-1', 'pocket-1', 'Rent', 1200, 1, 0, 'group-1')
new SubPocket('sp-g1-2', 'pocket-1', 'Utilities', 150, 1, 0, 'group-1')
new SubPocket('sp-g2-1', 'pocket-1', 'Other', 100, 1, 0, 'group-2')
```

---

### 2. `src/modules/movements/presentation/MovementController.integration.test.ts`

**Line 159** — `error TS2554: Expected 20 arguments, but got 18.`

The test instantiates `MovementController` with 18 args but the constructor now expects 20. Missing: `GetSpendingSummaryUseCase` (position 14) and `GetMovementYearsUseCase` (position 15).

**Fix**: Add mock declarations and pass them in the constructor call:
```ts
// Add declarations:
let mockGetSpendingSummaryUseCase: jest.Mocked<GetSpendingSummaryUseCase>;
let mockGetMovementYearsUseCase: jest.Mocked<GetMovementYearsUseCase>;

// Add mock initialization in beforeEach:
mockGetSpendingSummaryUseCase = { execute: jest.fn() } as any;
mockGetMovementYearsUseCase = { execute: jest.fn() } as any;

// Insert after mockCreateTransferUseCase in constructor call:
const controller = new MovementController(
  ...existing 13 args...,
  mockGetSpendingSummaryUseCase,   // NEW — position 14
  mockGetMovementYearsUseCase,     // NEW — position 15
  mockDeleteMovementsByAccountUseCase,
  mockDeleteMovementsByPocketUseCase,
  mockMarkMovementsAsOrphanedUseCase,
  mockUpdateMovementsAccountForPocketUseCase,
  mockMovementRepo
);
```

Also add imports:
```ts
import { GetSpendingSummaryUseCase } from '../application/useCases/GetSpendingSummaryUseCase';
import { GetMovementYearsUseCase } from '../application/useCases/GetMovementYearsUseCase';
```

---

### 3. `src/modules/pockets/presentation/PocketController.integration.test.ts`

**Line 73** — `error TS2554: Expected 8 arguments, but got 7.`

The test passes 7 args but `PocketController` now expects 8. Missing: `pocketRepo` (last param, injected as `'PocketRepository'`).

**Fix**: Add a mock pocket repo and pass it as the 8th argument:
```ts
// Add declaration:
let mockPocketRepo: any;

// Add in beforeEach:
mockPocketRepo = { findAllByUserId: jest.fn() } as any;

// Add as last arg in constructor:
const controller = new PocketController(
  ...existing 7 args...,
  mockPocketRepo  // NEW — position 8
);
```

---

### 4. `src/modules/settings/infrastructure/SupabaseExchangeRateRepository.integration.test.ts`

**Line 34** — `error TS2554: Expected 1 arguments, but got 0.`

```ts
repository = new SupabaseExchangeRateRepository();
```

Constructor now requires a `SupabaseClient` argument (injected via `@inject('SupabaseClient')`).

**Fix**: Pass the supabase client:
```ts
supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
repository = new SupabaseExchangeRateRepository(supabase);
```

(Move `supabase` creation before `repository` creation.)

---

### 5. `src/modules/settings/infrastructure/SupabaseSettingsRepository.integration.test.ts`

**Line 36** — `error TS2554: Expected 1 arguments, but got 0.`

```ts
repository = new SupabaseSettingsRepository();
```

Constructor now requires a `SupabaseClient` argument.

**Fix**: Pass the supabase client:
```ts
supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
repository = new SupabaseSettingsRepository(supabase);
```

(Move `supabase` creation before `repository` creation.)

---

### 6. `src/modules/settings/presentation/SettingsController.integration.test.ts`

**Lines 70, 136, 162, 188** — `error TS2345: Argument of type '{...}' is not assignable to parameter of type 'SettingsResponseDTO'`

All `mockResponse` objects are missing required fields: `dateFormat`, `movementsPerPage`, `reminderAdvanceDays`, `defaultCurrencyForNewAccounts`.

**Fix**: Add the missing fields to every `mockResponse` object:
```ts
const mockResponse = {
  id: 'settings-123',
  userId: testUserId,
  primaryCurrency: 'USD' as const,
  alphaVantageApiKey: 'test-api-key',
  dateFormat: 'YYYY-MM-DD',
  movementsPerPage: 50,
  reminderAdvanceDays: 3,
  defaultCurrencyForNewAccounts: 'USD' as const,
};
```

Apply to all 4 occurrences (lines 70, 136, 162, 188), adjusting `primaryCurrency` per test case.

---

## Coder Tasks

### Task 1: Fix SubPocket constructor + MovementController + PocketController (4 files)

Files:
- `src/modules/sub-pockets/infrastructure/SupabaseSubPocketRepository.integration.test.ts`
- `src/modules/movements/presentation/MovementController.integration.test.ts`
- `src/modules/pockets/presentation/PocketController.integration.test.ts`

Changes:
1. **SubPocketRepository test**: Remove `enabled` (boolean) argument from all `new SubPocket(...)` calls. The 7th param is now `groupId?: string` and 8th is `displayOrder?: number`.
2. **MovementController test**: Add `GetSpendingSummaryUseCase` and `GetMovementYearsUseCase` mocks + imports, insert them at positions 14-15 in the constructor call.
3. **PocketController test**: Add `mockPocketRepo` with `findAllByUserId` mock, pass as 8th constructor arg.

Verification: `npx tsc --noEmit --project tsconfig.test.json` (create temp tsconfig that includes `**/*.ts` without excluding tests).

---

### Task 2: Fix Settings module tests (3 files)

Files:
- `src/modules/settings/infrastructure/SupabaseExchangeRateRepository.integration.test.ts`
- `src/modules/settings/infrastructure/SupabaseSettingsRepository.integration.test.ts`
- `src/modules/settings/presentation/SettingsController.integration.test.ts`

Changes:
1. **ExchangeRateRepository test**: Move `supabase = createClient(...)` before `repository` creation, pass `supabase` to constructor.
2. **SettingsRepository test**: Same — move `supabase` creation before `repository`, pass to constructor.
3. **SettingsController test**: Add `dateFormat: 'YYYY-MM-DD'`, `movementsPerPage: 50`, `reminderAdvanceDays: 3`, `defaultCurrencyForNewAccounts: 'USD' as const` to all 4 `mockResponse` objects (lines ~70, ~136, ~162, ~188).

Verification: Same tsc check as Task 1.
