/**
 * Supabase NetWorthSnapshot Repository Implementation
 */

import { injectable, inject } from 'tsyringe';
import { SupabaseClient } from '@supabase/supabase-js';
import type { NetWorthSnapshot, CreateSnapshotDTO } from '../domain/NetWorthSnapshot';
import type { INetWorthSnapshotRepository } from './INetWorthSnapshotRepository';
import { DatabaseError } from '../../../shared/errors/AppError';

@injectable()
export class SupabaseNetWorthSnapshotRepository implements INetWorthSnapshotRepository {
    private supabase: SupabaseClient;

    constructor(@inject('SupabaseClient') supabase: SupabaseClient) {
        this.supabase = supabase;
    }

    async findAll(userId: string): Promise<NetWorthSnapshot[]> {
        const { data, error } = await this.supabase
            .from('net_worth_snapshots')
            .select('*')
            .eq('user_id', userId)
            .order('snapshot_date', { ascending: true });

        if (error) throw new DatabaseError(error.message);
        return data.map((item) => this.mapToDomain(item));
    }

    async findLatest(userId: string): Promise<NetWorthSnapshot | null> {
        const { data, error } = await this.supabase
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

    async findById(id: string): Promise<NetWorthSnapshot | null> {
        const { data, error } = await this.supabase
            .from('net_worth_snapshots')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            if (error.code === 'PGRST116') return null;
            throw new DatabaseError(error.message);
        }
        return this.mapToDomain(data);
    }

    async create(userId: string, dto: CreateSnapshotDTO): Promise<NetWorthSnapshot> {
        const today = new Date().toISOString().split('T')[0];

        const { data, error } = await this.supabase
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

    async update(id: string, dto: Partial<CreateSnapshotDTO>): Promise<NetWorthSnapshot> {
        const updateData: any = {};
        if (dto.totalNetWorth !== undefined) updateData.total_net_worth = dto.totalNetWorth;
        if (dto.baseCurrency !== undefined) updateData.base_currency = dto.baseCurrency;
        if (dto.breakdown !== undefined) updateData.breakdown = dto.breakdown;

        const { data, error } = await this.supabase
            .from('net_worth_snapshots')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) throw new DatabaseError(error.message);
        return this.mapToDomain(data);
    }

    async delete(id: string): Promise<void> {
        const { error } = await this.supabase
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
