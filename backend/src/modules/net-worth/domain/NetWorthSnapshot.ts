/**
 * NetWorthSnapshot Domain Entity
 */

export interface NetWorthSnapshot {
    id: string;
    userId: string;
    snapshotDate: string;  // YYYY-MM-DD
    totalNetWorth: number;
    baseCurrency: string;
    breakdown: Record<string, number>;  // { "USD": 5000, "MXN": 20000 }
    createdAt: string;
}

export interface CreateSnapshotDTO {
    totalNetWorth: number;
    baseCurrency: string;
    breakdown: Record<string, number>;
}
