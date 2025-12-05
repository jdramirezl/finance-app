import { IReminderRepository } from '../interfaces/IReminderRepository';
import { CreateReminderDTO, UpdateReminderDTO } from '../application/dtos/ReminderDTO';

export class ReminderService {
    constructor(private repository: IReminderRepository) { }

    async getAllReminders(userId: string) {
        return this.repository.findAll(userId);
    }

    async createReminder(userId: string, data: CreateReminderDTO) {
        return this.repository.create(userId, data);
    }

    async updateReminder(id: string, data: UpdateReminderDTO) {
        return this.repository.update(id, data);
    }

    async deleteReminder(id: string) {
        return this.repository.delete(id);
    }

    async markAsPaid(id: string, movementId?: string) {
        return this.repository.update(id, {
            isPaid: true,
            linkedMovementId: movementId
        });
    }
}
