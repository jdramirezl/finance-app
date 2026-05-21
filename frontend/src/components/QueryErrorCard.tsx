import { AlertTriangle, RefreshCw } from 'lucide-react';

interface QueryErrorCardProps {
  title: string;
  error: Error | null;
  onRetry: () => void;
}

const QueryErrorCard = ({ title, error, onRetry }: QueryErrorCardProps) => (
  <div
    role="alert"
    className="flex items-center gap-3 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
  >
    <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" aria-hidden="true" />
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-red-800 dark:text-red-200">
        Failed to load {title}
      </p>
      {error?.message && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-0.5 truncate">
          {error.message}
        </p>
      )}
    </div>
    <button
      onClick={onRetry}
      className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-700 dark:text-red-300 bg-red-100 dark:bg-red-900/40 rounded-md hover:bg-red-200 dark:hover:bg-red-900/60 transition-colors"
    >
      <RefreshCw className="w-3.5 h-3.5" />
      Retry
    </button>
  </div>
);

export default QueryErrorCard;
