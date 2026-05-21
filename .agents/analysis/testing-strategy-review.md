# Testing Strategy Review

## Executive Summary

The finance-app has a solid foundation of backend tests (unit, property-based, and integration) but significant gaps in frontend testing, E2E coverage, and CI enforcement. The backend follows clean architecture with tests at each layer; the frontend has service-level and hook tests but zero component tests for business-critical UI. E2E has a single smoke test. No API contract validation or performance testing exists.

**Overall test health**: ~40% coverage of critical paths. Backend is well-structured but integration tests require a live Supabase connection. Frontend services are tested but complex components and user flows are not.

---

## 1. Unit Tests

### What Exists

**Backend domain tests (well-covered):**
| File | Coverage |
|------|----------|
| `accounts/domain/Account.test.ts` | Account creation, validation, balance calc |
| `accounts/domain/Account.property.test.ts` | Property-based (fast-check) for account invariants |
| `accounts/domain/Account.investment.property.test.ts` | Investment account property tests |
| `accounts/domain/AccountDomainService.test.ts` | Domain service logic |
| `accounts/domain/StockPrice.test.ts` | Stock price entity |
| `movements/domain/Movement.test.ts` | Movement entity validation |
| `movements/domain/MovementDomainService.test.ts` | Movement business rules |
| `pockets/domain/Pocket.test.ts` | Pocket entity |
| `pockets/domain/PocketDomainService.test.ts` | Pocket domain service |
| `sub-pockets/domain/SubPocket.test.ts` | Sub-pocket entity |
| `sub-pockets/domain/SubPocket.property.test.ts` | Property-based sub-pocket tests |
| `sub-pockets/domain/FixedExpenseGroup.test.ts` | Fixed expense group entity |
| `settings/domain/Settings.test.ts` | Settings entity |
| `settings/domain/ExchangeRate.test.ts` | Exchange rate entity |
| `shared/container/index.test.ts` | DI container wiring (34KB - comprehensive) |

**Frontend utility/hook tests:**
| File | Coverage |
|------|----------|
| `utils/dateUtils.test.ts` | Date formatting utilities |
| `utils/fixedExpenseUtils.test.ts` | Fixed expense calculations |
| `utils/idGenerator.test.ts` | ID generation |
| `store/useThemeStore.test.ts` | Theme store |
| `hooks/__tests__/useMovementsSort.test.ts` | Movement sorting logic |
| `hooks/__tests__/useMovementsFilter.test.ts` | Movement filtering logic |
| `hooks/__tests__/useBalanceDeltas.test.ts` | Balance delta calculations |
| `hooks/__tests__/useConfirm.test.ts` | Confirm dialog hook |
| `hooks/__tests__/useToast.test.ts` | Toast notification hook |
| `hooks/__tests__/useConsolidatedTotal.test.ts` | Consolidated total calculation |
| `hooks/__tests__/useBulkSelection.test.ts` | Bulk selection logic |
| `hooks/__tests__/useNetWorthChartData.test.ts` | Net worth chart data transformation |

### What's Missing

**Backend - Critical gaps:**
- `reminders/domain/` — No unit tests for Reminder entity or domain logic
- `net-worth/domain/` — No unit tests for NetWorthSnapshot entity
- `movements/application/useCases/` — No use case unit tests (only integration)
- `accounts/application/useCases/` — No use case unit tests
- `pockets/application/useCases/` — No use case unit tests
- `shared/middleware/` — No tests for authMiddleware, validate, cacheControl, errorHandler

**Frontend - Critical gaps:**
- `services/currencyService.ts` — No tests (currency conversion is critical business logic)
- `services/settingsService.ts` — No tests
- `services/investmentService.ts` — No tests
- `services/reminderService.ts` — No tests
- `services/netWorthSnapshotService.ts` — No tests
- `services/fixedExpenseGroupService.ts` — No tests
- `services/movementTemplateService.ts` — No tests
- `hooks/useConsolidatedTotal.ts` — Has test but this is the most critical calculation
- `hooks/useInvestmentPrices.ts` — No tests (complex async logic)
- `hooks/useAutoNetWorthSnapshot.ts` — No tests
- `hooks/useBudgetPersistence.ts` — No tests
- `hooks/actions/*` — Zero tests for any action hooks (10 files, all untested)

### Priority & Effort

| Gap | Priority | Effort (files) |
|-----|----------|----------------|
| Backend middleware tests | Important | 4 |
| Reminder domain tests | Important | 2 |
| Currency service tests | Critical | 1 |
| Frontend untested services (5) | Important | 5 |
| Action hooks tests | Important | 5-6 |
| Backend use case unit tests | Nice-to-have | 10+ |

---

## 2. Integration Tests

### What Exists

**Backend integration tests (require live Supabase):**
| File | What it tests |
|------|---------------|
| `accounts/presentation/AccountController.integration.test.ts` | Account CRUD endpoints |
| `accounts/presentation/InvestmentController.integration.test.ts` | Investment endpoints |
| `accounts/infrastructure/SupabaseAccountRepository.integration.test.ts` | Account repo |
| `accounts/infrastructure/SupabaseStockPriceRepository.integration.test.ts` | Stock price repo |
| `movements/presentation/MovementController.integration.test.ts` | Movement CRUD endpoints |
| `movements/infrastructure/SupabaseMovementRepository.integration.test.ts` | Movement repo |
| `pockets/presentation/PocketController.integration.test.ts` | Pocket CRUD endpoints |
| `pockets/infrastructure/SupabasePocketRepository.integration.test.ts` | Pocket repo |
| `sub-pockets/presentation/SubPocketController.integration.test.ts` | Sub-pocket endpoints |
| `sub-pockets/presentation/FixedExpenseGroupController.integration.test.ts` | Fixed expense group endpoints |
| `sub-pockets/infrastructure/SupabaseSubPocketRepository.integration.test.ts` | Sub-pocket repo |
| `sub-pockets/infrastructure/SupabaseFixedExpenseGroupRepository.integration.test.ts` | Fixed expense group repo |
| `settings/presentation/SettingsController.integration.test.ts` | Settings endpoints |
| `settings/presentation/CurrencyController.integration.test.ts` | Currency/exchange rate endpoints |
| `settings/infrastructure/SupabaseSettingsRepository.integration.test.ts` | Settings repo |
| `settings/infrastructure/SupabaseExchangeRateRepository.integration.test.ts` | Exchange rate repo |
| `net-worth/presentation/NetWorthController.integration.test.ts` | Net worth endpoints |

**Frontend integration test:**
- `test/integration.test.ts` — DISABLED (placeholder only, was for Zustand, needs rewrite for TanStack Query)

### What's Missing

**Backend:**
- `reminders/presentation/` — No integration test for reminder endpoints
- `reminders/infrastructure/` — No integration test for reminder repository
- `net-worth/infrastructure/` — No integration test for net worth repository
- `movements/presentation/TemplateController` — No integration test for movement templates
- Cross-module integration (e.g., deleting an account cascades to movements)

**Frontend:**
- The entire frontend integration test suite is disabled
- No tests verifying TanStack Query hooks interact correctly with the API client
- No tests for auth flow integration (login -> token -> authenticated requests)

### Priority & Effort

| Gap | Priority | Effort (files) |
|-----|----------|----------------|
| Reminder controller integration test | Critical | 1 |
| Reminder repository integration test | Important | 1 |
| Net worth repository integration test | Important | 1 |
| Movement template controller test | Important | 1 |
| Frontend integration test rewrite | Important | 1-2 |
| Cross-module cascade tests | Nice-to-have | 2-3 |

---

## 3. E2E Tests (Playwright)

### What Exists

- `frontend/e2e/smoke.spec.ts` — Single test: verifies login page loads
- Playwright config exists with webServer setup (starts dev server on port 5173)
- Playwright installed as devDependency

### What's Missing — Critical User Flows

| Flow | Priority | Complexity |
|------|----------|------------|
| **Login/Logout** | Critical | Low |
| **Sign up** | Critical | Low |
| **Create account** | Critical | Medium |
| **Create pocket within account** | Critical | Medium |
| **Create movement (income/expense)** | Critical | Medium |
| **Edit movement inline** | Important | Medium |
| **Delete account (cascade confirmation)** | Critical | Medium |
| **Budget page: set income, distribute** | Important | High |
| **Fixed expenses: create group, add expense** | Important | High |
| **Reminders: create, mark as paid** | Important | Medium |
| **Net worth: view chart, create snapshot** | Nice-to-have | Medium |
| **Settings: change preferences** | Nice-to-have | Low |
| **Multi-currency: create accounts in different currencies** | Important | Medium |
| **Movement templates: save and use** | Nice-to-have | Medium |
| **Batch movement creation** | Nice-to-have | High |

### Priority & Effort

| Category | Priority | Estimated files |
|----------|----------|-----------------|
| Auth flows (login, signup, logout) | Critical | 1 |
| Account CRUD flow | Critical | 1 |
| Movement CRUD flow | Critical | 1 |
| Budget flow | Important | 1 |
| Fixed expenses flow | Important | 1 |
| Reminders flow | Important | 1 |
| Settings + multi-currency | Nice-to-have | 1 |
| **Total** | | **7 files** |

---

## 4. Component Tests (React Testing Library)

### What Exists

- `components/layout/ThemeProvider.test.tsx` — Theme toggle
- `components/ui/Modal.test.tsx` — Modal open/close
- `components/summary/FinancialCalendarWidget.test.tsx` — Calendar widget rendering
- `pages/__tests__/LoginPage.test.tsx` — Login page rendering
- `pages/__tests__/SignUpPage.test.tsx` — Sign up page rendering
- `contexts/__tests__/AuthContext.test.tsx` — Auth context provider

### What's Missing — Key Components Without Tests

| Component | Why it matters | Priority |
|-----------|---------------|----------|
| `MovementForm.tsx` (14KB) | Core data entry, complex validation | Critical |
| `MovementList.tsx` (22KB) | Main data display, bulk actions, inline edit | Critical |
| `AccountCard.tsx` | Account display with balance | Important |
| `AccountForm.tsx` | Account creation/edit | Important |
| `BudgetDistribution.tsx` (13KB) | Budget allocation logic in UI | Important |
| `ReminderForm.tsx` (17KB) | Complex form with recurrence | Important |
| `FixedExpenseGroupCard.tsx` (16KB) | Progress tracking, contributions | Important |
| `MovementFilters.tsx` (14KB) | Filter state management | Important |
| `BatchMovementForm.tsx` | Multi-row entry | Nice-to-have |
| `CDAccountForm.tsx` (12KB) | CD-specific form | Nice-to-have |
| `ErrorBoundary.tsx` | Error recovery | Nice-to-have |
| `ProtectedRoute.tsx` | Auth guard | Important |

### Priority & Effort

| Category | Priority | Estimated files |
|----------|----------|-----------------|
| MovementForm + MovementList | Critical | 2 |
| AccountCard + AccountForm | Important | 2 |
| BudgetDistribution | Important | 1 |
| ReminderForm | Important | 1 |
| FixedExpenseGroupCard | Important | 1 |
| ProtectedRoute | Important | 1 |
| **Total** | | **8 files** |

---

## 5. API Contract Tests

### What Exists

- Backend uses Zod schemas for request validation (`presentation/schemas.ts` in each module)
- Frontend uses TypeScript types but no runtime validation of API responses
- No shared contract between frontend and backend

### What's Missing

- No validation that frontend service calls match backend expected shapes
- No test that backend response shapes match frontend type expectations
- The `shared/` workspace exists but isn't used for contract enforcement
- No OpenAPI/Swagger spec generation from Zod schemas

### Recommendation

| Approach | Priority | Effort |
|----------|----------|--------|
| Export Zod schemas from backend, import in frontend tests | Critical | 2-3 files |
| Generate TypeScript types from Zod schemas into `shared/` | Important | 1 setup file |
| Add response validation in frontend apiClient (dev mode only) | Nice-to-have | 1 file |

This is high-value because the app has had bugs from shape mismatches (e.g., the settings bug where `accountCardDisplay` sent a full object instead of a string).

---

## 6. Visual Regression Tests

### What Exists

Nothing.

### Recommendation

**Not recommended at this stage.** Reasons:
- The app is planning a full UI/design overhaul (per project notes)
- Visual regression tests would break constantly during redesign
- The effort-to-value ratio is poor until the design stabilizes
- Playwright screenshots could be added later as a low-effort addition

**Revisit after**: The UX redesign is complete and the design system is stable.

| Verdict | Priority | Effort |
|---------|----------|--------|
| Skip for now | Nice-to-have (future) | N/A |

---

## 7. Performance Tests

### What Exists

Nothing.

### What's Needed

Given the Vercel free tier constraint and the real-time Supabase queries, performance matters:

| Test | Why | Priority |
|------|-----|----------|
| API response time assertions in integration tests | Catch N+1 queries | Important |
| Frontend bundle size check in CI | Prevent bloat on free tier | Important |
| TanStack Query cache hit verification | Ensure memoization works | Nice-to-have |
| Lighthouse CI score threshold | Overall performance gate | Nice-to-have |

### Recommendation

| Approach | Priority | Effort |
|----------|----------|--------|
| Add `expect(responseTime).toBeLessThan(500)` to backend integration tests | Important | 0 (inline in existing tests) |
| Add bundle size check to CI (`vite build` + size assertion) | Important | 1 CI step |
| Lighthouse CI | Nice-to-have | 1 CI config |

---

## 8. CI Pipeline Assessment

### What Exists

```yaml
# .github/workflows/ci.yml
jobs:
  lint          # ESLint
  test-backend  # Jest (all backend tests)
  test-frontend # Vitest (all frontend tests)
```

### What's Missing

| Gap | Priority |
|-----|----------|
| E2E tests not in CI | Critical |
| No coverage threshold enforcement | Important |
| No build size check | Important |
| Backend integration tests likely fail in CI (need Supabase credentials) | Critical |
| No test result caching | Nice-to-have |
| No parallel job optimization | Nice-to-have |

### Recommendation

The backend integration tests require a live Supabase connection. Options:
1. **Skip integration tests in CI** (tag them, run only unit tests) — quickest
2. **Use Supabase CLI for local DB in CI** — best long-term
3. **Mock Supabase in integration tests** — defeats the purpose

---

## Summary: Prioritized Action Plan

### Phase 1 — Critical (do first)

1. **Fix CI**: Separate unit tests from integration tests so CI passes reliably
2. **Currency service tests**: Core business logic with zero coverage
3. **Reminder integration tests**: Only module with no integration tests
4. **E2E auth flow**: Login/signup/logout with Playwright
5. **E2E account + movement flow**: Core CRUD paths

### Phase 2 — Important (do next)

6. **Frontend untested services** (5 files): investment, settings, reminder, netWorth, fixedExpenseGroup
7. **Component tests for MovementForm + MovementList**: Most complex UI
8. **API contract validation**: Prevent shape mismatch bugs
9. **Backend middleware tests**: Auth, validation, error handling
10. **Bundle size CI check**

### Phase 3 — Nice-to-have (do when stable)

11. Remaining component tests (budget, reminders, fixed expenses)
12. Backend use case unit tests
13. Performance assertions in integration tests
14. Lighthouse CI
15. Visual regression (after redesign)

---

## Estimated Total Effort

| Category | New test files | Priority breakdown |
|----------|---------------|-------------------|
| Unit tests | ~15 | 5 critical, 6 important, 4 nice-to-have |
| Integration tests | ~5 | 2 critical, 2 important, 1 nice-to-have |
| E2E tests | ~7 | 3 critical, 3 important, 1 nice-to-have |
| Component tests | ~8 | 2 critical, 5 important, 1 nice-to-have |
| Contract tests | ~3 | 1 critical, 1 important, 1 nice-to-have |
| CI improvements | ~2 | 2 critical, 1 important |
| **Total** | **~40 files** | |
