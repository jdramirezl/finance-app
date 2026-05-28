// CRITICAL: Load environment variables FIRST, before any other imports
import dotenv from 'dotenv';
import path from 'path';

// Try to load .env file (for local development)
// In production (Vercel, etc.), environment variables are provided directly
const envPath = path.resolve(__dirname, '../.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  // Only warn in development, not an error in production
  if (process.env.NODE_ENV !== 'production') {
    console.warn('⚠️  No .env file found:', envPath);
    console.warn('   Using environment variables from system');
  }
} else {
  console.log('✅ Environment variables loaded from:', envPath);
}

// Verify critical environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL:', process.env.SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✓' : '✗');
  console.error('\n   Make sure environment variables are set in:');
  console.error('   - Local: backend/.env file');
  console.error('   - Production: Vercel/hosting platform dashboard');
  process.exit(1);
}

// NOW import everything else (after env vars are loaded)
import 'reflect-metadata';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { errorHandler } from './shared/middleware/errorHandler';
import { cacheControl } from './shared/middleware/cacheControl';
import { initializeContainer } from './shared/container';

// Initialize dependency injection container BEFORE importing routes
initializeContainer();

// Import routes AFTER container is initialized
import accountRoutes from './modules/accounts/presentation/routes';
import investmentRoutes from './modules/accounts/presentation/investmentRoutes';
import pocketRoutes from './modules/pockets/presentation/routes';
import subPocketRoutes from './modules/sub-pockets/presentation/subPocketRoutes';
import groupRoutes from './modules/sub-pockets/presentation/groupRoutes';
import movementRoutes from './modules/movements/presentation/routes';
import templateRoutes from './modules/movements/presentation/templateRoutes';
import settingsRoutes from './modules/settings/presentation/settingsRoutes';
import currencyRoutes from './modules/settings/presentation/currencyRoutes';
import reminderRoutes from './modules/reminders/presentation/routes';
import netWorthRoutes from './modules/net-worth/presentation/routes';
import reportRoutes from './modules/reports/presentation/routes';
import syncRoutes from './modules/sync/presentation/syncRoutes';

const app = express();
const PORT = process.env.PORT || process.env.BACKEND_PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://finance-app-five-navy.vercel.app', 'https://finance-app.vercel.app']
    : ['http://localhost:5173', 'http://localhost:5174'],
  credentials: true,
}));
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.get('/api', (req: Request, res: Response) => {
  res.json({
    message: 'Finance App Backend API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api',
      accounts: '/api/accounts',
      investments: '/api/investments',
      pockets: '/api/pockets',
      subPockets: '/api/sub-pockets',
      fixedExpenseGroups: '/api/fixed-expense-groups',
      movements: '/api/movements',
      movementTemplates: '/api/movement-templates',
      settings: '/api/settings',
      currency: '/api/currency',
    },
  });
});

// Cache-Control headers per route group (GET responses only).
// Tunes browser caching to data volatility: stable data caches longer,
// volatile data (movements) caches briefly. Mutations are never cached.
const cacheStable = cacheControl(120, 300);            // accounts, pockets, sub-pockets, fixed-expense-groups
const cacheMovements = cacheControl(60, 120);          // movements (volatile)
const cacheInvestments = cacheControl(900, 1800);      // investments (15 min)
const cacheCurrency = cacheControl(3600, 7200);        // currency rates (1 hour)
const cacheSettings = cacheControl(300, 600);          // settings, snapshots, templates
const cacheReminders = cacheControl(120, 300);         // reminders

// Mount account routes
app.use('/api/accounts', cacheStable, accountRoutes);

// Mount investment routes
app.use('/api/investments', cacheInvestments, investmentRoutes);

// Mount pocket routes
app.use('/api/pockets', cacheStable, pocketRoutes);

// Mount sub-pocket routes
app.use('/api/sub-pockets', cacheStable, subPocketRoutes);

// Mount fixed expense group routes
app.use('/api/fixed-expense-groups', cacheStable, groupRoutes);

// Mount movement routes
app.use('/api/movements', cacheMovements, movementRoutes);

// Mount movement template routes
app.use('/api/movement-templates', cacheSettings, templateRoutes);

// Mount settings routes
app.use('/api/settings', cacheSettings, settingsRoutes);

// Mount currency routes
app.use('/api/currency', cacheCurrency, currencyRoutes);

// Mount reminder routes
app.use('/api/reminders', cacheReminders, reminderRoutes);

// Mount net worth snapshot routes
app.use('/api/net-worth-snapshots', cacheSettings, netWorthRoutes);

// Mount reports routes
app.use('/api/reports', cacheMovements, reportRoutes);

// Mount sync routes
app.use('/api/sync', syncRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// Start server (only in non-serverless environments)
if (process.env.VERCEL !== '1') {
  app.listen(PORT, () => {
    console.log(`🚀 Backend server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

export default app;
