import 'reflect-metadata';
import { CreateReminderUseCase } from './CreateReminderUseCase';
import type { IReminderRepository } from '../../infrastructure/IReminderRepository';
import type { CreateReminderDTO } from '../dtos/ReminderDTO';
import type { Reminder } from '../../domain/Reminder';

describe('CreateReminderUseCase', () => {
  let useCase: CreateReminderUseCase;
  let mockRepo: jest.Mocked<IReminderRepository>;

  beforeEach(() => {
    mockRepo = {
      findAll: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findByLinkedMovementId: jest.fn(),
      createException: jest.fn(),
    };
    useCase = new CreateReminderUseCase(mockRepo);
  });

  it('should create a reminder and return it', async () => {
    const dto: CreateReminderDTO = {
      title: 'Rent',
      amount: 1200,
      dueDate: '2026-06-01',
      recurrence: { type: 'monthly', interval: 1, endType: 'never' },
    };
    const expected: Reminder = {
      id: 'rem-1', userId: 'user-1', title: 'Rent', amount: 1200,
      dueDate: '2026-06-01', isPaid: false,
      recurrence: { type: 'monthly', interval: 1, endType: 'never' },
      createdAt: '', updatedAt: '',
    };
    mockRepo.create.mockResolvedValue(expected);

    const result = await useCase.execute('user-1', dto);

    expect(result).toEqual(expected);
    expect(mockRepo.create).toHaveBeenCalledWith('user-1', dto);
  });

  it('should pass optional fields through to repository', async () => {
    const dto: CreateReminderDTO = {
      title: 'Internet',
      amount: 600,
      dueDate: '2026-06-15',
      recurrence: { type: 'monthly', interval: 1, endType: 'never' },
      fixedExpenseId: 'fe-1',
      templateId: 'tmpl-1',
    };
    mockRepo.create.mockResolvedValue({ id: 'rem-2', userId: 'user-1', ...dto, isPaid: false, createdAt: '', updatedAt: '' } as any);

    await useCase.execute('user-1', dto);

    expect(mockRepo.create).toHaveBeenCalledWith('user-1', dto);
  });
});
