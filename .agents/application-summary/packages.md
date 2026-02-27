# Code Packages and Workspaces

## Monorepo Structure

Finance App is organized as a monorepo with three workspaces managed by npm workspaces:

```
finance-app/
├── frontend/     # React web application
├── backend/      # API server and business logic
└── shared/       # Shared types and contracts
```

## Workspace Details

### 1. Frontend Workspace

**Location**: `frontend/`

**Purpose**: React-based web application providing the user interface

**Key Technologies**:
- React 19 + TypeScript
- Vite (build tool and dev server)
- React Router v7 (routing)
- TanStack Query v5 (data fetching)
- Zustand v5 (state management)
- Tailwind CSS v4 (styling)
- Recharts (data visualization)

**Structure**:
```
frontend/
├── src/
│   ├── components/      # Reusable UI components
│   ├── pages/           # Page components (routes)
│   ├── services/        # Business logic and API services
│   ├── hooks/           # React hooks & TanStack Query hooks
│   ├── store/           # Zustand stores (UI state)
│   ├── types/           # TypeScript type definitions
│   ├── utils/           # Utility functions
│   ├── contexts/        # React contexts
│   └── lib/             # Library configurations
├── api/                 # Serverless API functions
├── tests/               # Test files
└── public/              # Static assets
```

**Key Modules**:
- **components/accounts/**: Account management UI
- **components/movements/**: Transaction tracking UI
- **components/budget/**: Budget planning UI
- **components/fixed-expenses/**: Fixed expense management UI
- **components/reminders/**: Reminder system UI
- **components/net-worth/**: Net worth visualization UI
- **components/summary/**: Dashboard and summary views
- **services/**: API client and business logic services
- **hooks/queries/**: TanStack Query hooks for data fetching
- **hooks/mutations/**: TanStack Query hooks for data mutations

**Scripts**:
- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run test`: Run tests
- `npm run lint`: Lint code

### 2. Backend Workspace

**Location**: `backend/`

**Purpose**: API server providing business logic and database operations

**Key Technologies**:
- Node.js + TypeScript
- Supabase (PostgreSQL + Auth)
- Express.js (implied from structure)

**Structure**:
```
backend/
├── src/
│   ├── modules/
│   │   ├── accounts/        # Account domain logic
│   │   ├── movements/       # Movement domain logic
│   │   ├── pockets/         # Pocket domain logic
│   │   ├── sub-pockets/     # Sub-pocket domain logic
│   │   ├── reminders/       # Reminder domain logic
│   │   ├── net-worth/       # Net worth domain logic
│   │   └── settings/        # Settings domain logic
│   └── shared/
│       ├── container/       # Dependency injection
│       ├── database/        # Database utilities
│       ├── errors/          # Error handling
│       ├── middleware/      # Express middleware
│       ├── types/           # TypeScript types
│       └── utils/           # Utility functions
├── migrations/              # Database migrations
└── tests/                   # Test files
```

**Domain Modules**:
Each module follows a clean architecture pattern with:
- `application/`: Application services and use cases
- `domain/`: Domain entities and business rules
- `infrastructure/`: Database repositories and external integrations

**Database Migrations**:
- `001_balance_calculation.sql`: Initial balance calculation logic
- `002_fix_pending_balance.sql`: Pending balance fixes
- `003_reminder_exceptions.sql`: Reminder exception handling
- `004_net_worth_snapshots.sql`: Net worth snapshot tables
- `005_shares_precision.sql`: Investment shares precision
- `006_add_snapshot_frequency.sql`: Snapshot frequency settings
- `007_fix_exchange_rates_id.sql`: Exchange rate ID fixes
- `008_add_cd_support.sql`: Certificate of Deposit support
- `009_update_account_type_constraint.sql`: Account type constraints
- `010_add_account_card_display_settings.sql`: Display settings

**Scripts**:
- `npm run dev`: Start development server
- `npm run build`: Build for production
- `npm run start`: Start production server
- `npm run test`: Run tests

### 3. Shared Workspace

**Location**: `shared/`

**Purpose**: Shared TypeScript types and API contracts used by both frontend and backend

**Key Technologies**:
- TypeScript

**Structure**:
```
shared/
├── api-contracts/       # API request/response contracts
└── types/               # Shared TypeScript types
    └── index.ts         # Type definitions
```

**Purpose**:
- Ensures type safety across frontend and backend
- Defines API contracts for consistent communication
- Shared domain types (Account, Pocket, Movement, etc.)
- Prevents type drift between workspaces

## Package Dependencies

### Root Package
- **concurrently**: Run multiple npm scripts simultaneously
- **typescript**: TypeScript compiler

### Frontend Dependencies
Key production dependencies:
- **react**: ^19.x - UI framework
- **react-router**: ^7.x - Routing
- **@tanstack/react-query**: ^5.x - Data fetching
- **zustand**: ^5.x - State management
- **tailwindcss**: ^4.x - Styling
- **recharts**: Data visualization
- **lucide-react**: Icon library
- **date-fns**: Date utilities
- **@supabase/supabase-js**: Supabase client

### Backend Dependencies
Key production dependencies:
- **@supabase/supabase-js**: Supabase client
- **express**: Web framework (implied)
- **typescript**: Type safety

### Shared Dependencies
- **typescript**: Type definitions

## Build and Development

### Development Workflow
```bash
# Install all dependencies
npm install

# Run frontend only
npm run dev

# Run backend only
npm run dev:backend

# Run both frontend and backend
npm run dev:all
```

### Production Build
```bash
# Build frontend
npm run build

# Build backend
npm run build:backend

# Build both
npm run build:all
```

### Testing
```bash
# Test frontend
npm run test

# Test backend
npm run test:backend
```

## Code Organization Principles

### Frontend
- **Component-based architecture**: Reusable UI components
- **Service layer**: Business logic separated from UI
- **Custom hooks**: Encapsulated data fetching and state logic
- **Type safety**: Full TypeScript coverage

### Backend
- **Clean architecture**: Domain-driven design with clear boundaries
- **Module-based**: Each domain has its own module
- **Dependency injection**: Loose coupling between layers
- **Database migrations**: Version-controlled schema changes

### Shared
- **Single source of truth**: Types defined once, used everywhere
- **API contracts**: Clear interface definitions
- **Type safety**: Compile-time validation across workspaces

## Version Control

**Repository**: https://github.com/jdramirezl/finance-app

**Latest Commit**: 50904d26846ae0d49c100e84111e143e9c725681

**Branch Strategy**: Main branch for production-ready code
