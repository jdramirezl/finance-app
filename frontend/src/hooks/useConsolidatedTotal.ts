import { useCallback, useEffect, useMemo, useState } from 'react';
import { cdCalculationService } from '../services/cdCalculationService';
import { currencyService } from '../services/currencyService';
import type { Account, CDInvestmentAccount, Currency } from '../types';
import type { InvestmentData } from '../components/summary';

const isCDAccount = (account: Account): account is CDInvestmentAccount =>
  account.type === 'cd';

const computeCDBalance = (account: CDInvestmentAccount): number => {
  try {
    if (!account.principal || !account.interestRate || !account.maturityDate) {
      return account.balance || 0;
    }
    const calculation = cdCalculationService.calculateCurrentValue(account);
    // Use net value if withholding tax is configured.
    return account.withholdingTaxRate && account.withholdingTaxRate > 0
      ? calculation.netCurrentValue
      : calculation.currentValue;
  } catch {
    return account.balance || 0;
  }
};

export interface UseConsolidatedTotalParams {
  accounts: Account[];
  primaryCurrency: Currency;
  investmentData: Map<string, InvestmentData>;
}

export interface UseConsolidatedTotalResult {
  accountsByCurrency: Record<Currency, Account[]>;
  sortedCurrencies: Currency[];
  totalsByCurrency: Record<Currency, number>;
  consolidatedTotal: number;
  /**
   * `true` once the latest cross-currency conversion has settled (or there
   * is no work to do). Consumers should render a skeleton for the
   * consolidated total until this flips, otherwise the user briefly sees
   * `$0.00` while exchange rates are fetched.
   */
  isConsolidatedReady: boolean;
  getAccountBalance: (account: Account) => number;
}

/**
 * Computes per-currency totals for the summary page and a single
 * consolidated total in the user's primary currency. Currency conversion is
 * async (via currencyService); we cache the latest converted total in state
 * and recompute when the underlying inputs change. An `ignore` flag prevents
 * stale conversions from clobbering newer ones.
 */
export const useConsolidatedTotal = ({
  accounts,
  primaryCurrency,
  investmentData,
}: UseConsolidatedTotalParams): UseConsolidatedTotalResult => {
  const accountsByCurrency = useMemo(() => {
    return accounts.reduce(
      (acc, account) => {
        if (!acc[account.currency]) acc[account.currency] = [];
        acc[account.currency].push(account);
        return acc;
      },
      {} as Record<Currency, Account[]>
    );
  }, [accounts]);

  const getAccountBalance = useCallback(
    (account: Account): number => {
      if (isCDAccount(account)) return computeCDBalance(account);
      if (account.type === 'investment' && account.stockSymbol) {
        const data = investmentData.get(account.id);
        return data ? data.totalValue : account.balance || 0;
      }
      return account.balance;
    },
    [investmentData]
  );

  const sortedCurrencies = useMemo(() => {
    return (Object.keys(accountsByCurrency) as Currency[]).sort((a, b) => {
      const aHasInvestment = accountsByCurrency[a].some(
        (acc) => acc.type === 'investment'
      );
      const bHasInvestment = accountsByCurrency[b].some(
        (acc) => acc.type === 'investment'
      );
      if (aHasInvestment && !bHasInvestment) return -1;
      if (!aHasInvestment && bHasInvestment) return 1;
      return a.localeCompare(b);
    });
  }, [accountsByCurrency]);

  const totalsByCurrency = useMemo(() => {
    return sortedCurrencies.reduce(
      (acc, currency) => {
        const list = accountsByCurrency[currency] || [];
        acc[currency] = list.reduce(
          (sum, account) => sum + getAccountBalance(account),
          0
        );
        return acc;
      },
      {} as Record<Currency, number>
    );
  }, [sortedCurrencies, accountsByCurrency, getAccountBalance]);

  const [consolidatedTotal, setConsolidatedTotal] = useState<number>(0);
  // No accounts → there's nothing to convert and `0` is the correct value,
  // so we can render the total immediately.
  const [isConsolidatedReady, setIsConsolidatedReady] = useState<boolean>(
    () => accounts.length === 0
  );

  useEffect(() => {
    let ignore = false;

    if (accounts.length === 0) {
      // Reset to the trivially-ready zero state when accounts are cleared.
      setConsolidatedTotal(0);
      setIsConsolidatedReady(true);
      return;
    }

    // Inputs changed — the previously cached total is stale until the new
    // conversion settles.
    setIsConsolidatedReady(false);

    const calculate = async () => {
      let total = 0;
      // Build a single batch of cross-currency conversions. Same-currency
      // totals are added directly to avoid an unnecessary network round-trip
      // for the trivial 1:1 case.
      const conversions: Array<{ amount: number; from: string; to: string }> = [];
      for (const currency of sortedCurrencies) {
        const currencyTotal = totalsByCurrency[currency];
        if (!currencyTotal || !currency) continue;
        if (currency === primaryCurrency) {
          total += currencyTotal;
          continue;
        }
        conversions.push({
          amount: currencyTotal,
          from: currency,
          to: primaryCurrency,
        });
      }

      if (conversions.length > 0) {
        const results = await currencyService.convertBatch(conversions);
        for (const { convertedAmount } of results) {
          total += convertedAmount;
        }
      }

      if (!ignore) {
        setConsolidatedTotal(total);
        setIsConsolidatedReady(true);
      }
    };

    calculate();

    return () => {
      ignore = true;
    };
  }, [accounts, primaryCurrency, sortedCurrencies, totalsByCurrency]);

  return {
    accountsByCurrency,
    sortedCurrencies,
    totalsByCurrency,
    consolidatedTotal,
    isConsolidatedReady,
    getAccountBalance,
  };
};
