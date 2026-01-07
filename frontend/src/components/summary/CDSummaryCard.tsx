import { TrendingUp, AlertTriangle, Landmark } from 'lucide-react';
import { format } from 'date-fns';
import { currencyService } from '../../services/currencyService';
import { cdCalculationService } from '../../services/cdCalculationService';
import SelectableValue from '../SelectableValue';
import type { CDInvestmentAccount } from '../../types';

interface CDSummaryCardProps {
  account: CDInvestmentAccount;
}

const CDSummaryCard = ({ account }: CDSummaryCardProps) => {
  // Calculate current CD values with error handling
  let calculation;
  let summary;
  let hasError = false;
  
  try {
    calculation = cdCalculationService.calculateCurrentValue(account);
    summary = cdCalculationService.generateCDSummary(account);
  } catch (error) {
    console.error('❌ Failed to calculate CD values:', error);
    hasError = true;
  }

  // Get display balance
  const displayBalance = hasError ? 0 : (calculation?.currentValue || 0);
  const netBalance = hasError ? 0 : (
    account.withholdingTaxRate && account.withholdingTaxRate > 0 
      ? calculation?.netCurrentValue || 0
      : calculation?.currentValue || 0
  );

  // Status styling
  const getStatusColor = () => {
    if (hasError) return 'text-red-600 dark:text-red-400';
    if (!summary) return 'text-gray-600 dark:text-gray-400';
    switch (summary.status) {
      case 'matured':
        return 'text-green-600 dark:text-green-400';
      case 'near-maturity':
        return 'text-yellow-600 dark:text-yellow-400';
      default:
        return 'text-blue-600 dark:text-blue-400';
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
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: account.color }}
          />
          <span className="font-semibold text-lg text-gray-900 dark:text-gray-100">
            {account.name}
          </span>
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>
        <span className="font-mono text-lg font-semibold text-gray-900 dark:text-gray-100">
          <SelectableValue id={`cd-sum-bal-${account.id}`} value={netBalance} currency={account.currency}>
            {currencyService.formatCurrency(netBalance, account.currency)}
          </SelectableValue>
        </span>
      </div>

      {/* CD Details - compact like pockets */}
      <div className="ml-5 space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-700 dark:text-gray-300">
            Certificate of Deposit • {account.interestRate || 0}% APY
          </span>
          <div className="flex items-center gap-1">
            <Landmark className="w-3 h-3 text-amber-600 dark:text-amber-400" />
          </div>
        </div>

        {!hasError && calculation && (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700 dark:text-gray-300">
                Total money invested:
              </span>
              <span className="font-mono text-gray-900 dark:text-gray-100">
                <SelectableValue id={`cd-principal-${account.id}`} value={account.principal || 0} currency={account.currency}>
                  {currencyService.formatCurrency(account.principal || 0, account.currency)}
                </SelectableValue>
              </span>
            </div>

            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-700 dark:text-gray-300">
                {account.withholdingTaxRate && account.withholdingTaxRate > 0 ? 'Net interest earned:' : 'Interest earned:'}
              </span>
              <span className="font-mono text-green-600 dark:text-green-400">
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
              <span className="text-gray-700 dark:text-gray-300">
                Maturity:
              </span>
              <span className="text-gray-900 dark:text-gray-100">
                {format(new Date(account.maturityDate), 'MMM dd, yyyy')}
              </span>
            </div>

            {calculation.daysToMaturity > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700 dark:text-gray-300">
                  Days to maturity:
                </span>
                <span className="text-gray-900 dark:text-gray-100">
                  {calculation.daysToMaturity}
                </span>
              </div>
            )}
          </>
        )}

        {/* Withholding Tax Warning - compact */}
        {account.withholdingTaxRate && account.withholdingTaxRate > 0 && (
          <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 mt-2">
            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
            <span>{account.withholdingTaxRate}% withholding tax will be deducted from interest earnings.</span>
          </div>
        )}

        {hasError && (
          <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 mt-2">
            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
            <span>Error calculating CD values. Please check configuration.</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CDSummaryCard;