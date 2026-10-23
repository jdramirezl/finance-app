import { container, instanceCachingFactory } from 'tsyringe';
import { IAccountRepository } from '../../modules/accounts/infrastructure/IAccountRepository';
import { SupabaseAccountRepository } from '../../modules/accounts/infrastructure/SupabaseAccountRepository';
import { IStockPriceRepository } from '../../modules/accounts/infrastructure/IStockPriceRepository';
import { SupabaseStockPriceRepository } from '../../modules/accounts/infrastructure/SupabaseStockPriceRepository';
import { IAlphaVantageService } from '../../modules/accounts/infrastructure/IAlphaVantageService';
import { AlphaVantageService } from '../../modules/accounts/infrastructure/AlphaVantageService';
import { FinnhubService } from '../../modules/accounts/infrastructure/FinnhubService';
import { FallbackStockPriceProvider } from '../../modules/accounts/infrastructure/FallbackStockPriceProvider';
import type { IStockPriceProvider } from '../../modules/accounts/infrastructure/IStockPriceProvider';
import { CreateAccountUseCase } from '../../modules/accounts/application/useCases/CreateAccountUseCase';
import { GetAllAccountsUseCase } from '../../modules/accounts/application/useCases/GetAllAccountsUseCase';
import { GetAccountByIdUseCase } from '../../modules/accounts/application/useCases/GetAccountByIdUseCase';
import { UpdateAccountUseCase } from '../../modules/accounts/application/useCases/UpdateAccountUseCase';
import { DeleteAccountUseCase } from '../../modules/accounts/application/useCases/DeleteAccountUseCase';
import { DeleteAccountCascadeUseCase } from '../../modules/accounts/application/useCases/DeleteAccountCascadeUseCase';
import { ReorderAccountsUseCase } from '../../modules/accounts/application/useCases/ReorderAccountsUseCase';
import { ArchiveAccountUseCase } from '../../modules/accounts/application/useCases/ArchiveAccountUseCase';
import { UnarchiveAccountUseCase } from '../../modules/accounts/application/useCases/UnarchiveAccountUseCase';
import { GetCurrentStockPriceUseCase } from '../../modules/accounts/application/useCases/GetCurrentStockPriceUseCase';
import { UpdateInvestmentAccountUseCase } from '../../modules/accounts/application/useCases/UpdateInvestmentAccountUseCase';
import { AccountController } from '../../modules/accounts/presentation/AccountController';
import { InvestmentController } from '../../modules/accounts/presentation/InvestmentController';

export function registerAccountModule(): void {
  container.register<IAccountRepository>('AccountRepository', { useClass: SupabaseAccountRepository });
  container.register<IStockPriceRepository>('StockPriceRepository', { useClass: SupabaseStockPriceRepository });
  container.register<IAlphaVantageService>('AlphaVantageService', { useClass: AlphaVantageService });
  // Finnhub (60/min) first when configured, Alpha Vantage (25/day) as fallback.
  container.register<IStockPriceProvider>('StockPriceProvider', {
    useFactory: instanceCachingFactory((c) => {
      const providers: IStockPriceProvider[] = [];
      const finnhubKey = process.env.FINNHUB_API_KEY;
      if (finnhubKey) providers.push(new FinnhubService(finnhubKey));
      providers.push(c.resolve<AlphaVantageService>('AlphaVantageService'));
      return new FallbackStockPriceProvider(providers);
    }),
  });
  container.register('StockPriceService', { useClass: GetCurrentStockPriceUseCase });
  container.register(CreateAccountUseCase, { useClass: CreateAccountUseCase });
  container.register(GetAllAccountsUseCase, { useClass: GetAllAccountsUseCase });
  container.register(GetAccountByIdUseCase, { useClass: GetAccountByIdUseCase });
  container.register(UpdateAccountUseCase, { useClass: UpdateAccountUseCase });
  container.register(DeleteAccountUseCase, { useClass: DeleteAccountUseCase });
  container.register(DeleteAccountCascadeUseCase, { useClass: DeleteAccountCascadeUseCase });
  container.register(ReorderAccountsUseCase, { useClass: ReorderAccountsUseCase });
  container.register(ArchiveAccountUseCase, { useClass: ArchiveAccountUseCase });
  container.register(UnarchiveAccountUseCase, { useClass: UnarchiveAccountUseCase });
  container.register(GetCurrentStockPriceUseCase, { useClass: GetCurrentStockPriceUseCase });
  container.register(UpdateInvestmentAccountUseCase, { useClass: UpdateInvestmentAccountUseCase });
  container.register(AccountController, { useClass: AccountController });
  container.register(InvestmentController, { useClass: InvestmentController });
}
