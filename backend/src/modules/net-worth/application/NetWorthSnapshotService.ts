/**
 * NetWorthSnapshot Service
 */

import type { INetWorthSnapshotRepository } from '../interfaces/INetWorthSnapshotRepository';
import type { CreateSnapshotDTO, NetWorthSnapshot } from '../domain/NetWorthSnapshot';

export class NetWorthSnapshotService {
    constructor(private repository: INetWorthSnapshotRepository) { }

    async getAll(userId: string): Promise<NetWorthSnapshot[]> {
        return this.repository.findAll(userId);
    }

    async getLatest(userId: string): Promise<NetWorthSnapshot | null> {
        return this.repository.findLatest(userId);
    }

    async createSnapshot(userId: string, data: CreateSnapshotDTO): Promise<NetWorthSnapshot> {
        return this.repository.create(userId, data);
    }

    async deleteSnapshot(id: string): Promise<void> {
        return this.repository.delete(id);
    }
}
