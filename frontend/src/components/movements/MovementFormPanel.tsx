import { X } from 'lucide-react';
import type { Ref } from 'react';
import BatchMovementForm, {
  type BatchMovementFormRef,
  type BatchMovementRow,
} from './BatchMovementForm';
import MovementForm, { type MovementFormData, type MovementFormRef } from './MovementForm';
import AccountContextPanel from './AccountContextPanel';
import QuickCalculator from './QuickCalculator';
import type { MovementFormStateResult } from '../../hooks/useMovementFormState';

export interface BalanceDeltas {
  accountDeltas: Record<string, number>;
  pocketDeltas: Record<string, number>;
  subPocketDeltas: Record<string, number>;
}

export interface BatchFormBindings {
  showBatchForm: boolean;
  batchFormRef: Ref<BatchMovementFormRef>;
  onBatchSave: (rows: BatchMovementRow[]) => Promise<void>;
  onBatchRowFocus: (row: BatchMovementRow) => void;
  onBatchRowsChange: (rows: BatchMovementRow[]) => void;
}

export interface SidePanelBindings {
  activeAccountId: string;
  activePocketId: string;
  balanceDeltas: BalanceDeltas;
  selectedPocketBalance: number | null;
  onUseCalculatorAmount: (amount: number) => void;
}

export interface MovementFormPanelProps {
  formState: MovementFormStateResult;
  isSaving: boolean;
  onSubmit: (data: MovementFormData) => Promise<void>;
  onClose: () => void;
  batch: BatchFormBindings;
  sidePanel: SidePanelBindings;
  movementFormRef: Ref<MovementFormRef>;
  onValuesChange: (values: Pick<MovementFormData, 'type' | 'accountId' | 'pocketId' | 'subPocketId' | 'amount'>) => void;
}

/**
 * Modal panel hosting either the single MovementForm or the BatchMovementForm,
 * with a persistent right-hand area showing account context and a calculator.
 *
 * Visibility is driven by `formState.showForm` and `batch.showBatchForm` —
 * only one of the two forms renders at a time.
 */
const MovementFormPanel = ({
  formState,
  isSaving,
  onSubmit,
  onClose,
  batch,
  sidePanel,
  movementFormRef,
  onValuesChange,
}: MovementFormPanelProps) => {
  const showSingle = formState.showForm;
  const showBatch = batch.showBatchForm;

  if (!showSingle && !showBatch) return null;

  const headerTitle = showBatch
    ? 'Batch Add Movements'
    : formState.editingMovement
    ? 'Edit Movement'
    : 'New Movement';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 pt-12">
      {/* Single shared backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/40 dark:bg-black/60 backdrop-blur-sm animate-backdrop-in transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        className={`relative flex items-start justify-center gap-4 w-full ${
          showBatch ? 'max-w-7xl' : 'max-w-[1400px]'
        } mx-auto`}
      >
        {/* Form (Main) */}
        <div className={`w-full ${showBatch ? 'max-w-4xl' : 'max-w-2xl'}`}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 max-h-[calc(100dvh-6rem)] overflow-y-auto animate-modal-in flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md z-10">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                {headerTitle}
              </h2>
              <button
                onClick={onClose}
                className="p-2 -mr-2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700/50"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6">
              {showBatch ? (
                <BatchMovementForm
                  ref={batch.batchFormRef}
                  onSave={batch.onBatchSave}
                  onCancel={onClose}
                  onFocusRow={batch.onBatchRowFocus}
                  onRowsChange={batch.onBatchRowsChange}
                />
              ) : (
                <MovementForm
                  ref={movementFormRef}
                  initialData={formState.editingMovement}
                  onSubmit={onSubmit}
                  onCancel={onClose}
                  isSaving={isSaving}
                  defaultValues={formState.defaultValues}
                  selectedTemplateId={formState.selectedTemplateId}
                  onTemplateSelect={formState.handleTemplateSelect}
                  onValuesChange={onValuesChange}
                />
              )}
            </div>
          </div>
        </div>

        {/* Right panels — kept persistent to avoid layout shifts */}
        <div className="hidden lg:flex flex-col gap-4 w-80 flex-shrink-0 h-[calc(100vh-6rem)] animate-modal-in">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 h-[60%] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Account Details
              </h3>
            </div>
            <div className="flex-1 overflow-y-auto">
              <AccountContextPanel
                accountId={sidePanel.activeAccountId || null}
                selectedPocketId={sidePanel.activePocketId || null}
                deltas={sidePanel.balanceDeltas}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 h-[calc(40%-1rem)] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex-shrink-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Quick Calculator
              </h3>
            </div>
            <div className="p-4 flex-1 overflow-y-auto">
              <QuickCalculator
                selectedPocketBalance={sidePanel.selectedPocketBalance}
                onUseAmount={sidePanel.onUseCalculatorAmount}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovementFormPanel;
