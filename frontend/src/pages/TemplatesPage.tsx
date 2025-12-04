import { useState } from 'react';
import { useMovementTemplatesQuery, useAccountsQuery, usePocketsQuery, useMovementTemplateMutations } from '../hooks/queries';
import { useToast } from '../hooks/useToast';
import { useConfirm } from '../hooks/useConfirm';
import { Trash2, Plus } from 'lucide-react';
import Button from '../components/Button';
import Card from '../components/Card';
import { Skeleton } from '../components/Skeleton';
import ConfirmDialog from '../components/ConfirmDialog';

const TemplatesPage = () => {
  // Queries
  const { data: movementTemplates = [], isLoading: templatesLoading } = useMovementTemplatesQuery();
  const { data: accounts = [] } = useAccountsQuery();
  const { data: pockets = [] } = usePocketsQuery();

  // Mutations
  const { deleteMovementTemplate } = useMovementTemplateMutations();

  const toast = useToast();
  const { confirm, confirmState, handleClose, handleConfirm } = useConfirm();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Derived loading state
  const isLoading = templatesLoading;

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: 'Delete Template',
      message: `Are you sure you want to delete the template "${name}"? This action cannot be undone.`,
      confirmText: 'Delete Template',
      variant: 'danger',
    });

    if (!confirmed) return;

    setDeletingId(id);
    try {
      await deleteMovementTemplate.mutateAsync(id);
      toast.success(`Template "${name}" deleted successfully!`);
    } catch (err) {
      toast.error(`Failed to delete template: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setDeletingId(null);
    }
  };

  const getMovementTypeLabel = (type: string): string => {
    switch (type) {
      case 'IngresoNormal': return 'Income';
      case 'EgresoNormal': return 'Expense';
      case 'IngresoFijo': return 'Fixed Income';
      case 'EgresoFijo': return 'Fixed Expense';
      default: return type;
    }
  };

  const getMovementTypeColor = (type: string): string => {
    switch (type) {
      case 'IngresoNormal':
      case 'IngresoFijo':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
      case 'EgresoNormal':
      case 'EgresoFijo':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
      default:
        return 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300';
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Movement Templates
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage your saved transaction templates for quick entry
          </p>
        </div>
      </div>

      {movementTemplates.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 mb-4">
              <Plus className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
              No templates yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Create your first template when adding a movement by checking "Save as template"
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {movementTemplates.map((template) => {
            const account = accounts.find(a => a.id === template.accountId);
            const pocket = pockets.find(p => p.id === template.pocketId);

            return (
              <Card key={template.id}>
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {template.name}
                      </h3>
                      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded mt-1 ${getMovementTypeColor(template.type)}`}>
                        {getMovementTypeLabel(template.type)}
                      </span>
                    </div>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDelete(template.id, template.name)}
                      loading={deletingId === template.id}
                      disabled={deletingId !== null}
                      className="p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Account:</span>
                      <span className="text-gray-900 dark:text-gray-100 font-medium">
                        {account?.name || 'Unknown'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Pocket:</span>
                      <span className="text-gray-900 dark:text-gray-100 font-medium">
                        {pocket?.name || 'Unknown'}
                      </span>
                    </div>
                    {template.defaultAmount && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                        <span className="text-gray-900 dark:text-gray-100 font-medium">
                          ${template.defaultAmount.toFixed(2)}
                        </span>
                      </div>
                    )}
                    {template.notes && (
                      <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-gray-600 dark:text-gray-400 text-xs italic">
                          "{template.notes}"
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmState.isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        variant={confirmState.variant}
      />
    </div>
  );
};

export default TemplatesPage;
