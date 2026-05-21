import { container } from 'tsyringe';
import { IReminderRepository } from '../../modules/reminders/infrastructure/IReminderRepository';
import { SupabaseReminderRepository } from '../../modules/reminders/infrastructure/SupabaseReminderRepository';
import { GetAllRemindersUseCase } from '../../modules/reminders/application/useCases/GetAllRemindersUseCase';
import { CreateReminderUseCase } from '../../modules/reminders/application/useCases/CreateReminderUseCase';
import { UpdateReminderUseCase } from '../../modules/reminders/application/useCases/UpdateReminderUseCase';
import { DeleteReminderUseCase } from '../../modules/reminders/application/useCases/DeleteReminderUseCase';
import { MarkReminderAsPaidUseCase } from '../../modules/reminders/application/useCases/MarkReminderAsPaidUseCase';
import { CreateReminderExceptionUseCase } from '../../modules/reminders/application/useCases/CreateReminderExceptionUseCase';
import { SplitReminderSeriesUseCase } from '../../modules/reminders/application/useCases/SplitReminderSeriesUseCase';
import { ReminderController } from '../../modules/reminders/presentation/ReminderController';

export function registerReminderModule(): void {
  container.register<IReminderRepository>('ReminderRepository', {
    useClass: SupabaseReminderRepository,
  });
  container.register(GetAllRemindersUseCase, { useClass: GetAllRemindersUseCase });
  container.register(CreateReminderUseCase, { useClass: CreateReminderUseCase });
  container.register(UpdateReminderUseCase, { useClass: UpdateReminderUseCase });
  container.register(DeleteReminderUseCase, { useClass: DeleteReminderUseCase });
  container.register(MarkReminderAsPaidUseCase, { useClass: MarkReminderAsPaidUseCase });
  container.register(CreateReminderExceptionUseCase, { useClass: CreateReminderExceptionUseCase });
  container.register(SplitReminderSeriesUseCase, { useClass: SplitReminderSeriesUseCase });
  container.register(ReminderController, { useClass: ReminderController });
}
