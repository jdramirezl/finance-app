/**
 * Supabase NetWorthSnapshot Repository Implementation
 */

import { injectable } from 'tsyringe';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { NetWorthSnapshot, CreateSnapshotDTO } from '../domain/NetWorthSnapshot';
import type { INetWorthSnapshotRepository } from '../interfaces/INetWorthSnapshotRepository';
import { DatabaseError } from '../../../shared/errors/AppError';

@injectable()
export class SupabaseNetWorthSnapshotRepository implements INetWorthSnapshotRepository {
    private supabase: SupabaseClient | null;

    constructor() {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

        if ((!supabaseUrl || !supabaseKey) && process.env.NODE_ENV !== 'test') {
            throw new Error('Supabase configuration missing');
        }

        this.supabase = supabaseUrl && supabaseKey
            ? createClient(supabaseUrl, supabaseKey)
            : null;
    }

    private ensureClient(): SupabaseClient {
        if (!this.supabase) {
            throw new DatabaseError('Supabase client not configured');
        }
        return this.supabase;
    }

    async findAll(userId: string): Promise<NetWorthSnapshot[]> {
        const { data, error } = await this.ensureClient()
            .from('net_worth_snapshots')
            .select('*')
            .eq('user_id', userId)
            .order('snapshot_date', { ascending: true });

        if (error) throw new DatabaseError(error.message);
        return data.map((item) => this.mapToDomain(item));
    }

    async findLatest(userId: string): Promise<NetWorthSnapshot | null> {
        const { data, error } = await this.ensureClient()
            .from('net_worth_snapshots')
            .select('*')
            .eq('user_id', userId)
            .order('snapshot_date', { ascending: false })
            .limit(1)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null; // No rows found
            throw new DatabaseError(error.message);
        }
        return this.mapToDomain(data);
    }

    async create(userId: string, dto: CreateSnapshotDTO): Promise<NetWorthSnapshot> {
        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await this.ensureClient()
            .from('net_worth_snapshots')
            .upsert({
                user_id: userId,
                snapshot_date: today,
                total_net_worth: dto.totalNetWorth,
                base_currency: dto.baseCurrency,
                breakdown: dto.breakdown
            }, {
                onConflict: 'user_id,snapshot_date'
            })
            .select()
            .single();

        if (error) throw new DatabaseError(error.message);
        return this.mapToDomain(data);
    }

    async delete(id: string): Promise<void> {
        const { error } = await this.ensureClient()
            .from('net_worth_snapshots')
            .delete()
            .eq('id', id);

        if (error) throw new DatabaseError(error.message);
    }

    private mapToDomain(data: any): NetWorthSnapshot {
        return {
            id: data.id,
            userId: data.user_id,
            snapshotDate: data.snapshot_date,
            totalNetWorth: parseFloat(data.total_net_worth),
            baseCurrency: data.base_currency,
            breakdown: data.breakdown || {},
            createdAt: data.created_at
        };
    }
}
