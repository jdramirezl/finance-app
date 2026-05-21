import 'reflect-metadata';
import { container } from 'tsyringe';
import { getSupabaseClient } from '../infrastructure/supabaseClient';
import { registerAccountModule } from './accounts.module';
import { registerPocketModule } from './pockets.module';
import { registerSubPocketModule } from './subPockets.module';
import { registerMovementModule } from './movements.module';
import { registerSettingsModule } from './settings.module';
import { registerReminderModule } from './reminders.module';
import { registerNetWorthModule } from './netWorth.module';

export function initializeContainer(): void {
  container.registerInstance('SupabaseClient', getSupabaseClient());
  registerAccountModule();
  registerPocketModule();
  registerSubPocketModule();
  registerMovementModule();
  registerSettingsModule();
  registerReminderModule();
  registerNetWorthModule();
}
