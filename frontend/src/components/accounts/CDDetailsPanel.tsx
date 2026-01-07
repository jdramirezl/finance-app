import { useState } from 'react';
import { Calendar, TrendingUp, AlertTriangle, Clock, Landmark, DollarSign, Percent } from 'lucide-react';
import { format } from 'date-fns';
import Card from '../Card';
import Button from '../Button';
import { currencyService } from '../../services/currencyService';
import { cdCalculationService } from '../../services/cdCalculationService';
import type { CDInvestmentAccount } from '../../types';

interface CDDetailsPanelProps {
  account: CDInvestmentAccount;
  onEdit?: (account: CDInvestmentAccount) => void;
}

const CDDetailsPanel = ({ account, onEdit }: CDDetailsPanelProps) => {
  const [showAdvancedDetails, setShowAdvancedDetails] = useState(false);

  // Calculate current CD values with error handling
  let calculation: any = null;
  let summary: any = null;
  let isNearMaturity = false;
  let hasError = false;
  let errorMessage = '';
  
  try {
    calculation = cdCalculationService.calculateCurrentValue(account);
    summary = cdCalculationService.generateCDSummary(account);
    isNearMaturity = cdCalculationService.isNearMaturity(account);
  } catch (error) {
    console.error('❌ Failed to calculate CD values in CDDetailsPanel:', error);
    hasError = true;
    errorMessage = error instanceof Error ? error.message : 'Calculation failed';
  }

  if (hasError) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <div
              className="w-6 h-6 rounded-full"
              style={{ backgroundColor: account.color }}
            />
            <Landmark className="w-4 h-4 text-white absolute top-1 left-1" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {account.name}
            </h2>
            <p className="text-sm text-red-600 dark:text-red-400">
              Certificate of Deposit • Error: {errorMessage}
            </p>
          </div>
        </div>

        <Card className="p-4 border-red-200 dark:border-red-700">
          <div className="text-center py-8">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-600 dark:text-red-400 mb-2">
              Configuration Error
            </h3>
            <p className="text-sm text-red-600 dark:text-red-400 mb-4">
              {errorMessage}
            </p>
            {onEdit && (
              <Button onClick={() => onEdit(account)} variant="secondary">
                Edit CD Configuration
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }

  // Format dates
  const maturityDate = new Date(account.maturityDate);
  const formattedMaturityDate = format(maturityDate, 'MMM dd, yyyy');
  const createdDate = account.cdCreatedAt ? new Date(account.cdCreatedAt) : null;
  const formattedCreatedDate = createdDate ? format(createdDate, 'MMM dd, yyyy') : 'Unknown';

  // Status styling
  const getStatusColor = () => {
    if (!summary) return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800';
    switch (summary.status) {
      case 'matured':
        return 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
      case 'near-maturity':
        return 'text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      default:
        return 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
    }
  };

  const getStatusText = () => {
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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div
              className="w-6 h-6 rounded-full"
              style={{ backgroundColor: account.color }}
            />
            <Landmark className="w-4 h-4 text-white absolute top-1 left-1" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {account.name}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Certificate of Deposit • {account.currency}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 text-sm font-medium rounded-full border ${getStatusColor()}`}>
            {getStatusText()}
          </span>
          {onEdit && (
            <Button variant="secondary" size="sm" onClick={() => onEdit(account)}>
              Edit
            </Button>
          )}
        </div>
      </div>

      {/* Current Value Card */}
      <Card className="p-6">
        <div className="text-center">
          <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            {calculation ? currencyService.formatCurrency(
              account.withholdingTaxRate && account.withholdingTaxRate > 0 
                ? calculation.netCurrentValue 
                : calculation.currentValue, 
              account.currency
            ) : 'N/A'}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            {account.withholdingTaxRate && account.withholdingTaxRate > 0 ? 'Net Current Value' : 'Current Value'}
          </div>
          {calculation && account.withholdingTaxRate && account.withholdingTaxRate > 0 && (
            <div className="text-xs text-gray-500 dark:text-gray-400">
              Gross: {currencyService.formatCurrency(calculation.currentValue, account.currency)}
            </div>
          )}
        </div>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-green-600 dark:text-green-400 mb-2">
              <TrendingUp className="w-5 h-5" />
              <span className="text-sm font-medium">
                {account.withholdingTaxRate && account.withholdingTaxRate > 0 ? 'Net Interest' : 'Interest Earned'}
              </span>
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {calculation ? currencyService.formatCurrency(
                account.withholdingTaxRate && account.withholdingTaxRate > 0 
                  ? calculation.netInterest 
                  : calculation.accruedInterest, 
                account.currency
              ) : 'N/A'}
            </div>
            {calculation && account.withholdingTaxRate && account.withholdingTaxRate > 0 && (
              <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Gross: {currencyService.formatCurrency(calculation.accruedInterest, account.currency)}
              </div>
            )}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 text-blue-600 dark:text-blue-400 mb-2">
              <Clock className="w-5 h-5" />
              <span className="text-sm font-medium">Days to Maturity</span>
            </div>
            <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {calculation ? (calculation.isMatured ? '0' : calculation.daysToMaturity) : 'N/A'}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {formattedMaturityDate}
            </div>
          </div>
        </Card>
      </div>

      {/* Alerts */}
      {calculation && isNearMaturity && !calculation.isMatured && (
        <div className="flex items-center gap-3 p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0" />
          <div className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Maturity Alert:</strong> This CD matures in {calculation.daysToMaturity} days on {formattedMaturityDate}
          </div>
        </div>
      )}

      {calculation && calculation.isMatured && (
        <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
          <Calendar className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
          <div className="text-sm text-green-800 dark:text-green-200">
            <strong>Matured:</strong> This CD matured on {formattedMaturityDate}. Consider reinvesting or withdrawing funds.
          </div>
        </div>
      )}

      {/* CD Terms */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5" />
          CD Terms
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600 dark:text-gray-400">Principal:</span>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {currencyService.formatCurrency(account.principal || 0, account.currency)}
            </div>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Interest Rate:</span>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {account.interestRate || 0}% APY
            </div>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Term:</span>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {account.termMonths || 0} months
            </div>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Compounding:</span>
            <div className="font-medium text-gray-900 dark:text-gray-100 capitalize">
              {account.compoundingFrequency || 'monthly'}
            </div>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Created:</span>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {formattedCreatedDate}
            </div>
          </div>
          <div>
            <span className="text-gray-600 dark:text-gray-400">Effective Yield:</span>
            <div className="font-medium text-gray-900 dark:text-gray-100">
              {calculation ? `${calculation.effectiveYield.toFixed(2)}%` : 'N/A'}
            </div>
          </div>
        </div>
      </Card>

      {/* Advanced Details Toggle */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowAdvancedDetails(!showAdvancedDetails)}
        className="w-full text-gray-600 dark:text-gray-400"
      >
        {showAdvancedDetails ? 'Hide Advanced Details' : 'Show Advanced Details'}
      </Button>

      {/* Advanced Details */}
      {showAdvancedDetails && (
        <div className="space-y-4">
          {/* Penalties and Taxes */}
          {((account.earlyWithdrawalPenalty && account.earlyWithdrawalPenalty > 0) || 
            (account.withholdingTaxRate && account.withholdingTaxRate > 0)) && (
            <Card className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Percent className="w-5 h-5" />
                Penalties & Taxes
              </h3>
              <div className="space-y-3">
                {account.earlyWithdrawalPenalty && account.earlyWithdrawalPenalty > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0" />
                    <div className="text-sm text-red-800 dark:text-red-200">
                      <strong>Early Withdrawal Penalty:</strong> {account.earlyWithdrawalPenalty}% of interest earned
                    </div>
                  </div>
                )}
                
                {account.withholdingTaxRate && account.withholdingTaxRate > 0 && (
                  <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                    <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                    <div className="text-sm text-orange-800 dark:text-orange-200">
                      <strong>Withholding Tax (Retención):</strong> {account.withholdingTaxRate}% of interest earnings will be withheld by the bank
                      {calculation && (
                        <div className="mt-1 text-xs">
                          Current Tax Amount: {currencyService.formatCurrency(calculation.withholdingTax, account.currency)}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Maturity Projections */}
          {calculation && (
            <Card className="p-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                Maturity Projections
              </h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 dark:text-gray-400">
                    Gross Interest at Maturity:
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">
                    {currencyService.formatCurrency(calculation.totalInterest, account.currency)}
                  </span>
                </div>
                {account.withholdingTaxRate && account.withholdingTaxRate > 0 && (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600 dark:text-gray-400">
                        Withholding Tax at Maturity:
                      </span>
                      <span className="font-semibold text-red-600 dark:text-red-400">
                        -{currencyService.formatCurrency(calculation.totalInterest * (account.withholdingTaxRate / 100), account.currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-3">
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        Net Interest at Maturity:
                      </span>
                      <span className="font-bold text-green-600 dark:text-green-400">
                        {currencyService.formatCurrency(calculation.totalInterest * (1 - (account.withholdingTaxRate / 100)), account.currency)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 pt-3">
                      <span className="font-bold text-gray-900 dark:text-gray-100">
                        Total Net Amount at Maturity:
                      </span>
                      <span className="font-bold text-blue-600 dark:text-blue-400 text-lg">
                        {currencyService.formatCurrency(
                          account.principal + calculation.totalInterest * (1 - (account.withholdingTaxRate / 100)), 
                          account.currency
                        )}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default CDDetailsPanel;