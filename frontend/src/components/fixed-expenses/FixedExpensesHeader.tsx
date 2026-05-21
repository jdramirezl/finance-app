import { Plus, Receipt } from 'lucide-react';
import type { Currency } from '../../types';
import Button from '../ui/Button';
import Card from '../ui/Card';

export interface FixedExpensesHeaderProps {
  pocketCount: number;
  enabledExpenseCount: number;
  totalMonthly: number;
  currency: Currency;
  onCreateMovements: () => void;
  onNewExpense: () => void;
}

/**
 * Page header for the Fixed Expenses page: title, action buttons, and the
 * monthly total summary card.
 */
const FixedExpensesHeader = ({
  pocketCount,
  enabledExpenseCount,
  totalMonthly,
  currency,
  onCreateMovements,
  onNewExpense,
}: FixedExpensesHeaderProps) => {
  return (
    <>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-on-surface">
            Fixed Expenses
          </h1>
          <p className="text-on-surface-variant mt-1">
            Managing {pocketCount} fixed expense{' '}
            {pocketCount === 1 ? 'pocket' : 'pockets'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            onClick={onCreateMovements}
            disabled={enabledExpenseCount === 0}
          >
            <Receipt className="w-5 h-5" />
            Create Movements
          </Button>
          <Button variant="primary" onClick={onNewExpense}>
            <Plus className="w-5 h-5" />
            New Fixed Expense
          </Button>
        </div>
      </div>

      <Card
        padding="md"
        className="bg-[rgba(27,33,34,0.8)] backdrop-blur-[12px] border border-white/[0.08]"
      >
        <h2 className="text-lg font-semibold text-on-surface mb-2">
          Monthly Fixed Expenses Total
        </h2>
        <p className="text-3xl font-bold text-primary font-mono">
          {totalMonthly.toLocaleString(undefined, {
            style: 'currency',
            currency,
          })}
        </p>
        <p className="text-sm text-on-surface-variant mt-1">
          Sum of all enabled fixed expenses monthly contributions
        </p>
      </Card>
    </>
  );
};

export default FixedExpensesHeader;
