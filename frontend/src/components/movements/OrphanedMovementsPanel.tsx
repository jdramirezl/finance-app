import { X } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import type { Movement } from '../../types';

export interface OrphanedRestoreRequest {
  movementIds: string[];
  sourceLabel: string;
}

export interface OrphanedMovementsPanelProps {
  isOpen: boolean;
  orphanedMovements: Movement[];
  onClose: () => void;
  onRestoreClick: (request: OrphanedRestoreRequest) => void;
}

interface GroupedOrphans {
  key: string;
  accountName: string;
  currency: string;
  movements: Movement[];
  totalAmount: number;
}

const groupOrphans = (movements: Movement[]): GroupedOrphans[] => {
  const grouped = movements.reduce<Record<string, Movement[]>>((acc, movement) => {
    const key = `${movement.orphanedAccountName}|${movement.orphanedAccountCurrency}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(movement);
    return acc;
  }, {});

  return Object.entries(grouped).map(([key, items]) => {
    const [accountName, currency] = key.split('|');
    const totalAmount = items.reduce((sum, m) => {
      const isIncome = m.type.includes('Ingreso');
      return sum + (isIncome ? m.amount : -m.amount);
    }, 0);
    return { key, accountName, currency, movements: items, totalAmount };
  });
};

/**
 * Renders the "Orphaned Movements" panel: groups movements by their
 * orphaned account name + currency and exposes a Restore button for each
 * group.
 */
const OrphanedMovementsPanel = ({
  isOpen,
  orphanedMovements,
  onClose,
  onRestoreClick,
}: OrphanedMovementsPanelProps) => {
  if (!isOpen) return null;

  const groups = groupOrphans(orphanedMovements);

  return (
    <Card padding="md">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Orphaned Movements
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Movements from deleted accounts/pockets. Click "Restore" on a
              group to pick a destination account and pocket.
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
            Close
          </Button>
        </div>

        {groups.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No orphaned movements found
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => (
              <div
                key={group.key}
                className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                      {group.accountName} ({group.currency})
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {group.movements.length} movement(s) • Total: $
                      {group.totalAmount.toFixed(2)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() =>
                      onRestoreClick({
                        movementIds: group.movements.map((m) => m.id),
                        sourceLabel: `${group.accountName} (${group.currency})`,
                      })
                    }
                  >
                    Restore
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Card>
  );
};

export default OrphanedMovementsPanel;
