import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, TrendingUp, Wallet } from 'lucide-react';

/**
 * Mobile-only floating action button (hidden on md+). Tapping it
 * expands a small menu of quick navigation shortcuts (new movement,
 * new transfer). The menu collapses automatically when the route
 * changes so it never lingers across navigations.
 */
const QuickActionsFAB = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [showQuickActions, setShowQuickActions] = useState(false);

  // Collapse the action menu when navigating away.
  useEffect(() => {
    setShowQuickActions(false);
  }, [location.pathname]);

  return (
    <div className="md:hidden">
      <div
        className={`fixed bottom-20 right-4 z-50 flex flex-col items-end gap-3 transition-all duration-200 ${
          showQuickActions
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <button
          onClick={() => navigate('/movements?action=new')}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-full shadow-lg border border-gray-100 dark:border-gray-700"
        >
          <span className="font-medium text-sm">New Movement</span>
          <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
            <TrendingUp className="w-4 h-4" aria-hidden="true" />
          </div>
        </button>
        <button
          onClick={() => navigate('/movements?action=transfer')}
          className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-full shadow-lg border border-gray-100 dark:border-gray-700"
        >
          <span className="font-medium text-sm">New Transfer</span>
          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Wallet className="w-4 h-4" aria-hidden="true" />
          </div>
        </button>
      </div>

      <button
        onClick={() => setShowQuickActions(!showQuickActions)}
        className={`
          fixed bottom-20 right-4 z-50 w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-transform duration-200
          ${showQuickActions
            ? 'bg-gray-800 dark:bg-gray-700 text-white rotate-45'
            : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:scale-105'
          }
        `}
        aria-label={showQuickActions ? 'Close quick actions menu' : 'Open quick actions menu'}
        aria-expanded={showQuickActions}
      >
        <Plus className="w-8 h-8" aria-hidden="true" />
      </button>
    </div>
  );
};

export default QuickActionsFAB;
