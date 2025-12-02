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
import type { IStockPriceRepository } from '../../modules/accounts/infrastructure/IStockPriceRepository';
import type { IAlphaVantageService } from '../../modules/accounts/infrastructure/IAlphaVantageService';
import { GetCurrentStockPriceUseCase } from '../../modules/accounts/application/useCases/GetCurrentStockPriceUseCase';
import { UpdateInvestmentAccountUseCase } from '../../modules/accounts/application/useCases/UpdateInvestmentAccountUseCase';
import { InvestmentController } from '../../modules/accounts/presentation/InvestmentController';
import type { IPocketRepository } from '../../modules/pockets/infrastructure/IPocketRepository';
import { CreatePocketUseCase } from '../../modules/pockets/application/useCases/CreatePocketUseCase';
import { GetPocketsByAccountUseCase } from '../../modules/pockets/application/useCases/GetPocketsByAccountUseCase';
import { GetPocketByIdUseCase } from '../../modules/pockets/application/useCases/GetPocketByIdUseCase';
import { UpdatePocketUseCase } from '../../modules/pockets/application/useCases/UpdatePocketUseCase';
import { DeletePocketUseCase } from '../../modules/pockets/application/useCases/DeletePocketUseCase';
import { MigrateFixedPocketUseCase } from '../../modules/pockets/application/useCases/MigrateFixedPocketUseCase';
import { ReorderPocketsUseCase } from '../../modules/pockets/application/useCases/ReorderPocketsUseCase';
import { PocketController } from '../../modules/pockets/presentation/PocketController';
import type { ISubPocketRepository } from '../../modules/sub-pockets/infrastructure/ISubPocketRepository';
import type { IFixedExpenseGroupRepository } from '../../modules/sub-pockets/infrastructure/IFixedExpenseGroupRepository';
import { CreateSubPocketUseCase } from '../../modules/sub-pockets/application/useCases/CreateSubPocketUseCase';
import { GetSubPocketsByPocketUseCase } from '../../modules/sub-pockets/application/useCases/GetSubPocketsByPocketUseCase';
import { GetSubPocketsByGroupUseCase } from '../../modules/sub-pockets/application/useCases/GetSubPocketsByGroupUseCase';
import { UpdateSubPocketUseCase } from '../../modules/sub-pockets/application/useCases/UpdateSubPocketUseCase';
import { DeleteSubPocketUseCase } from '../../modules/sub-pockets/application/useCases/DeleteSubPocketUseCase';
import { ToggleSubPocketEnabledUseCase } from '../../modules/sub-pockets/application/useCases/ToggleSubPocketEnabledUseCase';
import { MoveSubPocketToGroupUseCase } from '../../modules/sub-pockets/application/useCases/MoveSubPocketToGroupUseCase';
import { ReorderSubPocketsUseCase } from '../../modules/sub-pockets/application/useCases/ReorderSubPocketsUseCase';
import { SubPocketController } from '../../modules/sub-pockets/presentation/SubPocketController';
import { CreateFixedExpenseGroupUseCase } from '../../modules/sub-pockets/application/useCases/CreateFixedExpenseGroupUseCase';
import { GetAllGroupsUseCase } from '../../modules/sub-pockets/application/useCases/GetAllGroupsUseCase';
import { UpdateGroupUseCase } from '../../modules/sub-pockets/application/useCases/UpdateGroupUseCase';
import { DeleteGroupUseCase } from '../../modules/sub-pockets/application/useCases/DeleteGroupUseCase';
import { ToggleGroupUseCase } from '../../modules/sub-pockets/application/useCases/ToggleGroupUseCase';
import { FixedExpenseGroupController } from '../../modules/sub-pockets/presentation/FixedExpenseGroupController';
import type { IMovementRepository } from '../../modules/movements/infrastructure/IMovementRepository';
import { CreateMovementUseCase } from '../../modules/movements/application/useCases/CreateMovementUseCase';
import { GetMovementsByAccountUseCase } from '../../modules/movements/application/useCases/GetMovementsByAccountUseCase';
import { GetMovementsByPocketUseCase } from '../../modules/movements/application/useCases/GetMovementsByPocketUseCase';
import { GetMovementsByMonthUseCase } from '../../modules/movements/application/useCases/GetMovementsByMonthUseCase';
import { GetPendingMovementsUseCase } from '../../modules/movements/application/useCases/GetPendingMovementsUseCase';
import { GetOrphanedMovementsUseCase } from '../../modules/movements/application/useCases/GetOrphanedMovementsUseCase';
import { UpdateMovementUseCase } from '../../modules/movements/application/useCases/UpdateMovementUseCase';
import { DeleteMovementUseCase } from '../../modules/movements/application/useCases/DeleteMovementUseCase';
import { ApplyPendingMovementUseCase } from '../../modules/movements/application/useCases/ApplyPendingMovementUseCase';
import { MarkAsPendingUseCase } from '../../modules/movements/application/useCases/MarkAsPendingUseCase';
import { RestoreOrphanedMovementsUseCase } from '../../modules/movements/application/useCases/RestoreOrphanedMovementsUseCase';
import { MovementController } from '../../modules/movements/presentation/MovementController';
import type { ISettingsRepository } from '../../modules/settings/infrastructure/ISettingsRepository';
import type { IExchangeRateRepository } from '../../modules/settings/infrastructure/IExchangeRateRepository';
import type { IExchangeRateAPIService } from '../../modules/settings/infrastructure/IExchangeRateAPIService';
import { GetSettingsUseCase } from '../../modules/settings/application/useCases/GetSettingsUseCase';
import { UpdateSettingsUseCase } from '../../modules/settings/application/useCases/UpdateSettingsUseCase';
import { GetExchangeRateUseCase } from '../../modules/settings/application/useCases/GetExchangeRateUseCase';
import { ConvertCurrencyUseCase } from '../../modules/settings/application/useCases/ConvertCurrencyUseCase';
import { SettingsController } from '../../modules/settings/presentation/SettingsController';
import { CurrencyController } from '../../modules/settings/presentation/CurrencyController';

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

  describe('Investment Module Registration - Task 34.1', () => {
    it('should register StockPriceRepository as IStockPriceRepository', () => {
      const repo = container.resolve<IStockPriceRepository>('StockPriceRepository');
      expect(repo).toBeDefined();
      expect(repo).toHaveProperty('findBySymbol');
      expect(repo).toHaveProperty('save');
    });

    it('should register AlphaVantageService as IAlphaVantageService', () => {
      const service = container.resolve<IAlphaVantageService>('AlphaVantageService');
      expect(service).toBeDefined();
      expect(service).toHaveProperty('fetchStockPrice');
    });

    it('should register GetCurrentStockPriceUseCase with dependencies injected', () => {
      const useCase = container.resolve(GetCurrentStockPriceUseCase);
      expect(useCase).toBeDefined();
      expect(useCase).toHaveProperty('execute');
    });

    it('should register UpdateInvestmentAccountUseCase with dependencies injected', () => {
      const useCase = container.resolve(UpdateInvestmentAccountUseCase);
      expect(useCase).toBeDefined();
      expect(useCase).toHaveProperty('execute');
    });

    it('should register InvestmentController with all use cases injected', () => {
      const controller = container.resolve(InvestmentController);
      expect(controller).toBeDefined();
      expect(controller).toHaveProperty('getPrice');
      expect(controller).toHaveProperty('getPriceBySymbol');
      expect(controller).toHaveProperty('updateInvestment');
    });

    it('should resolve InvestmentController with all dependencies properly injected', () => {
      const controller = container.resolve(InvestmentController);
      expect(controller).toBeInstanceOf(InvestmentController);
      expect(typeof controller.getPrice).toBe('function');
      expect(typeof controller.getPriceBySymbol).toBe('function');
      expect(typeof controller.updateInvestment).toBe('function');
    });
  });

  describe('Pocket Module Registration - Task 12.1', () => {
    it('should register PocketRepository as IPocketRepository', () => {
      const repo = container.resolve<IPocketRepository>('PocketRepository');
      expect(repo).toBeDefined();
      expect(repo).toHaveProperty('save');
      expect(repo).toHaveProperty('findById');
      expect(repo).toHaveProperty('findByAccountId');
      expect(repo).toHaveProperty('findAllByUserId');
      expect(repo).toHaveProperty('existsByNameInAccount');
      expect(repo).toHaveProperty('existsByNameInAccountExcludingId');
      expect(repo).toHaveProperty('existsFixedPocketForUser');
      expect(repo).toHaveProperty('existsFixedPocketForUserExcludingId');
      expect(repo).toHaveProperty('update');
      expect(repo).toHaveProperty('delete');
      expect(repo).toHaveProperty('updateDisplayOrders');
    });
  });

  describe('Pocket Module Use Cases Registration - Task 12.1', () => {
    it('should register CreatePocketUseCase with dependencies injected', () => {
      const useCase = container.resolve(CreatePocketUseCase);
      expect(useCase).toBeDefined();
      expect(useCase).toHaveProperty('execute');
    });

    it('should register GetPocketsByAccountUseCase with dependencies injected', () => {
      const useCase = container.resolve(GetPocketsByAccountUseCase);
      expect(useCase).toBeDefined();
      expect(useCase).toHaveProperty('execute');
    });

    it('should register GetPocketByIdUseCase with dependencies injected', () => {
      const useCase = container.resolve(GetPocketByIdUseCase);
      expect(useCase).toBeDefined();
      expect(useCase).toHaveProperty('execute');
    });

    it('should register UpdatePocketUseCase with dependencies injected', () => {
      const useCase = container.resolve(UpdatePocketUseCase);
      expect(useCase).toBeDefined();
      expect(useCase).toHaveProperty('execute');
    });

    it('should register DeletePocketUseCase with dependencies injected', () => {
      const useCase = container.resolve(DeletePocketUseCase);
      expect(useCase).toBeDefined();
      expect(useCase).toHaveProperty('execute');
    });

    it('should register MigrateFixedPocketUseCase with dependencies injected', () => {
      const useCase = container.resolve(MigrateFixedPocketUseCase);
      expect(useCase).toBeDefined();
      expect(useCase).toHaveProperty('execute');
    });

    it('should register ReorderPocketsUseCase with dependencies injected', () => {
      const useCase = container.resolve(ReorderPocketsUseCase);
      expect(useCase).toBeDefined();
      expect(useCase).toHaveProperty('execute');
    });
  });

  describe('Pocket Module Controller Registration - Task 12.1', () => {
    it('should register PocketController with all use cases injected', () => {
      const controller = container.resolve(PocketController);
      expect(controller).toBeDefined();
      expect(controller).toHaveProperty('create');
      expect(controller).toHaveProperty('getByAccount');
      expect(controller).toHaveProperty('getById');
      expect(controller).toHaveProperty('update');
      expect(controller).toHaveProperty('delete');
      expect(controller).toHaveProperty('migrate');
      expect(controller).toHaveProperty('reorder');
    });

    it('should resolve PocketController with all dependencies properly injected', () => {
      // Resolve controller
      const controller = container.resolve(PocketController);
      
      // Verify it's an instance of PocketController
      expect(controller).toBeInstanceOf(PocketController);
      
      // Verify all methods are functions
      expect(typeof controller.create).toBe('function');
      expect(typeof controller.getByAccount).toBe('function');
      expect(typeof controller.getById).toBe('function');
      expect(typeof controller.update).toBe('function');
      expect(typeof controller.delete).toBe('function');
      expect(typeof controller.migrate).toBe('function');
      expect(typeof controller.reorder).toBe('function');
    });
  });

  describe('SubPocket Module Registration - Task 20.1', () => {
    it('should register SubPocketRepository as ISubPocketRepository', () => {
      const repo = container.resolve<ISubPocketRepository>('SubPocketRepository');
      expect(repo).toBeDefined();
      expect(repo).toHaveProperty('save');
      expect(repo).toHaveProperty('findById');
      expect(repo).toHaveProperty('findByPocketId');
      expect(repo).toHaveProperty('findByGroupId');
      expect(repo).toHaveProperty('update');
      expect(repo).toHaveProperty('delete');
      expect(repo).toHaveProperty('updateDisplayOrders');
    });
  });

  describe('SubPocket Module Use Cases Registration - Task 20.1', () => {
    it('should register CreateSubPocketUseCase with dependencies injected', () => {
      const useCase = container.resolve(CreateSubPocketUseCase);
      expect(useCase).toBeDefined();
      expect(useCase).toHaveProperty('execute');
    });

    it('should register GetSubPocketsByPocketUseCase with dependencies injected', () => {
      const useCase = container.resolve(GetSubPocketsByPocketUseCase);
      expect(useCase).toBeDefined();
      expect(useCase).toHaveProperty('execute');
    });

    it('should register GetSubPocketsByGroupUseCase with dependencies injected', () => {
      const useCase = container.resolve(GetSubPocketsByGroupUseCase);
      expect(useCase).toBeDefined();
      expect(useCase).toHaveProperty('execute');
    });

    it('should register UpdateSubPocketUseCase with dependencies injected', () => {
      const useCase = container.resolve(UpdateSubPocketUseCase);
      expect(useCase).toBeDefined();
      expect(useCase).toHaveProperty('execute');
    });

    it('should register DeleteSubPocketUseCase with dependencies injected', () => {
      const useCase = container.resolve(DeleteSubPocketUseCase);
      expect(useCase).toBeDefined();
      expect(useCase).toHaveProperty('execute');
    });

    it('should register ToggleSubPocketEnabledUseCase with dependencies injected', () => {
      const useCase = container.resolve(ToggleSubPocketEnabledUseCase);
      expect(useCase).toBeDefined();
      expect(useCase).toHaveProperty('execute');
    });

    it('should register MoveSubPocketToGroupUseCase with dependencies injected', () => {
      const useCase = container.resolve(MoveSubPocketToGroupUseCase);
      expect(useCase).toBeDefined();
      expect(useCase).toHaveProperty('execute');
    });

    it('should register ReorderSubPocketsUseCase with dependencies injected', () => {
      const useCase = container.resolve(ReorderSubPocketsUseCase);
      expect(useCase).toBeDefined();
      expect(useCase).toHaveProperty('execute');
    });
  });

  describe('SubPocket Module Controller Registration - Task 20.1', () => {
    it('should register SubPocketController with all use cases injected', () => {
      const controller = container.resolve(SubPocketController);
      expect(controller).toBeDefined();
      expect(controller).toHaveProperty('create');
      expect(controller).toHaveProperty('getByFilter');
      expect(controller).toHaveProperty('update');
      expect(controller).toHaveProperty('delete');
      expect(controller).toHaveProperty('toggle');
      expect(controller).toHaveProperty('moveToGroup');
      expect(controller).toHaveProperty('reorder');
    });

    it('should resolve SubPocketController with all dependencies properly injected', () => {
      const controller = container.resolve(SubPocketController);
      expect(controller).toBeInstanceOf(SubPocketController);
      expect(typeof controller.create).toBe('function');
      expect(typeof controller.getByFilter).toBe('function');
      expect(typeof controller.update).toBe('function');
      expect(typeof controller.delete).toBe('function');
      expect(typeof controller.toggle).toBe('function');
      expect(typeof controller.moveToGroup).toBe('function');
      expect(typeof controller.reorder).toBe('function');
    });
  });

  describe('Fixed Expense Group Module Registration - Task 20.1', () => {
    it('should register FixedExpenseGroupRepository as IFixedExpenseGroupRepository', () => {
      const repo = container.resolve<IFixedExpenseGroupRepository>('FixedExpenseGroupRepository');
      expect(repo).toBeDefined();
      expect(repo).toHaveProperty('save');
      expect(repo).toHaveProperty('findById');
      expect(repo).toHaveProperty('findAllByUserId');
      expect(repo).toHaveProperty('update');
      expect(repo).toHaveProperty('delete');
    });
  });

  describe('Fixed Expense Group Module Use Cases Registration - Task 20.1', () => {
    it('should register CreateFixedExpenseGroupUseCase with dependencies injected', () => {
      const useCase = container.resolve(CreateFixedExpenseGroupUseCase);
      expect(useCase).toBeDefined();
      expect(useCase).toHaveProperty('execute');
    });

    it('should register GetAllGroupsUseCase with dependencies injected', () => {
      const useCase = container.resolve(GetAllGroupsUseCase);
      expect(useCase).toBeDefined();
      expect(useCase).toHaveProperty('execute');
    });

    it('should register UpdateGroupUseCase with dependencies injected', () => {
      const useCase = container.resolve(UpdateGroupUseCase);
      expect(useCase).toBeDefined();
      expect(useCase).toHaveProperty('execute');
    });

    it('should register DeleteGroupUseCase with dependencies injected', () => {
      const useCase = container.resolve(DeleteGroupUseCase);
      expect(useCase).toBeDefined();
      expect(useCase).toHaveProperty('execute');
    });

    it('should register ToggleGroupUseCase with dependencies injected', () => {
      const useCase = container.resolve(ToggleGroupUseCase);
      expect(useCase).toBeDefined();
      expect(useCase).toHaveProperty('execute');
    });
  });

  describe('Fixed Expense Group Module Controller Registration - Task 20.1', () => {
    it('should register FixedExpenseGroupController with all use cases injected', () => {
      const controller = container.resolve(FixedExpenseGroupController);
      expect(controller).toBeDefined();
      expect(controller).toHaveProperty('create');
      expect(controller).toHaveProperty('getAll');
      expect(controller).toHaveProperty('update');
      expect(controller).toHaveProperty('delete');
      expect(controller).toHaveProperty('toggle');
    });

    it('should resolve FixedExpenseGroupController with all dependencies properly injected', () => {
      const controller = container.resolve(FixedExpenseGroupController);
      expect(controller).toBeInstanceOf(FixedExpenseGroupController);
      expect(typeof controller.create).toBe('function');
      expect(typeof controller.getAll).toBe('function');
      expect(typeof controller.update).toBe('function');
      expect(typeof controller.delete).toBe('function');
      expect(typeof controller.toggle).toBe('function');
    });
  });

  describe('Movement Module Registration - Task 27.1', () => {
    it('should register MovementRepository as IMovementRepository', () => {
      const repo = container.resolve<IMovementRepository>('MovementRepository');
      expect(repo).toBeDefined();
      expect(repo).toHaveProperty('save');
      expect(repo).toHaveProperty('findById');
      expect(repo).toHaveProperty('findAll');
      expect(repo).toHaveProperty('findByAccountId');
      expect(repo).toHaveProperty('findByPocketId');
      expect(repo).toHaveProperty('findBySubPocketId');
      expect(repo).toHaveProperty('findByMonth');
      expect(repo).toHaveProperty('findPending');
      expect(repo).toHaveProperty('findOrphaned');
      expect(repo).toHaveProperty('update');
      expect(repo).toHaveProperty('delete');
      expect(repo).toHaveProperty('deleteByAccountId');
      expect(repo).toHaveProperty('deleteByPocketId');
      expect(repo).toHaveProperty('markAsOrphanedByAccountId');
      expect(repo).toHaveProperty('markAsOrphanedByPocketId');
    });
  });

  describe('Movement Module Use Cases Registration - Task 27.1', () => {
    it('should register CreateMovementUseCase with dependencies injected', () => {
      const useCase = container.resolve(CreateMovementUseCase);
      expect(useCase).toBeDefined();
      expect(useCase).toHaveProperty('execute');
    });

    it('should register GetMovementsByAccountUseCase with dependencies injected', () => {
      const useCase = container.resolve(GetMovementsByAccountUseCase);
      expect(useCase).toBeDefined();
      expect(useCase).toHaveProperty('execute');
    });

    it('should register GetMovementsByPocketUseCase with dependencies injected', () => {
      const useCase = container.resolve(GetMovementsByPocketUseCase);
      expect(useCase).toBeDefined();
      expect(useCase).toHaveProperty('execute');
    });

    it('should register GetMovementsByMonthUseCase with dependencies injected', () => {
      const useCase = container.resolve(GetMovementsByMonthUseCase);
      expect(useCase).toBeDefined();
      expect(useCase).toHaveProperty('execute');
    });

    it('should register GetPendingMovementsUseCase with dependencies injected', () => {
      const useCase = container.resolve(GetPendingMovementsUseCase);
      expect(useCase).toBeDefined();
      expect(useCase).toHaveProperty('execute');
    });

    it('should register GetOrphanedMovementsUseCase with dependencies injected', () => {
      const useCase = container.resolve(GetOrphanedMovementsUseCase);
      expect(useCase).toBeDefined();
      expect(useCase).toHaveProperty('execute');
    });

    it('should register UpdateMovementUseCase with dependencies injected', () => {
      const useCase = container.resolve(UpdateMovementUseCase);
      expect(useCase).toBeDefined();
      expect(useCase).toHaveProperty('execute');
    });

    it('should register DeleteMovementUseCase with dependencies injected', () => {
      const useCase = container.resolve(DeleteMovementUseCase);
      expect(useCase).toBeDefined();
      expect(useCase).toHaveProperty('execute');
    });

    it('should register ApplyPendingMovementUseCase with dependencies injected', () => {
      const useCase = container.resolve(ApplyPendingMovementUseCase);
      expect(useCase).toBeDefined();
      expect(useCase).toHaveProperty('execute');
    });

    it('should register MarkAsPendingUseCase with dependencies injected', () => {
      const useCase = container.resolve(MarkAsPendingUseCase);
      expect(useCase).toBeDefined();
      expect(useCase).toHaveProperty('execute');
    });

    it('should register RestoreOrphanedMovementsUseCase with dependencies injected', () => {
      const useCase = container.resolve(RestoreOrphanedMovementsUseCase);
      expect(useCase).toBeDefined();
      expect(useCase).toHaveProperty('execute');
    });
  });

  describe('Movement Module Controller Registration - Task 27.1', () => {
    it('should register MovementController with all use cases injected', () => {
      const controller = container.resolve(MovementController);
      expect(controller).toBeDefined();
      expect(controller).toHaveProperty('create');
      expect(controller).toHaveProperty('getAll');
      expect(controller).toHaveProperty('getPending');
      expect(controller).toHaveProperty('getOrphaned');
      expect(controller).toHaveProperty('update');
      expect(controller).toHaveProperty('delete');
      expect(controller).toHaveProperty('applyPending');
      expect(controller).toHaveProperty('markAsPending');
      expect(controller).toHaveProperty('restoreOrphaned');
    });

    it('should resolve MovementController with all dependencies properly injected', () => {
      const controller = container.resolve(MovementController);
      expect(controller).toBeInstanceOf(MovementController);
      expect(typeof controller.create).toBe('function');
      expect(typeof controller.getAll).toBe('function');
      expect(typeof controller.getPending).toBe('function');
      expect(typeof controller.getOrphaned).toBe('function');
      expect(typeof controller.update).toBe('function');
      expect(typeof controller.delete).toBe('function');
      expect(typeof controller.applyPending).toBe('function');
      expect(typeof controller.markAsPending).toBe('function');
      expect(typeof controller.restoreOrphaned).toBe('function');
    });
  });

  describe('Settings Module Registration - Task 41.1', () => {
    it('should register SettingsRepository as ISettingsRepository', () => {
      const repo = container.resolve<ISettingsRepository>('SettingsRepository');
      expect(repo).toBeDefined();
      expect(repo).toHaveProperty('findByUserId');
      expect(repo).toHaveProperty('save');
      expect(repo).toHaveProperty('update');
    });

    it('should register ExchangeRateRepository as IExchangeRateRepository', () => {
      const repo = container.resolve<IExchangeRateRepository>('ExchangeRateRepository');
      expect(repo).toBeDefined();
      expect(repo).toHaveProperty('findRate');
      expect(repo).toHaveProperty('saveRate');
      expect(repo).toHaveProperty('deleteExpired');
    });

    it('should register ExchangeRateAPIService as IExchangeRateAPIService', () => {
      const service = container.resolve<IExchangeRateAPIService>('ExchangeRateAPIService');
      expect(service).toBeDefined();
      expect(service).toHaveProperty('fetchRate');
    });
  });

  describe('Settings Module Use Cases Registration - Task 41.1', () => {
    it('should register GetSettingsUseCase with dependencies injected', () => {
      const useCase = container.resolve(GetSettingsUseCase);
      expect(useCase).toBeDefined();
      expect(useCase).toHaveProperty('execute');
    });

    it('should register UpdateSettingsUseCase with dependencies injected', () => {
      const useCase = container.resolve(UpdateSettingsUseCase);
      expect(useCase).toBeDefined();
      expect(useCase).toHaveProperty('execute');
    });

    it('should register GetExchangeRateUseCase with dependencies injected', () => {
      const useCase = container.resolve(GetExchangeRateUseCase);
      expect(useCase).toBeDefined();
      expect(useCase).toHaveProperty('execute');
    });

    it('should register ConvertCurrencyUseCase with dependencies injected', () => {
      const useCase = container.resolve(ConvertCurrencyUseCase);
      expect(useCase).toBeDefined();
      expect(useCase).toHaveProperty('execute');
    });
  });

  describe('Settings Module Controller Registration - Task 41.1', () => {
    it('should register SettingsController with all use cases injected', () => {
      const controller = container.resolve(SettingsController);
      expect(controller).toBeDefined();
      expect(controller).toHaveProperty('get');
      expect(controller).toHaveProperty('update');
    });

    it('should resolve SettingsController with all dependencies properly injected', () => {
      const controller = container.resolve(SettingsController);
      expect(controller).toBeInstanceOf(SettingsController);
      expect(typeof controller.get).toBe('function');
      expect(typeof controller.update).toBe('function');
    });

    it('should register CurrencyController with all use cases injected', () => {
      const controller = container.resolve(CurrencyController);
      expect(controller).toBeDefined();
      expect(controller).toHaveProperty('getRate');
      expect(controller).toHaveProperty('convert');
    });

    it('should resolve CurrencyController with all dependencies properly injected', () => {
      const controller = container.resolve(CurrencyController);
      expect(controller).toBeInstanceOf(CurrencyController);
      expect(typeof controller.getRate).toBe('function');
      expect(typeof controller.convert).toBe('function');
    });
  });
});
