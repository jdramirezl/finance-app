import { useState, useCallback } from 'react';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

interface ConfirmState extends ConfirmOptions {
  isOpen: boolean;
  onConfirm: (() => void) | null;
}

export const useConfirm = () => {
  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'danger',
    onConfirm: null,
  });

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        ...options,
        onConfirm: () => {
          resolve(true);
          setConfirmState((prev) => ({ ...prev, isOpen: false }));
        },
      });

      // Store the resolve function to handle cancellation
      (window as any).__confirmResolve = resolve;
    });
  }, []);

  const handleClose = useCallback(() => {
    // Resolve with false when dialog is closed/cancelled
    if ((window as any).__confirmResolve) {
      (window as any).__confirmResolve(false);
      (window as any).__confirmResolve = null;
    }
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const handleConfirm = useCallback(() => {
    if (confirmState.onConfirm) {
      confirmState.onConfirm();
    }
  }, [confirmState.onConfirm]);

  return {
    confirm,
    confirmState: {
      isOpen: confirmState.isOpen,
      title: confirmState.title,
      message: confirmState.message,
      confirmText: confirmState.confirmText,
      cancelText: confirmState.cancelText,
      variant: confirmState.variant,
    },
    handleClose,
    handleConfirm,
  };
};
