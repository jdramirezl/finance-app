import { useState } from 'react';
import { X, Palette, Check } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

interface ColorPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectColor: (color: string) => void;
  currentColor: string;
  accountType?: 'normal' | 'investment' | 'cd';
  title?: string;
}

const ColorPickerModal = ({
  isOpen,
  onClose,
  onSelectColor,
  currentColor,
  accountType = 'normal',
  title = 'Choose a Color'
}: ColorPickerModalProps) => {
  const [selectedColor, setSelectedColor] = useState(currentColor);
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  // Recommended colors based on account type
  const getRecommendedColors = () => {
    switch (accountType) {
      case 'cd':
        return [
          { color: '#F59E0B', name: 'Amber' },
          { color: '#D97706', name: 'Amber Dark' },
          { color: '#92400E', name: 'Amber Darker' },
          { color: '#F97316', name: 'Orange' },
          { color: '#EA580C', name: 'Orange Dark' },
          { color: '#C2410C', name: 'Orange Darker' },
          { color: '#EAB308', name: 'Yellow' },
          { color: '#CA8A04', name: 'Yellow Dark' },
        ];
      case 'investment':
        return [
          { color: '#8B5CF6', name: 'Violet' },
          { color: '#7C3AED', name: 'Violet Dark' },
          { color: '#6D28D9', name: 'Violet Darker' },
          { color: '#A855F7', name: 'Purple' },
          { color: '#9333EA', name: 'Purple Dark' },
          { color: '#7E22CE', name: 'Purple Darker' },
          { color: '#EC4899', name: 'Pink' },
          { color: '#DB2777', name: 'Pink Dark' },
        ];
      default: // normal accounts
        return [
          { color: '#3B82F6', name: 'Blue' },
          { color: '#2563EB', name: 'Blue Dark' },
          { color: '#1D4ED8', name: 'Blue Darker' },
          { color: '#10B981', name: 'Emerald' },
          { color: '#059669', name: 'Emerald Dark' },
          { color: '#047857', name: 'Emerald Darker' },
          { color: '#EF4444', name: 'Red' },
          { color: '#DC2626', name: 'Red Dark' },
          { color: '#6B7280', name: 'Gray' },
          { color: '#4B5563', name: 'Gray Dark' },
          { color: '#F59E0B', name: 'Amber' },
          { color: '#8B5CF6', name: 'Violet' },
        ];
    }
  };

  const recommendedColors = getRecommendedColors();

  const handleConfirm = () => {
    onSelectColor(selectedColor);
    onClose();
  };

  const handleCancel = () => {
    setSelectedColor(currentColor);
    setShowCustomPicker(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleCancel} title={title}>
      <div className="space-y-6">
        {/* Color Preview */}
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div
              className="w-12 h-12 rounded-full border-2 border-gray-300 dark:border-gray-600 shadow-sm"
              style={{ backgroundColor: selectedColor }}
            />
            <div>
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Selected Color
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                {selectedColor.toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        {/* Recommended Colors */}
        <div>
          <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">
            Recommended Colors
          </h3>
          <div className="grid grid-cols-4 gap-3">
            {recommendedColors.map(({ color, name }) => (
              <button
                key={color}
                type="button"
                onClick={() => {
                  setSelectedColor(color);
                  setShowCustomPicker(false);
                }}
                className={`group relative flex flex-col items-center p-3 rounded-lg border-2 transition-all hover:scale-105 ${
                  selectedColor === color
                    ? 'border-gray-900 dark:border-gray-100 bg-gray-50 dark:bg-gray-800'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                title={name}
              >
                <div
                  className="w-8 h-8 rounded-full shadow-sm mb-2"
                  style={{ backgroundColor: color }}
                />
                <span className="text-xs text-gray-600 dark:text-gray-400 text-center leading-tight">
                  {name}
                </span>
                {selectedColor === color && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Color Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Custom Color
            </h3>
            <button
              type="button"
              onClick={() => setShowCustomPicker(!showCustomPicker)}
              className={`flex items-center gap-2 px-3 py-1.5 text-sm border rounded-md transition-colors ${
                showCustomPicker
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'
              }`}
            >
              <Palette className="w-4 h-4" />
              <span>{showCustomPicker ? 'Hide' : 'Show'} Color Picker</span>
            </button>
          </div>

          {showCustomPicker && (
            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <input
                type="color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="w-16 h-10 rounded border border-gray-300 dark:border-gray-600 cursor-pointer"
              />
              <div className="flex-1">
                <input
                  type="text"
                  value={selectedColor}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                      setSelectedColor(value);
                    }
                  }}
                  placeholder="#000000"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 font-mono text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            variant="secondary"
            onClick={handleCancel}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            className="flex-1"
          >
            Select Color
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ColorPickerModal;