import { supabase } from '../lib/supabase';
import type { BudgetPlanningData } from '../hooks/useBudgetPersistence';

const DEFAULT_DATA: BudgetPlanningData = {
  initialAmount: 0,
  distributionEntries: [],
  scenarios: [],
  allocationScenarios: [],
  activeAllocationScenarioId: '',
  defaultAccountId: '',
  defaultPocketId: '',
  budgetCurrency: '',
};

export const budgetPlanningService = {
  async get(): Promise<BudgetPlanningData> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return DEFAULT_DATA;

    const { data, error } = await supabase
      .from('budget_planning')
      .select('data')
      .eq('user_id', user.id)
      .single();

    if (error || !data) return DEFAULT_DATA;
    return { ...DEFAULT_DATA, ...data.data };
  },

  async save(planningData: BudgetPlanningData): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase
      .from('budget_planning')
      .upsert(
        { user_id: user.id, data: planningData, updated_at: new Date().toISOString() },
        { onConflict: 'user_id' }
      );
  },
};
