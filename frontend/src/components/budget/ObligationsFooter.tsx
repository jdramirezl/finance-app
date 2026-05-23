import { FolderPlus, Plus, Sparkles } from 'lucide-react';
import Button from '../ui/Button';

interface ObligationsFooterProps {
  onAddGroup: () => void;
  onAddExpense: () => void;
  onBulkGenerate: () => void;
  bulkDisabled: boolean;
}

const ObligationsFooter = ({
  onAddGroup,
  onAddExpense,
  onBulkGenerate,
  bulkDisabled,
}: ObligationsFooterProps) => {
  return (
    <div className="sticky bottom-0 bg-gray-900 border-t border-gray-700 p-4 flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={onAddGroup}>
          <FolderPlus className="w-4 h-4" />
          Add Group
        </Button>
        <Button variant="secondary" onClick={onAddExpense}>
          <Plus className="w-4 h-4" />
          Add Expense
        </Button>
      </div>
      <Button
        variant="primary"
        onClick={onBulkGenerate}
        disabled={bulkDisabled}
        className="w-full"
      >
        <Sparkles className="w-4 h-4" />
        Bulk Generate
      </Button>
    </div>
  );
};

export default ObligationsFooter;
