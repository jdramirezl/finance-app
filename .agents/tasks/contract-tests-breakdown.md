# Contract Tests Breakdown

## Summary

The frontend has 2 contract test files covering accounts, pockets, and movements. There are **6 additional API domains** with backend Zod schemas and corresponding frontend services that need contract tests.

## Existing Coverage

| Domain | Contract Test File | Status |
|--------|-------------------|--------|
| Accounts | `accountContracts.test.ts` | Done |
| Pockets | `accountContracts.test.ts` | Done |
| Movements | `movementContracts.test.ts` | Done |

## Missing Contract Tests

| # | Domain | Backend Schema File | Frontend Service | Priority |
|---|--------|-------------------|-----------------|----------|
| 1 | Reminders | `backend/src/modules/reminders/presentation/schemas.ts` | `frontend/src/services/reminderService.ts` | High |
| 2 | Sub-Pockets & Fixed Expense Groups | `backend/src/modules/sub-pockets/presentation/schemas.ts` | `frontend/src/services/subPocketService.ts` + `fixedExpenseGroupService.ts` | High |
| 3 | Net Worth Snapshots | `backend/src/modules/net-worth/presentation/schemas.ts` | `frontend/src/services/netWorthSnapshotService.ts` | Medium |
| 4 | Settings & Currency | `backend/src/modules/settings/presentation/schemas.ts` | `frontend/src/services/settingsService.ts` + `currencyService.ts` | Medium |
| 5 | Movement Templates | `backend/src/modules/movements/presentation/templateSchemas.ts` | `frontend/src/services/movementTemplateService.ts` | Medium |
| 6 | Investments | `backend/src/modules/settings/presentation/schemas.ts` (updateInvestmentSchema) | `frontend/src/services/investmentService.ts` | Low |

## Detailed Breakdown

---

### 1. Reminders (`reminderContracts.test.ts`)

**Backend schema**: `backend/src/modules/reminders/presentation/schemas.ts`

**Schemas to test**:

| Schema | Used By | Payloads to Validate |
|--------|---------|---------------------|
| `createReminderSchema` | `POST /api/reminders` | `{ title, amount, dueDate, recurrence: { type, interval, daysOfWeek?, endType, endCount?, endDate? }, fixedExpenseId?, templateId? }` |
| `updateReminderSchema` | `PUT /api/reminders/:id` | Partial of create + `isPaid`, `linkedMovementId` (nullable) |
| `markAsPaidSchema` | `POST /api/reminders/:id/pay` | `{ movementId? }` |
| `createExceptionSchema` | `POST /api/reminders/:id/exceptions` | `{ originalDate, action: 'deleted'|'modified', newTitle?, newAmount?, newDate?, isPaid?, linkedMovementId? }` |
| `splitSeriesSchema` | `POST /api/reminders/:id/split` | `{ splitDate, newDetails? }` (newDetails = createReminderSchema minus fixedExpenseId/templateId) |

**Frontend service methods**:
- `reminderService.create(data)` → createReminderSchema
- `reminderService.update(id, data)` → updateReminderSchema
- `reminderService.markAsPaid(id, movementId?)` → markAsPaidSchema
- `reminderService.createException(id, data)` → createExceptionSchema
- `reminderService.splitSeries(id, splitDate, newDetails?)` → splitSeriesSchema

**Complexity**: High — nested `recurrenceConfigSchema` with conditional fields, enum validation for `type`/`endType`/`action`.

---

### 2. Sub-Pockets & Fixed Expense Groups (`subPocketContracts.test.ts`)

**Backend schema**: `backend/src/modules/sub-pockets/presentation/schemas.ts`

**Schemas to test**:

| Schema | Used By | Payloads to Validate |
|--------|---------|---------------------|
| `createSubPocketSchema` | `POST /api/sub-pockets` | `{ pocketId (uuid), name, valueTotal (positive), periodicityMonths (int, positive), groupId? (uuid) }` |
| `updateSubPocketSchema` | `PUT /api/sub-pockets/:id` | `{ name?, valueTotal?, periodicityMonths? }` |
| `moveToGroupSchema` | `POST /api/sub-pockets/:id/move-to-group` | `{ groupId: uuid | null }` |
| `reorderSubPocketsSchema` | `POST /api/sub-pockets/reorder` | `{ subPocketIds: uuid[] (min 1) }` |
| `createGroupSchema` | `POST /api/fixed-expense-groups` | `{ name, color }` |
| `updateGroupSchema` | `PUT /api/fixed-expense-groups/:id` | `{ name?, color? }` |
| `reorderGroupsSchema` | `POST /api/fixed-expense-groups/reorder` | `{ ids: uuid[] (min 1) }` |

**Frontend service methods**:
- `subPocketService.createSubPocket(pocketId, name, valueTotal, periodicityMonths, groupId?)` → createSubPocketSchema
- `subPocketService.updateSubPocket(id, updates)` → updateSubPocketSchema
- `subPocketService.moveToGroup(subPocketId, groupId)` → moveToGroupSchema
- `subPocketService.reorderSubPockets(pocketId, subPocketIds)` → reorderSubPocketsSchema
- `fixedExpenseGroupService.create(name, color)` → createGroupSchema
- `fixedExpenseGroupService.update(id, name, color)` → updateGroupSchema
- `fixedExpenseGroupService.reorder(ids)` → reorderGroupsSchema

**Note**: The frontend `reorderSubPockets` sends `{ pocketId, subPocketIds }` but the backend schema only expects `{ subPocketIds }`. This is a potential contract mismatch to flag.

---

### 3. Net Worth Snapshots (`netWorthContracts.test.ts`)

**Backend schema**: `backend/src/modules/net-worth/presentation/schemas.ts`

**Schemas to test**:

| Schema | Used By | Payloads to Validate |
|--------|---------|---------------------|
| `createSnapshotSchema` | `POST /api/net-worth-snapshots` | `{ totalNetWorth (number), baseCurrency (enum), breakdown: Record<Currency, number> }` |
| `updateSnapshotSchema` | `PUT /api/net-worth-snapshots/:id` | `{ totalNetWorth?, baseCurrency?, breakdown? }` |

**Frontend service methods**:
- `netWorthSnapshotService.create(data)` → createSnapshotSchema
- `netWorthSnapshotService.update(id, data)` → updateSnapshotSchema

**Complexity**: Low — simple schemas, but `breakdown` uses `z.record(currency, z.number())` which needs careful testing.

---

### 4. Settings & Currency (`settingsContracts.test.ts`)

**Backend schema**: `backend/src/modules/settings/presentation/schemas.ts`

**Schemas to test**:

| Schema | Used By | Payloads to Validate |
|--------|---------|---------------------|
| `updateSettingsSchema` | `PUT /api/settings` | `{ primaryCurrency?, alphaVantageApiKey?, snapshotFrequency?, defaultExpenseAccountId?, defaultExpensePocketId?, defaultIncomeAccountId?, defaultIncomePocketId?, dateFormat?, movementsPerPage?, reminderAdvanceDays?, defaultCurrencyForNewAccounts? }` |
| `convertCurrencySchema` | `POST /api/currency/convert` | `{ amount (number), fromCurrency (enum), toCurrency (enum) }` |
| `convertBatchSchema` | `POST /api/currency/convert-batch` | `{ conversions: [{ amount, from (enum), to (enum) }] (min 1) }` |

**Frontend service methods**:
- `settingsService.updateSettings(updates)` → updateSettingsSchema
- `currencyService.convert(amount, from, to)` → convertCurrencySchema
- `currencyService.convertBatch(conversions)` → convertBatchSchema

**Note**: `updateSettingsSchema` uses `.passthrough()` (not `.strict()`), meaning extra fields are allowed. Tests should validate that known fields pass and that enum constraints work, but unknown fields won't fail.

---

### 5. Movement Templates (`templateContracts.test.ts`)

**Backend schema**: `backend/src/modules/movements/presentation/templateSchemas.ts`

**Schemas to test**:

| Schema | Used By | Payloads to Validate |
|--------|---------|---------------------|
| `createTemplateSchema` | `POST /api/movement-templates` | `{ name, type (movementType enum), accountId (uuid), pocketId (uuid), subPocketId? (uuid, nullable), defaultAmount? (positive, nullable), notes? (nullable) }` |
| `updateTemplateSchema` | `PUT /api/movement-templates/:id` | All fields optional, same types as create |

**Frontend service methods**:
- `movementTemplateService.createTemplate(name, type, accountId, pocketId, defaultAmount?, notes?, subPocketId?)` → createTemplateSchema
- `movementTemplateService.updateTemplate(id, updates)` → updateTemplateSchema

**Complexity**: Low-medium — nullable optional fields need careful testing.

---

### 6. Investments (`investmentContracts.test.ts`)

**Backend schema**: `backend/src/modules/settings/presentation/schemas.ts` → `updateInvestmentSchema`

**Schemas to test**:

| Schema | Used By | Payloads to Validate |
|--------|---------|---------------------|
| `updateInvestmentSchema` | `POST /api/investments/:accountId/update` | `{ shares? (min 0), montoInvertido? (min 0) }` |

**Frontend service methods**:
- No direct frontend call to this endpoint currently (investment updates go through account updates). The `investmentService` only calls `GET /api/investments/prices/:symbol` (no body validation needed).

**Complexity**: Very low — single schema with 2 optional numeric fields. Could be bundled with accounts contract test.

---

## Reports Domain (Query Params Only)

The reports module uses `validateQuery` (not `validateBody`), meaning schemas validate query parameters, not request bodies. The frontend calls these via GET requests with query strings:

| Schema | Endpoint | Query Params |
|--------|----------|-------------|
| `spendingByCategoryQuerySchema` | `GET /api/reports/spending-by-category` | `startDate`, `endDate` |
| `monthlyTrendQuerySchema` | `GET /api/reports/monthly-trend` | `months` (1-24, default 6) |
| `categoryTrendQuerySchema` | `GET /api/reports/category-trend` | `category`, `months` |
| `exchangeRateHistoryQuerySchema` | `GET /api/reports/exchange-rate-history` | `base`, `target`, `days` (1-365, default 90) |

**Decision**: The user has decided to remove the Reports page. The `exchangeRateHistoryQuerySchema` is still used by `currencyService.getExchangeRateHistory()`. Consider including it in the settings/currency contract test if the exchange rate history feature remains.

---

## Potential Contract Mismatches Found

1. **subPocketService.reorderSubPockets** sends `{ pocketId, subPocketIds }` but backend `reorderSubPocketsSchema` only expects `{ subPocketIds }`. The extra `pocketId` field will be rejected by `.strict()`.

2. **currencyService.convert** sends `{ amount, fromCurrency, toCurrency }` matching `convertCurrencySchema` field names exactly. Confirmed correct.

3. **currencyService.convertBatch** sends `{ conversions: [{ amount, from, to }] }` matching `convertBatchSchema`. Confirmed correct.

---

## Execution Waves

### Wave 1 (High Priority — Complex Schemas)

| Task | File to Create | Schemas | Estimated Complexity |
|------|---------------|---------|---------------------|
| Reminders | `reminderContracts.test.ts` | 5 schemas + nested recurrenceConfig | High |
| Sub-Pockets & Groups | `subPocketContracts.test.ts` | 7 schemas | Medium |

### Wave 2 (Medium Priority — Straightforward)

| Task | File to Create | Schemas | Estimated Complexity |
|------|---------------|---------|---------------------|
| Net Worth | `netWorthContracts.test.ts` | 2 schemas | Low |
| Settings & Currency | `settingsContracts.test.ts` | 3 schemas | Medium |
| Movement Templates | `templateContracts.test.ts` | 2 schemas | Low |

### Wave 3 (Low Priority — Minimal)

| Task | File to Create | Schemas | Estimated Complexity |
|------|---------------|---------|---------------------|
| Investments | `investmentContracts.test.ts` | 1 schema | Very Low |

---

## Contract Test Pattern Reference

Each test file should follow the established pattern from existing tests:

1. Recreate backend Zod schemas at the top (with comment referencing source file)
2. Group tests by schema in `describe` blocks
3. Test valid payloads (happy path with all required fields)
4. Test valid payloads with optional fields
5. Test rejection of invalid values (wrong types, out-of-range, invalid enums)
6. Test `.strict()` rejection of unknown fields
7. Test edge cases (empty objects for partial updates, nullable fields, empty arrays)

All tests use `vitest` with `z.safeParse(payload).success` assertions.
