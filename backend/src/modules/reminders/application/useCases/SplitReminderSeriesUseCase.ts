import { injectable, inject } from 'tsyringe';
import type { IReminderRepository } from '../../infrastructure/IReminderRepository';
import type { CreateReminderDTO } from '../dtos/ReminderDTO';
import { Reminder } from '../../domain/Reminder';
import { NotFoundError, ForbiddenError } from '../../../../shared/errors/AppError';

@injectable()
export class SplitReminderSeriesUseCase {
  constructor(
    @inject('ReminderRepository') private reminderRepo: IReminderRepository
  ) {}

  async execute(userId: string, id: string, splitDate: string, newDetails?: CreateReminderDTO): Promise<Reminder | null> {
    const original = await this.reminderRepo.findById(id);
    if (!original) throw new NotFoundError('Reminder not found');
    if (original.userId !== userId) throw new ForbiddenError('Not authorized');

    // End original series the day before splitDate
    const splitDateObj = new Date(splitDate);
    const dayBeforeObj = new Date(splitDateObj);
    dayBeforeObj.setDate(dayBeforeObj.getDate() - 1);
    const dayBeforeStr = dayBeforeObj.toISOString().split('T')[0];

    await this.reminderRepo.update(id, {
      recurrence: {
        ...original.recurrence,
        endType: 'on_date',
        endDate: dayBeforeStr
      }
    });

    // Create new series if details provided (Edit action)
    if (newDetails) {
      return this.reminderRepo.create(userId, newDetails);
    }

    return null;
  }
}
