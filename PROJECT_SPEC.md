# Project Specification — Personal Finance Management System

## Overview

A web application for personal finance management built with React and TypeScript. The system manages accounts, pockets (bolsillos), monthly movements, budget planning, fixed expenses with sub-pockets, multi-currency consolidated summaries, and investment tracking (VOO).

**Future Goal:** Migrate/share logic with a React Native mobile app.

## Core Domains

1. **Accounts and Pockets** - Main financial containers
2. **Monthly Movements** - Transaction tracking
3. **Budget Planning** - Income distribution planning
4. **Fixed Expenses** - Special pocket with sub-pockets for recurring expenses
5. **Multi-Currency Summary** - Consolidated view across currencies
6. **Investments (VOO)** - Investment tracking with real-time pricing

## Domain Model

### Core Entities

- **Account**
  - Represents a financial account (bank account, cash, etc.)
  - Properties: `name`, `color`, `currency`, `balance` (calculated)
  - Constraints: Unique combination of `name` + `currency`

- **Pocket**
  - Sub-container within an account for specific purposes
  - Properties: `name`, `type`, `balance`, `currency` (inherited from account)
  - Types: `normal`, `fixed` (only one fixed pocket exists in entire app)
  - Constraints: Unique `name` within an account

- **SubPocket**
  - Only exists for `pocket.type === 'fixed'`
  - Represents individual fixed expense items
  - Properties: `name`, `valueTotal`, `periodicityMonths`, `balance`, `enabled`
  - Calculated: `aporteMensual = valueTotal / periodicityMonths`
  - Calculated: `progreso = balanceActual / valueTotal`

- **Movement**
  - Financial transaction record
  - Properties: `type`, `amount`, `accountId`, `pocketId`, `subPocketId` (optional), `notes`, `displayedDate`, `createdAt`
  - Types: `IngresoNormal`, `EgresoNormal`, `IngresoFijo`, `EgresoFijo`, `InvestmentIngreso`, `InvestmentShares`

- **Investment** (Special Account Type)
  - Represents investment tracking (e.g., VOO)
  - Properties: `montoInvertido`, `shares`, `precioActual`, `gananciasUSD`, `gananciasPct`
  - Always displayed first in account lists

## Business Rules

### Accounting Rules

1. **Balance Calculation**
   - Movements affect pockets only, never directly modify `Account.balance`
   - `Account.balance = sum(account.pockets.map(p => p.balance))`
   - Fixed pocket balance = sum of all its sub-pocket balances

2. **Fixed Expenses Pocket**
   - Only ONE fixed expenses pocket exists in the entire application
   - Belongs to a single account
   - Sub-pockets can only be created/modified from the Fixed Expenses view
   - Cannot be modified from the Accounts view

3. **Account Uniqueness**
   - Cannot have two accounts with same `name` AND `currency`
   - Example: "nu" with MXN and "nu" with COP is valid
   - Example: "nu" with MXN and "nu" with MXN is invalid

4. **Pocket Uniqueness**
   - Within a single account, pocket names must be unique
   - Different accounts can have pockets with the same name

### Fixed Expenses Calculations

- `progreso = balanceActual / valueTotal`
- `aporteMensual = valueTotal / periodicityMonths`
- `totalFijosMes = sum(aporteMensual)` for all enabled sub-pockets

### Fixed Expenses Special Cases

1. **Negative Balance (Debt)**
   - Allowed: Fixed expenses can have negative balances
   - Next payment compensates: `normalPayment + abs(negativeBalance)`
   - Example: If -100 and normal payment is 1000, next payment = 1100

2. **Near Completion**
   - If remaining amount < normal monthly payment, adjust payment
   - Payment = `min(valueTotal - currentBalance, aporteMensual)`
   - Example: Target 10, current 8, monthly 3.33 → next payment = 2

## Views/Pages

### 1. Summary Page (Main/Home)

**Primary View Card:**
- Total by currency (one card per currency)
- Total across all accounts (converted to primary currency)
- Investment gains included in USD total

**Accounts Section:**
- Grouped by currency
- Investment account always shown first
- Each account shows:
  - Account title | Account total (in selected currency)
  - List of all pockets with their balances (always expanded)
- Fixed expenses pocket shown as normal pocket in account view

**Fixed Expenses Section:**
- Table showing:
  - Total money in all fixed expenses
  - Per fixed expense:
    - Name
    - Money contributed
    - Total target value
    - Visual progress indicator (red/orange/green gradient)
- Read-only in this view (modifications in Fixed Expenses page)

### 2. Accounts View

**Functionality:**
- CRUD for accounts
- CRUD for pockets
- Click account → expand details in right panel (same page)

**Account Creation:**
- Required: `name`, `color`, `currency`
- Validation: Unique `name` + `currency` combination

**Pocket Management:**
- Create, modify, delete pockets
- Pocket currency matches account currency
- Validation: Unique pocket name within account
- Fixed pocket validation: Only one exists globally

### 3. Fixed Expenses View

**Functionality:**
- CRUD for fixed expense sub-pockets
- Enable/disable toggle for each sub-pocket
- Table-like interface with columns:
  - Name
  - Total value (`valueTotal`)
  - Divisibility (`periodicityMonths`)
  - Real monthly total (`aporteMensual`)

**Validation:**
- Must have account with fixed expenses pocket before creating sub-pockets
- Show current progress/completion status

### 4. Budget Planning View

**Workflow:**
1. Input field for total amount (typically salary)
2. Subtract total of enabled fixed expenses → show remaining
3. Distribution grid with entries:
   - Name (user-assigned)
   - Percentage (user-assigned)
   - Calculated amount (percentage of remaining)
4. All entries modifiable

**Example:**
```
Initial: 110
Fixed Expenses: 10
Remaining: 100
-----------------
| viajes | 50% | 50 |
| ahorros | 50% | 50 |
-----------------
```

### 5. Movements View

**Functionality:**
- Register new movements
- Edit all fields of existing movements
- Group by month (visual separation)
- Sort by `createdAt` (registration date), not `displayedDate`

**Movement Types:**
- `IngresoNormal` - Income to normal pockets
- `EgresoNormal` - Expense from normal pockets
- `IngresoFijo` - Income to fixed expense sub-pocket
- `EgresoFijo` - Expense from fixed expense sub-pocket
- `InvestmentIngreso` - Money to investment
- `InvestmentShares` - Shares to investment

**Fields:**
- Account (selection)
- Pocket (selection, or sub-pocket for fixed expenses)
- Amount
- Type (income/expense)
- Notes/comments
- Display date (user-assigned)
- Created date (auto, for sorting)

**Visual Organization:**
- Visual differentiation by type (colors/indicators/separate tables)
- Grouped by month:
  ```
  January:
    - 1/1/2025 | 10,000$ | comida | account_1 | pocket_1
    - 25/1/2025 | 120,000$ | cambio a telmex | fixed | tag_internet
  February:
    - 1/2/2025 | 25,000$ | comida | account_3 | pocket_2
  ```

### 6. Investments View (VOO)

**Display:**
- Total money invested (`montoInvertido`)
- Current shares owned (`shares`)
- Current percentage gain/loss (`gananciasPct`)
- Total gain/loss in USD (`gananciasUSD`)

**Functionality:**
- Register money input (as normal pocket income)
- Register shares input
- Cannot modify gains (calculated from external API)
- Uses `vooService.ts` to fetch current price from public API

## Multi-Currency Support

### Primary Currency Selection
- User selects primary currency in settings/config page
- All totals converted and summed in primary currency
- Conversion rates from external service (to be integrated)

### Currency Display
- Summary shows totals per currency
- Consolidated total in primary currency
- Account balances converted for display

## External Integrations (To Plan/Implement)

1. **Exchange Rate Service**
   - For multi-currency conversion
   - API integration needed

2. **Stock/Index Price Service**
   - For VOO and other indices
   - Real-time or periodic updates
   - Mock during development

## Technical Constraints

### Persistence
- **Initial:** Local storage (localStorage/IndexedDB)
- **Architecture:** Code written to easily migrate to other databases
- **Future:** Backend database integration

### Technology Stack
- **Frontend:** React + TypeScript
- **Future:** React Native for mobile (shared logic)

## Data Flow Principles

1. All financial changes flow through Movements
2. Balances are always calculated, never manually set
3. Fixed expenses have special handling and validation
4. Investment account is special type with external data dependency

