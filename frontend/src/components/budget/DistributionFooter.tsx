import { Zap } from 'lucide-react';
import Button from '../ui/Button';

interface DistributionFooterProps {
  onGenerate: () => void;
  generateDisabled: boolean;
}

const DistributionFooter = ({
  onGenerate,
  generateDisabled,
}: DistributionFooterProps) => {
  return (
    <div className="sticky bottom-0 bg-gray-900 border-t border-gray-700 p-4 flex justify-end gap-3">
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
