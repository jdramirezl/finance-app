import { useState } from 'react';
import { Palette } from 'lucide-react';
import ColorPickerModal from './ColorPickerModal';

interface ColorSelectorProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  accountType?: 'normal' | 'investment' | 'cd';
  className?: string;
}

const ColorSelector = ({ 
  label, 
  value, 
  onChange, 
  accountType = 'normal',
  className = '' 
}: ColorSelectorProps) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const getAccountTypeLabel = () => {
    switch (accountType) {
      case 'cd':
        return 'Certificate of Deposit';
      case 'investment':
        return 'Investment Account';
      default:
        return 'Account';
    }
  };

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        {label}
      </label>
      
      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-3 w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg hover:border-gray-400 dark:hover:border-gray-500 transition-colors bg-white dark:bg-gray-700"
      >
        <div
          className="w-8 h-8 rounded-full border border-gray-300 dark:border-gray-600 shadow-sm flex-shrink-0"
          style={{ backgroundColor: value }}
        />
        <div className="flex-1 text-left">
          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Selected Color
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
            {value.toUpperCase()}
          </div>
        </div>
        <Palette className="w-5 h-5 text-gray-400" />
      </button>

      <ColorPickerModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSelectColor={onChange}
        currentColor={value}
        accountType={accountType}
        title={`Choose ${getAccountTypeLabel()} Color`}
      />
    </div>
  );
};

export default ColorSelector;