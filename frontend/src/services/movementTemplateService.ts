import type { MovementTemplate, MovementType } from '../types';
import { supabase } from '../lib/supabase';
import { apiClient } from './apiClient';
import { mapMovementTemplateRow } from './mappers';

/**
 * Movement Template Service
 *
 * Mixed-transport service:
 *  - Reads go straight to Supabase (PostgREST) so the UI avoids the
 *    500-900ms backend auth round-trip and sees the latest write
 *    immediately. RLS filters by user_id on the table.
 *  - Writes still go through the Express backend via apiClient, which
 *    owns validation (required fields, uniqueness by name, ownership)
 *    and surfaces server errors as Error instances.
 */
const BASE = '/api/movement-templates';

class MovementTemplateService {
    /** List every template owned by the current user. */
    async getAllTemplates(): Promise<MovementTemplate[]> {
        const { data, error } = await supabase
            .from('movement_templates')
            .select('*')
            .order('name', { ascending: true });
        if (error) throw new Error(`Failed to fetch movement templates: ${error.message}`);
        return (data ?? []).map(mapMovementTemplateRow);
    }

    /** Fetch a single template by id; returns null when not found. */
    async getTemplate(id: string): Promise<MovementTemplate | null> {
        const { data, error } = await supabase
            .from('movement_templates')
            .select('*')
            .eq('id', id)
            .single();
        if (error) {
            if (error.code === 'PGRST116') return null;
            throw new Error(error.message);
        }
        return data ? mapMovementTemplateRow(data) : null;
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
