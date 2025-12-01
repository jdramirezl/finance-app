# Backend Migration - Comprehensive Implementation Guide

**Purpose**: Complete guide for migrating the finance app from frontend-only to a proper backend architecture  
**Target Audience**: AI assistant in planning mode for detailed iteration  
**Current Status**: Phase 0 complete, Phase 1 (Accounts) 20% done  
**Goal**: Progressive module-by-module migration with zero downtime

---

## 📋 Table of Contents

1. [Project Context](#project-context)
2. [Current Architecture](#current-architecture)
3. [Target Architecture](#target-architecture)
4. [Migration Strategy](#migration-strategy)
5. [Phase 0: Infrastructure (COMPLETE)](#phase-0-infrastructure-complete)
6. [Phase 1: Accounts Module (IN PROGRESS)](#phase-1-accounts-module-in-progress)
7. [Phase 2-6: Remaining Modules](#phase-2-6-remaining-modules)
8. [Technical Implementation Details](#technical-implementation-details)
9. [Testing Strategy](#testing-strategy)
10. [Deployment & Operations](#deployment--operations)
11. [Open Questions & Decisions](#open-questions--decisions)

---

## 📖 Project Context

### What is This Application?

A personal finance management web application built with:
- **Frontend**: React 19 + TypeScript + Vite + Tailwind CSS + Zustand
- **Current Backend**: Direct Supabase calls from frontend (no API layer)
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth

### Core Domain Concepts

1. **Accounts**: Financial containers (bank accounts, cash, investments)
   - Properties: name, color, currency, balance, type (normal/investment)
   - Business rule: Balance calculated from pocket balances
   - Uniqueness: name + currency combination

2. **Pockets**: Sub-containers within accounts
   - Types: normal or fixed (only one fixed pocket globally)
   - Properties: name, type, balance, currency (inherited from account)
   - Business rule: Fixed pocket balance = sum of sub-pocket balances
   - Uniqueness: name within an account

3. **SubPockets**: Only exist within the fixed expenses pocket
   - Properties: name, valueTotal, periodicityMonths, balance, enabled, groupId
   - Business rule: Monthly contribution = valueTotal / periodicityMonths
   - Can be grouped into FixedExpenseGroups for bi-weekly salary scenarios

4. **FixedExpenseGroups**: Grouping mechanism for sub-pockets
   - Properties: name, color
   - Purpose: Organize expenses by payment period (e.g., "First Payment", "Second Payment")
   - Sub-pockets can be moved between groups

5. **Movements**: All financial transactions
   - Types: IngresoNormal, EgresoNormal, IngresoFijo, EgresoFijo
   - Properties: type, accountId, pocketId, subPocketId, amount, notes, displayedDate, isPending, isOrphaned
   - Business rule: Balance = sum of movements (income - expenses)
   - Orphaned movements: Soft-deleted when account/pocket deleted, can be restored

6. **Investments**: Special account type for tracking stocks
   - Properties: stockSymbol, shares, montoInvertido, precioActual
   - Balance calculation: shares × current price
   - Price caching: 3-tier (local → database → API)

7. **Settings**: Global app configuration
   - Primary currency selection
   - API keys (Alpha Vantage for stock prices)

8. **Movement Templates**: Reusable transaction templates
   - Quick-create movements with predefined values

### Key Business Rules

1. **Balance Calculation Hierarchy**
   - Movement → SubPocket balance
   - SubPocket balances → Fixed Pocket balance
   - Pocket balances → Account balance
   - All balances calculated, never set directly

2. **Uniqueness Constraints**
   - Account: name + currency must be unique per user
   - Pocket: name must be unique within account
   - Only ONE fixed expenses pocket globally

3. **Cascade Behavior**
   - Delete account → orphan movements (soft delete) OR hard delete movements
   - Delete pocket → orphan movements (soft delete)
   - Delete sub-pocket → must have no movements

4. **Investment Accounts**
   - Cannot have fixed expenses pockets
   - Balance = shares × current stock price
   - Special pockets: "Shares" and "Invested Money"

5. **Orphaned Movements**
   - Preserved for audit/restoration
   - Store original account/pocket names for matching
   - Can be restored to new account/pocket with same name+currency

---

## 🏗️ Current Architecture

### Frontend Structure

```
src/
├── components/          # Reusable UI components
├── pages/              # Route-based page components
├── services/           # Business logic + Supabase calls
│   ├── accountService.ts
│   ├── pocketService.ts
│   ├── subPocketService.ts
│   ├── movementService.ts
│   ├── investmentService.ts
│   ├── currencyService.ts
│   ├── fixedExpenseGroupService.ts
│   ├── movementTemplateService.ts
│   └── supabaseStorageService.ts  # Direct Supabase client
├── store/              # Zustand state management
│   └── useFinanceStore.ts
├── types/              # TypeScript type definitions
└── utils/              # Utility functions
```

### Current Data Flow

```
User Action → Page Component → Store Action → Service → SupabaseStorageService → Supabase
                                    ↓
                              State Update → Re-render
```

### Problems with Current Architecture

1. **No API Layer**: Frontend directly calls Supabase
2. **Business Logic in Frontend**: Validation, calculations in services
3. **No Backend Validation**: Trust frontend completely
4. **Difficult to Scale**: Can't add mobile app easily
5. **No Centralized Logging**: Hard to debug production issues
6. **No Rate Limiting**: Vulnerable to abuse
7. **Tight Coupling**: Frontend knows database schema

---

## 🎯 Target Architecture

### Backend Structure (Clean Architecture)

```
backend/
├── src/
│   ├── modules/                    # Domain modules (DDD)
│   │   ├── accounts/
│   │   │   ├── domain/            # Entities, value objects, domain logic
│   │   │   │   ├── Account.ts
│   │   │   │   └── AccountDomainService.ts
│   │   │   ├── application/       # Use cases, DTOs
│   │   │   │   ├── useCases/
│   │   │   │   │   ├── CreateAccountUseCase.ts
│   │   │   │   │   ├── GetAllAccountsUseCase.ts
│   │   │   │   │   ├── UpdateAccountUseCase.ts
│   │   │   │   │   ├── DeleteAccountUseCase.ts
│   │   │   │   │   └── DeleteAccountCascadeUseCase.ts
│   │   │   │   └── dtos/
│   │   │   │       ├── CreateAccountDTO.ts
│   │   │   │       ├── UpdateAccountDTO.ts
│   │   │   │       └── AccountResponseDTO.ts
│   │   │   ├── infrastructure/    # Repositories, external services
│   │   │   │   ├── IAccountRepository.ts
│   │   │   │   ├── SupabaseAccountRepository.ts
│   │   │   │   └── AccountMapper.ts
│   │   │   └── presentation/      # Controllers, routes
│   │   │       ├── AccountController.ts
│   │   │       └── routes.ts
│   │   ├── pockets/
│   │   ├── movements/
│   │   ├── fixed-expenses/
│   │   └── investments/
│   ├── shared/                    # Shared infrastructure
│   │   ├── database/
│   │   │   └── supabase.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── errorHandler.ts
│   │   │   └── validation.ts
│   │   ├── utils/
│   │   └── container.ts           # DI container
│   └── server.ts                  # Express app
```

### Target Data Flow

```
User Action → Page → Store → Service (with feature flag)
                                ↓
                          Backend API? ──Yes──→ HTTP Request → Backend
                                ↓                                  ↓
                               No                            Controller
                                ↓                                  ↓
                          Supabase Direct                    Use Case
                                                                   ↓
                                                             Repository
                                                                   ↓
                                                              Supabase
```

### Architecture Layers Explained

**1. Domain Layer** (Core Business Logic)
- Pure TypeScript classes
- No dependencies on infrastructure
- Contains entities, value objects, domain services
- Enforces business rules and invariants
- Example: Account entity validates name, color, currency

**2. Application Layer** (Use Cases)
- Orchestrates domain logic
- Defines DTOs for input/output
- Transaction boundaries
- Example: CreateAccountUseCase validates uniqueness, creates entity, saves via repository

**3. Infrastructure Layer** (External Dependencies)
- Implements repository interfaces
- Database access (Supabase)
- External APIs (stock prices, exchange rates)
- Mappers (domain ↔ persistence ↔ DTO)

**4. Presentation Layer** (HTTP Interface)
- Controllers handle HTTP requests
- Route definitions
- Request/response validation
- Error handling

---

## 🚀 Migration Strategy

### Progressive Module Migration

**Key Principle**: Migrate one module at a time, validate, then move to next

### Feature Flag System

```typescript
// Frontend .env
VITE_USE_BACKEND_ACCOUNTS=true
VITE_USE_BACKEND_POCKETS=false
VITE_USE_BACKEND_MOVEMENTS=false

// Frontend service
class AccountService {
  private useBackend = import.meta.env.VITE_USE_BACKEND_ACCOUNTS === 'true';
  
  async getAll(): Promise<Account[]> {
    if (this.useBackend) {
      return apiClient.get<Account[]>('/api/accounts');
    } else {
      return SupabaseStorageService.getAccounts(); // Fallback
    }
  }
}
```

### Migration Phases

1. **Phase 0**: Infrastructure setup (COMPLETE)
2. **Phase 1**: Accounts module (IN PROGRESS - 20%)
3. **Phase 2**: Pockets module
4. **Phase 3**: SubPockets & Fixed Expenses module
5. **Phase 4**: Movements module
6. **Phase 5**: Investments module
7. **Phase 6**: Settings & Currency module

### Rollback Strategy

- Feature flags allow instant rollback
- Keep Supabase fallback code during migration
- Monitor error rates per module
- Gradual rollout: dev → staging → production (10% → 50% → 100%)

---

## ✅ Phase 0: Infrastructure (COMPLETE)

### What Was Built

1. **Backend Server**
   - Express.js with TypeScript
   - Running on port 3001
   - CORS configured for frontend (port 5173)
   - Security middleware (helmet)
   - Compression enabled
   - Health check endpoint: `GET /health`
   - API info endpoint: `GET /api`

2. **Workspace Configuration**
   - Monorepo with npm workspaces
   - Root package.json manages all packages
   - Shared dependencies
   - Scripts: `npm run dev:backend`, `npm run dev:frontend`

3. **Shared Types Package**
   - Located in `shared/types/`
   - Copied from frontend types
   - Available to both frontend and backend
   - Includes: Account, Pocket, SubPocket, Movement, etc.

4. **Frontend API Client**
   - File: `src/services/apiClient.ts`
   - Methods: GET, POST, PUT, DELETE
   - Authentication: Passes Supabase token in headers
   - Error handling: Throws typed errors
   - Base URL: `http://localhost:3001` (configurable via env)

5. **Dependency Injection Setup**
   - Using tsyringe
   - Container configuration in `backend/src/shared/container.ts`
   - Ready for registering repositories, use cases, controllers

6. **Error Handling**
   - Custom error classes: AppError, ValidationError, ConflictError, NotFoundError
   - Global error handler middleware
   - Proper HTTP status codes

### Files Created in Phase 0

```
backend/
├── src/
│   ├── shared/
│   │   ├── database/
│   │   │   └── supabase.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts
│   │   │   ├── errorHandler.ts
│   │   │   └── cors.ts
│   │   ├── utils/
│   │   │   └── errors.ts
│   │   └── container.ts
│   ├── modules/                    # Empty, ready for Phase 1+
│   └── server.ts
├── package.json
├── tsconfig.json
├── .env.example
└── .env

shared/
├── types/
│   └── index.ts                    # All domain types
├── api-contracts/                  # Empty, ready for DTOs
└── package.json

frontend/
└── src/
    └── services/
        └── apiClient.ts            # NEW: HTTP client for backend
```

### Testing Phase 0

```bash
# Start backend
npm run dev:backend

# Test health check
curl http://localhost:3001/health
# Response: {"status":"ok","timestamp":"...","uptime":123}

# Test API info
curl http://localhost:3001/api
# Response: {"message":"Finance App Backend API","version":"1.0.0"}
```

### Commit
- `51c3f36` - feat: Phase 0 - Backend infrastructure setup

---

## 🚧 Phase 1: Accounts Module (IN PROGRESS - 20%)

### Current Status

**✅ Completed:**
- Domain layer: Account entity with business rules
- Started application layer: AccountDTO and CreateAccountUseCase skeleton

**❌ Missing:**
- Complete all use cases
- Infrastructure layer (repository)
- Presentation layer (controller, routes)
- Frontend adapter
- Testing
- Feature flag implementation

### What Exists Now

```typescript
// backend/src/modules/accounts/domain/Account.ts
export class Account {
  constructor(
    public readonly id: string,
    public name: string,
    public color: string,
    public currency: Currency,
    private _balance: number,
    public type: 'normal' | 'investment' = 'normal',
    public stockSymbol?: string,
    public montoInvertido?: number,
    public shares?: number,
    public displayOrder?: number
  ) {
    this.validate();
  }

  private validate(): void {
    if (!this.name?.trim()) throw new Error('Account name cannot be empty');
    if (!this.color?.match(/^#[0-9A-Fa-f]{6}$/)) throw new Error('Invalid color');
    if (this.type === 'investment' && !this.stockSymbol) {
      throw new Error('Investment accounts must have stock symbol');
    }
  }

  get balance(): number { return this._balance; }
  updateBalance(newBalance: number): void { this._balance = newBalance; }
  update(name?: string, color?: string, currency?: Currency): void { /* ... */ }
  isInvestment(): boolean { return this.type === 'investment'; }
  toJSON() { /* ... */ }
}
```

### Complete Implementation Needed for Phase 1

#### 1. Application Layer - Use Cases

**CreateAccountUseCase.ts**
```typescript
@injectable()
export class CreateAccountUseCase {
  constructor(
    @inject('AccountRepository') private repo: IAccountRepository,
    @inject('PocketRepository') private pocketRepo: IPocketRepository
  ) {}

  async execute(dto: CreateAccountDTO): Promise<AccountResponseDTO> {
    // 1. Validate input
    if (!dto.name?.trim()) throw new ValidationError('Name required');
    if (!dto.color?.match(/^#[0-9A-Fa-f]{6}$/)) throw new ValidationError('Invalid color');
    
    // 2. Check uniqueness (name + currency)
    const exists = await this.repo.existsByNameAndCurrency(dto.name, dto.currency);
    if (exists) throw new ConflictError('Account with this name and currency exists');
    
    // 3. Create domain entity
    const account = new Account(
      generateId(),
      dto.name,
      dto.color,
      dto.currency,
      0, // Initial balance
      dto.type || 'normal',
      dto.stockSymbol,
      dto.montoInvertido,
      dto.shares
    );
    
    // 4. For investment accounts, create default pockets
    if (account.isInvestment()) {
      // Create "Shares" and "Invested Money" pockets
      // This matches current frontend behavior
    }
    
    // 5. Save to database
    await this.repo.save(account);
    
    // 6. Return DTO
    return AccountMapper.toResponseDTO(account);
  }
}
```

**GetAllAccountsUseCase.ts**
```typescript
@injectable()
export class GetAllAccountsUseCase {
  constructor(
    @inject('AccountRepository') private repo: IAccountRepository,
    @inject('PocketRepository') private pocketRepo: IPocketRepository,
    @inject('InvestmentService') private investmentService: IInvestmentService
  ) {}

  async execute(userId: string, skipInvestmentPrices = false): Promise<AccountResponseDTO[]> {
    // 1. Get all accounts for user
    const accounts = await this.repo.findAllByUserId(userId);
    
    // 2. For each account, calculate balance
    for (const account of accounts) {
      if (account.isInvestment() && !skipInvestmentPrices) {
        // Calculate from shares × current price
        const price = await this.investmentService.getCurrentPrice(account.stockSymbol!);
        account.updateBalance(account.shares! * price);
      } else {
        // Calculate from pocket balances
        const pockets = await this.pocketRepo.findByAccountId(account.id);
        const balance = pockets.reduce((sum, p) => sum + p.balance, 0);
        account.updateBalance(balance);
      }
    }
    
    // 3. Sort by displayOrder
    accounts.sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
    
    // 4. Return DTOs
    return accounts.map(AccountMapper.toResponseDTO);
  }
}
```

**GetAccountByIdUseCase.ts**
```typescript
@injectable()
export class GetAccountByIdUseCase {
  constructor(@inject('AccountRepository') private repo: IAccountRepository) {}

  async execute(id: string, userId: string): Promise<AccountResponseDTO> {
    const account = await this.repo.findById(id);
    
    if (!account) throw new NotFoundError('Account not found');
    
    // Verify ownership
    if (account.userId !== userId) throw new ForbiddenError('Access denied');
    
    return AccountMapper.toResponseDTO(account);
  }
}
```

**UpdateAccountUseCase.ts**
```typescript
@injectable()
export class UpdateAccountUseCase {
  constructor(@inject('AccountRepository') private repo: IAccountRepository) {}

  async execute(id: string, dto: UpdateAccountDTO, userId: string): Promise<AccountResponseDTO> {
    // 1. Get existing account
    const account = await this.repo.findById(id);
    if (!account) throw new NotFoundError('Account not found');
    if (account.userId !== userId) throw new ForbiddenError('Access denied');
    
    // 2. Check uniqueness if name/currency changed
    if (dto.name || dto.currency) {
      const newName = dto.name || account.name;
      const newCurrency = dto.currency || account.currency;
      
      if (newName !== account.name || newCurrency !== account.currency) {
        const exists = await this.repo.existsByNameAndCurrency(newName, newCurrency, id);
        if (exists) throw new ConflictError('Account with this name and currency exists');
      }
    }
    
    // 3. Update entity
    account.update(dto.name, dto.color, dto.currency);
    
    // 4. Save
    await this.repo.update(account);
    
    return AccountMapper.toResponseDTO(account);
  }
}
```

**DeleteAccountUseCase.ts**
```typescript
@injectable()
export class DeleteAccountUseCase {
  constructor(
    @inject('AccountRepository') private repo: IAccountRepository,
    @inject('PocketRepository') private pocketRepo: IPocketRepository
  ) {}

  async execute(id: string, userId: string): Promise<void> {
    const account = await this.repo.findById(id);
    if (!account) throw new NotFoundError('Account not found');
    if (account.userId !== userId) throw new ForbiddenError('Access denied');
    
    // Check for pockets
    const pockets = await this.pocketRepo.findByAccountId(id);
    if (pockets.length > 0) {
      throw new ConflictError(`Cannot delete account with ${pockets.length} pocket(s)`);
    }
    
    await this.repo.delete(id);
  }
}
```

**DeleteAccountCascadeUseCase.ts**
```typescript
@injectable()
export class DeleteAccountCascadeUseCase {
  constructor(
    @inject('AccountRepository') private accountRepo: IAccountRepository,
    @inject('PocketRepository') private pocketRepo: IPocketRepository,
    @inject('SubPocketRepository') private subPocketRepo: ISubPocketRepository,
    @inject('MovementRepository') private movementRepo: IMovementRepository
  ) {}

  async execute(
    id: string, 
    userId: string, 
    deleteMovements = false
  ): Promise<CascadeDeleteResultDTO> {
    const account = await this.accountRepo.findById(id);
    if (!account) throw new NotFoundError('Account not found');
    if (account.userId !== userId) throw new ForbiddenError('Access denied');
    
    // Get all related data
    const pockets = await this.pocketRepo.findByAccountId(id);
    const pocketIds = pockets.map(p => p.id);
    
    let subPocketCount = 0;
    let movementCount = 0;
    
    // Delete sub-pockets (for fixed pocket)
    for (const pocket of pockets) {
      if (pocket.type === 'fixed') {
        const subPockets = await this.subPocketRepo.findByPocketId(pocket.id);
        subPocketCount += subPockets.length;
        for (const sp of subPockets) {
          await this.subPocketRepo.delete(sp.id);
        }
      }
    }
    
    // Handle movements
    if (deleteMovements) {
      // Hard delete
      movementCount = await this.movementRepo.deleteByAccountId(id);
    } else {
      // Soft delete (mark as orphaned)
      movementCount = await this.movementRepo.markAsOrphanedByAccountId(id);
    }
    
    // Delete pockets
    for (const pocket of pockets) {
      await this.pocketRepo.delete(pocket.id);
    }
    
    // Delete account
    await this.accountRepo.delete(id);
    
    return {
      account: account.name,
      pockets: pockets.length,
      subPockets: subPocketCount,
      movements: movementCount
    };
  }
}
```

**ReorderAccountsUseCase.ts**
```typescript
@injectable()
export class ReorderAccountsUseCase {
  constructor(@inject('AccountRepository') private repo: IAccountRepository) {}

  async execute(accountIds: string[], userId: string): Promise<void> {
    // Verify all accounts belong to user
    const accounts = await this.repo.findByIds(accountIds);
    
    if (accounts.length !== accountIds.length) {
      throw new ValidationError('Some accounts not found');
    }
    
    if (accounts.some(a => a.userId !== userId)) {
      throw new ForbiddenError('Access denied');
    }
    
    // Update display order
    for (let i = 0; i < accountIds.length; i++) {
      const account = accounts.find(a => a.id === accountIds[i])!;
      account.displayOrder = i;
      await this.repo.update(account);
    }
  }
}
```

#### 2. Application Layer - DTOs

**CreateAccountDTO.ts**
```typescript
export interface CreateAccountDTO {
  name: string;
  color: string;
  currency: Currency;
  type?: 'normal' | 'investment';
  stockSymbol?: string;
  montoInvertido?: number;
  shares?: number;
}
```

**UpdateAccountDTO.ts**
```typescript
export interface UpdateAccountDTO {
  name?: string;
  color?: string;
  currency?: Currency;
}
```

**AccountResponseDTO.ts**
```typescript
export interface AccountResponseDTO {
  id: string;
  name: string;
  color: string;
  currency: Currency;
  balance: number;
  type: 'normal' | 'investment';
  stockSymbol?: string;
  montoInvertido?: number;
  shares?: number;
  displayOrder?: number;
}
```

**CascadeDeleteResultDTO.ts**
```typescript
export interface CascadeDeleteResultDTO {
  account: string;
  pockets: number;
  subPockets: number;
  movements: number;
}
```

#### 3. Infrastructure Layer - Repository Interface

**IAccountRepository.ts**
```typescript
export interface IAccountRepository {
  // Create
  save(account: Account): Promise<void>;
  
  // Read
  findById(id: string): Promise<Account | null>;
  findAllByUserId(userId: string): Promise<Account[]>;
  findByIds(ids: string[]): Promise<Account[]>;
  existsByNameAndCurrency(name: string, currency: Currency, excludeId?: string): Promise<boolean>;
  
  // Update
  update(account: Account): Promise<void>;
  
  // Delete
  delete(id: string): Promise<void>;
}
```

#### 4. Infrastructure Layer - Repository Implementation

**SupabaseAccountRepository.ts**
```typescript
@injectable()
export class SupabaseAccountRepository implements IAccountRepository {
  constructor(@inject('SupabaseClient') private supabase: SupabaseClient) {}

  async save(account: Account): Promise<void> {
    const data = AccountMapper.toPersistence(account);
    
    const { error } = await this.supabase
      .from('accounts')
      .insert(data);
    
    if (error) throw new DatabaseError(error.message);
  }

  async findById(id: string): Promise<Account | null> {
    const { data, error } = await this.supabase
      .from('accounts')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) return null;
    return AccountMapper.toDomain(data);
  }

  async findAllByUserId(userId: string): Promise<Account[]> {
    const { data, error } = await this.supabase
      .from('accounts')
      .select('*')
      .eq('user_id', userId)
      .order('display_order', { ascending: true });
    
    if (error) throw new DatabaseError(error.message);
    return data.map(AccountMapper.toDomain);
  }

  async findByIds(ids: string[]): Promise<Account[]> {
    const { data, error } = await this.supabase
      .from('accounts')
      .select('*')
      .in('id', ids);
    
    if (error) throw new DatabaseError(error.message);
    return data.map(AccountMapper.toDomain);
  }

  async existsByNameAndCurrency(
    name: string, 
    currency: Currency, 
    excludeId?: string
  ): Promise<boolean> {
    let query = this.supabase
      .from('accounts')
      .select('id')
      .eq('name', name)
      .eq('currency', currency);
    
    if (excludeId) {
      query = query.neq('id', excludeId);
    }
    
    const { data, error } = await query.limit(1);
    
    if (error) throw new DatabaseError(error.message);
    return data.length > 0;
  }

  async update(account: Account): Promise<void> {
    const data = AccountMapper.toPersistence(account);
    
    const { error } = await this.supabase
      .from('accounts')
      .update(data)
      .eq('id', account.id);
    
    if (error) throw new DatabaseError(error.message);
  }

  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('accounts')
      .delete()
      .eq('id', id);
    
    if (error) throw new DatabaseError(error.message);
  }
}
```

#### 5. Infrastructure Layer - Mapper

**AccountMapper.ts**
```typescript
export class AccountMapper {
  // Domain entity → Database row
  static toPersistence(account: Account): any {
    return {
      id: account.id,
      name: account.name,
      color: account.color,
      currency: account.currency,
      balance: account.balance,
      type: account.type,
      stock_symbol: account.stockSymbol,
      monto_invertido: account.montoInvertido,
      shares: account.shares,
      display_order: account.displayOrder,
    };
  }

  // Database row → Domain entity
  static toDomain(raw: any): Account {
    return new Account(
      raw.id,
      raw.name,
      raw.color,
      raw.currency,
      raw.balance,
      raw.type || 'normal',
      raw.stock_symbol,
      raw.monto_invertido,
      raw.shares,
      raw.display_order
    );
  }

  // Domain entity → Response DTO
  static toResponseDTO(account: Account): AccountResponseDTO {
    return {
      id: account.id,
      name: account.name,
      color: account.color,
      currency: account.currency,
      balance: account.balance,
      type: account.type,
      stockSymbol: account.stockSymbol,
      montoInvertido: account.montoInvertido,
      shares: account.shares,
      displayOrder: account.displayOrder,
    };
  }
}
```

#### 6. Presentation Layer - Controller

**AccountController.ts**
```typescript
@injectable()
export class AccountController {
  constructor(
    @inject(CreateAccountUseCase) private createUseCase: CreateAccountUseCase,
    @inject(GetAllAccountsUseCase) private getAllUseCase: GetAllAccountsUseCase,
    @inject(GetAccountByIdUseCase) private getByIdUseCase: GetAccountByIdUseCase,
    @inject(UpdateAccountUseCase) private updateUseCase: UpdateAccountUseCase,
    @inject(DeleteAccountUseCase) private deleteUseCase: DeleteAccountUseCase,
    @inject(DeleteAccountCascadeUseCase) private cascadeUseCase: DeleteAccountCascadeUseCase,
    @inject(ReorderAccountsUseCase) private reorderUseCase: ReorderAccountsUseCase
  ) {}

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = req.body as CreateAccountDTO;
      const userId = req.user!.id;
      
      const result = await this.createUseCase.execute(dto);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const skipInvestmentPrices = req.query.skipInvestmentPrices === 'true';
      
      const accounts = await this.getAllUseCase.execute(userId, skipInvestmentPrices);
      res.json(accounts);
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      
      const account = await this.getByIdUseCase.execute(id, userId);
      res.json(account);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const dto = req.body as UpdateAccountDTO;
      const userId = req.user!.id;
      
      const result = await this.updateUseCase.execute(id, dto, userId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      
      await this.deleteUseCase.execute(id, userId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async deleteCascade(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const deleteMovements = req.body.deleteMovements === true;
      
      const result = await this.cascadeUseCase.execute(id, userId, deleteMovements);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async reorder(req: Request, res: Response, next: NextFunction) {
    try {
      const { accountIds } = req.body;
      const userId = req.user!.id;
      
      await this.reorderUseCase.execute(accountIds, userId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
```

#### 7. Presentation Layer - Routes

**routes.ts**
```typescript
import { Router } from 'express';
import { container } from 'tsyringe';
import { authMiddleware } from '../../../shared/middleware/auth';
import { AccountController } from './AccountController';

export function createAccountRoutes(): Router {
  const router = Router();
  const controller = container.resolve(AccountController);

  // All routes require authentication
  router.use(authMiddleware);

  // POST /api/accounts - Create account
  router.post('/', (req, res, next) => controller.create(req, res, next));

  // GET /api/accounts - Get all accounts
  router.get('/', (req, res, next) => controller.getAll(req, res, next));

  // GET /api/accounts/:id - Get account by ID
  router.get('/:id', (req, res, next) => controller.getById(req, res, next));

  // PUT /api/accounts/:id - Update account
  router.put('/:id', (req, res, next) => controller.update(req, res, next));

  // DELETE /api/accounts/:id - Delete account (requires no pockets)
  router.delete('/:id', (req, res, next) => controller.delete(req, res, next));

  // POST /api/accounts/:id/cascade - Delete account with all data
  router.post('/:id/cascade', (req, res, next) => controller.deleteCascade(req, res, next));

  // POST /api/accounts/reorder - Reorder accounts
  router.post('/reorder', (req, res, next) => controller.reorder(req, res, next));

  return router;
}
```

**Register in server.ts**
```typescript
// backend/src/server.ts
import { createAccountRoutes } from './modules/accounts/presentation/routes';

// ... other imports

app.use('/api/accounts', createAccountRoutes());
```

#### 8. Dependency Injection Configuration

**container.ts**
```typescript
// backend/src/shared/container.ts
import { container } from 'tsyringe';
import { createClient } from '@supabase/supabase-js';

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);
container.registerInstance('SupabaseClient', supabase);

// Account module
container.register('AccountRepository', { 
  useClass: SupabaseAccountRepository 
});
container.register(CreateAccountUseCase, { useClass: CreateAccountUseCase });
container.register(GetAllAccountsUseCase, { useClass: GetAllAccountsUseCase });
container.register(GetAccountByIdUseCase, { useClass: GetAccountByIdUseCase });
container.register(UpdateAccountUseCase, { useClass: UpdateAccountUseCase });
container.register(DeleteAccountUseCase, { useClass: DeleteAccountUseCase });
container.register(DeleteAccountCascadeUseCase, { useClass: DeleteAccountCascadeUseCase });
container.register(ReorderAccountsUseCase, { useClass: ReorderAccountsUseCase });
container.register(AccountController, { useClass: AccountController });
```

#### 9. Frontend Adapter

**Update accountService.ts**
```typescript
// frontend/src/services/accountService.ts
import { apiClient } from './apiClient';
import { SupabaseStorageService } from './supabaseStorageService';
import type { Account, Currency } from '../types';

class AccountService {
  private useBackend = import.meta.env.VITE_USE_BACKEND_ACCOUNTS === 'true';

  async getAllAccounts(): Promise<Account[]> {
    if (this.useBackend) {
      try {
        return await apiClient.get<Account[]>('/api/accounts');
      } catch (error) {
        console.error('Backend call failed, falling back to Supabase:', error);
        return await SupabaseStorageService.getAccounts();
      }
    }
    return await SupabaseStorageService.getAccounts();
  }

  async getAccount(id: string): Promise<Account | null> {
    if (this.useBackend) {
      try {
        return await apiClient.get<Account>(`/api/accounts/${id}`);
      } catch (error) {
        console.error('Backend call failed, falling back to Supabase:', error);
        const accounts = await SupabaseStorageService.getAccounts();
        return accounts.find(a => a.id === id) || null;
      }
    }
    const accounts = await SupabaseStorageService.getAccounts();
    return accounts.find(a => a.id === id) || null;
  }

  async createAccount(
    name: string,
    color: string,
    currency: Currency,
    type: Account['type'] = 'normal',
    stockSymbol?: string
  ): Promise<Account> {
    if (this.useBackend) {
      try {
        return await apiClient.post<Account>('/api/accounts', {
          name,
          color,
          currency,
          type,
          stockSymbol,
        });
      } catch (error) {
        console.error('Backend call failed, falling back to Supabase:', error);
        // Fallback to old implementation
        return await this.createAccountDirect(name, color, currency, type, stockSymbol);
      }
    }
    return await this.createAccountDirect(name, color, currency, type, stockSymbol);
  }

  async updateAccount(
    id: string,
    updates: Partial<Pick<Account, 'name' | 'color' | 'currency'>>
  ): Promise<Account> {
    if (this.useBackend) {
      try {
        return await apiClient.put<Account>(`/api/accounts/${id}`, updates);
      } catch (error) {
        console.error('Backend call failed, falling back to Supabase:', error);
        return await this.updateAccountDirect(id, updates);
      }
    }
    return await this.updateAccountDirect(id, updates);
  }

  async deleteAccount(id: string): Promise<void> {
    if (this.useBackend) {
      try {
        await apiClient.delete(`/api/accounts/${id}`);
        return;
      } catch (error) {
        console.error('Backend call failed, falling back to Supabase:', error);
        await this.deleteAccountDirect(id);
      }
    }
    await this.deleteAccountDirect(id);
  }

  async deleteAccountCascade(
    id: string,
    deleteMovements = false
  ): Promise<{ account: string; pockets: number; subPockets: number; movements: number }> {
    if (this.useBackend) {
      try {
        return await apiClient.post(`/api/accounts/${id}/cascade`, { deleteMovements });
      } catch (error) {
        console.error('Backend call failed, falling back to Supabase:', error);
        return await this.deleteAccountCascadeDirect(id, deleteMovements);
      }
    }
    return await this.deleteAccountCascadeDirect(id, deleteMovements);
  }

  async reorderAccounts(accounts: Account[]): Promise<void> {
    if (this.useBackend) {
      try {
        const accountIds = accounts.map(a => a.id);
        await apiClient.post('/api/accounts/reorder', { accountIds });
        return;
      } catch (error) {
        console.error('Backend call failed, falling back to Supabase:', error);
        await this.reorderAccountsDirect(accounts);
      }
    }
    await this.reorderAccountsDirect(accounts);
  }

  // Keep old direct Supabase methods as fallback
  private async createAccountDirect(...) { /* existing code */ }
  private async updateAccountDirect(...) { /* existing code */ }
  private async deleteAccountDirect(...) { /* existing code */ }
  private async deleteAccountCascadeDirect(...) { /* existing code */ }
  private async reorderAccountsDirect(...) { /* existing code */ }
}

export const accountService = new AccountService();
```

**Environment Variable**
```bash
# frontend/.env
VITE_USE_BACKEND_ACCOUNTS=true  # Enable backend for accounts
VITE_API_URL=http://localhost:3001
```

#### 10. Testing

**Unit Tests - CreateAccountUseCase.test.ts**
```typescript
describe('CreateAccountUseCase', () => {
  let useCase: CreateAccountUseCase;
  let mockRepo: jest.Mocked<IAccountRepository>;
  let mockPocketRepo: jest.Mocked<IPocketRepository>;

  beforeEach(() => {
    mockRepo = {
      save: jest.fn(),
      existsByNameAndCurrency: jest.fn(),
    } as any;
    mockPocketRepo = {} as any;
    useCase = new CreateAccountUseCase(mockRepo, mockPocketRepo);
  });

  it('should create account successfully', async () => {
    mockRepo.existsByNameAndCurrency.mockResolvedValue(false);
    
    const dto = { name: 'Test', color: '#ffffff', currency: 'USD' as Currency };
    const result = await useCase.execute(dto);
    
    expect(result.name).toBe('Test');
    expect(mockRepo.save).toHaveBeenCalled();
  });

  it('should throw ValidationError for empty name', async () => {
    const dto = { name: '', color: '#ffffff', currency: 'USD' as Currency };
    
    await expect(useCase.execute(dto)).rejects.toThrow(ValidationError);
  });

  it('should throw ConflictError if account exists', async () => {
    mockRepo.existsByNameAndCurrency.mockResolvedValue(true);
    
    const dto = { name: 'Test', color: '#ffffff', currency: 'USD' as Currency };
    
    await expect(useCase.execute(dto)).rejects.toThrow(ConflictError);
  });
});
```

**Integration Tests - AccountController.test.ts**
```typescript
describe('AccountController Integration', () => {
  let app: Express;
  let authToken: string;

  beforeAll(async () => {
    // Setup test database
    // Get auth token
  });

  describe('POST /api/accounts', () => {
    it('should create account', async () => {
      const response = await request(app)
        .post('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Test Account',
          color: '#3b82f6',
          currency: 'USD'
        });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Test Account');
    });

    it('should return 401 without auth', async () => {
      const response = await request(app)
        .post('/api/accounts')
        .send({ name: 'Test', color: '#fff', currency: 'USD' });

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/accounts', () => {
    it('should return all accounts', async () => {
      const response = await request(app)
        .get('/api/accounts')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});
```

---

## 📋 Phase 2-6: Remaining Modules

### Phase 2: Pockets Module

**Domain Entities:**
- Pocket entity with type (normal/fixed)
- Business rules: balance calculation, uniqueness within account

**Use Cases:**
- CreatePocketUseCase
- GetPocketsByAccountUseCase
- UpdatePocketUseCase
- DeletePocketUseCase
- MigrateFixedPocketToAccountUseCase (NEW - recently implemented in frontend)
- ReorderPocketsUseCase

**Special Considerations:**
- Only one fixed pocket globally
- Investment accounts cannot have fixed pockets
- Pocket migration must update all movements

**API Endpoints:**
```
POST   /api/pockets
GET    /api/pockets?accountId=xxx
GET    /api/pockets/:id
PUT    /api/pockets/:id
DELETE /api/pockets/:id
POST   /api/pockets/:id/migrate
POST   /api/pockets/reorder
```

### Phase 3: SubPockets & Fixed Expenses Module

**Domain Entities:**
- SubPocket entity
- FixedExpenseGroup entity

**Use Cases:**
- CreateSubPocketUseCase
- GetSubPocketsByPocketUseCase
- GetSubPocketsByGroupUseCase
- UpdateSubPocketUseCase
- DeleteSubPocketUseCase
- ToggleSubPocketEnabledUseCase
- MoveSubPocketToGroupUseCase
- CreateFixedExpenseGroupUseCase
- UpdateFixedExpenseGroupUseCase
- DeleteFixedExpenseGroupUseCase
- ToggleFixedExpenseGroupUseCase

**Special Considerations:**
- Sub-pockets only exist in fixed pocket
- Monthly contribution calculation: valueTotal / periodicityMonths
- Groups for organizing by payment period
- Deleting group moves sub-pockets to default group

**API Endpoints:**
```
POST   /api/sub-pockets
GET    /api/sub-pockets?pocketId=xxx
GET    /api/sub-pockets?groupId=xxx
PUT    /api/sub-pockets/:id
DELETE /api/sub-pockets/:id
POST   /api/sub-pockets/:id/toggle
POST   /api/sub-pockets/:id/move-to-group
POST   /api/sub-pockets/reorder

POST   /api/fixed-expense-groups
GET    /api/fixed-expense-groups
PUT    /api/fixed-expense-groups/:id
DELETE /api/fixed-expense-groups/:id
POST   /api/fixed-expense-groups/:id/toggle
```

### Phase 4: Movements Module

**Domain Entities:**
- Movement entity
- MovementType value object

**Use Cases:**
- CreateMovementUseCase
- GetMovementsByAccountUseCase
- GetMovementsByPocketUseCase
- GetMovementsByMonthUseCase
- GetPendingMovementsUseCase
- GetOrphanedMovementsUseCase
- UpdateMovementUseCase
- DeleteMovementUseCase
- ApplyPendingMovementUseCase
- MarkAsPendingUseCase
- RestoreOrphanedMovementsUseCase
- RecalculateBalancesUseCase

**Special Considerations:**
- Movements affect balances (must recalculate)
- Pending movements don't affect balances
- Orphaned movements (soft delete) for restoration
- Pagination for large datasets
- Grouping by month for UI

**API Endpoints:**
```
POST   /api/movements
GET    /api/movements?accountId=xxx
GET    /api/movements?pocketId=xxx
GET    /api/movements?month=2024-11
GET    /api/movements/pending
GET    /api/movements/orphaned
GET    /api/movements/:id
PUT    /api/movements/:id
DELETE /api/movements/:id
POST   /api/movements/:id/apply
POST   /api/movements/:id/mark-pending
POST   /api/movements/restore-orphaned
```

### Phase 5: Investments Module

**Domain Entities:**
- InvestmentAccount (extends Account)
- StockPrice value object

**Use Cases:**
- GetCurrentStockPriceUseCase
- UpdateInvestmentAccountUseCase
- CacheStockPriceUseCase

**Special Considerations:**
- 3-tier caching: local → database → API
- Alpha Vantage API integration
- Price updates affect account balance
- Cache expiration (24 hours)

**API Endpoints:**
```
GET    /api/investments/:accountId/price
POST   /api/investments/:accountId/update
GET    /api/investments/prices/:symbol
```

### Phase 6: Settings & Currency Module

**Domain Entities:**
- Settings entity
- ExchangeRate value object

**Use Cases:**
- GetSettingsUseCase
- UpdateSettingsUseCase
- GetExchangeRateUseCase
- ConvertCurrencyUseCase

**Special Considerations:**
- Exchange rate API integration (fawazahmed0/exchange-api)
- 3-tier caching for rates
- Support for non-major currencies via USD conversion

**API Endpoints:**
```
GET    /api/settings
PUT    /api/settings
GET    /api/currency/rates?from=USD&to=MXN
POST   /api/currency/convert
```

---

## 🔧 Technical Implementation Details

### Authentication Flow

```typescript
// Frontend: Get Supabase token
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;

// Frontend: Pass token to backend
const response = await fetch('http://localhost:3001/api/accounts', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// Backend: Verify token
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user; // Attach user to request
    next();
  } catch (error) {
    next(error);
  }
}
```

### Error Handling

```typescript
// Custom error classes
export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public isOperational = true
  ) {
    super(message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(400, message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string) {
    super(403, message);
  }
}

// Global error handler
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
  }

  console.error('Unexpected error:', err);
  res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
}
```

### Database Schema (Supabase)

**Current Tables:**
```sql
-- accounts
CREATE TABLE accounts (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  currency TEXT NOT NULL,
  balance NUMERIC DEFAULT 0,
  type TEXT DEFAULT 'normal',
  stock_symbol TEXT,
  monto_invertido NUMERIC,
  shares NUMERIC,
  display_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- pockets
CREATE TABLE pockets (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  balance NUMERIC DEFAULT 0,
  currency TEXT NOT NULL,
  display_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- sub_pockets
CREATE TABLE sub_pockets (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  pocket_id UUID NOT NULL REFERENCES pockets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  value_total NUMERIC NOT NULL,
  periodicity_months INTEGER NOT NULL,
  balance NUMERIC DEFAULT 0,
  enabled BOOLEAN DEFAULT true,
  group_id UUID REFERENCES fixed_expense_groups(id),
  display_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- fixed_expense_groups
CREATE TABLE fixed_expense_groups (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- movements
CREATE TABLE movements (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type TEXT NOT NULL,
  account_id UUID NOT NULL REFERENCES accounts(id),
  pocket_id UUID NOT NULL REFERENCES pockets(id),
  sub_pocket_id UUID REFERENCES sub_pockets(id),
  amount NUMERIC NOT NULL,
  notes TEXT,
  displayed_date TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_pending BOOLEAN DEFAULT false,
  is_orphaned BOOLEAN DEFAULT false,
  orphaned_account_name TEXT,
  orphaned_account_currency TEXT,
  orphaned_pocket_name TEXT
);

-- stock_prices (cache)
CREATE TABLE stock_prices (
  id UUID PRIMARY KEY,
  symbol TEXT NOT NULL,
  price NUMERIC NOT NULL,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(symbol)
);

-- exchange_rates (cache)
CREATE TABLE exchange_rates (
  id UUID PRIMARY KEY,
  from_currency TEXT NOT NULL,
  to_currency TEXT NOT NULL,
  rate NUMERIC NOT NULL,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(from_currency, to_currency)
);

-- settings
CREATE TABLE settings (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  primary_currency TEXT NOT NULL DEFAULT 'USD',
  alpha_vantage_api_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🧪 Testing Strategy

### Test Pyramid

```
        /\
       /  \      E2E Tests (10%)
      /____\     - Full user flows
     /      \    - Frontend + Backend + DB
    /________\   
   /          \  Integration Tests (30%)
  /____________\ - API endpoints
 /              \- Database interactions
/________________\
                  Unit Tests (60%)
                  - Use cases
                  - Domain entities
                  - Repositories (mocked)
```

### Test Coverage Goals

- **Domain Layer**: 90%+ (pure logic, easy to test)
- **Application Layer**: 85%+ (use cases with mocked repos)
- **Infrastructure Layer**: 70%+ (repository implementations)
- **Presentation Layer**: 80%+ (controllers)

### Test Environment Setup

```typescript
// backend/src/test/setup.ts
import { createClient } from '@supabase/supabase-js';

// Use test database
const testSupabase = createClient(
  process.env.TEST_SUPABASE_URL!,
  process.env.TEST_SUPABASE_KEY!
);

beforeEach(async () => {
  // Clear all tables
  await testSupabase.from('movements').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await testSupabase.from('sub_pockets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await testSupabase.from('pockets').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await testSupabase.from('accounts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
});
```

### Test Fixtures

```typescript
// backend/src/test/fixtures/accountFixtures.ts
export const createTestAccount = (overrides?: Partial<Account>): Account => {
  return new Account(
    overrides?.id || generateId(),
    overrides?.name || 'Test Account',
    overrides?.color || '#3b82f6',
    overrides?.currency || 'USD',
    overrides?.balance || 0,
    overrides?.type || 'normal'
  );
};

export const createTestAccountDTO = (overrides?: Partial<CreateAccountDTO>): CreateAccountDTO => {
  return {
    name: overrides?.name || 'Test Account',
    color: overrides?.color || '#3b82f6',
    currency: overrides?.currency || 'USD',
    type: overrides?.type || 'normal',
  };
};
```

---

## 🚀 Deployment & Operations

### Environment Variables

**Backend (.env)**
```bash
NODE_ENV=production
BACKEND_PORT=3001
FRONTEND_URL=https://finance-app.vercel.app

# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_KEY=eyJxxx...

# External APIs
ALPHA_VANTAGE_API_KEY=xxx
```

**Frontend (.env.production)**
```bash
VITE_API_URL=https://api.finance-app.com
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...

# Feature flags
VITE_USE_BACKEND_ACCOUNTS=true
VITE_USE_BACKEND_POCKETS=true
VITE_USE_BACKEND_MOVEMENTS=true
VITE_USE_BACKEND_INVESTMENTS=true
VITE_USE_BACKEND_SETTINGS=true
```

### Deployment Strategy

**Option 1: Monorepo on Vercel**
- Frontend: Vercel (automatic)
- Backend: Vercel Serverless Functions
- Pros: Simple, single deployment
- Cons: Cold starts, limited control

**Option 2: Separate Deployments**
- Frontend: Vercel
- Backend: Railway/Render/Fly.io
- Pros: Better performance, more control
- Cons: More complex setup

**Option 3: Docker + Cloud Run**
- Frontend: Vercel
- Backend: Google Cloud Run (containerized)
- Pros: Scalable, cost-effective
- Cons: Requires Docker knowledge

### Monitoring & Logging

```typescript
// backend/src/shared/middleware/logger.ts
import winston from 'winston';

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Log all requests
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  logger.info({
    method: req.method,
    path: req.path,
    userId: req.user?.id,
    timestamp: new Date().toISOString(),
  });
  next();
}
```

### Performance Optimization

1. **Database Indexing**
```sql
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_pockets_account_id ON pockets(account_id);
CREATE INDEX idx_movements_account_id ON movements(account_id);
CREATE INDEX idx_movements_pocket_id ON movements(pocket_id);
CREATE INDEX idx_movements_displayed_date ON movements(displayed_date);
```

2. **Caching Strategy**
- Stock prices: 24 hours
- Exchange rates: 24 hours
- Account balances: Calculated on-demand (not cached)

3. **Pagination**
- Movements: 50 per page
- Use cursor-based pagination for large datasets

---

## ❓ Open Questions & Decisions

### 1. API Versioning
**Question**: Should we version the API from the start?

**Options:**
- A) `/api/v1/accounts` - Explicit versioning
- B) `/api/accounts` - No versioning initially

**Recommendation**: Start with `/api/v1/` for future flexibility

### 2. Real-time Updates
**Question**: How to handle real-time balance updates?

**Options:**
- A) Polling (current approach)
- B) WebSockets
- C) Server-Sent Events (SSE)
- D) Supabase Realtime

**Recommendation**: Keep polling initially, add WebSockets in Phase 7

### 3. Database Migrations
**Question**: How to manage schema changes?

**Options:**
- A) Continue with SQL files
- B) Use Prisma migrations
- C) Use Supabase migrations CLI

**Recommendation**: Continue with SQL files (already working)

### 4. Validation Library
**Question**: Use validation library for DTOs?

**Options:**
- A) class-validator + class-transformer
- B) zod
- C) joi
- D) Manual validation

**Recommendation**: Use zod (TypeScript-first, lightweight)

### 5. Rate Limiting
**Question**: Implement rate limiting?

**Options:**
- A) express-rate-limit
- B) Redis-based rate limiting
- C) No rate limiting initially

**Recommendation**: Add express-rate-limit in Phase 1

### 6. CORS Configuration
**Question**: How strict should CORS be?

**Current**: Allow localhost:5173 only
**Production**: Allow specific domain only

**Recommendation**: Environment-based CORS configuration

### 7. Error Tracking
**Question**: Use error tracking service?

**Options:**
- A) Sentry
- B) LogRocket
- C) Custom logging only

**Recommendation**: Add Sentry in production

### 8. API Documentation
**Question**: Generate API documentation?

**Options:**
- A) Swagger/OpenAPI
- B) Postman collections
- C) Manual markdown docs

**Recommendation**: Use Swagger for auto-generated docs

---

## 📊 Migration Timeline & Effort Estimation

### Phase 1: Accounts Module (Current)
**Estimated Time**: 2-3 days (12-15 hours)
- Use cases: 3 hours
- Infrastructure: 3 hours
- Presentation: 2 hours
- DI setup: 1 hour
- Frontend adapter: 2 hours
- Testing: 4 hours
- Validation: 2 hours

**Status**: 20% complete (domain layer done)

### Phase 2: Pockets Module
**Estimated Time**: 2-3 days (12-15 hours)
- Similar complexity to accounts
- Additional: pocket migration logic

### Phase 3: SubPockets & Fixed Expenses
**Estimated Time**: 3-4 days (18-20 hours)
- Two entities (SubPocket + FixedExpenseGroup)
- Complex business rules
- Group management logic

### Phase 4: Movements Module
**Estimated Time**: 4-5 days (24-30 hours)
- Most complex module
- Balance recalculation
- Orphan management
- Pagination
- Month grouping

### Phase 5: Investments Module
**Estimated Time**: 2 days (12 hours)
- External API integration
- Caching logic
- Price updates

### Phase 6: Settings & Currency
**Estimated Time**: 2 days (12 hours)
- Simple CRUD
- Exchange rate API
- Caching

### Total Estimated Time
- **Development**: 6-7 weeks (full-time)
- **Testing**: +1 week
- **Documentation**: +1 week
- **Buffer**: +1 week

**Total**: 9-10 weeks for complete migration

### Risk Factors
- **High Risk**: Movements module (complex balance calculations)
- **Medium Risk**: Investment price fetching (external API)
- **Low Risk**: Accounts, Pockets, Settings (straightforward CRUD)

---

## 🎯 Success Criteria

### Phase 1 (Accounts) Complete When:
- ✅ All 7 use cases implemented and tested
- ✅ Repository with full CRUD operations
- ✅ Controller with all endpoints
- ✅ Frontend adapter with feature flag
- ✅ Unit tests: 85%+ coverage
- ✅ Integration tests: All endpoints tested
- ✅ Feature flag enabled in dev
- ✅ No regressions in existing functionality
- ✅ Performance: API response < 200ms
- ✅ Documentation: API endpoints documented

### Overall Migration Complete When:
- ✅ All 6 phases complete
- ✅ All feature flags enabled in production
- ✅ Frontend Supabase fallback code removed
- ✅ Test coverage: 80%+ overall
- ✅ API documentation complete
- ✅ Monitoring and logging in place
- ✅ Zero production incidents
- ✅ Performance metrics met
- ✅ Mobile app can use same backend

---

## 📚 Additional Resources

### Documentation to Create
1. API Reference (Swagger/OpenAPI)
2. Architecture Decision Records (ADRs)
3. Deployment Guide
4. Troubleshooting Guide
5. Contributing Guide

### Code Examples Needed
1. How to add a new use case
2. How to add a new repository
3. How to add a new controller
4. How to write tests
5. How to add a new module

### Tools & Libraries
- **Backend**: Express, TypeScript, tsyringe, winston
- **Testing**: Jest, supertest
- **Validation**: zod
- **Documentation**: Swagger
- **Monitoring**: Sentry (future)
- **Rate Limiting**: express-rate-limit (future)

---

## 🚦 Next Immediate Actions

### For Planning Session (AI Assistant)
1. Review this comprehensive guide
2. Identify any gaps or missing information
3. Propose detailed implementation plan for Phase 1
4. Suggest improvements to architecture
5. Identify potential issues early
6. Create detailed task breakdown
7. Estimate effort more precisely
8. Propose testing strategy details

### For Implementation (Developer)
1. Complete all Phase 1 use cases
2. Implement repository layer
3. Create controller and routes
4. Update frontend adapter
5. Write comprehensive tests
6. Enable feature flag
7. Validate end-to-end
8. Document learnings

---

## 📝 Summary

This document provides a complete guide for migrating the finance app from a frontend-only architecture to a proper backend with Clean Architecture principles. The migration is progressive, module-by-module, with feature flags for safe rollback.

**Current Status**: Phase 0 complete, Phase 1 (Accounts) 20% done

**Next Step**: Complete Phase 1 implementation (use cases, repository, controller, tests)

**Goal**: Maintainable, scalable, testable backend that can support web and mobile clients

---

**Document Version**: 1.0  
**Last Updated**: December 1, 2025  
**Author**: Backend Migration Team  
**Status**: Ready for Planning Session
