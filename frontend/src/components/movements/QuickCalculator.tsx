import { useState, useEffect } from 'react';
import { Plus, Minus } from 'lucide-react';
import Button from '../Button';
import Input from '../Input';
import { useSelection } from '../../context/SelectionContext';

interface QuickCalculatorProps {
  selectedPocketBalance: number | null;
  onUseAmount: (amount: number) => void;
}

const QuickCalculator = ({ onUseAmount }: QuickCalculatorProps) => {
  const [operand1, setOperand1] = useState<string>('');
  const [operand2, setOperand2] = useState<string>('');
  const [operator, setOperator] = useState<'+' | '-'>('-');
  const [result, setResult] = useState<number | null>(null);
  const [activeField, setActiveField] = useState<'operand1' | 'operand2' | null>(null);

  const { selectedItems, clearSelection } = useSelection();

  // When a value is selected and we have an active field, populate it
  useEffect(() => {
    if (selectedItems.size > 0 && activeField) {
      // Get the first selected value
      const [firstValue] = Array.from(selectedItems.values());
      
      if (activeField === 'operand1') {
        setOperand1(firstValue.toString());
      } else if (activeField === 'operand2') {
        setOperand2(firstValue.toString());
      }
      
      // Clear selection after using it
      clearSelection();
      setActiveField(null);
    }
  }, [selectedItems, activeField, clearSelection]);

  // Calculate result whenever operands or operator change
  useEffect(() => {
    const num1 = parseFloat(operand1);
    const num2 = parseFloat(operand2);

    if (!isNaN(num1) && !isNaN(num2)) {
      const calculated = operator === '+' ? num1 + num2 : num1 - num2;
      setResult(calculated);
    } else {
      setResult(null);
    }
  }, [operand1, operand2, operator]);

  const handleUseResult = () => {
    if (result !== null && result >= 0) {
      onUseAmount(result);
    }
  };

  const handleClear = () => {
    setOperand1('');
    setOperand2('');
    setResult(null);
    setActiveField(null);
    clearSelection();
  };

  return (
    <div className="space-y-4 w-full">
      {/* Instruction */}
      <p className="text-xs text-gray-600 dark:text-gray-400 text-center bg-blue-50 dark:bg-blue-900/20 p-2 rounded">
        💡 Click a field, then click a balance to fill it
      </p>

      {/* Calculator Display */}
      <div className="flex items-center gap-2">
        {/* Operand 1 */}
        <div className="flex-1">
          <Input
            type="number"
            value={operand1}
            onChange={(e) => setOperand1(e.target.value)}
            onFocus={() => setActiveField('operand1')}
            placeholder="0.00"
            step="0.01"
            className={`text-center font-mono text-lg ${
              activeField === 'operand1' 
                ? 'ring-2 ring-blue-500 dark:ring-blue-400' 
                : ''
            }`}
          />
        </div>

        {/* Operator Toggle */}
        <button
          type="button"
          onClick={() => setOperator(operator === '+' ? '-' : '+')}
          className="p-3 rounded-lg bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          title="Toggle operator"
        >
          {operator === '+' ? (
            <Plus className="w-6 h-6 text-green-600 dark:text-green-400" />
          ) : (
            <Minus className="w-6 h-6 text-red-600 dark:text-red-400" />
          )}
        </button>

        {/* Operand 2 */}
        <div className="flex-1">
          <Input
            type="number"
            value={operand2}
            onChange={(e) => setOperand2(e.target.value)}
            onFocus={() => setActiveField('operand2')}
            placeholder="0.00"
            step="0.01"
            className={`text-center font-mono text-lg ${
              activeField === 'operand2' 
                ? 'ring-2 ring-blue-500 dark:ring-blue-400' 
                : ''
            }`}
          />
        </div>
      </div>

      {/* Result Display */}
      <div className="text-center">
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-1">Result</div>
        <div className={`
          px-4 py-3 rounded-lg border-2 text-center font-mono font-bold text-2xl
          ${result !== null 
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300' 
            : 'bg-gray-100 dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500'
          }
        `}>
          {result !== null ? result.toFixed(2) : '0.00'}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={handleClear}
          className="w-full"
        >
          Clear
        </Button>

        {/* Use Result Button */}
        {result !== null && (
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={handleUseResult}
            disabled={result < 0}
            className="w-full"
          >
            {result < 0 
              ? 'Result must be positive' 
              : `Use ${result.toFixed(2)} as Amount`
            }
          </Button>
        )}
      </div>
    </div>
  );
};

export default QuickCalculator;
