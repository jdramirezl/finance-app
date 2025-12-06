import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

const Modal = ({ isOpen, onClose, title, children, size = 'md' }: ModalProps) => {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-[calc(100vw-2rem)]',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      {/* Blurred backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm animate-backdrop-in transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div
        className={`
          relative w-full ${sizeClasses[size]} 
          bg-white dark:bg-gray-800 
          rounded-2xl shadow-2xl 
          border border-gray-100 dark:border-gray-700
          max-h-[calc(100vh-3rem)] overflow-y-auto
          animate-modal-in
          flex flex-col
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md z-10">
            <h2 id="modal-title" className="text-xl font-bold text-gray-900 dark:text-gray-100">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-2 -mr-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700/50 focus:outline-none focus:ring-2 focus:ring-gray-200 dark:focus:ring-gray-700"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;

