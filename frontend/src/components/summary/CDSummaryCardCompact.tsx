import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Landmark } from 'lucide-react';
import { currencyService } from '../../services/currencyService';
import { cdCalculationService } from '../../services/cdCalculationService';
import { formatDisplayDate } from '../../utils/dateUtils';
import SelectableValue from '../ui/SelectableValue';
import type { CDInvestmentAccount, CDCalculationResult } from '../../types';

type CDSummary = ReturnType<typeof cdCalculationService.generateCDSummary>;

interface CDSummaryCardCompactProps {
  account: CDInvestmentAccount;
}

const CDSummaryCardCompact = ({ account }: CDSummaryCardCompactProps) => {
  const navigate = useNavigate();

  const handleAccountClick = () => {
    navigate(`/accounts?id=${account.id}`);
  };

  // Calculate current CD values with error handling
  let calculation: CDCalculationResult | null = null;
  let summary: CDSummary | null = null;
  let hasError = false;

  try {
    calculation = cdCalculationService.calculateCurrentValue(account);
    summary = cdCalculationService.generateCDSummary(account);
  } catch {
    hasError = true;
  }

  // Get display balance
  const netBalance = hasError ? 0 : (
    account.withholdingTaxRate && account.withholdingTaxRate > 0
      ? calculation?.netCurrentValue || 0
      : calculation?.currentValue || 0
  );

  // Status styling
  const getStatusColor = () => {
    if (hasError) return 'text-red-400';
    if (!summary) return 'text-on-surface-variant';
    switch (summary.status) {
      case 'matured':
        return 'text-emerald-400';
      case 'near-maturity':
        return 'text-tertiary';
      default:
        return 'text-primary';
    }
  };

  const getStatusText = () => {
    if (hasError) return 'Error';
    if (!summary) return 'Unknown';
    switch (summary.status) {
      case 'matured':
        return 'Matured';
      case 'near-maturity':
        return 'Near Maturity';
      default:
        return 'Active';
    }
  };

  return (
    <div className="border-l-4 pl-4" style={{ borderColor: account.color }}>
      {/* Header - similar to regular accounts */}
      <div className="flex items-center justify-between mb-2">
        <div
          className="flex items-center gap-2 cursor-pointer group"
          onClick={handleAccountClick}
          title="View Account Details"
        >
          <div
            className="w-3 h-3 rounded-full transition-transform group-hover:scale-125"
            style={{ backgroundColor: account.color }}
          />
          <span className="font-semibold text-lg text-on-surface group-hover:text-primary">
            {account.name}
          </span>
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>
        <span className="font-mono text-lg font-semibold text-on-surface">
          <SelectableValue id={`cd-sum-bal-${account.id}`} value={netBalance} currency={account.currency}>
            {currencyService.formatCurrency(netBalance, account.currency)}
          </SelectableValue>
        </span>
      </div>

      {/* CD Details - compact like pockets */}
      <div className="ml-5 space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-on-surface-variant">
            Certificate of Deposit • <span className="font-mono">{account.interestRate || 0}%</span> APY
          </span>
          <div className="flex items-center gap-1">
            <Landmark className="w-3 h-3 text-tertiary" />
          </div>
        </div>

        {!hasError && calculation && (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-on-surface-variant">
                Total money invested:
              </span>
              <span className="font-mono text-on-surface">
                <SelectableValue id={`cd-principal-${account.id}`} value={account.principal || 0} currency={account.currency}>
                  {currencyService.formatCurrency(account.principal || 0, account.currency)}
                </SelectableValue>
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-on-surface-variant">
                {account.withholdingTaxRate && account.withholdingTaxRate > 0 ? 'Net interest earned:' : 'Interest earned:'}
              </span>
              <span className="font-mono text-emerald-400">
                <SelectableValue
                  id={`cd-interest-${account.id}`}
                  value={account.withholdingTaxRate && account.withholdingTaxRate > 0 ? calculation.netInterest : calculation.accruedInterest}
                  currency={account.currency}
                >
                  +{currencyService.formatCurrency(
                    account.withholdingTaxRate && account.withholdingTaxRate > 0
                      ? calculation.netInterest
                      : calculation.accruedInterest,
                    account.currency
                  )}
                </SelectableValue>
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-on-surface-variant">
                Maturity:
              </span>
              <span className="font-mono text-on-surface">
                {formatDisplayDate(account.maturityDate, 'MMM dd, yyyy')}
              </span>
            </div>

            {calculation.daysToMaturity > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-on-surface-variant">
                  Days to maturity:
                </span>
                <span className="font-mono text-on-surface">
                  {calculation.daysToMaturity}
                </span>
              </div>
            )}
          </>
        )}

        {/* Withholding Tax Warning - compact */}
        {account.withholdingTaxRate && account.withholdingTaxRate > 0 && (
          <div className="flex items-center gap-2 text-xs text-red-400 mt-2">
            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
            <span>{account.withholdingTaxRate}% withholding tax will be deducted from interest earnings.</span>
          </div>
        )}

        {hasError && (
          <div className="flex items-center gap-2 text-xs text-red-400 mt-2">
            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
            <span>Error calculating CD values. Please check configuration.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CDSummaryCardCompact;
