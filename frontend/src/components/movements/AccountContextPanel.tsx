import { useMemo } from 'react';
import { useAccountsQuery, usePocketsQuery, useSubPocketsQuery } from '../../hooks/queries';
import { formatCurrency } from '../../utils/formatCurrency';
import { CheckCircle2 } from 'lucide-react';

interface AccountContextPanelProps {
  accountId: string | null;
  selectedPocketId: string | null;
  className?: string;
  deltas?: {
    accountDeltas: Record<string, number>;
    pocketDeltas: Record<string, number>;
    subPocketDeltas: Record<string, number>;
  };
}

const AccountContextPanel = ({ accountId, selectedPocketId, className = '', deltas }: AccountContextPanelProps) => {
  const { data: accounts = [] } = useAccountsQuery();
  const { data: allPockets = [] } = usePocketsQuery();
  const { data: allSubPockets = [] } = useSubPocketsQuery();

  const account = useMemo(() => 
    accounts.find(a => a.id === accountId),
    [accounts, accountId]
  );

  const pockets = useMemo(() => 
    allPockets.filter(p => p.accountId === accountId),
    [allPockets, accountId]
  );

  const getSubPocketsForPocket = (pocketId: string) => 
    allSubPockets.filter(sp => sp.pocketId === pocketId);

  if (!accountId || !account) {
    return (
      <div className={`flex items-center justify-center h-full ${className}`}>
        <div className="text-center text-gray-400 dark:text-gray-500 p-8">
          <p className="text-sm">Select an account to view details</p>
        </div>
      </div>
    );
  }

  const renderBalancePreview = (current: number, delta: number, currency: string, isSmall = false) => {
    if (!delta || delta === 0) {
      return (
        <p className={`${isSmall ? 'text-sm font-semibold' : 'text-2xl font-bold text-blue-600 dark:text-blue-400'}`}>
          {formatCurrency(current, currency)}
        </p>
      );
    }

    const next = current + delta;
    const isIncrease = delta > 0;

    return (
      <div className="flex flex-col items-end">
        <p className="text-[10px] text-gray-400 dark:text-gray-500 line-through leading-none mb-1">
          {formatCurrency(current, currency)}
        </p>
        <p className={`
          ${isSmall ? 'text-sm font-bold' : 'text-2xl font-bold'}
          ${isIncrease ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}
          leading-none
        `}>
          {formatCurrency(next, currency)}
        </p>
      </div>
    );
  };

  const accountDelta = deltas?.accountDeltas[accountId] || 0;

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Account Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
          {account.name}
        </h3>
        {renderBalancePreview(account.balance, accountDelta, account.currency)}
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          Total Balance
        </p>
      </div>

      {/* Pockets List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Pockets ({pockets.length})
        </h4>
        
        {pockets.length === 0 ? (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500">
            <p className="text-sm">No pockets in this account</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pockets.map(pocket => {
              const isSelected = pocket.id === selectedPocketId;
              const subPockets = pocket.type === 'fixed' ? getSubPocketsForPocket(pocket.id) : [];
              
              return (
                <div key={pocket.id} className="space-y-1">
                  <div
                    className={`
                      p-3 rounded-lg border transition-all
                      ${isSelected 
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 shadow-sm' 
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                      }
                    `}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`
                            text-sm font-medium truncate
                            ${isSelected 
                              ? 'text-blue-700 dark:text-blue-300' 
                              : 'text-gray-900 dark:text-gray-100'
                            }
                          `}>
                            {pocket.name}
                          </p>
                          {isSelected && (
                            <CheckCircle2 className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                          )}
                        </div>
                        {pocket.type === 'fixed' && (
                          <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded">
                            Fixed Expenses
                          </span>
                        )}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className={`
                          ${isSelected 
                            ? 'text-blue-700 dark:text-blue-300' 
                            : 'text-gray-900 dark:text-gray-100'
                          }
                        `}>
                          {renderBalancePreview(
                            pocket.balance, 
                            deltas?.pocketDeltas[pocket.id] || 0, 
                            pocket.currency, 
                            true
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Sub-pockets for Fixed Expenses */}
                  {pocket.type === 'fixed' && subPockets.length > 0 && (
                    <div className="ml-4 space-y-1">
                      {subPockets.map(subPocket => (
                        <div
                          key={subPocket.id}
                          className="p-2 rounded-md bg-purple-50/50 dark:bg-purple-900/10 border border-purple-200/50 dark:border-purple-800/30"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-xs font-medium text-purple-700 dark:text-purple-300 truncate">
                              {subPocket.name}
                            </p>
                            <div className="text-xs font-semibold text-purple-600 dark:text-purple-400">
                              {renderBalancePreview(
                                subPocket.balance,
                                deltas?.subPocketDeltas[subPocket.id] || 0,
                                pocket.currency,
                                true
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          💡 Balances update in real-time
        </p>
      </div>
    </div>
  );
};

export default AccountContextPanel;
