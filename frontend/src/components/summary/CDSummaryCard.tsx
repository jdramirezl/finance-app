import { AlertTriangle, Landmark, Calendar, DollarSign } from 'lucide-react';
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
  let calculation: any = null;
  let summary: any = null;
  let hasError = false;
  
  try {
    calculation = cdCalculationService.calculateCurrentValue(account);
    summary = cdCalculationService.generateCDSummary(account);
  } catch (error) {
    console.error('❌ Failed to calculate CD values:', error);
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
    if (hasError) return 'text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
    if (!summary) return 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800';
    switch (summary.status) {
      case 'matured':
        return 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
      case 'near-maturity':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
      default:
        return 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';
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
    const startDate = new Date(account.cdCreatedAt);
    const endDate = new Date(account.maturityDate);
    const currentDate = new Date();
    
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsed = currentDate.getTime() - startDate.getTime();
    
    return Math.min(Math.max((elapsed / totalDuration) * 100, 0), 100);
  };

  const progressPercentage = getProgressPercentage();

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg p-4 border-l-4" style={{ borderColor: account.color }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: `${account.color}20`, border: `2px solid ${account.color}` }}
          >
            <Landmark className="w-5 h-5" style={{ color: account.color }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-lg text-gray-900 dark:text-gray-100">
                {account.name}
              </span>
              <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getStatusColor()}`}>
                {getStatusText()}
              </span>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Certificate of Deposit • {account.interestRate || 0}% APY
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-2xl font-bold text-gray-900 dark:text-gray-100">
            <SelectableValue id={`cd-sum-bal-${account.id}`} value={netBalance} currency={account.currency}>
              {currencyService.formatCurrency(netBalance, account.currency)}
            </SelectableValue>
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {account.withholdingTaxRate && account.withholdingTaxRate > 0 ? 'Net Current Value' : 'Current Value'}
          </div>
        </div>
      </div>

      {!hasError && calculation && (
        <>
          {/* Progress to Maturity */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>Progress to Maturity</span>
              <span>{progressPercentage.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
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
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <DollarSign className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Interest</span>
              </div>
              <div className="text-sm font-bold text-green-600 dark:text-green-400">
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
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <Calendar className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Maturity</span>
              </div>
              <div className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {format(new Date(account.maturityDate), 'MMM dd')}
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700 text-center">
              <div className="flex items-center justify-center gap-1 mb-1">
                <span className="text-lg font-bold" style={{ color: account.color }}>%</span>
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">APY</span>
              </div>
              <div className="text-lg font-bold text-gray-900 dark:text-gray-100">
                {account.interestRate || 0}%
              </div>
            </div>
          </div>

          {/* Investment Details */}
          <div className="space-y-2">
            <div className="flex items-center justify-between py-2 px-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Principal Amount</span>
              <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                <SelectableValue id={`cd-principal-${account.id}`} value={account.principal || 0} currency={account.currency}>
                  {currencyService.formatCurrency(account.principal || 0, account.currency)}
                </SelectableValue>
              </span>
            </div>

            {calculation.daysToMaturity > 0 && (
              <div className="flex items-center justify-between py-2 px-3 bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Days to Maturity</span>
                <span className="font-mono font-semibold text-gray-900 dark:text-gray-100">
                  {calculation.daysToMaturity}
                </span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Withholding Tax Warning */}
      {account.withholdingTaxRate && account.withholdingTaxRate > 0 && (
        <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded-md">
          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
          <span>{account.withholdingTaxRate}% withholding tax will be deducted from interest earnings.</span>
        </div>
      )}

      {hasError && (
        <div className="flex items-center gap-2 text-xs text-red-600 dark:text-red-400 mt-3 p-2 bg-red-50 dark:bg-red-900/20 rounded-md">
          <AlertTriangle className="w-3 h-3 flex-shrink-0" />
          <span>Error calculating CD values. Please check configuration.</span>
        </div>
      )}
    </div>
  );
};

export default CDSummaryCard;