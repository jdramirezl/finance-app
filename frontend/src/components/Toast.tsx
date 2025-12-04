import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

const Toast = ({ message, type = 'info', duration = 5000, onClose }: ToastProps) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(onClose, 300); // Wait for exit animation
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300); // Wait for exit animation
  };

  const icons = {
    success: <CheckCircle className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    info: <Info className="w-5 h-5" />,
    warning: <AlertTriangle className="w-5 h-5" />,
  };

  const styles = {
    success: 'bg-white/90 dark:bg-gray-800/90 border-l-4 border-l-green-500 text-gray-900 dark:text-gray-100',
    error: 'bg-white/90 dark:bg-gray-800/90 border-l-4 border-l-red-500 text-gray-900 dark:text-gray-100',
    info: 'bg-white/90 dark:bg-gray-800/90 border-l-4 border-l-blue-500 text-gray-900 dark:text-gray-100',
    warning: 'bg-white/90 dark:bg-gray-800/90 border-l-4 border-l-yellow-500 text-gray-900 dark:text-gray-100',
  };

  const iconColors = {
    success: 'text-green-600 dark:text-green-400',
    error: 'text-red-600 dark:text-red-400',
    info: 'text-blue-600 dark:text-blue-400',
    warning: 'text-yellow-600 dark:text-yellow-400',
  };

  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-lg border border-gray-200 dark:border-gray-700 shadow-2xl backdrop-blur-xl max-w-md transition-all duration-300 ${isExiting ? 'animate-toast-exit' : 'animate-toast-enter'
        } ${styles[type]}`}
      role="alert"
    >
      <div className={`flex-shrink-0 ${iconColors[type]}`}>{icons[type]}</div>
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={handleClose}
        className="flex-shrink-0 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all hover:scale-110"
        aria-label="Close notification"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Toast;
