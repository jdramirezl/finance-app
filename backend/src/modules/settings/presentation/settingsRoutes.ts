/**
 * Settings Routes
 * 
 * Defines HTTP routes for settings operations.
 * All routes are protected with authentication middleware.
 * 
 * Requirements: 14.1-14.3
 */

import { Router } from 'express';
import { container } from 'tsyringe';
import { SettingsController } from './SettingsController';
import { authMiddleware } from '../../../shared/middleware/authMiddleware';

const router = Router();

// Resolve controller from DI container
const controller = container.resolve(SettingsController);

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * GET /api/settings
 * Get user settings
 * 
 * Response: 200 + SettingsResponseDTO
 * Errors: 404 (not found)
 * 
 * Requirements: 14.1
 */
router.get('/', (req, res, next) => controller.get(req, res, next));

/**
 * PUT /api/settings
 * Update user settings
 * 
 * Body: UpdateSettingsDTO
 * Response: 200 + SettingsResponseDTO
 * Errors: 400 (validation), 404 (not found)
 * 
 * Requirements: 14.2, 14.3
 */
router.put('/', (req, res, next) => controller.update(req, res, next));

export default router;
