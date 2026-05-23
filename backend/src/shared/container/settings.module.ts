import { container } from 'tsyringe';
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

export function registerSettingsModule(): void {
  container.register<ISettingsRepository>('SettingsRepository', {
    useClass: SupabaseSettingsRepository,
  });
  container.register<IExchangeRateRepository>('ExchangeRateRepository', {
    useClass: SupabaseExchangeRateRepository,
  });
  container.register<IExchangeRateAPIService>('ExchangeRateAPIService', {
    useClass: ExchangeRateAPIService,
  });
  container.register(GetSettingsUseCase, { useClass: GetSettingsUseCase });
  container.register(UpdateSettingsUseCase, { useClass: UpdateSettingsUseCase });
  container.register(GetExchangeRateUseCase, { useClass: GetExchangeRateUseCase });
  container.register(ConvertCurrencyUseCase, { useClass: ConvertCurrencyUseCase });
  container.register(SettingsController, { useClass: SettingsController });
  container.register(CurrencyController, { useClass: CurrencyController });
}
