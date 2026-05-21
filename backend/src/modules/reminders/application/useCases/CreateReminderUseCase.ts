import { injectable, inject } from 'tsyringe';
import type { IReminderRepository } from '../../infrastructure/IReminderRepository';
import type { CreateReminderDTO } from '../dtos/ReminderDTO';
import { Reminder } from '../../domain/Reminder';

@injectable()
export class CreateReminderUseCase {
  constructor(
    @inject('ReminderRepository') private reminderRepo: IReminderRepository
  ) {}

  async execute(userId: string, data: CreateReminderDTO): Promise<Reminder> {
    return this.reminderRepo.create(userId, data);
  }
}
