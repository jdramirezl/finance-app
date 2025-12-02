/**
 * Unit tests for CreatePocketUseCase
 */

import 'reflect-metadata';
import { CreatePocketUseCase } from './CreatePocketUseCase';
import type { IPocketRepository } from '../../infrastructure/IPocketRepository';
import type { IAccountRepository } from '../../../accounts/infrastructure/IAccountRepository';
import type { CreatePocketDTO } from '../dtos/PocketDTO';
import { Account } from '../../../accounts/domain/Account';
import { ValidationError, ConflictError, NotFoundError } from '../../../../shared/errors/AppError';
import type { Currency } from '@shared-backend/types';

describe('CreatePocketUseCase', () => {
  let useCase: CreatePocketUseCase;
  let mockPocketRepo: jest.Mocked<IPocketRepository>;
  let mockAccountRepo: jest.Mocked<IAccountRepository>;

  beforeEach(() => {
    // Create mock repositories
    mockPocketRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findByAccountId: jest.fn(),
      findAllByUserId: jest.fn(),
      existsByNameInAccount: jest.fn(),
      existsFixedPocketForUser: jest.fn(),
      existsFixedPocketForUserExcludingId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateDisplayOrders: jest.fn(),
    } as any;

    mockAccountRepo = {
      save: jest.fn(),
      findById: jest.fn(),
      findAllByUserId: jest.fn(),
      existsByNameAndCurrency: jest.fn(),
      existsByNameAndCurrencyExcludingId: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      updateDisplayOrders: jest.fn(),
    } as any;

    useCase = new CreatePocketUseCase(mockPocketRepo, mockAccountRepo);
  });

  describe('Validation', () => {
    it('should throw ValidationError if name is empty', async () => {
      const dto: CreatePocketDTO = {
        accountId: 'account-1',
        name: '',
        type: 'normal',
        currency: 'USD',
      };

      await expect(useCase.execute(dto, 'user-1')).rejects.toThrow(ValidationError);
      await expect(useCase.execute(dto, 'user-1')).rejects.toThrow('Pocket name is required');
    });

    it('should throw ValidationError if name is only whitespace', async () => {
      const dto: CreatePocketDTO = {
        accountId: 'account-1',
        name: '   ',
        type: 'normal',
        currency: 'USD',
      };

      await expect(useCase.execute(dto, 'user-1')).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError if accountId is empty', async () => {
      const dto: CreatePocketDTO = {
        accountId: '',
        name: 'Test Pocket',
        type: 'normal',
        currency: 'USD',
      };

      await expect(useCase.execute(dto, 'user-1')).rejects.toThrow(ValidationError);
      await expect(useCase.execute(dto, 'user-1')).rejects.toThrow('Account ID is required');
    });

    it('should throw ValidationError if type is missing', async () => {
      const dto: any = {
        accountId: 'account-1',
        name: 'Test Pocket',
        currency: 'USD',
      };

      await expect(useCase.execute(dto, 'user-1')).rejects.toThrow(ValidationError);
      await expect(useCase.execute(dto, 'user-1')).rejects.toThrow('Pocket type is required');
    });

    it('should throw ValidationError if type is invalid', async () => {
      const dto: any = {
        accountId: 'account-1',
        name: 'Test Pocket',
        type: 'invalid',
        currency: 'USD',
      };

      await expect(useCase.execute(dto, 'user-1')).rejects.toThrow(ValidationError);
      await expect(useCase.execute(dto, 'user-1')).rejects.toThrow('Pocket type must be either "normal" or "fixed"');
    });

    it('should throw ValidationError if currency is missing', async () => {
      const dto: any = {
        accountId: 'account-1',
        name: 'Test Pocket',
        type: 'normal',
      };

      await expect(useCase.execute(dto, 'user-1')).rejects.toThrow(ValidationError);
      await expect(useCase.execute(dto, 'user-1')).rejects.toThrow('Currency is required');
    });
  });

  describe('Account Verification', () => {
    it('should throw NotFoundError if account does not exist', async () => {
      mockAccountRepo.findById.mockResolvedValue(null);

      const dto: CreatePocketDTO = {
        accountId: 'non-existent',
        name: 'Test Pocket',
        type: 'normal',
        currency: 'USD',
      };

      await expect(useCase.execute(dto, 'user-1')).rejects.toThrow(NotFoundError);
      await expect(useCase.execute(dto, 'user-1')).rejects.toThrow('Account not found');
    });

    it('should throw ValidationError if trying to create fixed pocket in investment account', async () => {
      const investmentAccount = new Account(
        'account-1',
        'Investment Account',
        '#3b82f6',
        'USD',
        0,
        'investment',
        'VOO'
      );
      mockAccountRepo.findById.mockResolvedValue(investmentAccount);

      const dto: CreatePocketDTO = {
        accountId: 'account-1',
        name: 'Fixed Expenses',
        type: 'fixed',
        currency: 'USD',
      };

      await expect(useCase.execute(dto, 'user-1')).rejects.toThrow(ValidationError);
      await expect(useCase.execute(dto, 'user-1')).rejects.toThrow('Investment accounts cannot have fixed pockets');
    });
  });

  describe('Uniqueness Validation', () => {
    beforeEach(() => {
      const normalAccount = new Account(
        'account-1',
        'Test Account',
        '#3b82f6',
        'USD',
        0,
        'normal'
      );
      mockAccountRepo.findById.mockResolvedValue(normalAccount);
    });

    it('should throw ConflictError if pocket name exists in account', async () => {
      mockPocketRepo.existsByNameInAccount.mockResolvedValue(true);

      const dto: CreatePocketDTO = {
        accountId: 'account-1',
        name: 'Existing Pocket',
        type: 'normal',
        currency: 'USD',
      };

      await expect(useCase.execute(dto, 'user-1')).rejects.toThrow(ConflictError);
      await expect(useCase.execute(dto, 'user-1')).rejects.toThrow('A pocket with name "Existing Pocket" already exists in this account');
    });

    it('should throw ConflictError if fixed pocket already exists for user', async () => {
      mockPocketRepo.existsByNameInAccount.mockResolvedValue(false);
      mockPocketRepo.existsFixedPocketForUser.mockResolvedValue(true);

      const dto: CreatePocketDTO = {
        accountId: 'account-1',
        name: 'Fixed Expenses',
        type: 'fixed',
        currency: 'USD',
      };

      await expect(useCase.execute(dto, 'user-1')).rejects.toThrow(ConflictError);
      await expect(useCase.execute(dto, 'user-1')).rejects.toThrow('Only one fixed pocket is allowed per user');
    });
  });

  describe('Successful Creation', () => {
    beforeEach(() => {
      const normalAccount = new Account(
        'account-1',
        'Test Account',
        '#3b82f6',
        'USD',
        0,
        'normal'
      );
      mockAccountRepo.findById.mockResolvedValue(normalAccount);
      mockPocketRepo.existsByNameInAccount.mockResolvedValue(false);
      mockPocketRepo.existsFixedPocketForUser.mockResolvedValue(false);
    });

    it('should create normal pocket successfully', async () => {
      const dto: CreatePocketDTO = {
        accountId: 'account-1',
        name: 'Savings',
        type: 'normal',
        currency: 'USD',
      };

      const result = await useCase.execute(dto, 'user-1');

      expect(result.name).toBe('Savings');
      expect(result.type).toBe('normal');
      expect(result.currency).toBe('USD');
      expect(result.accountId).toBe('account-1');
      expect(result.balance).toBe(0);
      expect(mockPocketRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should create fixed pocket successfully', async () => {
      const dto: CreatePocketDTO = {
        accountId: 'account-1',
        name: 'Fixed Expenses',
        type: 'fixed',
        currency: 'USD',
      };

      const result = await useCase.execute(dto, 'user-1');

      expect(result.name).toBe('Fixed Expenses');
      expect(result.type).toBe('fixed');
      expect(result.currency).toBe('USD');
      expect(result.accountId).toBe('account-1');
      expect(result.balance).toBe(0);
      expect(mockPocketRepo.save).toHaveBeenCalledTimes(1);
    });

    it('should trim pocket name', async () => {
      const dto: CreatePocketDTO = {
        accountId: 'account-1',
        name: '  Savings  ',
        type: 'normal',
        currency: 'USD',
      };

      const result = await useCase.execute(dto, 'user-1');

      expect(result.name).toBe('Savings');
      expect(mockPocketRepo.existsByNameInAccount).toHaveBeenCalledWith('Savings', 'account-1', 'user-1');
    });

    it('should set initial balance to 0', async () => {
      const dto: CreatePocketDTO = {
        accountId: 'account-1',
        name: 'Savings',
        type: 'normal',
        currency: 'USD',
      };

      const result = await useCase.execute(dto, 'user-1');

      expect(result.balance).toBe(0);
    });

    it('should verify account belongs to user', async () => {
      const dto: CreatePocketDTO = {
        accountId: 'account-1',
        name: 'Savings',
        type: 'normal',
        currency: 'USD',
      };

      await useCase.execute(dto, 'user-1');

      expect(mockAccountRepo.findById).toHaveBeenCalledWith('account-1', 'user-1');
    });

    it('should check uniqueness within correct account', async () => {
      const dto: CreatePocketDTO = {
        accountId: 'account-1',
        name: 'Savings',
        type: 'normal',
        currency: 'USD',
      };

      await useCase.execute(dto, 'user-1');

      expect(mockPocketRepo.existsByNameInAccount).toHaveBeenCalledWith('Savings', 'account-1', 'user-1');
    });

    it('should check fixed pocket uniqueness for user', async () => {
      const dto: CreatePocketDTO = {
        accountId: 'account-1',
        name: 'Fixed Expenses',
        type: 'fixed',
        currency: 'USD',
      };

      await useCase.execute(dto, 'user-1');

      expect(mockPocketRepo.existsFixedPocketForUser).toHaveBeenCalledWith('user-1');
    });

    it('should not check fixed pocket uniqueness for normal pockets', async () => {
      const dto: CreatePocketDTO = {
        accountId: 'account-1',
        name: 'Savings',
        type: 'normal',
        currency: 'USD',
      };

      await useCase.execute(dto, 'user-1');

      expect(mockPocketRepo.existsFixedPocketForUser).not.toHaveBeenCalled();
    });
  });
});
