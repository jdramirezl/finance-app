import type { MovementTemplate, MovementType } from '../types';
import { apiClient } from './apiClient';

/**
 * Movement Template Service
 *
 * Thin client over the backend's /api/movement-templates routes. The
 * backend owns validation (required fields, uniqueness by name, ownership
 * via RLS / req.user.id), so this service is intentionally minimal and
 * just forwards user input. Errors raised by the backend surface through
 * apiClient as Error instances with the server-provided message.
 */
const BASE = '/api/movement-templates';

class MovementTemplateService {
    /** List every template owned by the current user. */
    async getAllTemplates(): Promise<MovementTemplate[]> {
        return apiClient.get<MovementTemplate[]>(BASE);
    }

    /** Fetch a single template by id; returns null on 404. */
    async getTemplate(id: string): Promise<MovementTemplate | null> {
        try {
            return await apiClient.get<MovementTemplate>(`${BASE}/${id}`);
        } catch (err) {
            const message = err instanceof Error ? err.message : '';
            if (message.includes('not found')) {
                return null;
            }
            throw err;
        }
    }

    /** Create a new template. Backend enforces uniqueness on (user_id, name). */
    async createTemplate(
        name: string,
        type: MovementType,
        accountId: string,
        pocketId: string,
        defaultAmount?: number | null,
        notes?: string | null,
        subPocketId?: string | null
    ): Promise<MovementTemplate> {
        return apiClient.post<MovementTemplate>(BASE, {
            name,
            type,
            accountId,
            pocketId,
            subPocketId: subPocketId ?? null,
            defaultAmount: defaultAmount ?? null,
            notes: notes ?? null,
        });
    }

    /** Update a subset of fields on an existing template. */
    async updateTemplate(
        id: string,
        updates: Partial<Pick<MovementTemplate, 'name' | 'type' | 'accountId' | 'pocketId' | 'subPocketId' | 'defaultAmount' | 'notes'>>
    ): Promise<MovementTemplate> {
        return apiClient.put<MovementTemplate>(`${BASE}/${id}`, updates);
    }

    /** Delete a template by id. */
    async deleteTemplate(id: string): Promise<void> {
        await apiClient.delete<void>(`${BASE}/${id}`);
    }
}

export const movementTemplateService = new MovementTemplateService();
