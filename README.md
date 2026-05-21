# Finance App - Personal Finance Management System

![CI](https://github.com/jdramirezl/finance-app/actions/workflows/ci.yml/badge.svg)

A modern web application for managing personal finances with multi-user support, cloud sync, and comprehensive financial tracking.

## ✨ Features

- 🔐 **Secure Authentication** - Email/password with Supabase
- 👥 **Multi-User Support** - Each user has private finances
- ☁️ **Cloud Sync** - Access from any device
- 💰 **Account Management** - Track multiple accounts and pockets
- 📊 **Movement Tracking** - Record all transactions with filters
- 🎯 **Budget Planning** - Plan income distribution
- 📅 **Fixed Expenses** - Manage recurring expenses
- 🔔 **Reminders** - Bill payment reminders with recurrence (Daily, Weekly, Monthly, Yearly)
- 📈 **Net Worth Timeline** - Visual history of your wealth with currency breakdown
- ⚡ **Real-time Rates** - Async exchange rate fetching for accurate multi-currency totals
- ⏳ **Pending Movements** - Track future transactions
- 💱 **Multi-Currency** - Support for USD, MXN, COP, EUR, GBP
- 📉 **Investment Tracking** - Track stocks (e.g., VOO) and gains
- 🌙 **Dark Mode** - Full dark theme support

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start both frontend and backend
npm run dev:all

# Or start individually
npm run dev          # Frontend only (http://localhost:5173)
npm run dev:backend  # Backend only (http://localhost:3001)
```

## 🛠️ Tech Stack

**Frontend:**
- **React 19** + **TypeScript** - UI framework
- **Vite** - Build tool and dev server
- **React Router v7** - Client-side routing
- **TanStack Query v5** - Data fetching & server state
- **Zustand v5** - Client state management (Theme, UI)
- **Tailwind CSS v4** - Styling
- **Lucide React** - Icons
- **date-fns** - Date utilities
- **Recharts** - Data visualization

**Backend:**
- **Express** + **TypeScript** - API server with clean architecture
- **Supabase** - PostgreSQL database + Authentication
- **tsyringe** - Dependency injection
- **Zod** - Runtime validation
- **Row Level Security** - Data isolation per user

**Hosting:**
- **Vercel** - Frontend hosting (FREE)
- **Supabase** - Backend hosting (FREE)

## Project Structure

```
finance-app/
├── frontend/           # React 19 + Vite SPA
│   ├── src/
│   │   ├── components/ # Feature-based UI components
│   │   ├── pages/      # Route pages
│   │   ├── services/   # API service layer
│   │   ├── hooks/      # TanStack Query & action hooks
│   │   ├── store/      # Zustand stores
│   │   ├── types/      # TypeScript types
│   │   └── utils/      # Utilities
│   └── api/            # Vercel serverless functions
├── backend/            # Express API server
│   ├── src/
│   │   ├── modules/    # Domain modules (clean architecture)
│   │   └── shared/     # DI container, middleware, types
│   └── migrations/     # Supabase SQL migrations
└── supabase/           # Supabase CLI config
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

4. Preview production build:
```bash
npm run preview
```

## 📖 Documentation

- **[docs/PROJECT_SPEC.md](./docs/PROJECT_SPEC.md)** - Complete technical specifications
- **[docs/FEATURE_ROADMAP.md](./docs/FEATURE_ROADMAP.md)** - Feature roadmap
- **[docs/qol.md](./docs/qol.md)** - Quality of life improvements
- **[AGENTS.md](./AGENTS.md)** - AI assistant guide for this codebase

## 🎯 Development Status

### ✅ Completed Features

- ✅ Account and pocket management with drag & drop
- ✅ Monthly movement tracking with advanced filters
- ✅ Budget planning
- ✅ Fixed expenses with sub-pockets
- ✅ Smart Reminders system
- ✅ Net Worth Timeline & Analytics
- ✅ Multi-currency support with Async Rates
- ✅ Investment tracking (Real-time stock data)
- ✅ Pending movements
- ✅ Dark mode
- ✅ Multi-user authentication
- ✅ Cloud database with Supabase
- ✅ Movement Templates for quick entry
- ✅ Deployment ready

### 🚧 Future Enhancements

- Mobile app (React Native)
- Export data to CSV/Excel
- Recurring transactions (Auto-create)
- Email notifications
- Shared accounts (Family mode)
- Advanced Data analytics

## 💰 Cost

**$0/month** - Both Supabase and Vercel have generous free tiers perfect for personal use!

## 🔐 Security

- Row Level Security (RLS) ensures data isolation
- Encrypted passwords with Supabase Auth
- HTTPS only (automatic with Vercel)
- Environment variables for sensitive data
- No data mixing between users

## 📝 License

Private project for personal use
