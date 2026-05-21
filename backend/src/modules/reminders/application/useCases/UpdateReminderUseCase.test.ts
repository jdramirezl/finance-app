import 'reflect-metadata';
import { UpdateReminderUseCase } from './UpdateReminderUseCase';
import type { IReminderRepository } from '../../infrastructure/IReminderRepository';
import { NotFoundError, ForbiddenError } from '../../../../shared/errors/AppError';

describe('UpdateReminderUseCase', () => {
  let useCase: UpdateReminderUseCase;
  let mockRepo: jest.Mocked<IReminderRepository>;

  const existingReminder = {
    id: 'rem-1', userId: 'user-1', title: 'Rent', amount: 1200,
    dueDate: '2026-06-01', isPaid: false,
    recurrence: { type: 'monthly' as const, interval: 1, endType: 'never' as const },
    createdAt: '', updatedAt: '',
  };

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
    useCase = new UpdateReminderUseCase(mockRepo);
  });

  it('should update reminder when user owns it', async () => {
    mockRepo.findById.mockResolvedValue(existingReminder);
    mockRepo.update.mockResolvedValue({ ...existingReminder, amount: 1500 });

    const result = await useCase.execute('rem-1', { amount: 1500 }, 'user-1');

    expect(result.amount).toBe(1500);
    expect(mockRepo.update).toHaveBeenCalledWith('rem-1', { amount: 1500 });
  });

  it('should throw NotFoundError when reminder does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('bad-id', { amount: 1 }, 'user-1'))
      .rejects.toThrow(NotFoundError);
  });

  it('should throw ForbiddenError when userId does not match', async () => {
    mockRepo.findById.mockResolvedValue(existingReminder);

    await expect(useCase.execute('rem-1', { amount: 1 }, 'other-user'))
      .rejects.toThrow(ForbiddenError);
    expect(mockRepo.update).not.toHaveBeenCalled();
  });
});
