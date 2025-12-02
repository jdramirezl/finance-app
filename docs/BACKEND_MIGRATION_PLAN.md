# Backend Migration Plan - Progressive Modularization

## 🎯 Goals

1. **Separate frontend and backend** into distinct modules within the same repository
2. **Progressive migration** - migrate and test one module at a time
3. **Zero downtime** - frontend continues working during migration
4. **Modern architecture** - Clean Architecture, DDD patterns, dependency injection
5. **Maintainability** - DRY, SOLID principles, proper error handling
6. **Type safety** - Shared types between frontend and backend

---

## 📁 Proposed Repository Structure

```
finance-app/
├── frontend/                    # React + Vite (existing code)
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── hooks/
│   │   ├── contexts/
│   │   ├── services/           # API clients (calls backend)
│   │   └── types/              # Symlink to shared types
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                     # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── modules/            # Domain modules (DDD)
│   │   │   ├── accounts/
│   │   │   │   ├── domain/     # Entities, value objects
│   │   │   │   ├── application/ # Use cases, DTOs
│   │   │   │   ├── infrastructure/ # Repositories, Supabase
│   │   │   │   └── presentation/ # Controllers, routes
│   │   │   ├── pockets/
│   │   │   ├── movements/
│   │   │   ├── fixed-expenses/
│   │   │   └── investments/
│   │   ├── shared/             # Shared infrastructure
│   │   │   ├── database/       # Supabase client
│   │   │   ├── middleware/     # Auth, error handling
│   │   │   └── utils/
│   │   └── server.ts           # Express app
│   ├── package.json
│   └── tsconfig.json
│
├── shared/                      # Shared types and contracts
│   ├── types/                  # Domain types
│   └── api-contracts/          # API request/response types
│
├── package.json                 # Root workspace config
└── docs/
    └── BACKEND_MIGRATION_PLAN.md
```

---

## 🏗️ Architecture Patterns

### Clean Architecture (Hexagonal)

```
┌─────────────────────────────────────────────┐
│           Presentation Layer                │
│  (Controllers, Routes, DTOs)                │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│          Application Layer                  │
│  (Use Cases, Business Logic)                │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│            Domain Layer                     │
│  (Entities, Value Objects, Domain Logic)    │
└─────────────────┬───────────────────────────┘
                  │
┌─────────────────▼───────────────────────────┐
│        Infrastructure Layer                 │
│  (Repositories, Supabase, External APIs)    │
└─────────────────────────────────────────────┘
```

### Dependency Injection

Using **tsyringe** or **inversify** for IoC container:

```typescript
// Example: AccountService with DI
@injectable()
class AccountService {
  constructor(
    @inject('AccountRepository') private accountRepo: IAccountRepository,
    @inject('PocketRepository') private pocketRepo: IPocketRepository,
    @inject('Logger') private logger: ILogger
  ) {}

  async createAccount(dto: CreateAccountDTO): Promise<Account> {
    // Business logic here
  }
}
```

---

## 📋 Migration Strategy - Progressive Module Migration

### Phase 0: Setup (Week 1)

**Goal**: Prepare infrastructure without breaking existing code

1. **Create backend structure**
   ```bash
   mkdir -p backend/src/{modules,shared}
   cd backend && npm init -y
   npm install express cors helmet compression
   npm install -D typescript @types/node @types/express ts-node-dev
   ```

2. **Setup workspace** (monorepo with npm workspaces)
   ```json
   // Root package.json
   {
     "name": "finance-app-monorepo",
     "private": true,
     "workspaces": ["frontend", "backend", "shared"]
   }
   ```

3. **Create shared types package**
   ```bash
   mkdir -p shared/types
   # Copy existing types from frontend/src/types
   ```

4. **Setup Express server** (basic structure)
   ```typescript
   // backend/src/server.ts
   import express from 'express';
   import cors from 'cors';
   
   const app = express();
   app.use(cors());
   app.use(express.json());
   
   // Health check
   app.get('/health', (req, res) => res.json({ status: 'ok' }));
   
   app.listen(3001, () => console.log('Backend running on :3001'));
   ```

5. **Create API client abstraction** in frontend
   ```typescript
   // frontend/src/services/apiClient.ts
   class ApiClient {
     private baseURL = import.meta.env.VITE_API_URL || 'http://localhost:3001';
     
     async get<T>(path: string): Promise<T> { /* ... */ }
     async post<T>(path: string, data: any): Promise<T> { /* ... */ }
   }
   ```

**Deliverable**: Backend runs alongside frontend, no functionality migrated yet

---

### Phase 1: Migrate Accounts Module (Week 2)

**Goal**: First complete module migration with full architecture

#### 1.1 Backend Implementation

```typescript
// backend/src/modules/accounts/domain/Account.ts
export class Account {
  constructor(
    public readonly id: string,
    public name: string,
    public color: string,
    public currency: Currency,
    private _balance: number
  ) {}

  get balance(): number {
    return this._balance;
  }

  updateBalance(newBalance: number): void {
    if (newBalance < 0) throw new Error('Balance cannot be negative');
    this._balance = newBalance;
  }
}

// backend/src/modules/accounts/application/useCases/CreateAccountUseCase.ts
@injectable()
export class CreateAccountUseCase {
  constructor(
    @inject('AccountRepository') private repo: IAccountRepository
  ) {}

  async execute(dto: CreateAccountDTO): Promise<AccountDTO> {
    // Validation
    if (!dto.name?.trim()) throw new ValidationError('Name required');
    
    // Check uniqueness
    const exists = await this.repo.existsByNameAndCurrency(dto.name, dto.currency);
    if (exists) throw new ConflictError('Account already exists');
    
    // Create entity
    const account = new Account(
      generateId(),
      dto.name,
      dto.color,
      dto.currency,
      0
    );
    
    // Persist
    await this.repo.save(account);
    
    return AccountMapper.toDTO(account);
  }
}

// backend/src/modules/accounts/infrastructure/SupabaseAccountRepository.ts
@injectable()
export class SupabaseAccountRepository implements IAccountRepository {
  constructor(@inject('SupabaseClient') private supabase: SupabaseClient) {}

  async save(account: Account): Promise<void> {
    const { error } = await this.supabase
      .from('accounts')
      .insert(AccountMapper.toPersistence(account));
    
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
}

// backend/src/modules/accounts/presentation/AccountController.ts
@injectable()
export class AccountController {
  constructor(
    @inject(CreateAccountUseCase) private createUseCase: CreateAccountUseCase,
    @inject(GetAccountsUseCase) private getUseCase: GetAccountsUseCase
  ) {}

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const dto = req.body as CreateAccountDTO;
      const result = await this.createUseCase.execute(dto);
      res.status(201).json(result);
    } catch (error) {
      next(error);
    }
  }

  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id; // From auth middleware
      const accounts = await this.getUseCase.execute(userId);
      res.json(accounts);
    } catch (error) {
      next(error);
    }
  }
}

// backend/src/modules/accounts/presentation/routes.ts
export function createAccountRoutes(container: DependencyContainer): Router {
  const router = Router();
  const controller = container.resolve(AccountController);

  router.post('/', authMiddleware, (req, res, next) => 
    controller.create(req, res, next)
  );
  
  router.get('/', authMiddleware, (req, res, next) => 
    controller.getAll(req, res, next)
  );

  return router;
}
```

#### 1.2 Frontend Adapter

```typescript
// frontend/src/services/accountService.ts (UPDATED)
class AccountService {
  private useBackend = import.meta.env.VITE_USE_BACKEND === 'true';
  
  async getAll(): Promise<Account[]> {
    if (this.useBackend) {
      // NEW: Call backend API
      return apiClient.get<Account[]>('/api/accounts');
    } else {
      // OLD: Direct Supabase (fallback during migration)
      return SupabaseStorageService.getAccounts();
    }
  }

  async create(name: string, color: string, currency: Currency): Promise<Account> {
    if (this.useBackend) {
      return apiClient.post<Account>('/api/accounts', { name, color, currency });
    } else {
      // Old implementation
    }
  }
}
```

#### 1.3 Testing

```typescript
// backend/src/modules/accounts/__tests__/CreateAccountUseCase.test.ts
describe('CreateAccountUseCase', () => {
  let useCase: CreateAccountUseCase;
  let mockRepo: jest.Mocked<IAccountRepository>;

  beforeEach(() => {
    mockRepo = {
      save: jest.fn(),
      existsByNameAndCurrency: jest.fn(),
    };
    useCase = new CreateAccountUseCase(mockRepo);
  });

  it('should create account successfully', async () => {
    mockRepo.existsByNameAndCurrency.mockResolvedValue(false);
    
    const dto = { name: 'Test', color: '#fff', currency: 'USD' };
    const result = await useCase.execute(dto);
    
    expect(result.name).toBe('Test');
    expect(mockRepo.save).toHaveBeenCalled();
  });

  it('should throw error if account exists', async () => {
    mockRepo.existsByNameAndCurrency.mockResolvedValue(true);
    
    await expect(useCase.execute({ name: 'Test', color: '#fff', currency: 'USD' }))
      .rejects.toThrow(ConflictError);
  });
});
```

**Deliverable**: Accounts module fully migrated, tested, and working via backend

---

### Phase 2-6: Migrate Remaining Modules (Weeks 3-7)

Follow same pattern for each module:

- **Phase 2**: Pockets Module
- **Phase 3**: SubPockets & Fixed Expenses Module
- **Phase 4**: Movements Module
- **Phase 5**: Investment Module
- **Phase 6**: Settings & Currency Module

Each phase:
1. Implement backend module (domain → application → infrastructure → presentation)
2. Update frontend service to call backend
3. Write tests (unit + integration)
4. Enable via feature flag (`VITE_USE_BACKEND_MODULES=accounts,pockets`)
5. Validate in production
6. Remove old code once stable

---

## 🔧 Technical Implementation Details

### Dependency Injection Setup

```typescript
// backend/src/shared/container.ts
import { container } from 'tsyringe';
import { createClient } from '@supabase/supabase-js';

export function setupContainer() {
  // Supabase client
  const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
  );
  container.registerInstance('SupabaseClient', supabase);

  // Repositories
  container.register('AccountRepository', { useClass: SupabaseAccountRepository });
  container.register('PocketRepository', { useClass: SupabasePocketRepository });

  // Use cases
  container.register(CreateAccountUseCase, { useClass: CreateAccountUseCase });
  container.register(GetAccountsUseCase, { useClass: GetAccountsUseCase });

  // Controllers
  container.register(AccountController, { useClass: AccountController });
}
```

### Error Handling Middleware

```typescript
// backend/src/shared/middleware/errorHandler.ts
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

### Authentication Middleware

```typescript
// backend/src/shared/middleware/auth.ts
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}
```

---

## 🧪 Testing Strategy

### Unit Tests
- **Domain entities**: Business logic validation
- **Use cases**: Mocked repositories
- **Repositories**: Mocked Supabase client

### Integration Tests
- **API endpoints**: Real database (test instance)
- **End-to-end flows**: Frontend → Backend → Database

### Test Structure
```typescript
// backend/src/modules/accounts/__tests__/
├── unit/
│   ├── Account.test.ts
│   ├── CreateAccountUseCase.test.ts
│   └── AccountRepository.test.ts
├── integration/
│   └── AccountController.test.ts
└── fixtures/
    └── accountFixtures.ts
```

---

## 📊 Migration Progress Tracking

### Feature Flags

```typescript
// shared/types/featureFlags.ts
export interface FeatureFlags {
  useBackendAccounts: boolean;
  useBackendPockets: boolean;
  useBackendMovements: boolean;
  useBackendInvestments: boolean;
}

// frontend/.env
VITE_USE_BACKEND_ACCOUNTS=true
VITE_USE_BACKEND_POCKETS=false
VITE_USE_BACKEND_MOVEMENTS=false
```

### Migration Checklist

- [ ] Phase 0: Setup infrastructure
  - [ ] Backend structure created
  - [ ] Workspace configured
  - [ ] Shared types package
  - [ ] Express server running
  - [ ] API client abstraction

- [ ] Phase 1: Accounts Module
  - [ ] Domain layer
  - [ ] Application layer (use cases)
  - [ ] Infrastructure layer (repository)
  - [ ] Presentation layer (controller, routes)
  - [ ] Frontend adapter
  - [ ] Unit tests
  - [ ] Integration tests
  - [ ] Feature flag enabled
  - [ ] Production validation

- [ ] Phase 2: Pockets Module
  - [ ] (Same checklist as Phase 1)

- [ ] Phase 3: SubPockets & Fixed Expenses
- [ ] Phase 4: Movements
- [ ] Phase 5: Investments
- [ ] Phase 6: Settings & Currency

---

## 🚀 Benefits of This Approach

1. **Progressive Migration**: No big bang, migrate one module at a time
2. **Zero Downtime**: Frontend works during entire migration
3. **Rollback Safety**: Feature flags allow instant rollback
4. **Better Testing**: Isolated modules are easier to test
5. **Scalability**: Backend can scale independently
6. **Team Collaboration**: Clear module boundaries
7. **Code Reusability**: Shared types, utilities
8. **Maintainability**: Clean architecture, SOLID principles

---

## 📝 Next Steps

1. **Review this plan** - Discuss and adjust as needed
2. **Start Phase 0** - Setup infrastructure (1 week)
3. **Migrate Accounts** - First complete module (1 week)
4. **Validate & Iterate** - Ensure pattern works
5. **Continue with remaining modules** - One per week

---

## 🤔 Open Questions

1. **Deployment**: Keep monorepo or split later?
2. **Database migrations**: Alembic/Prisma or continue with SQL files?
3. **API versioning**: `/api/v1/accounts` from the start?
4. **Real-time updates**: WebSockets or polling?
5. **Caching strategy**: Redis or in-memory?

---

**Estimated Timeline**: 7-8 weeks for complete migration
**Risk Level**: Low (progressive, feature-flagged)
**Effort**: Medium (well-structured, clear patterns)
