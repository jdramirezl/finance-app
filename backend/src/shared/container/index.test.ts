/**
 * Container Registration Tests
 * 
 * Verifies that all dependencies are properly registered in the DI container.
 * 
 * Requirements: 2.5
 */

import 'reflect-metadata';
import { container } from 'tsyringe';
import { initializeContainer } from './index';
import type { IAccountRepository } from '../../modules/accounts/infrastructure/IAccountRepository';
import { CreateAccountUseCase } from '../../modules/accounts/application/useCases/CreateAccountUseCase';
import { GetAllAccountsUseCase } from '../../modules/accounts/application/useCases/GetAllAccountsUseCase';
import { GetAccountByIdUseCase } from '../../modules/accounts/application/useCases/GetAccountByIdUseCase';
import { UpdateAccountUseCase } from '../../modules/accounts/application/useCases/UpdateAccountUseCase';
import { DeleteAccountUseCase } from '../../modules/accounts/application/useCases/DeleteAccountUseCase';
import { DeleteAccountCascadeUseCase } from '../../modules/accounts/application/useCases/DeleteAccountCascadeUseCase';
import { ReorderAccountsUseCase } from '../../modules/accounts/application/useCases/ReorderAccountsUseCase';
import { AccountController } from '../../modules/accounts/presentation/AccountController';

// Mock environment variables for Supabase
process.env.SUPABASE_URL = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_KEY = 'test-service-key';

describe('Dependency Injection Container', () => {
  beforeAll(() => {
    // Register mock dependencies for repositories that will be implemented in later phases
    // These are needed for use cases that depend on them
    
    // Mock PocketRepository (Phase 2)
    container.register('PocketRepository', {
      useValue: {
        findByAccountId: jest.fn().mockResolvedValue([]),
      },
    });

    // Mock SubPocketRepository (Phase 3)
    container.register('SubPocketRepository', {
      useValue: {
        findByPocketId: jest.fn().mockResolvedValue([]),
        delete: jest.fn().mockResolvedValue(undefined),
      },
    });

    // Mock MovementRepository (Phase 4)
    container.register('MovementRepository', {
      useValue: {
        findByAccountId: jest.fn().mockResolvedValue([]),
        markAsOrphaned: jest.fn().mockResolvedValue(undefined),
        delete: jest.fn().mockResolvedValue(undefined),
      },
    });

    // Mock StockPriceService (Phase 5)
    container.register('StockPriceService', {
      useValue: {
        getCurrentPrice: jest.fn().mockResolvedValue(100),
      },
    });

    // Initialize container after mocks
    initializeContainer();
  });

  describe('Account Module Registration - Task 5.1', () => {
    it('should register AccountRepository as IAccountRepository', () => {
      const repo = container.resolve<IAccountRepository>('AccountRepository');
      expect(repo).toBeDefined();
      expect(repo).toHaveProperty('save');
      expect(repo).toHaveProperty('findById');
      expect(repo).toHaveProperty('findAllByUserId');
      expect(repo).toHaveProperty('existsByNameAndCurrency');
      expect(repo).toHaveProperty('update');
      expect(repo).toHaveProperty('delete');
    });
  });

  describe('Account Module Use Cases Registration - Task 5.2', () => {
    it('should register CreateAccountUseCase with AccountRepository injected', () => {
      const useCase = container.resolve(CreateAccountUseCase);
      expect(useCase).toBeDefined();
      expect(useCase).toHaveProperty('execute');
    });

    it('should register GetAllAccountsUseCase with dependencies injected', () => {
      // Note: This use case depends on PocketRepository and StockPriceService
      // which will be registered in later phases. For now, we verify it's registered.
      const useCase = container.resolve(GetAllAccountsUseCase);
      expect(useCase).toBeDefined();
      expect(useCase).toHaveProperty('execute');
    });

    it('should register GetAccountByIdUseCase with dependencies injected', () => {
      // Note: This use case depends on PocketRepository and StockPriceService
      // which will be registered in later phases. For now, we verify it's registered.
      const useCase = container.resolve(GetAccountByIdUseCase);
      expect(useCase).toBeDefined();
      expect(useCase).toHaveProperty('execute');
    });

    it('should register UpdateAccountUseCase with AccountRepository injected', () => {
      const useCase = container.resolve(UpdateAccountUseCase);
      expect(useCase).toBeDefined();
      expect(useCase).toHaveProperty('execute');
    });

    it('should register DeleteAccountUseCase with dependencies injected', () => {
      // Note: This use case depends on PocketRepository which will be registered in Phase 2
      const useCase = container.resolve(DeleteAccountUseCase);
      expect(useCase).toBeDefined();
      expect(useCase).toHaveProperty('execute');
    });

    it('should register DeleteAccountCascadeUseCase with dependencies injected', () => {
      // Note: This use case depends on PocketRepository, SubPocketRepository, and MovementRepository
      // which will be registered in later phases
      const useCase = container.resolve(DeleteAccountCascadeUseCase);
      expect(useCase).toBeDefined();
      expect(useCase).toHaveProperty('execute');
    });

    it('should register ReorderAccountsUseCase with AccountRepository injected', () => {
      const useCase = container.resolve(ReorderAccountsUseCase);
      expect(useCase).toBeDefined();
      expect(useCase).toHaveProperty('execute');
    });
  });

  describe('Account Module Controller Registration - Task 5.3', () => {
    it('should register AccountController with all use cases injected', () => {
      const controller = container.resolve(AccountController);
      expect(controller).toBeDefined();
      expect(controller).toHaveProperty('create');
      expect(controller).toHaveProperty('getAll');
      expect(controller).toHaveProperty('getById');
      expect(controller).toHaveProperty('update');
      expect(controller).toHaveProperty('delete');
      expect(controller).toHaveProperty('deleteCascade');
      expect(controller).toHaveProperty('reorder');
    });

    it('should resolve AccountController with all dependencies properly injected', () => {
      // Resolve controller
      const controller = container.resolve(AccountController);
      
      // Verify it's an instance of AccountController
      expect(controller).toBeInstanceOf(AccountController);
      
      // Verify all methods are functions
      expect(typeof controller.create).toBe('function');
      expect(typeof controller.getAll).toBe('function');
      expect(typeof controller.getById).toBe('function');
      expect(typeof controller.update).toBe('function');
      expect(typeof controller.delete).toBe('function');
      expect(typeof controller.deleteCascade).toBe('function');
      expect(typeof controller.reorder).toBe('function');
    });
  });
});
