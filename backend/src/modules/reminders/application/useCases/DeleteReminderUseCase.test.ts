import 'reflect-metadata';
import { DeleteReminderUseCase } from './DeleteReminderUseCase';
import type { IReminderRepository } from '../../infrastructure/IReminderRepository';
import { NotFoundError, ForbiddenError } from '../../../../shared/errors/AppError';

describe('DeleteReminderUseCase', () => {
  let useCase: DeleteReminderUseCase;
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
    useCase = new DeleteReminderUseCase(mockRepo);
  });

  it('should delete reminder when user owns it', async () => {
    mockRepo.findById.mockResolvedValue(existingReminder);
    mockRepo.delete.mockResolvedValue(undefined);

    await useCase.execute('rem-1', 'user-1');

    expect(mockRepo.delete).toHaveBeenCalledWith('rem-1');
  });

  it('should throw NotFoundError when reminder does not exist', async () => {
    mockRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('bad-id', 'user-1'))
      .rejects.toThrow(NotFoundError);
  });

  it('should throw ForbiddenError when userId does not match', async () => {
    mockRepo.findById.mockResolvedValue(existingReminder);

    await expect(useCase.execute('rem-1', 'other-user'))
      .rejects.toThrow(ForbiddenError);
    expect(mockRepo.delete).not.toHaveBeenCalled();
  });
});
