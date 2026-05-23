import { injectable, inject } from 'tsyringe';
import type { IReminderRepository } from '../../infrastructure/IReminderRepository';
import { Reminder } from '../../domain/Reminder';

@injectable()
export class GetAllRemindersUseCase {
  constructor(
    @inject('ReminderRepository') private reminderRepo: IReminderRepository
  ) {}

  async execute(userId: string): Promise<Reminder[]> {
    return this.reminderRepo.findAll(userId);
  }
}
