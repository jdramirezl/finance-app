/**
 * NetWorthSnapshot Controller
 */

import { Request, Response } from 'express';
import { NetWorthSnapshotService } from '../application/NetWorthSnapshotService';

export class NetWorthSnapshotController {
    constructor(private service: NetWorthSnapshotService) { }

    getAll = async (req: Request, res: Response) => {
        try {
            const userId = req.user!.id;
            const snapshots = await this.service.getAll(userId);
            res.json(snapshots);
        } catch (error) {
            console.error('Error in getAll snapshots:', error);
            res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
    };

    getLatest = async (req: Request, res: Response) => {
        try {
            const userId = req.user!.id;
            const snapshot = await this.service.getLatest(userId);
            res.json(snapshot);
        } catch (error) {
            console.error('Error in getLatest snapshot:', error);
            res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
    };

    create = async (req: Request, res: Response) => {
        try {
            const userId = req.user!.id;
            const snapshot = await this.service.createSnapshot(userId, req.body);
            res.status(201).json(snapshot);
        } catch (error) {
            console.error('Error in create snapshot:', error);
            res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
    };

    delete = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            await this.service.deleteSnapshot(id);
            res.status(204).send();
        } catch (error) {
            console.error('Error in delete snapshot:', error);
            res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
    };
}
