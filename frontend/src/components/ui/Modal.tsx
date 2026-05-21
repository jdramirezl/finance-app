import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

const getVisibleFocusables = (root: HTMLElement | null): HTMLElement[] => {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)).filter(
    (el) => !el.hasAttribute('disabled') && el.offsetParent !== null
  );
};

const Modal = ({ isOpen, onClose, title, children, size = 'md' }: ModalProps) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previousActiveElement = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    previousActiveElement.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const focusTimeout = window.setTimeout(() => {
      const focusables = getVisibleFocusables(dialogRef.current);
      if (focusables.length > 0) {
        focusables[0].focus();
      } else {
        dialogRef.current?.focus();
      }
    }, 0);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusables = getVisibleFocusables(dialogRef.current);
      if (focusables.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;

      if (event.shiftKey) {
        if (active === first || !dialogRef.current.contains(active)) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      window.clearTimeout(focusTimeout);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';

      const toRestore = previousActiveElement.current;
      if (toRestore && document.contains(toRestore)) {
        toRestore.focus();
      }
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
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-backdrop-in transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        tabIndex={-1}
        className={`
          relative w-full ${sizeClasses[size]}
          bg-surface-container-high/90 backdrop-blur-[20px]
          rounded-2xl
          border border-primary/10
          max-h-[calc(100vh-3rem)] overflow-y-auto
          animate-modal-in
          flex flex-col
          focus:outline-none
        `}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] sticky top-0 bg-surface-container-high/80 backdrop-blur-md z-10">
            <h2 id="modal-title" className="text-xl font-semibold text-on-surface">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-2 -mr-2 text-on-surface-variant hover:text-on-surface transition-colors rounded-full hover:bg-surface-container-highest focus:outline-none focus:ring-2 focus:ring-primary/30"
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
