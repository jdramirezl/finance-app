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
            console.error('Error in getAll reminders:', error);
            res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
    };

    create = async (req: Request, res: Response) => {
        try {
            const userId = req.user!.id;
            const reminder = await this.reminderService.createReminder(userId, req.body);
            res.status(201).json(reminder);
        } catch (error) {
            console.error('Error in create reminder:', error);
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

    createException = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            // Merge reminderId from params with body data
            const exceptionData = { ...req.body, reminderId: id };
            const exception = await this.reminderService.createException(exceptionData);
            res.status(201).json(exception);
        } catch (error) {
            console.error('Error in createException:', error);
            res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
    };

    splitSeries = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { splitDate, newDetails } = req.body;
            const result = await this.reminderService.splitSeries(req.user!.id, id, splitDate, newDetails);
            res.status(200).json(result || { message: 'Series ended' });
        } catch (error) {
            console.error('Error in splitSeries:', error);
            res.status(500).json({ error: error instanceof Error ? error.message : 'Unknown error' });
        }
    };
}
