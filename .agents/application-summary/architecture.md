# Architecture

## High-Level Architecture

Finance App follows a modern three-tier architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend                             │
│  (React 19 + TypeScript + Vite + TanStack Query)           │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Pages      │  │  Components  │  │   Services   │     │
│  │  (Routes)    │  │   (UI)       │  │  (Business)  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │             │
│         └──────────────────┴──────────────────┘             │
│                          │                                   │
│                   ┌──────▼──────┐                           │
│                   │  API Client │                           │
│                   └──────┬──────┘                           │
└──────────────────────────┼──────────────────────────────────┘
                           │
                    HTTPS / REST API
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                        Backend                               │
│         (Node.js + TypeScript + Express)                    │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Application  │  │    Domain    │  │Infrastructure│     │
│  │   Services   │  │   Entities   │  │ Repositories │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                              │               │
└──────────────────────────────────────────────┼──────────────┘
                                               │
                                        ┌──────▼──────┐
                                        │  Supabase   │
                                        │ PostgreSQL  │
                                        │    + Auth   │
                                        └─────────────┘
```

## System Components

### 1. Frontend Layer

**Technology**: React 19 + TypeScript + Vite

**Responsibilities**:
- User interface rendering
- Client-side routing
- State management (UI state)
- Data fetching and caching
- Form validation
- Real-time updates

**Key Patterns**:
- **Component-based architecture**: Modular, reusable UI components
- **Service layer**: Business logic separated from presentation
- **Custom hooks**: Encapsulated data fetching and state logic
- **Context providers**: Shared state across component tree

**State Management**:
- **TanStack Query**: Server state (data fetching, caching, synchronization)
- **Zustand**: Client state (theme, UI preferences)
- **React Context**: Authentication state

### 2. Backend Layer

**Technology**: Node.js + TypeScript + Express

**Responsibilities**:
- Business logic execution
- Data validation
- Database operations
- Authentication and authorization
- API endpoint management

**Architecture Pattern**: Clean Architecture / Domain-Driven Design

**Layers**:
1. **Application Layer**: Use cases and application services
2. **Domain Layer**: Business entities and rules
3. **Infrastructure Layer**: Database access, external services

**Key Patterns**:
- **Dependency injection**: Loose coupling between layers
- **Repository pattern**: Data access abstraction
- **Service pattern**: Business logic encapsulation
- **Module-based organization**: Each domain is self-contained

### 3. Database Layer

**Technology**: Supabase (PostgreSQL)

**Responsibilities**:
- Data persistence
- User authentication
- Row-level security
- Real-time subscriptions (future)

**Security**:
- **Row Level Security (RLS)**: Data isolation per user
- **Encrypted passwords**: Supabase Auth handles encryption
- **HTTPS only**: All connections encrypted

## Domain Model

### Core Entities

```
User (Supabase Auth)
  │
  ├── Account (1:N)
  │     ├── name: string
  │     ├── color: string
  │     ├── currency: Currency
  │     ├── balance: number (calculated)
  │     │
  │     └── Pocket (1:N)
  │           ├── name: string
  │           ├── type: 'normal' | 'fixed'
  │           ├── balance: number (calculated)
  │           │
  │           └── SubPocket (1:N, only for type='fixed')
  │                 ├── name: string
  │                 ├── valueTotal: number
  │                 ├── periodicityMonths: number
  │                 ├── balance: number
  │                 └── enabled: boolean
  │
  ├── Movement (1:N)
  │     ├── type: MovementType
  │     ├── amount: number
  │     ├── accountId: FK
  │     ├── pocketId: FK
  │     ├── subPocketId: FK (optional)
  │     ├── notes: string
  │     ├── displayedDate: Date
  │     ├── createdAt: Date
  │     └── isPending: boolean
  │
  ├── MovementTemplate (1:N)
  │     ├── name: string
  │     ├── type: MovementType
  │     ├── accountId: FK
  │     ├── pocketId: FK
  │     ├── defaultAmount: number (optional)
  │     └── notes: string (optional)
  │
  ├── Reminder (1:N)
  │     ├── title: string
  │     ├── amount: number
  │     ├── dueDate: Date
  │     ├── recurrence: 'daily' | 'weekly' | 'monthly' | 'yearly'
  │     └── enabled: boolean
  │
  ├── NetWorthSnapshot (1:N)
  │     ├── date: Date
  │     ├── totalValue: number
  │     └── currencyBreakdown: JSON
  │
  └── Settings (1:1)
        ├── primaryCurrency: Currency
        ├── snapshotFrequency: string
        └── theme: 'light' | 'dark'
```

### Business Rules

1. **Balance Calculation**:
   - Movements affect pockets only
   - Account balance = sum of pocket balances
   - Fixed pocket balance = sum of sub-pocket balances

2. **Account Uniqueness**:
   - Cannot have duplicate (name + currency) combinations

3. **Fixed Expenses**:
   - Only ONE fixed expenses pocket exists globally
   - Sub-pockets can only exist in fixed pocket
   - Monthly contribution = valueTotal / periodicityMonths

4. **Pending Movements**:
   - Don't affect current balances
   - Visible in separate view
   - Can be converted to actual movements

## Key APIs and Interfaces

### Frontend Services

**Account Service** (`accountService.ts`):
- `getAccounts()`: Fetch all accounts
- `createAccount(data)`: Create new account
- `updateAccount(id, data)`: Update account
- `deleteAccount(id)`: Delete account
- `calculateBalance(accountId)`: Calculate account balance

**Movement Service** (`movementService.ts`):
- `getMovements(filters)`: Fetch movements with filters
- `createMovement(data)`: Create new movement
- `updateMovement(id, data)`: Update movement
- `deleteMovement(id)`: Delete movement
- `createFromTemplate(templateId)`: Create from template

**Pocket Service** (`pocketService.ts`):
- `getPockets(accountId)`: Fetch pockets for account
- `createPocket(data)`: Create new pocket
- `updatePocket(id, data)`: Update pocket
- `deletePocket(id)`: Delete pocket

**Investment Service** (`investmentService.ts`):
- `getInvestmentData()`: Fetch investment account data
- `getCurrentPrice(symbol)`: Get real-time stock price
- `calculateGains()`: Calculate gains/losses

**Currency Service** (`currencyService.ts`):
- `getExchangeRates()`: Fetch current exchange rates
- `convertCurrency(amount, from, to)`: Convert between currencies
- `getConsolidatedTotal()`: Get total in primary currency

### Backend Modules

**Accounts Module**:
- Application: Account use cases
- Domain: Account entity and business rules
- Infrastructure: Account repository

**Movements Module**:
- Application: Movement use cases
- Domain: Movement entity and business rules
- Infrastructure: Movement repository

**Pockets Module**:
- Application: Pocket use cases
- Domain: Pocket entity and business rules
- Infrastructure: Pocket repository

**Net Worth Module**:
- Application: Snapshot creation and retrieval
- Domain: Net worth calculation logic
- Infrastructure: Snapshot repository

## Technologies and Frameworks

### Frontend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.x | UI framework |
| TypeScript | 5.9.x | Type safety |
| Vite | Latest | Build tool and dev server |
| React Router | 7.x | Client-side routing |
| TanStack Query | 5.x | Data fetching and caching |
| Zustand | 5.x | Client state management |
| Tailwind CSS | 4.x | Utility-first styling |
| Lucide React | Latest | Icon library |
| Recharts | Latest | Data visualization |
| date-fns | Latest | Date manipulation |
| @supabase/supabase-js | Latest | Supabase client |

### Backend Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 18+ | Runtime environment |
| TypeScript | 5.9.x | Type safety |
| Express | Latest | Web framework |
| Supabase | Latest | Database and auth |
| PostgreSQL | Latest | Relational database |

### Development Tools

| Tool | Purpose |
|------|---------|
| ESLint | Code linting |
| Prettier | Code formatting |
| Vitest | Unit testing |
| Jest | Backend testing |
| Concurrently | Run multiple scripts |

## Data Flow

### Read Operation Example (Get Accounts)

```
1. User navigates to Accounts page
   ↓
2. React component mounts
   ↓
3. TanStack Query hook executes
   ↓
4. accountService.getAccounts() called
   ↓
5. HTTP GET request to backend API
   ↓
6. Backend validates authentication
   ↓
7. Repository queries Supabase (with RLS)
   ↓
8. Data returned to frontend
   ↓
9. TanStack Query caches result
   ↓
10. Component renders with data
```

### Write Operation Example (Create Movement)

```
1. User submits movement form
   ↓
2. Form validation (client-side)
   ↓
3. TanStack Query mutation executes
   ↓
4. movementService.createMovement() called
   ↓
5. HTTP POST request to backend API
   ↓
6. Backend validates authentication
   ↓
7. Application service validates business rules
   ↓
8. Repository inserts into Supabase
   ↓
9. Balance recalculation triggered
   ↓
10. Success response returned
   ↓
11. TanStack Query invalidates related queries
   ↓
12. UI updates with new data
```

## Security Architecture

### Authentication Flow

```
1. User enters credentials
   ↓
2. Frontend calls Supabase Auth
   ↓
3. Supabase validates credentials
   ↓
4. JWT token issued
   ↓
5. Token stored in browser
   ↓
6. Token included in all API requests
   ↓
7. Backend validates token
   ↓
8. Row Level Security enforced
```

### Data Isolation

- **Row Level Security (RLS)**: PostgreSQL policies ensure users can only access their own data
- **User ID filtering**: All queries automatically filtered by authenticated user ID
- **No data mixing**: Complete isolation between user accounts

## External Integrations

### Exchange Rate API
- **Purpose**: Real-time currency conversion
- **Implementation**: Serverless function (`frontend/api/exchange-rates.ts`)
- **Caching**: Results cached to minimize API calls

### Stock Price API
- **Purpose**: Real-time stock/index pricing (e.g., VOO)
- **Implementation**: Serverless function (`frontend/api/stock-price.ts`)
- **Update Frequency**: On-demand when viewing investment accounts

## Performance Considerations

### Frontend Optimization
- **Code splitting**: Route-based lazy loading
- **Query caching**: TanStack Query reduces redundant API calls
- **Optimistic updates**: Immediate UI feedback before server confirmation
- **Memoization**: React.memo and useMemo for expensive computations

### Backend Optimization
- **Database indexing**: Indexes on frequently queried fields
- **Connection pooling**: Supabase handles connection management
- **Calculated fields**: Balances computed on-demand, not stored

## Scalability

### Current Limitations
- Single-region deployment
- No horizontal scaling (free tier)
- Limited concurrent connections

### Future Scalability Options
- **Caching layer**: Redis for frequently accessed data
- **CDN**: Static asset distribution
- **Database read replicas**: For read-heavy workloads
- **Microservices**: Split domains into separate services if needed
