// CRITICAL: Load environment variables FIRST, before any other imports
import dotenv from 'dotenv';
import path from 'path';

const envPath = path.resolve(__dirname, '../.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error('❌ Error loading .env file:', result.error);
  console.error('   Tried to load from:', envPath);
} else {
  console.log('✅ Environment variables loaded from:', envPath);
}

// Verify critical environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables:');
  console.error('   SUPABASE_URL:', process.env.SUPABASE_URL ? '✓' : '✗');
  console.error('   SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✓' : '✗');
  console.error('\n   Make sure backend/.env file exists and contains:');
  console.error('   - SUPABASE_URL');
  console.error('   - SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// NOW import everything else (after env vars are loaded)
import 'reflect-metadata';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { errorHandler } from './shared/middleware/errorHandler';
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
import settingsRoutes from './modules/settings/presentation/settingsRoutes';
import currencyRoutes from './modules/settings/presentation/currencyRoutes';

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
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
      settings: '/api/settings',
      currency: '/api/currency',
    },
  });
});

// Mount account routes
app.use('/api/accounts', accountRoutes);

// Mount investment routes
app.use('/api/investments', investmentRoutes);

// Mount pocket routes
app.use('/api/pockets', pocketRoutes);

// Mount sub-pocket routes
app.use('/api/sub-pockets', subPocketRoutes);

// Mount fixed expense group routes
app.use('/api/fixed-expense-groups', groupRoutes);

// Mount movement routes
app.use('/api/movements', movementRoutes);

// Mount settings routes
app.use('/api/settings', settingsRoutes);

// Mount currency routes
app.use('/api/currency', currencyRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Global error handler (must be last)
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;
