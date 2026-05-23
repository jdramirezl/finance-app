import { formatCurrency } from '../../utils/formatCurrency';

export interface DistributionHeaderProps {
  distributable: number;
  currency: string;
  /** Total allocated percentage across all distribution entries (0-100+). */
  totalPercentage: number;
}

interface BadgeStyle {
  className: string;
  label: string;
}

const getBadgeStyle = (totalPercentage: number): BadgeStyle => {
  // Round once for both the threshold check and the displayed value so the
  // badge label and color always agree.
  const rounded = Math.round(totalPercentage);

  if (rounded === 0) {
    return {
      className: 'bg-gray-700 text-gray-400',
      label: 'Not allocated',
    };
  }

  if (rounded === 100) {
    return {
      className: 'bg-green-500/20 text-green-400',
      label: 'Allocated: 100%',
    };
  }

  if (rounded > 100) {
    return {
      className: 'bg-red-500/20 text-red-400',
      label: `Over-allocated: ${rounded}%`,
    };
  }

  return {
    className: 'bg-amber-500/20 text-amber-400',
    label: `Allocated: ${rounded}%`,
  };
};

/**
 * Header for the distribution panel of the unified budget page. Shows the
 * remainder available to distribute (income minus fixed obligations) and a
 * badge summarizing how much of it has been allocated.
 */
const DistributionHeader = ({
  distributable,
  currency,
  totalPercentage,
}: DistributionHeaderProps) => {
  const badge = getBadgeStyle(totalPercentage);

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex flex-col">
        <h2 className="text-lg font-semibold text-gray-100">
          Available to Distribute
        </h2>
        <p className="text-sm text-gray-400">Remainder from fixed obligations</p>
      </div>

      <div className="flex flex-col items-end gap-2">
        <span className="text-2xl font-bold text-blue-400">
          {formatCurrency(distributable, currency)}
        </span>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>
    </div>
  );
};

export default DistributionHeader;
