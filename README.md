# Finance App - Personal Finance Management System

A modern web application for managing personal finances with multi-user support, cloud sync, and comprehensive financial tracking.

## ✨ Features

- 🔐 **Secure Authentication** - Email/password with Supabase
- 👥 **Multi-User Support** - Each user has private finances
- ☁️ **Cloud Sync** - Access from any device
- 💰 **Account Management** - Track multiple accounts and pockets
- 📊 **Movement Tracking** - Record all transactions with filters
- 🎯 **Budget Planning** - Plan income distribution
- 📅 **Fixed Expenses** - Manage recurring expenses
- ⏳ **Pending Movements** - Track future transactions
- 💱 **Multi-Currency** - Support for USD, MXN, COP, EUR, GBP
- 📈 **Investment Tracking** - Track stocks and gains
- 🌙 **Dark Mode** - Full dark theme support

## 🚀 Quick Start

### For Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
```

### For Deployment

See [QUICK_START.md](./QUICK_START.md) for 25-minute deployment guide!

## 🛠️ Tech Stack

**Frontend:**
- **React 19** + **TypeScript** - UI framework
- **Vite** - Build tool and dev server
- **React Router v7** - Client-side routing
- **Tailwind CSS v4** - Styling
- **Zustand** - State management
- **Lucide React** - Icons
- **date-fns** - Date utilities

**Backend:**
- **Supabase** - PostgreSQL database + Authentication
- **Row Level Security** - Data isolation per user

**Hosting:**
- **Vercel** - Frontend hosting (FREE)
- **Supabase** - Backend hosting (FREE)

## Project Structure

```
src/
├── components/     # Reusable UI components
├── pages/          # Page components (routes)
├── services/       # Business logic and API services
├── store/          # Zustand state stores
├── types/          # TypeScript type definitions
├── utils/          # Utility functions
└── hooks/          # Custom React hooks
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

- **[QUICK_START.md](./QUICK_START.md)** - Deploy in 25 minutes
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - Detailed deployment instructions
- **[DEPLOYMENT_SUMMARY.md](./DEPLOYMENT_SUMMARY.md)** - What was implemented
- **[PROJECT_SPEC.md](./docs/PROJECT_SPEC.md)** - Complete specifications
- **[PENDING_MOVEMENTS.md](./docs/PENDING_MOVEMENTS.md)** - Pending movements feature

## 🎯 Development Status

### ✅ Completed Features

- ✅ Account and pocket management with drag & drop
- ✅ Monthly movement tracking with advanced filters
- ✅ Budget planning
- ✅ Fixed expenses with sub-pockets
- ✅ Multi-currency support
- ✅ Investment tracking (VOO)
- ✅ Pending movements
- ✅ Dark mode
- ✅ Multi-user authentication
- ✅ Cloud database with Supabase
- ✅ Movement Templates for quick entry
- ✅ Deployment ready

### 🚧 Future Enhancements

- Mobile app (React Native)
- Export data to CSV/Excel
- Recurring transactions
- Email notifications
- Shared accounts
- Data analytics

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
