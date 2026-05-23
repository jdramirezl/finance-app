import { useCallback, useState } from 'react';
import { useMovementTemplatesQuery, useAccountsQuery, usePocketsQuery, useMovementTemplateMutations } from '../hooks/queries';
import { useToast } from '../hooks/useToast';
import { useConfirmDialog } from '../contexts/ConfirmDialogContext';
import { Plus } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import MovementTemplateForm from '../components/movements/MovementTemplateForm';
import TemplateCard from '../components/movements/TemplateCard';
import type { MovementTemplate, MovementType } from '../types';

const TemplatesPage = () => {
  const { data: movementTemplates = [], isLoading: templatesLoading } = useMovementTemplatesQuery();
  const { data: accounts = [] } = useAccountsQuery();
  const { data: pockets = [] } = usePocketsQuery();
  const { createMovementTemplate, updateMovementTemplate, deleteMovementTemplate } = useMovementTemplateMutations();

  const toast = useToast();
  const { confirm } = useConfirmDialog();

  const [showForm, setShowForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<MovementTemplate | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const isLoading = templatesLoading;

  const handleCreate = async (data: {
    name: string;
    type: MovementType;
    accountId: string;
    pocketId: string;
    subPocketId?: string | null;
    defaultAmount?: number | null;
    notes?: string | null;
  }) => {
    setIsSaving(true);
    try {
      await createMovementTemplate.mutateAsync(data);
      toast.success('Template created successfully!');
      setShowForm(false);
    } catch {
      // Toast is shown by the mutation's onError handler.
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdate = async (data: {
    name: string;
    type: MovementType;
    accountId: string;
    pocketId: string;
    subPocketId?: string | null;
    defaultAmount?: number | null;
    notes?: string | null;
  }) => {
    if (!editingTemplate) return;

    setIsSaving(true);
    try {
      await updateMovementTemplate.mutateAsync({
        id: editingTemplate.id,
        updates: data
      });
      toast.success('Template updated successfully!');
      setShowForm(false);
      setEditingTemplate(null);
    } catch {
      // Toast is shown by the mutation's onError handler.
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = useCallback((template: MovementTemplate) => {
    setEditingTemplate(template);
    setShowForm(true);
  }, []);

  const handleDelete = useCallback(async (template: MovementTemplate) => {
    const confirmed = await confirm({
      title: 'Delete Template',
      message: `Are you sure you want to delete the template "${template.name}"? This action cannot be undone.`,
      confirmText: 'Delete Template',
      variant: 'danger',
    });

    if (!confirmed) return;

    setDeletingId(template.id);
    try {
      await deleteMovementTemplate.mutateAsync(template.id);
      toast.success(`Template "${template.name}" deleted successfully!`);
    } catch {
      // Toast is shown by the mutation's onError handler.
    } finally {
      setDeletingId(null);
    }
  }, [confirm, deleteMovementTemplate, toast]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  const disableDeleteActions = deletingId !== null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">
            Movement Templates
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage your saved transaction templates for quick entry
          </p>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setEditingTemplate(null);
            setShowForm(true);
          }}
        >
          <Plus className="w-5 h-5" aria-hidden="true" />
          New Template
        </Button>
      </div>

      {movementTemplates.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-700 mb-4">
              <Plus className="w-8 h-8 text-gray-400" aria-hidden="true" />
            </div>
            <h3 className="text-lg font-medium text-gray-100 mb-2">
              No templates yet
            </h3>
            <p className="text-gray-400 mb-4">
              Create your first template to speed up transaction entry
            </p>
            <Button
              variant="primary"
              onClick={() => {
                setEditingTemplate(null);
                setShowForm(true);
              }}
            >
              Create Template
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {movementTemplates.map((template) => {
            const account = accounts.find(a => a.id === template.accountId);
            const pocket = pockets.find(p => p.id === template.pocketId);

            return (
              <TemplateCard
                key={template.id}
                template={template}
                account={account}
                pocket={pocket}
                isDeleting={deletingId === template.id}
                disableActions={disableDeleteActions}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            );
          })}
        </div>
      )}

      <Modal
        isOpen={showForm}
        onClose={() => {
          setShowForm(false);
          setEditingTemplate(null);
        }}
        title={editingTemplate ? 'Edit Template' : 'New Template'}
        size="lg"
      >
        <MovementTemplateForm
          initialData={editingTemplate}
          onSubmit={editingTemplate ? handleUpdate : handleCreate}
          onCancel={() => {
            setShowForm(false);
            setEditingTemplate(null);
          }}
          isSaving={isSaving}
        />
      </Modal>
    </div>
  );
};

export default TemplatesPage;
