/**
 * Unit tests for ArchiveAccountUseCase
 */

import 'reflect-metadata';
import { ArchiveAccountUseCase } from './ArchiveAccountUseCase';
import type { IAccountRepository } from '../../infrastructure/IAccountRepository';
import type { IPocketRepository } from '../../../pockets/infrastructure/IPocketRepository';
import { Account } from '../../domain/Account';
import { Pocket } from '../../../pockets/domain/Pocket';
import { NotFoundError } from '../../../../shared/errors/AppError';

describe('ArchiveAccountUseCase', () => {
  let useCase: ArchiveAccountUseCase;
  let mockAccountRepo: jest.Mocked<IAccountRepository>;
  let mockPocketRepo: jest.Mocked<IPocketRepository>;

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

    mockPocketRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findByAccountId: jest.fn(),
      findAllByUserId: jest.fn(),
      existsByNameInAccount: jest.fn(),
      existsByNameInAccountExcludingId: jest.fn(),
      existsFixedPocketInAccount: jest.fn(),
      existsFixedPocketForUser: jest.fn(),
      existsFixedPocketForUserExcludingId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      archive: jest.fn(),
      unarchive: jest.fn(),
      deleteByAccountId: jest.fn(),
      updateDisplayOrders: jest.fn(),
    } as jest.Mocked<IPocketRepository>;

    useCase = new ArchiveAccountUseCase(mockAccountRepo, mockPocketRepo);
  });

  it('should archive account and all its pockets', async () => {
    const accountId = 'account-1';
    const userId = 'user-1';
    const account = new Account(accountId, 'Checking', '#3b82f6', 'USD', 0);
    const pockets = [
      new Pocket('pocket-1', accountId, 'Savings', 'normal', 0, 'USD'),
      new Pocket('pocket-2', accountId, 'Travel', 'normal', 0, 'USD'),
    ];

    mockAccountRepo.findById.mockResolvedValue(account);
    mockPocketRepo.findByAccountId.mockResolvedValue(pockets);

    await useCase.execute(accountId, userId);

    expect(mockAccountRepo.findById).toHaveBeenCalledWith(accountId, userId);
    expect(mockAccountRepo.archive).toHaveBeenCalledWith(accountId, userId);
    expect(mockPocketRepo.findByAccountId).toHaveBeenCalledWith(accountId, userId);
    expect(mockPocketRepo.archive).toHaveBeenCalledTimes(2);
    expect(mockPocketRepo.archive).toHaveBeenCalledWith('pocket-1', userId);
    expect(mockPocketRepo.archive).toHaveBeenCalledWith('pocket-2', userId);
  });

  it('should archive account with no pockets without error', async () => {
    const accountId = 'account-1';
    const userId = 'user-1';
    const account = new Account(accountId, 'Checking', '#3b82f6', 'USD', 0);

    mockAccountRepo.findById.mockResolvedValue(account);
    mockPocketRepo.findByAccountId.mockResolvedValue([]);

    await useCase.execute(accountId, userId);

    expect(mockAccountRepo.archive).toHaveBeenCalledWith(accountId, userId);
    expect(mockPocketRepo.archive).not.toHaveBeenCalled();
  });

  it('should throw NotFoundError when account does not exist', async () => {
    mockAccountRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing', 'user-1')).rejects.toThrow(NotFoundError);
    await expect(useCase.execute('missing', 'user-1')).rejects.toThrow('Account not found');

    expect(mockAccountRepo.archive).not.toHaveBeenCalled();
    expect(mockPocketRepo.archive).not.toHaveBeenCalled();
  });

  it('should throw NotFoundError when user does not own the account', async () => {
    // Repository returns null when account is not owned by the requesting user
    mockAccountRepo.findById.mockResolvedValue(null);

    await expect(useCase.execute('account-1', 'wrong-user')).rejects.toThrow(NotFoundError);

    expect(mockAccountRepo.archive).not.toHaveBeenCalled();
  });
});
