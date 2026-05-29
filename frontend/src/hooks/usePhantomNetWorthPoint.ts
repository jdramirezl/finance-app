import { useEffect, useMemo, useState } from 'react';
import { currencyService } from '../services/currencyService';
import { useAccountsQuery, useSettingsQuery } from './queries';

export interface PhantomPoint {
  date: string;
  total: number;
  breakdown: Record<string, number>;
  isPhantom: true;
  isAnchor: true;
}

export const usePhantomNetWorthPoint = (): { data: PhantomPoint | null; isLoading: boolean } => {
  const { data: accounts, isLoading: accountsLoading } = useAccountsQuery();
  const { data: settings, isLoading: settingsLoading } = useSettingsQuery();
  const primaryCurrency = settings?.primaryCurrency ?? 'COP';

  const activeAccounts = useMemo(
    () => (accounts ?? []).filter((a) => !a.archivedAt),
    [accounts]
  );

  const breakdown = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of activeAccounts) {
      map[a.currency] = (map[a.currency] ?? 0) + a.balance;
    }
    return map;
  }, [activeAccounts]);

  const [total, setTotal] = useState<number | null>(null);

  useEffect(() => {
    if (accountsLoading || settingsLoading) return;
    let ignore = false;

    const convert = async () => {
      let sum = 0;
      const conversions: Array<{ amount: number; from: string; to: string }> = [];
      for (const [currency, amount] of Object.entries(breakdown)) {
        if (currency === primaryCurrency) { sum += amount; continue; }
        conversions.push({ amount, from: currency, to: primaryCurrency });
      }
      if (conversions.length > 0) {
        const results = await currencyService.convertBatch(conversions);
        for (const { convertedAmount } of results) sum += convertedAmount;
      }
      if (!ignore) setTotal(sum);
    };

    convert();
    return () => { ignore = true; };
  }, [breakdown, primaryCurrency, accountsLoading, settingsLoading]);

  if (accountsLoading || settingsLoading || total === null) {
    return { data: null, isLoading: true };
  }

  return {
    data: { date: new Date().toISOString().slice(0, 10), total, breakdown, isPhantom: true, isAnchor: true },
    isLoading: false,
  };
};
