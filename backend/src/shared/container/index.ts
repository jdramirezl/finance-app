/**
 * Dependency Injection Container Setup
 * 
 * Registers all dependencies for the application.
 * Uses tsyringe for dependency injection.
 * 
 * Requirements: 2.5
 */

import 'reflect-metadata';
import { container } from 'tsyringe';

// Account Module
import { IAccountRepository } from '../../modules/accounts/infrastructure/IAccountRepository';
import { SupabaseAccountRepository } from '../../modules/accounts/infrastructure/SupabaseAccountRepository';
import { CreateAccountUseCase } from '../../modules/accounts/application/useCases/CreateAccountUseCase';
import { GetAllAccountsUseCase } from '../../modules/accounts/application/useCases/GetAllAccountsUseCase';
import { GetAccountByIdUseCase } from '../../modules/accounts/application/useCases/GetAccountByIdUseCase';
import { UpdateAccountUseCase } from '../../modules/accounts/application/useCases/UpdateAccountUseCase';
import { DeleteAccountUseCase } from '../../modules/accounts/application/useCases/DeleteAccountUseCase';
import { DeleteAccountCascadeUseCase } from '../../modules/accounts/application/useCases/DeleteAccountCascadeUseCase';
import { ReorderAccountsUseCase } from '../../modules/accounts/application/useCases/ReorderAccountsUseCase';
import { AccountController } from '../../modules/accounts/presentation/AccountController';

/**
 * Register Account Module dependencies
 */
function registerAccountModule(): void {
  // Register repository
  container.register<IAccountRepository>('AccountRepository', {
    useClass: SupabaseAccountRepository,
  });

  // Register use cases (automatically resolved by tsyringe)
  container.register(CreateAccountUseCase, { useClass: CreateAccountUseCase });
  container.register(GetAllAccountsUseCase, { useClass: GetAllAccountsUseCase });
  container.register(GetAccountByIdUseCase, { useClass: GetAccountByIdUseCase });
  container.register(UpdateAccountUseCase, { useClass: UpdateAccountUseCase });
  container.register(DeleteAccountUseCase, { useClass: DeleteAccountUseCase });
  container.register(DeleteAccountCascadeUseCase, { useClass: DeleteAccountCascadeUseCase });
  container.register(ReorderAccountsUseCase, { useClass: ReorderAccountsUseCase });

  // Register controller
  container.register(AccountController, { useClass: AccountController });
}

/**
 * Mock Pocket Repository (temporary until Phase 2)
 * 
 * This allows the backend to start even though Pockets module isn't implemented yet.
 */
class MockPocketRepository {
  async findByAccountId(accountId: string, userId: string): Promise<Array<{ id: string; accountId: string; balance: number }>> {
    // Return empty array - no pockets yet
    return [];
  }
}

/**
 * Mock Stock Price Service (temporary until Phase 5)
 * 
 * This allows investment accounts to work without the full investment module.
 */
class MockStockPriceService {
  async getCurrentPrice(symbol: string): Promise<number> {
    // Return a mock price - in production this would call Alpha Vantage API
    return 0;
  }
}

/**
 * Mock SubPocket Repository (temporary until Phase 3)
 */
class MockSubPocketRepository {
  async findByPocketId(pocketId: string, userId: string): Promise<any[]> {
    return [];
  }
  
  async deleteByPocketId(pocketId: string, userId: string): Promise<number> {
    return 0;
  }
}

/**
 * Mock Movement Repository (temporary until Phase 4)
 */
class MockMovementRepository {
  async findByAccountId(accountId: string, userId: string): Promise<any[]> {
    return [];
  }
  
  async findByPocketId(pocketId: string, userId: string): Promise<any[]> {
    return [];
  }
  
  async markAsOrphaned(accountId: string, userId: string): Promise<number> {
    return 0;
  }
  
  async deleteByAccountId(accountId: string, userId: string): Promise<number> {
    return 0;
  }
  
  async deleteByPocketId(pocketId: string, userId: string): Promise<number> {
    return 0;
  }
}

/**
 * Initialize all module registrations
 */
export function initializeContainer(): void {
  // Register mock dependencies (temporary until their phases are implemented)
  container.register('PocketRepository', {
    useClass: MockPocketRepository,
  });
  
  container.register('StockPriceService', {
    useClass: MockStockPriceService,
  });
  
  container.register('SubPocketRepository', {
    useClass: MockSubPocketRepository,
  });
  
  container.register('MovementRepository', {
    useClass: MockMovementRepository,
  });

  registerAccountModule();
  // Future modules will be registered here
}
