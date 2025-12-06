/**
 * Net Worth Snapshot Service
 */

import { apiClient as api } from './apiClient';

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
        const response = await api.get<NetWorthSnapshot[]>('/api/net-worth-snapshots');
        return response;
    },

    getLatest: async (): Promise<NetWorthSnapshot | null> => {
        const response = await api.get<NetWorthSnapshot | null>('/api/net-worth-snapshots/latest');
        return response;
    },

    create: async (data: CreateSnapshotDTO): Promise<NetWorthSnapshot> => {
        const response = await api.post<NetWorthSnapshot>('/api/net-worth-snapshots', data);
        return response;
    },

    delete: async (id: string): Promise<void> => {
        await api.delete(`/api/net-worth-snapshots/${id}`);
    }
};
