import { memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Landmark, Calendar, DollarSign } from 'lucide-react';
import { currencyService } from '../../services/currencyService';
import { cdCalculationService } from '../../services/cdCalculationService';
import { parseDate, formatDisplayDate } from '../../utils/dateUtils';
import SelectableValue from '../ui/SelectableValue';
import type { CDInvestmentAccount, CDCalculationResult } from '../../types';

// `generateCDSummary` returns a richer ad-hoc shape on top of the
// calculation result; we use the inferred return type so the card stays
// in sync with the service.
type CDSummary = ReturnType<typeof cdCalculationService.generateCDSummary>;

interface CDSummaryCardProps {
  account: CDInvestmentAccount;
}

/**
 * Renders a single Certificate of Deposit summary card on the summary
 * page. Memoized so unrelated re-renders on the summary page don't
 * re-trigger the (relatively expensive) CD calculation for every CD card.
 */
const CDSummaryCard = ({ account }: CDSummaryCardProps) => {
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
    if (hasError) return 'text-red-400 bg-red-400/10';
    if (!summary) return 'text-on-surface-variant bg-surface-container-highest';
    switch (summary.status) {
      case 'matured':
        return 'text-emerald-400 bg-emerald-400/10';
      case 'near-maturity':
        return 'text-tertiary bg-tertiary/10';
      default:
        return 'text-primary bg-primary/10';
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

  // Calculate progress percentage
  const getProgressPercentage = () => {
    if (hasError || !calculation || !account.cdCreatedAt || !account.maturityDate) return 0;
    const startDate = parseDate(account.cdCreatedAt);
    const endDate = parseDate(account.maturityDate);
    const currentDate = new Date();

    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsed = currentDate.getTime() - startDate.getTime();

    return Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
  };

  const progressPercentage = getProgressPercentage();

  return (
    <div className="bg-surface-container-high/50 rounded-lg p-4 border-l-4" style={{ borderColor: account.color }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div
          className="flex items-center gap-3 cursor-pointer group"
          onClick={handleAccountClick}
          title="View Account Details"
        >
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110"
            style={{ backgroundColor: `${account.color}20`, border: `2px solid ${account.color}` }}
          >
            <Landmark className="w-5 h-5" style={{ color: account.color }} aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-lg text-on-surface group-hover:text-primary">
                {account.name}
              </span>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor()}`}>
                {getStatusText()}
              </span>
            </div>
            <div className="text-sm text-on-surface-variant">
              Certificate of Deposit • <span className="font-mono">{account.interestRate || 0}%</span> APY
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-2xl font-bold text-on-surface">
            <SelectableValue id={`cd-sum-bal-${account.id}`} value={netBalance} currency={account.currency}>
              {currencyService.formatCurrency(netBalance, account.currency)}
            </SelectableValue>
          </div>
          <div className="text-sm text-on-surface-variant">
            {account.withholdingTaxRate && account.withholdingTaxRate > 0 ? 'Net Current Value' : 'Current Value'}
          </div>
        </div>
      </div>

      {!hasError && calculation && (
        <>
          {/* Progress to Maturity */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-on-surface-variant mb-2">
              <span>Progress to Maturity</span>
              <span className="font-mono">{progressPercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-surface-container-highest rounded-full h-2 overflow-hidden">
              <div
                className="h-full transition-all duration-300 rounded-full"
                style={{
                  width: `${progressPercentage}%`,
                  backgroundColor: account.color
                }}
              />
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-surface-container rounded-lg p-3 border border-outline-variant text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <DollarSign className="w-3 h-3 text-on-surface-variant" aria-hidden="true" />
                <span className="text-xs font-medium text-on-surface-variant">Interest</span>
              </div>
              <div className="text-sm font-bold font-mono text-emerald-400">
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
              </div>
            </div>

            <div className="bg-surface-container rounded-lg p-3 border border-outline-variant text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Calendar className="w-3 h-3 text-on-surface-variant" aria-hidden="true" />
                <span className="text-xs font-medium text-on-surface-variant">Maturity</span>
              </div>
              <div className="text-sm font-bold font-mono text-on-surface">
                {formatDisplayDate(account.maturityDate, 'MMM dd')}
              </div>
            </div>

            <div className="bg-surface-container rounded-lg p-3 border border-outline-variant text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <span className="text-lg font-bold" style={{ color: account.color }}>%</span>
                <span className="text-xs font-medium text-on-surface-variant">APY</span>
              </div>
              <div className="text-lg font-bold font-mono text-on-surface">
                {account.interestRate || 0}%
              </div>
            </div>
          </div>

          {/* Investment Details */}
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 px-3 bg-surface-container rounded-md border border-outline-variant">
              <span className="text-sm font-medium text-on-surface-variant">Principal Amount</span>
              <span className="font-mono font-semibold text-on-surface">
                <SelectableValue id={`cd-principal-${account.id}`} value={account.principal || 0} currency={account.currency}>
                  {currencyService.formatCurrency(account.principal || 0, account.currency)}
                </SelectableValue>
              </span>
            </div>

            {calculation.daysToMaturity > 0 && (
              <div className="flex items-center justify-between py-2 px-3 bg-surface-container rounded-md border border-outline-variant">
                <span className="text-sm font-medium text-on-surface-variant">Days to Maturity</span>
                <span className="font-mono font-semibold text-on-surface">
                  {calculation.daysToMaturity}
                </span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Withholding Tax Warning */}
      {account.withholdingTaxRate && account.withholdingTaxRate > 0 && (
        <div className="flex items-center gap-2 text-xs text-red-400 mt-3 p-2 bg-red-400/10 rounded-md">
          <AlertTriangle className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
          <span>{account.withholdingTaxRate}% withholding tax will be deducted from interest earnings.</span>
        </div>
      )}

      {hasError && (
        <div className="flex items-center gap-2 text-xs text-red-400 mt-3 p-2 bg-red-400/10 rounded-md">
          <AlertTriangle className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
          <span>Error calculating CD values. Please check configuration.</span>
        </div>
      )}
    </div>
  );
};

export default memo(CDSummaryCard);
