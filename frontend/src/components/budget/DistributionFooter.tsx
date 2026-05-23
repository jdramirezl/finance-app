import { X, Zap } from 'lucide-react';
import Button from '../ui/Button';

interface DistributionFooterProps {
  onCancel: () => void;
  onGenerate: () => void;
  generateDisabled: boolean;
  hasChanges: boolean;
}

const DistributionFooter = ({
  onCancel,
  onGenerate,
  generateDisabled,
  hasChanges,
}: DistributionFooterProps) => {
  return (
    <div className="sticky bottom-0 bg-gray-900 border-t border-gray-700 p-4 flex justify-end gap-3">
      {hasChanges && (
        <Button variant="secondary" onClick={onCancel}>
          <X className="w-4 h-4" />
          Cancel Changes
        </Button>
      )}
      <Button
        variant="primary"
        onClick={onGenerate}
        disabled={generateDisabled}
      >
        <Zap className="w-4 h-4" />
        Generate Movements
      </Button>
    </div>
  );
};

export default DistributionFooter;
