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
import { IStockPriceRepository } from '../../modules/accounts/infrastructure/IStockPriceRepository';
import { SupabaseStockPriceRepository } from '../../modules/accounts/infrastructure/SupabaseStockPriceRepository';
import { IAlphaVantageService } from '../../modules/accounts/infrastructure/IAlphaVantageService';
import { AlphaVantageService } from '../../modules/accounts/infrastructure/AlphaVantageService';
import { CreateAccountUseCase } from '../../modules/accounts/application/useCases/CreateAccountUseCase';
import { GetAllAccountsUseCase } from '../../modules/accounts/application/useCases/GetAllAccountsUseCase';
import { GetAccountByIdUseCase } from '../../modules/accounts/application/useCases/GetAccountByIdUseCase';
import { UpdateAccountUseCase } from '../../modules/accounts/application/useCases/UpdateAccountUseCase';
import { DeleteAccountUseCase } from '../../modules/accounts/application/useCases/DeleteAccountUseCase';
import { DeleteAccountCascadeUseCase } from '../../modules/accounts/application/useCases/DeleteAccountCascadeUseCase';
import { ReorderAccountsUseCase } from '../../modules/accounts/application/useCases/ReorderAccountsUseCase';
import { GetCurrentStockPriceUseCase } from '../../modules/accounts/application/useCases/GetCurrentStockPriceUseCase';
import { UpdateInvestmentAccountUseCase } from '../../modules/accounts/application/useCases/UpdateInvestmentAccountUseCase';
import { AccountController } from '../../modules/accounts/presentation/AccountController';
import { InvestmentController } from '../../modules/accounts/presentation/InvestmentController';

// Pocket Module
import { IPocketRepository } from '../../modules/pockets/infrastructure/IPocketRepository';
import { SupabasePocketRepository } from '../../modules/pockets/infrastructure/SupabasePocketRepository';
import { CreatePocketUseCase } from '../../modules/pockets/application/useCases/CreatePocketUseCase';
import { GetPocketsByAccountUseCase } from '../../modules/pockets/application/useCases/GetPocketsByAccountUseCase';
import { GetPocketByIdUseCase } from '../../modules/pockets/application/useCases/GetPocketByIdUseCase';
import { UpdatePocketUseCase } from '../../modules/pockets/application/useCases/UpdatePocketUseCase';
import { DeletePocketUseCase } from '../../modules/pockets/application/useCases/DeletePocketUseCase';
import { MigrateFixedPocketUseCase } from '../../modules/pockets/application/useCases/MigrateFixedPocketUseCase';
import { ReorderPocketsUseCase } from '../../modules/pockets/application/useCases/ReorderPocketsUseCase';
import { PocketController } from '../../modules/pockets/presentation/PocketController';

// SubPocket Module
import { ISubPocketRepository } from '../../modules/sub-pockets/infrastructure/ISubPocketRepository';
import { SupabaseSubPocketRepository } from '../../modules/sub-pockets/infrastructure/SupabaseSubPocketRepository';
import { CreateSubPocketUseCase } from '../../modules/sub-pockets/application/useCases/CreateSubPocketUseCase';
import { GetSubPocketsByPocketUseCase } from '../../modules/sub-pockets/application/useCases/GetSubPocketsByPocketUseCase';
import { GetSubPocketsByGroupUseCase } from '../../modules/sub-pockets/application/useCases/GetSubPocketsByGroupUseCase';
import { UpdateSubPocketUseCase } from '../../modules/sub-pockets/application/useCases/UpdateSubPocketUseCase';
import { DeleteSubPocketUseCase } from '../../modules/sub-pockets/application/useCases/DeleteSubPocketUseCase';
import { ToggleSubPocketEnabledUseCase } from '../../modules/sub-pockets/application/useCases/ToggleSubPocketEnabledUseCase';
import { MoveSubPocketToGroupUseCase } from '../../modules/sub-pockets/application/useCases/MoveSubPocketToGroupUseCase';
import { ReorderSubPocketsUseCase } from '../../modules/sub-pockets/application/useCases/ReorderSubPocketsUseCase';
import { SubPocketController } from '../../modules/sub-pockets/presentation/SubPocketController';

// Fixed Expense Group Module
import { IFixedExpenseGroupRepository } from '../../modules/sub-pockets/infrastructure/IFixedExpenseGroupRepository';
import { SupabaseFixedExpenseGroupRepository } from '../../modules/sub-pockets/infrastructure/SupabaseFixedExpenseGroupRepository';
import { CreateFixedExpenseGroupUseCase } from '../../modules/sub-pockets/application/useCases/CreateFixedExpenseGroupUseCase';
import { GetAllGroupsUseCase } from '../../modules/sub-pockets/application/useCases/GetAllGroupsUseCase';
import { UpdateGroupUseCase } from '../../modules/sub-pockets/application/useCases/UpdateGroupUseCase';
import { DeleteGroupUseCase } from '../../modules/sub-pockets/application/useCases/DeleteGroupUseCase';
import { ToggleGroupUseCase } from '../../modules/sub-pockets/application/useCases/ToggleGroupUseCase';
import { ReorderFixedExpenseGroupsUseCase } from '../../modules/sub-pockets/application/useCases/ReorderFixedExpenseGroupsUseCase';
import { FixedExpenseGroupController } from '../../modules/sub-pockets/presentation/FixedExpenseGroupController';

// Movement Module
import { IMovementRepository } from '../../modules/movements/infrastructure/IMovementRepository';
import { SupabaseMovementRepository } from '../../modules/movements/infrastructure/SupabaseMovementRepository';
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
import { CreateTransferUseCase } from '../../modules/movements/application/useCases/CreateTransferUseCase';
import { MovementController } from '../../modules/movements/presentation/MovementController';

// Settings Module
import { ISettingsRepository } from '../../modules/settings/infrastructure/ISettingsRepository';
import { SupabaseSettingsRepository } from '../../modules/settings/infrastructure/SupabaseSettingsRepository';
import { IExchangeRateRepository } from '../../modules/settings/infrastructure/IExchangeRateRepository';
import { SupabaseExchangeRateRepository } from '../../modules/settings/infrastructure/SupabaseExchangeRateRepository';
import { IExchangeRateAPIService } from '../../modules/settings/infrastructure/IExchangeRateAPIService';
import { ExchangeRateAPIService } from '../../modules/settings/infrastructure/ExchangeRateAPIService';
import { GetSettingsUseCase } from '../../modules/settings/application/useCases/GetSettingsUseCase';
import { UpdateSettingsUseCase } from '../../modules/settings/application/useCases/UpdateSettingsUseCase';
import { GetExchangeRateUseCase } from '../../modules/settings/application/useCases/GetExchangeRateUseCase';
import { ConvertCurrencyUseCase } from '../../modules/settings/application/useCases/ConvertCurrencyUseCase';
import { SettingsController } from '../../modules/settings/presentation/SettingsController';
import { CurrencyController } from '../../modules/settings/presentation/CurrencyController';
// Reminders Module
import { IReminderRepository } from '../../modules/reminders/interfaces/IReminderRepository';
import { SupabaseReminderRepository } from '../../modules/reminders/infrastructure/SupabaseReminderRepository';
import { ReminderService } from '../../modules/reminders/application/ReminderService';
import { ReminderController } from '../../modules/reminders/interfaces/ReminderController';


/**
 * Initialize all module registrations
 */
/**
 * Register Account Module dependencies
 */
function registerAccountModule(): void {
  // Repositories
  container.register<IAccountRepository>('AccountRepository', { useClass: SupabaseAccountRepository });
  container.register<IStockPriceRepository>('StockPriceRepository', { useClass: SupabaseStockPriceRepository });

  // Services
  container.register<IAlphaVantageService>('AlphaVantageService', { useClass: AlphaVantageService });

  // Register GetCurrentStockPriceUseCase as StockPriceService for GetAllAccountsUseCase
  container.register('StockPriceService', { useClass: GetCurrentStockPriceUseCase });

  // Use Cases
  container.register(CreateAccountUseCase, { useClass: CreateAccountUseCase });
  container.register(GetAllAccountsUseCase, { useClass: GetAllAccountsUseCase });
  container.register(GetAccountByIdUseCase, { useClass: GetAccountByIdUseCase });
  container.register(UpdateAccountUseCase, { useClass: UpdateAccountUseCase });
  container.register(DeleteAccountUseCase, { useClass: DeleteAccountUseCase });
  container.register(DeleteAccountCascadeUseCase, { useClass: DeleteAccountCascadeUseCase });
  container.register(ReorderAccountsUseCase, { useClass: ReorderAccountsUseCase });
  container.register(GetCurrentStockPriceUseCase, { useClass: GetCurrentStockPriceUseCase });
  container.register(UpdateInvestmentAccountUseCase, { useClass: UpdateInvestmentAccountUseCase });

  // Controller
  container.register(AccountController, { useClass: AccountController });
  container.register(InvestmentController, { useClass: InvestmentController });
}

/**
 * Register Pocket Module dependencies
 */
function registerPocketModule(): void {
  // Repository
  container.register<IPocketRepository>('PocketRepository', { useClass: SupabasePocketRepository });



  // Use Cases
  container.register(CreatePocketUseCase, { useClass: CreatePocketUseCase });
  container.register(GetPocketsByAccountUseCase, { useClass: GetPocketsByAccountUseCase });
  container.register(GetPocketByIdUseCase, { useClass: GetPocketByIdUseCase });
  container.register(UpdatePocketUseCase, { useClass: UpdatePocketUseCase });
  container.register(DeletePocketUseCase, { useClass: DeletePocketUseCase });
  container.register(MigrateFixedPocketUseCase, { useClass: MigrateFixedPocketUseCase });
  container.register(ReorderPocketsUseCase, { useClass: ReorderPocketsUseCase });

  // Controller
  container.register(PocketController, { useClass: PocketController });
}

/**
 * Register SubPocket Module dependencies
 */
function registerSubPocketModule(): void {
  // Register repository
  container.register<ISubPocketRepository>('SubPocketRepository', {
    useClass: SupabaseSubPocketRepository,
  });

  // Register use cases (automatically resolved by tsyringe)
  container.register(CreateSubPocketUseCase, { useClass: CreateSubPocketUseCase });
  container.register(GetSubPocketsByPocketUseCase, { useClass: GetSubPocketsByPocketUseCase });
  container.register(GetSubPocketsByGroupUseCase, { useClass: GetSubPocketsByGroupUseCase });
  container.register(UpdateSubPocketUseCase, { useClass: UpdateSubPocketUseCase });
  container.register(DeleteSubPocketUseCase, { useClass: DeleteSubPocketUseCase });
  container.register(ToggleSubPocketEnabledUseCase, { useClass: ToggleSubPocketEnabledUseCase });
  container.register(MoveSubPocketToGroupUseCase, { useClass: MoveSubPocketToGroupUseCase });
  container.register(ReorderSubPocketsUseCase, { useClass: ReorderSubPocketsUseCase });

  // Register controller
  container.register(SubPocketController, { useClass: SubPocketController });
}

/**
 * Register Fixed Expense Group Module dependencies
 */
function registerFixedExpenseGroupModule(): void {
  // Register repository
  container.register<IFixedExpenseGroupRepository>('FixedExpenseGroupRepository', {
    useClass: SupabaseFixedExpenseGroupRepository,
  });

  // Register use cases (automatically resolved by tsyringe)
  container.register(CreateFixedExpenseGroupUseCase, { useClass: CreateFixedExpenseGroupUseCase });
  container.register(GetAllGroupsUseCase, { useClass: GetAllGroupsUseCase });
  container.register(UpdateGroupUseCase, { useClass: UpdateGroupUseCase });
  container.register(DeleteGroupUseCase, { useClass: DeleteGroupUseCase });
  container.register(DeleteGroupUseCase, { useClass: DeleteGroupUseCase });
  container.register(ToggleGroupUseCase, { useClass: ToggleGroupUseCase });
  container.register(ReorderFixedExpenseGroupsUseCase, { useClass: ReorderFixedExpenseGroupsUseCase });

  // Register controller
  container.register(FixedExpenseGroupController, { useClass: FixedExpenseGroupController });
}

/**
 * Register Movement Module dependencies
 */
function registerMovementModule(): void {
  // Register repository
  container.register<IMovementRepository>('MovementRepository', {
    useClass: SupabaseMovementRepository,
  });

  // Register use cases (automatically resolved by tsyringe)
  container.register(CreateMovementUseCase, { useClass: CreateMovementUseCase });
  container.register(GetMovementsByAccountUseCase, { useClass: GetMovementsByAccountUseCase });
  container.register(GetMovementsByPocketUseCase, { useClass: GetMovementsByPocketUseCase });
  container.register(GetMovementsByMonthUseCase, { useClass: GetMovementsByMonthUseCase });
  container.register(GetPendingMovementsUseCase, { useClass: GetPendingMovementsUseCase });
  container.register(GetOrphanedMovementsUseCase, { useClass: GetOrphanedMovementsUseCase });
  container.register(UpdateMovementUseCase, { useClass: UpdateMovementUseCase });
  container.register(DeleteMovementUseCase, { useClass: DeleteMovementUseCase });
  container.register(ApplyPendingMovementUseCase, { useClass: ApplyPendingMovementUseCase });
  container.register(MarkAsPendingUseCase, { useClass: MarkAsPendingUseCase });
  container.register(RestoreOrphanedMovementsUseCase, { useClass: RestoreOrphanedMovementsUseCase });
  container.register(CreateTransferUseCase, { useClass: CreateTransferUseCase });

  // Register controller
  container.register(MovementController, { useClass: MovementController });
}

/**
 * Register Settings Module dependencies
 */
function registerSettingsModule(): void {
  // Register repositories
  container.register<ISettingsRepository>('SettingsRepository', {
    useClass: SupabaseSettingsRepository,
  });

  container.register<IExchangeRateRepository>('ExchangeRateRepository', {
    useClass: SupabaseExchangeRateRepository,
  });

  // Register services
  container.register<IExchangeRateAPIService>('ExchangeRateAPIService', {
    useClass: ExchangeRateAPIService,
  });

  // Register use cases (automatically resolved by tsyringe)
  container.register(GetSettingsUseCase, { useClass: GetSettingsUseCase });
  container.register(UpdateSettingsUseCase, { useClass: UpdateSettingsUseCase });
  container.register(GetExchangeRateUseCase, { useClass: GetExchangeRateUseCase });
  container.register(ConvertCurrencyUseCase, { useClass: ConvertCurrencyUseCase });

  // Register controllers
  container.register(SettingsController, { useClass: SettingsController });
  container.register(CurrencyController, { useClass: CurrencyController });
}

/**
 * Register Reminder Module dependencies
 */
function registerReminderModule(): void {
  // Register repository
  container.register<IReminderRepository>('ReminderRepository', {
    useClass: SupabaseReminderRepository,
  });

  // Register service
  container.register(ReminderService, {
    useFactory: (c) => new ReminderService(c.resolve('ReminderRepository'))
  });

  // Register controller
  container.register(ReminderController, { useClass: ReminderController });
}

/**
 * Initialize all module registrations
 */
export function initializeContainer(): void {
  registerAccountModule();
  registerPocketModule();
  registerSubPocketModule();
  registerFixedExpenseGroupModule();
  registerMovementModule();
  registerSettingsModule();
  registerReminderModule();
}
