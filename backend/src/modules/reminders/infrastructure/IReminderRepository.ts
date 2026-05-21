import { Reminder } from '../domain/Reminder';
import { CreateReminderDTO, UpdateReminderDTO } from '../application/dtos/ReminderDTO';
import { CreateExceptionDTO, ReminderException } from '../domain/ReminderException';

export interface IReminderRepository {
    findAll(userId: string): Promise<Reminder[]>;
    findById(id: string): Promise<Reminder | null>;
    create(userId: string, data: CreateReminderDTO): Promise<Reminder>;
    update(id: string, data: UpdateReminderDTO): Promise<Reminder>;
    delete(id: string): Promise<void>;
    findByLinkedMovementId(movementId: string): Promise<Reminder | null>;
    createException(data: CreateExceptionDTO): Promise<ReminderException>;
}
