# Finance App - AI Assistant Guide

> **For AI Assistants**: This document provides comprehensive context about the Finance App personal finance management system. Use this as your primary reference when working with this codebase.

## Quick Context

**What**: Personal finance management web application with multi-user support and cloud sync

**Tech Stack**: React 19 + TypeScript + Vite (frontend), Supabase PostgreSQL + Auth (backend), Vercel hosting

**Architecture**: Monorepo with 3 workspaces (frontend, backend, shared), clean architecture pattern

**Cost**: $0/month (free tier hosting)

**Repository**: https://github.com/jdramirezl/finance-app

## Table of Contents

1. [Application Overview](#application-overview)
2. [Core Concepts](#core-concepts)
3. [Architecture](#architecture)
4. [Code Organization](#code-organization)
5. [Key Features](#key-features)
6. [Development Workflow](#development-workflow)
7. [Deployment](#deployment)
8. [Common Tasks](#common-tasks)
9. [Troubleshooting](#troubleshooting)
10. [Additional Resources](#additional-resources)

## Application Overview

### What It Does

Finance App enables users to:
- **Track Accounts**: Manage multiple bank accounts, cash, and investments across currencies
- **Organize with Pockets**: Create sub-containers within accounts for specific purposes
- **Record Transactions**: Log income and expenses with detailed categorization
- **Plan Budgets**: Distribute income with percentage-based allocation
- **Manage Fixed Expenses**: Track recurring bills with automatic monthly contributions
- **Set Reminders**: Never miss payments with recurring reminders
- **Track Net Worth**: Visualize wealth over time with historical snapshots
- **Monitor Investments**: Track stocks with real-time pricing
- **Handle Multiple Currencies**: Support USD, MXN, COP, EUR, GBP with auto-conversion
- **Plan Future Transactions**: Register pending movements that don't affect current balance

### Why It Exists

**Problem**: Personal finance data is fragmented across banks, apps, and spreadsheets. Existing solutions are expensive or lack customization.

**Solution**: Free, comprehensive finance tracking with flexible organization, multi-currency support, and cloud sync.

**Value**: $0/month cost, 2-3 hours/month time savings, complete financial visibility, bank-grade security.

## Core Concepts

### Domain Model

```
User
├── Account (bank, cash, investment)
│   └── Pocket (savings, travel, etc.)
│       └── SubPocket (only in fixed expense pocket)
├── Movement (transaction)
├── MovementTemplate (saved transaction pattern)
├── Reminder (bill payment reminder)
├── NetWorthSnapshot (historical wealth data)
└── Settings (preferences)
```

### Business Rules

1. **Balance Calculation**: Movements affect pockets only. Account balance = sum of pocket balances.
2. **Account Uniqueness**: Cannot have duplicate (name + currency) combinations.
3. **Fixed Expenses**: Only ONE fixed expenses pocket exists globally. Sub-pockets only exist here.
4. **Pending Movements**: Don't affect current balances until converted to actual movements.

### Key Entities

**Account**: Financial account with name, color, currency, calculated balance

**Pocket**: Sub-container within account (types: 'normal' | 'fixed')

**SubPocket**: Only in fixed pocket, tracks recurring expenses with automatic monthly contributions

**Movement**: Transaction with type, amount, account/pocket references, dates, optional pending flag

**MovementTemplate**: Saved transaction pattern for quick entry

## Architecture

### System Design

```
Frontend (React + Vite)
    ↓ HTTPS/REST
Backend (Supabase PostgreSQL + Auth)
    ↓
Database (PostgreSQL with RLS)
```

**Frontend Layer**:
- React 19 + TypeScript for UI
- TanStack Query for server state (data fetching, caching)
- Zustand for client state (theme, UI preferences)
- Tailwind CSS for styling
- Vite for build and dev server

**Backend Layer**:
- Supabase provides PostgreSQL database
- Auto-generated REST API
- Email/password authentication with JWT
- Row Level Security (RLS) for data isolation

**Key Patterns**:
- Clean architecture in backend modules
- Component-based UI with service layer
- Repository pattern for data access
- Domain-driven design

### Data Flow

**Read Operation**:
1. Component mounts → TanStack Query hook executes
2. Service method called → HTTP request to Supabase
3. RLS validates user → Data returned
4. TanStack Query caches → Component renders

**Write Operation**:
1. User submits form → Validation
2. TanStack Query mutation → Service method
3. HTTP request → Backend validates
4. Database insert/update → Balance recalculation
5. Success response → Query invalidation → UI updates

## Code Organization

### Monorepo Structure

```
finance-app/
├── frontend/          # React web application
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── pages/         # Route pages
│   │   ├── services/      # Business logic & API
│   │   ├── hooks/         # React & TanStack Query hooks
│   │   ├── store/         # Zustand stores
│   │   ├── types/         # TypeScript types
│   │   └── utils/         # Utility functions
│   ├── api/           # Serverless functions
│   └── tests/         # Test files
├── backend/           # API server
│   ├── src/
│   │   ├── modules/       # Domain modules
│   │   │   ├── accounts/
│   │   │   ├── movements/
│   │   │   ├── pockets/
│   │   │   ├── reminders/
│   │   │   └── net-worth/
│   │   └── shared/        # Shared utilities
│   └── migrations/    # Database migrations
└── shared/            # Shared types & contracts
    ├── api-contracts/
    └── types/
```

### Key Directories

**Frontend Components**:
- `components/accounts/`: Account management UI
- `components/movements/`: Transaction tracking UI
- `components/budget/`: Budget planning UI
- `components/fixed-expenses/`: Fixed expense management UI
- `components/reminders/`: Reminder system UI
- `components/net-worth/`: Net worth visualization UI

**Frontend Services**:
- `accountService.ts`: Account CRUD operations
- `movementService.ts`: Transaction operations
- `pocketService.ts`: Pocket management
- `investmentService.ts`: Investment tracking
- `currencyService.ts`: Currency conversion
- `reminderService.ts`: Reminder management

**Backend Modules** (each follows clean architecture):
- `application/`: Use cases and application services
- `domain/`: Business entities and rules
- `infrastructure/`: Database repositories

## Key Features

### 1. Account & Pocket Management
- Create accounts with name, color, currency
- Add pockets within accounts for organization
- Drag & drop reordering
- Calculated balances (never manually set)

### 2. Movement Tracking
- Record income and expenses
- Link to accounts and pockets
- Save as templates for quick entry
- Filter by date, type, account
- Pending movements for future transactions

### 3. Fixed Expenses
- Special pocket type for recurring bills
- Sub-pockets with target amounts and periodicity
- Automatic monthly contribution calculation
- Progress tracking with visual indicators
- Enable/disable individual expenses

### 4. Budget Planning
- Input total income
- Subtract fixed expenses automatically
- Distribute remaining with percentages
- Real-time calculation of amounts

### 5. Reminders
- Set bill payment reminders
- Recurrence: daily, weekly, monthly, yearly
- Enable/disable individual reminders
- Due date tracking

### 6. Net Worth Timeline
- Historical snapshots of total wealth
- Currency breakdown
- Visual charts with Recharts
- Automatic or manual snapshot creation

### 7. Investment Tracking
- Track stock holdings (e.g., VOO)
- Real-time price updates
- Gain/loss calculation
- Integrated into net worth

### 8. Multi-Currency Support
- USD, MXN, COP, EUR, GBP
- Real-time exchange rates
- Consolidated totals in primary currency
- Per-currency breakdowns

## Development Workflow

### Setup

```bash
# Clone and install
git clone https://github.com/jdramirezl/finance-app
cd finance-app
npm install

# Configure environment
# Create frontend/.env with Supabase credentials:
# VITE_SUPABASE_URL=https://[project-id].supabase.co
# VITE_SUPABASE_ANON_KEY=[anon-key]

# Start development
npm run dev:all  # Both frontend and backend
# OR
npm run dev      # Frontend only (http://localhost:5173)
```

### Common Commands

```bash
# Development
npm run dev              # Start frontend
npm run dev:backend      # Start backend
npm run dev:all          # Start both

# Testing
npm run test             # Frontend tests
npm run test:backend     # Backend tests

# Building
npm run build            # Build frontend
npm run build:backend    # Build backend

# Linting
npm run lint             # Lint code
```

### Making Changes

**Adding a Feature**:
1. Define types in `shared/types/`
2. Create service methods in `frontend/src/services/`
3. Create components in `frontend/src/components/`
4. Add page route in `frontend/src/pages/`
5. Write tests
6. Update documentation

**Database Changes**:
1. Create migration: `supabase migration new [name]`
2. Write SQL in `backend/migrations/###_name.sql`
3. Test locally
4. Run in production: `supabase db push`
5. Update TypeScript types

## Deployment

### Automatic Deployment

**Frontend** (Vercel):
- Push to `main` branch on GitHub
- Vercel automatically builds and deploys
- Preview deployments for pull requests

**Database** (Supabase):
- Migrations run manually via CLI
- Schema changes applied to production

### Manual Deployment

```bash
# Frontend
vercel --prod

# Database migrations
supabase link --project-ref [project-id]
supabase db push
```

### Environment Variables

**Vercel** (Frontend):
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key
- Optional: API keys for exchange rates and stock prices

**Supabase** (Backend):
- Configured in Supabase dashboard
- Connection strings auto-generated

## Common Tasks

### Task: Add a New Page

1. Create page component in `frontend/src/pages/NewPage.tsx`
2. Add route in router configuration
3. Create necessary components in `frontend/src/components/`
4. Add service methods if needed
5. Update navigation

### Task: Add a Database Table

1. Create migration: `supabase migration new add_table_name`
2. Write SQL with RLS policies
3. Run migration: `supabase db push`
4. Add TypeScript types in `shared/types/`
5. Create service methods
6. Update components

### Task: Fix a Bug

1. Reproduce the issue locally
2. Check browser console and network tab
3. Review relevant service and component code
4. Fix and test locally
5. Write test to prevent regression
6. Deploy fix

### Task: Update Dependencies

```bash
npm outdated          # Check for updates
npm update            # Update all
npm run test          # Test after updates
npm run build         # Verify build works
```

## Troubleshooting

### Build Fails

**Check**:
- All dependencies in package.json
- TypeScript errors: `npm run build`
- Environment variables set correctly

### Authentication Issues

**Check**:
- Supabase URL and anon key in environment
- RLS policies allow the operation
- JWT token in request headers
- User is authenticated

### Database Errors

**Check**:
- Database not paused (free tier auto-pauses)
- RLS policies configured correctly
- Connection string valid
- User has permissions

### Slow Performance

**Check**:
- Bundle size (use code splitting)
- Database query performance
- Image optimization
- API response caching
- Network tab in DevTools

## Additional Resources

### Detailed Documentation

For comprehensive information, see `.agents/application-summary/`:
- `identity.md`: Ownership and project status
- `product.md`: Business context and use cases
- `packages.md`: Code organization details
- `architecture.md`: System design deep dive
- `infrastructure.md`: Deployment and hosting
- `operations.md`: Maintenance and procedures
- `documentation.md`: All documentation links
- `index.md`: Navigation guide

### Project Documentation

- `README.md`: Project overview and quick start
- `docs/PROJECT_SPEC.md`: Complete technical specifications
- `docs/FEATURE_ROADMAP.md`: Planned features
- `docs/qol.md`: Quality of life improvements

### External Documentation

- **React**: https://react.dev
- **TypeScript**: https://www.typescriptlang.org/docs
- **Vite**: https://vitejs.dev
- **TanStack Query**: https://tanstack.com/query/latest
- **Tailwind CSS**: https://tailwindcss.com/docs
- **Supabase**: https://supabase.com/docs
- **Vercel**: https://vercel.com/docs

### Getting Help

- **GitHub Issues**: https://github.com/jdramirezl/finance-app/issues
- **Supabase Discord**: https://discord.supabase.com
- **Vercel Support**: support@vercel.com

## Working with This Codebase

### Best Practices

1. **Type Safety**: Use TypeScript strictly, define types in `shared/types/`
2. **Component Structure**: Keep components focused, extract reusable logic to hooks
3. **Service Layer**: Business logic in services, not components
4. **Testing**: Write tests for new features
5. **Documentation**: Update docs when making significant changes

### Code Patterns

**Data Fetching**:
```typescript
// Use TanStack Query hooks
const { data, isLoading, error } = useQuery({
  queryKey: ['accounts'],
  queryFn: accountService.getAccounts
});
```

**Mutations**:
```typescript
const mutation = useMutation({
  mutationFn: accountService.createAccount,
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['accounts'] });
  }
});
```

**State Management**:
```typescript
// Use Zustand for UI state
const theme = useThemeStore((state) => state.theme);
const setTheme = useThemeStore((state) => state.setTheme);
```

### Security Considerations

- Never commit secrets to git
- Use environment variables for sensitive data
- RLS policies enforce data isolation
- All connections use HTTPS
- JWT tokens for authentication

### Performance Tips

- Use React.memo for expensive components
- Implement code splitting for routes
- Optimize images and assets
- Cache API responses with TanStack Query
- Monitor Core Web Vitals

## Summary

Finance App is a well-architected personal finance management system built with modern technologies. The codebase follows clean architecture principles, uses TypeScript throughout for type safety, and leverages free-tier cloud services for zero-cost hosting.

**Key Strengths**:
- Comprehensive feature set
- Clean, maintainable code structure
- Strong type safety
- Secure multi-user support
- Zero operational cost

**When Working on This Project**:
1. Start with this AGENTS.md for context
2. Review relevant detailed docs in `.agents/application-summary/`
3. Follow established patterns and conventions
4. Write tests for new features
5. Update documentation as needed

For detailed information on any topic, refer to the comprehensive documentation in `.agents/application-summary/`.
