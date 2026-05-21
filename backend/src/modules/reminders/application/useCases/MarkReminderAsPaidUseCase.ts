import { injectable, inject } from 'tsyringe';
import type { IReminderRepository } from '../../infrastructure/IReminderRepository';
import { Reminder } from '../../domain/Reminder';
import { NotFoundError, ForbiddenError } from '../../../../shared/errors/AppError';

@injectable()
export class MarkReminderAsPaidUseCase {
  constructor(
    @inject('ReminderRepository') private reminderRepo: IReminderRepository
  ) {}

  async execute(id: string, userId: string, movementId?: string): Promise<Reminder> {
    const existing = await this.reminderRepo.findById(id);
    if (!existing) throw new NotFoundError('Reminder not found');
    if (existing.userId !== userId) throw new ForbiddenError('Not authorized');

    return this.reminderRepo.update(id, { isPaid: true, linkedMovementId: movementId });
  }
}
