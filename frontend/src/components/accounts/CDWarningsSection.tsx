import { AlertTriangle } from 'lucide-react';

interface CDWarningsSectionProps {
  earlyWithdrawalPenalty?: number;
  withholdingTaxRate?: number;
}

const CDWarningsSection = ({
  earlyWithdrawalPenalty,
  withholdingTaxRate,
}: CDWarningsSectionProps) => {
  const hasEarlyWithdrawalPenalty = !!(earlyWithdrawalPenalty && earlyWithdrawalPenalty > 0);
  const hasWithholdingTax = !!(withholdingTaxRate && withholdingTaxRate > 0);

  if (!hasEarlyWithdrawalPenalty && !hasWithholdingTax) {
    return null;
  }

  return (
    <>
      {hasEarlyWithdrawalPenalty && (
        <div className="flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Early Withdrawal Penalty:</strong> Withdrawing funds before maturity will result in a {earlyWithdrawalPenalty}% penalty on interest earned.
          </div>
        </div>
      )}

      {hasWithholdingTax && (
        <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-red-800 dark:text-red-200">
            <strong>Withholding Tax (Retención en la Fuente):</strong> The bank will withhold {withholdingTaxRate}% of your interest earnings as tax. This amount will be deducted from your final payout.
          </div>
        </div>
      )}
    </>
  );
};

export default CDWarningsSection;
