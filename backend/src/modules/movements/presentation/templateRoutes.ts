/**
 * Movement Template Routes
 *
 * Lightweight CRUD endpoints for movement_templates. There is no domain
 * logic beyond uniqueness-by-name and basic validation, so we deliberately
 * skip the full controller + use-case + repository layering used by other
 * modules and talk to Supabase directly. Keep that scope in mind before
 * adding complexity here.
 *
 * Routes are protected by authMiddleware, which attaches req.user.id; every
 * query is scoped to that user_id so a request can never read or modify
 * another user's templates.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { authMiddleware } from '../../../shared/middleware/authMiddleware';
import {
    DatabaseError,
    NotFoundError,
    ValidationError,
    ConflictError,
} from '../../../shared/errors/AppError';
import { generateId } from '../../../shared/utils/idGenerator';

// ---------------------------------------------------------------------------
// Supabase client
// ---------------------------------------------------------------------------
// Mirrors the lazy-init pattern used by authMiddleware and the Supabase
// repositories: skip throwing during module load when running tests without
// credentials, but fail loudly the first time a route actually tries to
// query.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if ((!supabaseUrl || !supabaseKey) && process.env.NODE_ENV !== 'test') {
    throw new Error('Supabase configuration missing: SUPABASE_URL and SUPABASE_SERVICE_KEY required');
}

const supabase: SupabaseClient | null = supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

function ensureClient(): SupabaseClient {
    if (!supabase) {
        throw new DatabaseError('Supabase client not configured');
    }
    return supabase;
}

// ---------------------------------------------------------------------------
// DTO + mapping
// ---------------------------------------------------------------------------
interface MovementTemplateRow {
    id: string;
    user_id: string;
    name: string;
    type: string;
    account_id: string | null;
    pocket_id: string | null;
    sub_pocket_id: string | null;
    default_amount: string | number | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
}

interface MovementTemplateDTO {
    id: string;
    name: string;
    type: string;
    accountId: string | null;
    pocketId: string | null;
    subPocketId: string | null;
    defaultAmount: number | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
}

function rowToDTO(row: MovementTemplateRow): MovementTemplateDTO {
    return {
        id: row.id,
        name: row.name,
        type: row.type,
        accountId: row.account_id,
        pocketId: row.pocket_id,
        subPocketId: row.sub_pocket_id,
        defaultAmount: row.default_amount !== null && row.default_amount !== undefined
            ? Number(row.default_amount)
            : null,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------
function requireString(value: unknown, field: string): string {
    if (typeof value !== 'string' || value.trim().length === 0) {
        throw new ValidationError(`${field} is required`);
    }
    return value.trim();
}

function optionalString(value: unknown): string | null {
    if (value === undefined || value === null) return null;
    if (typeof value !== 'string') return null;
    const trimmed = value.trim();
    return trimmed.length === 0 ? null : trimmed;
}

function optionalNumber(value: unknown): number | null {
    if (value === undefined || value === null) return null;
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.trim() !== '') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
const router = Router();

router.use(authMiddleware);

/**
 * GET /api/movement-templates
 * List all templates for the authenticated user.
 */
router.get('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user!.id;

        const { data, error } = await ensureClient()
            .from('movement_templates')
            .select('*')
            .eq('user_id', userId)
            .order('name', { ascending: true });

        if (error) throw new DatabaseError(`Failed to fetch movement templates: ${error.message}`);

        res.json((data ?? []).map(rowToDTO));
    } catch (err) {
        next(err);
    }
});

/**
 * GET /api/movement-templates/:id
 * Fetch a single template owned by the authenticated user.
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user!.id;
        const id = req.params.id;

        const { data, error } = await ensureClient()
            .from('movement_templates')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                throw new NotFoundError(`Movement template ${id} not found`);
            }
            throw new DatabaseError(`Failed to fetch movement template: ${error.message}`);
        }

        res.json(rowToDTO(data));
    } catch (err) {
        next(err);
    }
});

/**
 * POST /api/movement-templates
 * Create a new template.
 *
 * Body: { name, type, accountId, pocketId, subPocketId?, defaultAmount?, notes? }
 */
router.post('/', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user!.id;

        const name = requireString(req.body?.name, 'name');
        const type = requireString(req.body?.type, 'type');
        const accountId = requireString(req.body?.accountId, 'accountId');
        const pocketId = requireString(req.body?.pocketId, 'pocketId');
        const subPocketId = optionalString(req.body?.subPocketId);
        const defaultAmount = optionalNumber(req.body?.defaultAmount);
        const notes = optionalString(req.body?.notes);

        const now = new Date().toISOString();
        const insertRow = {
            id: generateId(),
            user_id: userId,
            name,
            type,
            account_id: accountId,
            pocket_id: pocketId,
            sub_pocket_id: subPocketId,
            default_amount: defaultAmount,
            notes,
            created_at: now,
            updated_at: now,
        };

        const { data, error } = await ensureClient()
            .from('movement_templates')
            .insert(insertRow)
            .select()
            .single();

        if (error) {
            // Postgres unique_violation maps to a 409 — the table has a
            // UNIQUE (user_id, name) index.
            if (error.code === '23505') {
                throw new ConflictError(`A movement template named "${name}" already exists`);
            }
            throw new DatabaseError(`Failed to create movement template: ${error.message}`);
        }

        res.status(201).json(rowToDTO(data));
    } catch (err) {
        next(err);
    }
});

/**
 * PUT /api/movement-templates/:id
 * Replace mutable fields on an existing template.
 *
 * Body fields are all optional; whatever is provided is updated.
 */
router.put('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user!.id;
        const id = req.params.id;

        // Build an update payload only out of fields the caller actually sent
        // so we never null out columns by accident.
        const updates: Record<string, unknown> = {};
        if (req.body?.name !== undefined) updates.name = requireString(req.body.name, 'name');
        if (req.body?.type !== undefined) updates.type = requireString(req.body.type, 'type');
        if (req.body?.accountId !== undefined) updates.account_id = requireString(req.body.accountId, 'accountId');
        if (req.body?.pocketId !== undefined) updates.pocket_id = requireString(req.body.pocketId, 'pocketId');
        if (req.body?.subPocketId !== undefined) updates.sub_pocket_id = optionalString(req.body.subPocketId);
        if (req.body?.defaultAmount !== undefined) updates.default_amount = optionalNumber(req.body.defaultAmount);
        if (req.body?.notes !== undefined) updates.notes = optionalString(req.body.notes);

        if (Object.keys(updates).length === 0) {
            throw new ValidationError('No updatable fields provided');
        }

        updates.updated_at = new Date().toISOString();

        const { data, error } = await ensureClient()
            .from('movement_templates')
            .update(updates)
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                throw new NotFoundError(`Movement template ${id} not found`);
            }
            if (error.code === '23505') {
                throw new ConflictError(`A movement template with that name already exists`);
            }
            throw new DatabaseError(`Failed to update movement template: ${error.message}`);
        }

        res.json(rowToDTO(data));
    } catch (err) {
        next(err);
    }
});

/**
 * DELETE /api/movement-templates/:id
 * Remove a template the authenticated user owns.
 */
router.delete('/:id', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const userId = req.user!.id;
        const id = req.params.id;

        const { error, count } = await ensureClient()
            .from('movement_templates')
            .delete({ count: 'exact' })
            .eq('id', id)
            .eq('user_id', userId);

        if (error) {
            throw new DatabaseError(`Failed to delete movement template: ${error.message}`);
        }
        if ((count ?? 0) === 0) {
            throw new NotFoundError(`Movement template ${id} not found`);
        }

        res.status(204).send();
    } catch (err) {
        next(err);
    }
});

export default router;
