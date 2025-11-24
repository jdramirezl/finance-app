# Project Planning & To-Do List

## Phase 1: Project Setup & Foundation

### 1.1 Project Initialization
- [ ] Initialize React + TypeScript project (Vite/CRA)
- [ ] Set up project structure (folders: components, services, types, utils, hooks)
- [ ] Configure ESLint and Prettier
- [ ] Set up routing (React Router)
- [ ] Create basic layout component (navigation, main container)

### 1.2 Type Definitions
- [ ] Define `Account` type/interface
- [ ] Define `Pocket` type/interface
- [ ] Define `SubPocket` type/interface
- [ ] Define `Movement` type/interface
- [ ] Define `Investment` type/interface (extends Account)
- [ ] Define enums: `PocketType`, `MovementType`, `Currency`
- [ ] Create type guards and validation utilities

### 1.3 Data Persistence Layer
- [ ] Design data storage schema (localStorage/IndexedDB structure)
- [ ] Create `storageService.ts` with CRUD operations
- [ ] Implement data migration utilities (for future DB changes)
- [ ] Create data initialization (default accounts, etc.)

## Phase 2: Core Business Logic & Services

### 2.1 Account Service
- [ ] Create `accountService.ts`
- [ ] Implement `createAccount(name, color, currency)`
- [ ] Implement `updateAccount(id, data)`
- [ ] Implement `deleteAccount(id)` (with validation)
- [ ] Implement `getAccount(id)`
- [ ] Implement `getAllAccounts()`
- [ ] Implement `validateAccountUniqueness(name, currency)`
- [ ] Implement `calculateAccountBalance(accountId)` (sum of pockets)

### 2.2 Pocket Service
- [ ] Create `pocketService.ts`
- [ ] Implement `createPocket(accountId, name, type)`
- [ ] Implement `updatePocket(id, data)`
- [ ] Implement `deletePocket(id)`
- [ ] Implement `getPocket(id)`
- [ ] Implement `getPocketsByAccount(accountId)`
- [ ] Implement `validatePocketUniqueness(accountId, name)`
- [ ] Implement `validateFixedPocketUniqueness()` (only one globally)
- [ ] Implement `calculatePocketBalance(pocketId)` (for fixed: sum sub-pockets)

### 2.3 SubPocket Service (Fixed Expenses)
- [ ] Create `subPocketService.ts`
- [ ] Implement `createSubPocket(pocketId, name, valueTotal, periodicityMonths)`
- [ ] Implement `updateSubPocket(id, data)`
- [ ] Implement `deleteSubPocket(id)`
- [ ] Implement `getSubPocket(id)`
- [ ] Implement `getSubPocketsByPocket(pocketId)`
- [ ] Implement `calculateAporteMensual(valueTotal, periodicityMonths)`
- [ ] Implement `calculateProgreso(balance, valueTotal)`
- [ ] Implement `calculateTotalFijosMes(pocketId)` (sum of enabled sub-pockets)
- [ ] Implement `toggleSubPocketEnabled(id)`
- [ ] Implement `calculateNextPayment(subPocketId)` (handles negative balance & near completion)

### 2.4 Movement Service
- [ ] Create `movementService.ts`
- [ ] Implement `createMovement(type, accountId, pocketId, amount, notes, displayedDate)`
- [ ] Implement `updateMovement(id, data)` (all fields editable)
- [ ] Implement `deleteMovement(id)`
- [ ] Implement `getMovement(id)`
- [ ] Implement `getAllMovements()` (sorted by createdAt)
- [ ] Implement `getMovementsByMonth(year, month)`
- [ ] Implement `getMovementsByAccount(accountId)`
- [ ] Implement `getMovementsByPocket(pocketId)`
- [ ] Implement balance update logic (update pocket balance on create/update/delete)
- [ ] Implement cascade balance updates (pocket → account)

### 2.5 Investment Service
- [ ] Create `investmentService.ts`
- [ ] Implement `createInvestmentAccount(name, currency)`
- [ ] Implement `registerInvestmentIngreso(accountId, amount)`
- [ ] Implement `registerInvestmentShares(accountId, shares)`
- [ ] Implement `calculateInvestmentMetrics(accountId)` (montoInvertido, shares, gananciasUSD, gananciasPct)
- [ ] Create `vooService.ts` for external API calls
- [ ] Implement mock price service for development
- [ ] Implement real API integration (future)

### 2.6 Currency & Conversion Service
- [ ] Create `currencyService.ts`
- [ ] Implement `setPrimaryCurrency(currency)`
- [ ] Implement `getPrimaryCurrency()`
- [ ] Implement `convertAmount(amount, fromCurrency, toCurrency)`
- [ ] Implement `getTotalByCurrency(currency)`
- [ ] Implement `getConsolidatedTotal()` (all currencies → primary)
- [ ] Create mock exchange rate service for development
- [ ] Plan external exchange rate API integration

## Phase 3: UI Components

### 3.1 Layout & Navigation
- [ ] Create `Layout.tsx` component
- [ ] Create `Navigation.tsx` component (menu/sidebar)
- [ ] Create `Header.tsx` component
- [ ] Set up route definitions
- [ ] Implement navigation between pages

### 3.2 Shared Components
- [ ] Create `Card.tsx` component
- [ ] Create `Button.tsx` component
- [ ] Create `Input.tsx` component
- [ ] Create `Select.tsx` component
- [ ] Create `Table.tsx` component
- [ ] Create `Modal.tsx` component
- [ ] Create `CurrencyDisplay.tsx` component (formatting)
- [ ] Create `ProgressBar.tsx` component (for fixed expenses)
- [ ] Create `ColorPicker.tsx` component (for account colors)

### 3.3 Summary Page Components
- [ ] Create `SummaryPage.tsx` main component
- [ ] Create `SummaryTotals.tsx` (totals by currency + consolidated)
- [ ] Create `SummaryAccounts.tsx` (accounts grouped by currency)
- [ ] Create `AccountCard.tsx` (individual account display)
- [ ] Create `PocketList.tsx` (pockets within account)
- [ ] Create `InvestmentCard.tsx` (special display for investments)
- [ ] Create `FixedExpensesSummary.tsx` (table with progress indicators)
- [ ] Implement currency grouping logic
- [ ] Implement investment-first sorting

### 3.4 Accounts Page Components
- [ ] Create `AccountsPage.tsx` main component
- [ ] Create `AccountList.tsx` (left panel)
- [ ] Create `AccountForm.tsx` (create/edit account)
- [ ] Create `AccountDetails.tsx` (right panel when account selected)
- [ ] Create `PocketList.tsx` (within account details)
- [ ] Create `PocketForm.tsx` (create/edit pocket)
- [ ] Implement account selection state
- [ ] Implement validation feedback (unique name+currency, unique pocket names)
- [ ] Implement fixed pocket creation validation

### 3.5 Fixed Expenses Page Components
- [ ] Create `FixedExpensesPage.tsx` main component
- [ ] Create `FixedExpensesTable.tsx` (editable table)
- [ ] Create `SubPocketForm.tsx` (create/edit sub-pocket)
- [ ] Create `SubPocketRow.tsx` (table row with enable/disable toggle)
- [ ] Implement validation (must have fixed pocket account)
- [ ] Implement real-time calculation display (aporteMensual)
- [ ] Implement enable/disable toggle functionality

### 3.6 Budget Planning Page Components
- [ ] Create `BudgetPlanningPage.tsx` main component
- [ ] Create `InitialAmountInput.tsx`
- [ ] Create `FixedExpensesDeduction.tsx` (shows subtraction)
- [ ] Create `RemainingAmount.tsx` (display)
- [ ] Create `DistributionGrid.tsx` (editable entries)
- [ ] Create `DistributionEntry.tsx` (name, percentage, calculated amount)
- [ ] Implement percentage calculation logic
- [ ] Implement add/remove distribution entries
- [ ] Implement real-time recalculation on changes

### 3.7 Movements Page Components
- [ ] Create `MovementsPage.tsx` main component
- [ ] Create `MovementForm.tsx` (create/edit movement)
- [ ] Create `MovementsList.tsx` (grouped by month)
- [ ] Create `MonthGroup.tsx` (month header + movements)
- [ ] Create `MovementRow.tsx` (individual movement display)
- [ ] Implement month grouping logic
- [ ] Implement sorting by createdAt
- [ ] Implement visual type differentiation (colors/indicators)
- [ ] Implement movement editing (all fields)
- [ ] Implement account/pocket selection dropdowns
- [ ] Implement sub-pocket selection for fixed expenses

### 3.8 Settings/Config Page
- [ ] Create `SettingsPage.tsx`
- [ ] Create `PrimaryCurrencySelector.tsx`
- [ ] Implement primary currency persistence

## Phase 4: State Management & Data Flow

### 4.1 State Management Setup
- [ ] Choose state management solution (Context API / Zustand / Redux)
- [ ] Create global state store
- [ ] Implement account state management
- [ ] Implement pocket state management
- [ ] Implement movement state management
- [ ] Implement currency/primary currency state

### 4.2 Data Synchronization
- [ ] Ensure all balance calculations update in real-time
- [ ] Implement reactive updates (when movement changes, update balances)
- [ ] Ensure fixed expenses calculations update on sub-pocket changes
- [ ] Ensure summary page updates on any data change

### 4.3 Validation & Error Handling
- [ ] Create validation utilities
- [ ] Implement error boundaries
- [ ] Add user-friendly error messages
- [ ] Implement form validation feedback

## Phase 5: Styling & UX

### 5.1 Design System
- [ ] Choose CSS solution (Tailwind / Styled Components / CSS Modules)
- [ ] Define color palette
- [ ] Define typography scale
- [ ] Define spacing system
- [ ] Create theme configuration

### 5.2 Visual Polish
- [ ] Style all components consistently
- [ ] Implement progress indicators (red/orange/green for fixed expenses)
- [ ] Implement visual type differentiation for movements
- [ ] Add loading states
- [ ] Add empty states
- [ ] Implement responsive design

### 5.3 User Experience
- [ ] Add confirmation dialogs for deletions
- [ ] Add success/error notifications
- [ ] Implement keyboard shortcuts (if applicable)
- [ ] Add tooltips/help text
- [ ] Ensure smooth transitions/animations

## Phase 6: Testing & Quality

### 6.1 Unit Tests
- [ ] Test account service functions
- [ ] Test pocket service functions
- [ ] Test sub-pocket service functions
- [ ] Test movement service functions
- [ ] Test balance calculation logic
- [ ] Test fixed expenses calculations
- [ ] Test currency conversion logic
- [ ] Test validation functions

### 6.2 Integration Tests
- [ ] Test account + pocket creation flow
- [ ] Test movement creation and balance updates
- [ ] Test fixed expenses workflow
- [ ] Test budget planning calculations

### 6.3 E2E Tests (Optional)
- [ ] Test complete user workflows
- [ ] Test data persistence

## Phase 7: External Integrations

### 7.1 Exchange Rate API
- [ ] Research and select exchange rate API
- [ ] Implement API client
- [ ] Add error handling and fallbacks
- [ ] Implement caching strategy
- [ ] Replace mock service with real API

### 7.2 Stock/Index Price API
- [ ] Research and select stock price API
- [ ] Implement VOO price fetching
- [ ] Add error handling
- [ ] Implement periodic updates
- [ ] Replace mock service with real API

## Phase 8: Documentation & Deployment

### 8.1 Documentation
- [ ] Write component documentation
- [ ] Document service APIs
- [ ] Create user guide
- [ ] Document data structure/schema

### 8.2 Deployment Preparation
- [ ] Set up build configuration
- [ ] Optimize bundle size
- [ ] Add environment variables configuration
- [ ] Prepare deployment scripts
- [ ] Deploy to hosting service (Vercel/Netlify/etc.)

## Phase 9: Future Enhancements

### 9.1 Advanced Features
- [ ] Add data export/import functionality
- [ ] Add charts/graphs for spending analysis
- [ ] Add budget vs actual comparisons
- [ ] Add recurring movement templates
- [ ] Add movement categories/tags

### 9.2 Mobile App Preparation
- [ ] Extract shared business logic to separate module
- [ ] Design API layer for future backend
- [ ] Plan React Native migration strategy

## Notes

- **Priority Order:** Complete phases sequentially, but can work on UI components (Phase 3) in parallel with services (Phase 2) once interfaces are defined
- **Critical Path:** Services → Components → State Management → Styling → Testing
- **MVP Scope:** Phases 1-5 are essential for MVP. Phases 6-8 are for production readiness.
- **Data Migration:** Keep storage layer abstracted to allow easy migration to backend database later

