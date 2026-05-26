/**
 * Net Worth Snapshot Service
 */

import { apiClient as api } from './apiClient';
import { supabase } from '../lib/supabase';
import { mapNetWorthSnapshotRow } from './mappers';

export interface NetWorthSnapshot {
    id: string;
    userId: string;
    snapshotDate: string;
    totalNetWorth: number;
    baseCurrency: string;
    breakdown: Record<string, number>;
    createdAt: string;
}

export interface CreateSnapshotDTO {
    totalNetWorth: number;
    baseCurrency: string;
    breakdown: Record<string, number>;
}

export const netWorthSnapshotService = {
    getAll: async (): Promise<NetWorthSnapshot[]> => {
        const { data, error } = await supabase
            .from('net_worth_snapshots')
            .select('*')
            .order('snapshot_date', { ascending: true });
        if (error) throw new Error(error.message);
        return (data ?? []).map(mapNetWorthSnapshotRow);
    },

    getLatest: async (): Promise<NetWorthSnapshot | null> => {
        const { data, error } = await supabase
            .from('net_worth_snapshots')
            .select('*')
            .order('snapshot_date', { ascending: false })
            .limit(1)
            .maybeSingle();
        if (error) throw new Error(error.message);
        return data ? mapNetWorthSnapshotRow(data) : null;
    },

    create: async (data: CreateSnapshotDTO): Promise<NetWorthSnapshot> => {
        const response = await api.post<NetWorthSnapshot>('/api/net-worth-snapshots', { ...data });
        return response;
    },

    update: async (id: string, data: Partial<CreateSnapshotDTO>): Promise<NetWorthSnapshot> => {
        const response = await api.put<NetWorthSnapshot>(`/api/net-worth-snapshots/${id}`, { ...data });
        return response;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/api/net-worth-snapshots/${id}`);
    }
};
