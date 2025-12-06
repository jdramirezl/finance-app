import { IReminderRepository } from '../interfaces/IReminderRepository';
import { CreateReminderDTO, UpdateReminderDTO } from '../application/dtos/ReminderDTO';
import { CreateExceptionDTO } from '../domain/ReminderException';
import { NotFoundError } from '../../../shared/errors/AppError';

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

    async createException(data: CreateExceptionDTO) {
        return this.repository.createException(data);
    }

    async splitSeries(userId: string, id: string, splitDate: string, newDetails?: CreateReminderDTO) {
        const original = await this.repository.findById(id);
        if (!original) throw new NotFoundError('Reminder not found');
        if (original.userId !== userId) throw new Error('Unauthorized');

        // 1. Update original series to end BEFORE splitDate
        // Assuming splitDate is YYYY-MM-DD
        const splitDateObj = new Date(splitDate);
        const dayBeforeObj = new Date(splitDateObj);
        dayBeforeObj.setDate(dayBeforeObj.getDate() - 1);
        const dayBeforeStr = dayBeforeObj.toISOString().split('T')[0];

        await this.repository.update(id, {
            recurrence: {
                ...original.recurrence,
                endType: 'on_date',
                endDate: dayBeforeStr
            }
        });

        // 2. Create new series if details provided (Edit action)
        if (newDetails) {
            return this.repository.create(userId, newDetails);
        }

        // If Delete action (no newDetails), explicitly return nothing/void 
        // effectively, the original just stopped.
    }
}
