import { Request, Response, NextFunction } from 'express';
import { injectable, inject } from 'tsyringe';
import { ReminderService } from '../application/ReminderService';
import type { CreateReminderDTO, UpdateReminderDTO } from '../application/dtos/ReminderDTO';

@injectable()
export class ReminderController {
    constructor(
        @inject(ReminderService) private reminderService: ReminderService) { }

    getAll = async (req: Request, res: Response) => {
        try {
            const userId = req.user!.id;
            const reminders = await this.reminderService.getAllReminders(userId);
            res.json(reminders);
        } catch (error) {
            res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
    };

    create = async (req: Request, res: Response) => {
        try {
            const userId = req.user!.id;
            const reminder = await this.reminderService.createReminder(userId, req.body);
            res.status(201).json(reminder);
        } catch (error) {
            res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
    };

    update = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const reminder = await this.reminderService.updateReminder(id, req.body);
            res.json(reminder);
        } catch (error) {
            res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
    };

    delete = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            await this.reminderService.deleteReminder(id);
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
    };

    markAsPaid = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { movementId } = req.body;
            const reminder = await this.reminderService.markAsPaid(id, movementId);
            res.json(reminder);
        } catch (error) {
            res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
    };
}
