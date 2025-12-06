/**
 * NetWorthSnapshot Repository Interface
 */

import type { NetWorthSnapshot, CreateSnapshotDTO } from '../domain/NetWorthSnapshot';

export interface INetWorthSnapshotRepository {
    findAll(userId: string): Promise<NetWorthSnapshot[]>;
    findLatest(userId: string): Promise<NetWorthSnapshot | null>;
    create(userId: string, data: CreateSnapshotDTO): Promise<NetWorthSnapshot>;
    delete(id: string): Promise<void>;
}
