import { Wallet } from 'lucide-react';
import type {
  Account,
  AccountCardDisplaySettings,
  Currency,
  Pocket,
} from '../../types';
import EmptyState from '../EmptyState';
import CurrencySection from './CurrencySection';
import type { InvestmentData } from './InvestmentCard';

export interface CurrencyBreakdownSectionProps {
  sortedCurrencies: Currency[];
  accountsByCurrency: Record<Currency, Account[]>;
  pockets: Pocket[];
  investmentData: Map<string, InvestmentData>;
  refreshingPrices: Set<string>;
  accountCardDisplay: AccountCardDisplaySettings;
  onRefreshPrice: (account: Account) => void;
}

/**
 * Per-currency account grouping for the summary page. Renders a
 * `CurrencySection` per currency, or an empty state when no accounts exist.
 */
const CurrencyBreakdownSection = ({
  sortedCurrencies,
  accountsByCurrency,
  pockets,
  investmentData,
  refreshingPrices,
  accountCardDisplay,
  onRefreshPrice,
}: CurrencyBreakdownSectionProps) => {
  if (sortedCurrencies.length === 0) {
    return (
      <EmptyState
        icon={Wallet}
        title="No accounts yet"
        description="Create your first account to see your summary."
      />
    );
  }

  return (
    <div className="space-y-4">
      {sortedCurrencies.map((currency) => (
        <CurrencySection
          key={currency}
          currency={currency}
          accounts={accountsByCurrency[currency]}
          pockets={pockets}
          investmentData={investmentData}
          refreshingPrices={refreshingPrices}
          onRefreshPrice={onRefreshPrice}
          normalAccountDisplayMode={accountCardDisplay.normal}
          investmentAccountDisplayMode={accountCardDisplay.investment}
          cdAccountDisplayMode={accountCardDisplay.cd}
        />
      ))}
    </div>
  );
};

export default CurrencyBreakdownSection;
