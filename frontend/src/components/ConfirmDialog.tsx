import Modal from './Modal';
import Button from './Button';
import { AlertTriangle, Info, AlertCircle } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
}

const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}: ConfirmDialogProps) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          icon: <AlertCircle className="w-12 h-12 text-red-600 dark:text-red-400" />,
          bgColor: 'bg-red-50 dark:bg-red-900/20',
          borderColor: 'border-red-200 dark:border-red-800',
          buttonVariant: 'danger' as const,
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-12 h-12 text-yellow-600 dark:text-yellow-400" />,
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
          borderColor: 'border-yellow-200 dark:border-yellow-800',
          buttonVariant: 'primary' as const,
        };
      case 'info':
        return {
          icon: <Info className="w-12 h-12 text-blue-600 dark:text-blue-400" />,
          bgColor: 'bg-blue-50 dark:bg-blue-900/20',
          borderColor: 'border-blue-200 dark:border-blue-800',
          buttonVariant: 'primary' as const,
        };
    }
  };

  const styles = getVariantStyles();

  const handleConfirm = () => {
    onConfirm();
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="">
      <div className="text-center">
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className={`p-3 rounded-full ${styles.bgColor} ${styles.borderColor} border-2`}>
            {styles.icon}
          </div>
        </div>

        {/* Title */}
        <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
          {title}
        </h3>

        {/* Message */}
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          {message}
        </p>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={isLoading}
            className="flex-1"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={styles.buttonVariant}
            onClick={handleConfirm}
            loading={isLoading}
            className="flex-1"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default ConfirmDialog;
