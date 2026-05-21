import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface FloatingPanelProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  position?: 'left' | 'right';
  width?: string;
}

const FloatingPanel = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  position = 'right',
  width = 'w-80'
}: FloatingPanelProps) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const positionClasses = position === 'left' 
    ? 'left-4 animate-slide-in-left' 
    : 'right-4 animate-slide-in-right';

  return (
    <div
      className={`
        fixed top-20 ${positionClasses} ${width}
        max-h-[calc(100vh-6rem)]
        bg-white dark:bg-gray-800 
        rounded-2xl shadow-2xl 
        border border-gray-200 dark:border-gray-700
        z-[60]
        flex flex-col
        overflow-hidden
      `}
      role="complementary"
      aria-label={title}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h3>
        <button
          onClick={onClose}
          className="p-1.5 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50"
          aria-label="Close panel"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {children}
      </div>
    </div>
  );
};

export default FloatingPanel;
