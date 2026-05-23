import { injectable, inject } from 'tsyringe';
import type { IReminderRepository } from '../../infrastructure/IReminderRepository';
import { CreateExceptionDTO, ReminderException } from '../../domain/ReminderException';
import { NotFoundError, ForbiddenError } from '../../../../shared/errors/AppError';

@injectable()
export class CreateReminderExceptionUseCase {
  constructor(
    @inject('ReminderRepository') private reminderRepo: IReminderRepository
  ) {}

  async execute(data: CreateExceptionDTO, userId: string): Promise<ReminderException> {
    const existing = await this.reminderRepo.findById(data.reminderId);
    if (!existing) throw new NotFoundError('Reminder not found');
    if (existing.userId !== userId) throw new ForbiddenError('Not authorized');

    return this.reminderRepo.createException(data);
  }
}
