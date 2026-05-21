import Card from '../ui/Card';
import Input from '../ui/Input';

export interface BudgetIncomeSectionProps {
  initialAmount: number;
  onChange: (value: number) => void;
}

/**
 * Income input card. Plain wrapper around the Input so the page can compose
 * it alongside the rest of the planning sections.
 */
const BudgetIncomeSection = ({ initialAmount, onChange }: BudgetIncomeSectionProps) => {
  return (
    <Card padding="md">
      <Input
        label="Initial Amount"
        type="number"
        step="0.01"
        min="0"
        value={initialAmount || ''}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        placeholder="Enter your total amount (e.g., salary)"
        helperText="Typically your monthly income or the amount you want to distribute"
        className="text-lg font-semibold"
      />
    </Card>
  );
};

export default BudgetIncomeSection;
