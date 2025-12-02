/**
 * Vercel Serverless Function Entry Point
 * 
 * This file wraps the Express backend for deployment on Vercel.
 * It exports the Express app as a serverless function handler.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// Import the Express app
// Note: We need to build the backend first, so we import from dist
let app: any;

// Lazy load the app to avoid cold start issues
async function getApp() {
  if (!app) {
    // In production, import from the built backend
    const { default: expressApp } = await import('../backend/dist/server.js');
    app = expressApp;
  }
  return app;
}

// Export the serverless function handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const expressApp = await getApp();
  return expressApp(req, res);
}
