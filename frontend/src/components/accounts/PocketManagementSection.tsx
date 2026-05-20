import { useState } from 'react';
import { Plus } from 'lucide-react';
import type { Account, Pocket } from '../../types';
import Button from '../Button';
import Modal from '../Modal';
import SortableList from '../SortableList';
import SortableItem from '../SortableItem';
import PocketCard from './PocketCard';
import PocketForm from './PocketForm';
import {
  usePocketActions,
  type MigrationController,
} from '../../hooks/usePocketActions';
import type { useToast } from '../../hooks/useToast';
import type { useConfirm } from '../../hooks/useConfirm';
import type { usePocketMutations } from '../../hooks/queries/usePocketMutations';

type PocketMutations = ReturnType<typeof usePocketMutations>;

interface PocketManagementSectionProps {
  accountId: string;
  accounts: Account[];
  pockets: Pocket[];
  pocketMutations: PocketMutations;
  toast: ReturnType<typeof useToast.getState>;
  confirm: ReturnType<typeof useConfirm>['confirm'];
  setError: (value: string | null) => void;
}

/**
 * Renders the pockets sub-section of an account detail panel: header with
 * "New Pocket" action, inline create/edit form, sortable list of pockets,
 * and the migration dialog for moving fixed-expense pockets between
 * accounts. Form open/close state lives locally; pocket actions are
 * delegated to `usePocketActions`.
 */
const PocketManagementSection = ({
  accountId,
  accounts,
  pockets,
  pocketMutations,
  toast,
  confirm,
  setError,
}: PocketManagementSectionProps) => {
  const [showForm, setShowForm] = useState(false);
  const [editingPocket, setEditingPocket] = useState<Pocket | null>(null);

  const closeForm = () => {
    setShowForm(false);
    setEditingPocket(null);
  };

  const actions = usePocketActions({
    accounts,
    pockets,
    selectedAccountId: accountId,
    mutations: pocketMutations,
    confirm,
    toast,
    setError,
    closePocketForm: closeForm,
  });

  const sortedPockets = [...pockets].sort(
    (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
  );

  const handleSubmit = editingPocket
    ? (e: React.FormEvent<HTMLFormElement>) =>
        actions.handleUpdatePocket(editingPocket, e)
    : actions.handleCreatePocket;

  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
          Pockets
        </h2>
        <Button
          variant="primary"
          size="sm"
          onClick={() => {
            setShowForm(true);
            setEditingPocket(null);
          }}
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline ml-1">New Pocket</span>
        </Button>
      </div>

      {showForm && (
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
          <PocketForm
            initialData={editingPocket}
            onSubmit={handleSubmit}
            onCancel={closeForm}
            isSaving={actions.isPocketFormSaving}
          />
        </div>
      )}

      {pockets.length === 0 && !showForm ? (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          No pockets yet. Create one to organize your money.
        </div>
      ) : pockets.length > 0 ? (
        <SortableList
          items={sortedPockets}
          onReorder={(items) => pocketMutations.reorderPockets.mutate(items)}
          getId={(pocket) => pocket.id}
          renderItem={(pocket) => (
            <SortableItem key={pocket.id} id={pocket.id}>
              <PocketCard
                pocket={pocket}
                onEdit={() => {
                  setEditingPocket(pocket);
                  setShowForm(true);
                }}
                onDelete={() => actions.handleDeletePocket(pocket.id)}
                onMigrate={
                  pocket.type === 'fixed'
                    ? () => actions.migration.open(pocket.id)
                    : undefined
                }
              />
            </SortableItem>
          )}
        />
      ) : null}

      <MigrationDialog
        accounts={accounts}
        currentAccountId={accountId}
        migration={actions.migration}
      />
    </>
  );
};

interface MigrationDialogProps {
  accounts: Account[];
  currentAccountId: string;
  migration: MigrationController;
}

const MigrationDialog = ({
  accounts,
  currentAccountId,
  migration,
}: MigrationDialogProps) => {
  return (
    <Modal isOpen={migration.isOpen} onClose={migration.close}>
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Migrate Pocket
        </h3>
        <p className="text-gray-600 dark:text-gray-400">
          Select an account to migrate this pocket and all its movements to.
        </p>

        <div>
          <label className="block text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">
            Target Account
          </label>
          <select
            value={migration.targetAccountId}
            onChange={(e) => migration.setTargetAccountId(e.target.value)}
            className="w-full px-3 py-2 border dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          >
            <option value="">Select an account</option>
            {accounts
              .filter((a) => a.id !== currentAccountId)
              .map((account) => (
                <option key={account.id} value={account.id}>
                  {account.name} ({account.currency})
                </option>
              ))}
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-4">
          <Button
            variant="secondary"
            onClick={migration.close}
            disabled={migration.isMigrating}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => migration.confirm()}
            loading={migration.isMigrating}
            disabled={!migration.targetAccountId}
          >
            Migrate Pocket
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default PocketManagementSection;
