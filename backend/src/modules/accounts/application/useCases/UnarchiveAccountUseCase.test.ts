/**
 * Unit tests for UnarchiveAccountUseCase
 */

import 'reflect-metadata';
import { UnarchiveAccountUseCase } from './UnarchiveAccountUseCase';
import type { IAccountRepository } from '../../infrastructure/IAccountRepository';
import { Account } from '../../domain/Account';
import { NotFoundError } from '../../../../shared/errors/AppError';

describe('UnarchiveAccountUseCase', () => {
  let useCase: UnarchiveAccountUseCase;
  let mockAccountRepo: jest.Mocked<IAccountRepository>;

  beforeEach(() => {
    mockAccountRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findAllByUserId: jest.fn(),
      existsByNameAndCurrency: jest.fn(),
      existsByNameAndCurrencyExcludingId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      archive: jest.fn(),
      unarchive: jest.fn(),
      updateDisplayOrders: jest.fn(),
    } as jest.Mocked<IAccountRepository>;

    useCase = new UnarchiveAccountUseCase(mockAccountRepo);
  });

  it('should unarchive an existing account', async () => {
    const accountId = 'account-1';
    const userId = 'user-1';
    const account = new Account(accountId, 'Checking', '#3b82f6', 'USD', 0);

    mockAccountRepo.findById.mockResolvedValue(account);

    await useCase.execute(accountId, userId);

    expect(mockAccountRepo.findById).toHaveBeenCalledWith(accountId, userId);
    expect(mockAccountRepo.unarchive).toHaveBeenCalledWith(accountId, userId);
  });

  it('should throw NotFoundError when account does not exist', async () => {
    mockAccountRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing', 'user-1')).rejects.toThrow(NotFoundError);
    await expect(useCase.execute('missing', 'user-1')).rejects.toThrow('Account not found');

    expect(mockAccountRepo.unarchive).not.toHaveBeenCalled();
  });
});
