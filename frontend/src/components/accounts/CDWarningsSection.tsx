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
        <div className="flex items-start gap-2 p-3 bg-tertiary/10 rounded-lg border border-tertiary/20">
          <AlertTriangle className="w-4 h-4 text-tertiary flex-shrink-0 mt-0.5" />
          <div className="text-sm text-tertiary">
            <strong>Early Withdrawal Penalty:</strong> Withdrawing funds before maturity will result in a {earlyWithdrawalPenalty}% penalty on interest earned.
          </div>
        </div>
      )}

      {hasWithholdingTax && (
        <div className="flex items-start gap-2 p-3 bg-error/10 rounded-lg border border-error/20">
          <AlertTriangle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
          <div className="text-sm text-error">
            <strong>Withholding Tax (Retención en la Fuente):</strong> The bank will withhold {withholdingTaxRate}% of your interest earnings as tax. This amount will be deducted from your final payout.
          </div>
        </div>
      )}
    </>
  );
};

export default CDWarningsSection;
