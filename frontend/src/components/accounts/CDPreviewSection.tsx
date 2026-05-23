import { Calendar } from 'lucide-react';
import { addMonths, format } from 'date-fns';
import Button from '../ui/Button';
import { currencyService } from '../../services/currencyService';
import { cdCalculationService } from '../../services/cdCalculationService';
import { parseDate } from '../../utils/dateUtils';
import type { Currency, CompoundingFrequency } from '../../types';

interface CDPreviewSectionProps {
  principal: number;
  interestRate: number;
  termMonths: number;
  compoundingFrequency: CompoundingFrequency;
  currency: Currency;
  withholdingTaxRate?: number;
  useCustomMaturityDate?: boolean;
  customMaturityDate?: string;
  showPreview: boolean;
  onToggleShowPreview: () => void;
}

const CDPreviewSection = ({
  principal,
  interestRate,
  termMonths,
  compoundingFrequency,
  currency,
  withholdingTaxRate,
  useCustomMaturityDate,
  customMaturityDate,
  showPreview,
  onToggleShowPreview,
}: CDPreviewSectionProps) => {
  // Calculate preview values
  const previewMaturityDate = useCustomMaturityDate && customMaturityDate
    ? parseDate(customMaturityDate)
    : addMonths(new Date(), termMonths);

  const previewCalculation = principal > 0 && interestRate > 0 && termMonths > 0
    ? cdCalculationService.calculateCompoundInterest(
        principal,
        interestRate / 100,
        termMonths * 30, // Approximate days
        compoundingFrequency
      )
    : null;

  const hasWithholdingTax = !!(withholdingTaxRate && withholdingTaxRate > 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Calendar className="w-5 h-5" />
          Preview
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onToggleShowPreview}
        >
          {showPreview ? 'Hide' : 'Show'} Preview
        </Button>
      </div>

      {showPreview && previewCalculation && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-blue-700 dark:text-blue-300">Maturity Date:</span>
              <div className="font-medium text-blue-900 dark:text-blue-100">
                {format(previewMaturityDate, 'MMM dd, yyyy')}
              </div>
            </div>
            <div>
              <span className="text-blue-700 dark:text-blue-300">Total at Maturity:</span>
              <div className="font-medium text-blue-900 dark:text-blue-100">
                {currencyService.formatCurrency(previewCalculation.finalAmount, currency)}
              </div>
            </div>
            <div>
              <span className="text-blue-700 dark:text-blue-300">Gross Interest:</span>
              <div className="font-medium text-blue-900 dark:text-blue-100">
                {currencyService.formatCurrency(previewCalculation.interestEarned, currency)}
              </div>
            </div>
            <div>
              <span className="text-blue-700 dark:text-blue-300">Effective Yield:</span>
              <div className="font-medium text-blue-900 dark:text-blue-100">
                {((previewCalculation.interestEarned / principal) * 100).toFixed(2)}%
              </div>
            </div>
            {hasWithholdingTax && (
              <>
                <div>
                  <span className="text-blue-700 dark:text-blue-300">Withholding Tax:</span>
                  <div className="font-medium text-red-600 dark:text-red-400">
                    -{currencyService.formatCurrency(
                      previewCalculation.interestEarned * (withholdingTaxRate! / 100),
                      currency
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-blue-700 dark:text-blue-300">Net Interest:</span>
                  <div className="font-medium text-green-600 dark:text-green-400">
                    {currencyService.formatCurrency(
                      previewCalculation.interestEarned * (1 - (withholdingTaxRate! / 100)),
                      currency
                    )}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <span className="text-blue-700 dark:text-blue-300">Net Amount at Maturity:</span>
                  <div className="font-bold text-green-600 dark:text-green-400 text-lg">
                    {currencyService.formatCurrency(
                      principal + previewCalculation.interestEarned * (1 - (withholdingTaxRate! / 100)),
                      currency
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CDPreviewSection;
