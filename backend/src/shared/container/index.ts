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
 * Initialize all module registrations
 */
export function initializeContainer(): void {
  registerAccountModule();
  // Future modules will be registered here
}
