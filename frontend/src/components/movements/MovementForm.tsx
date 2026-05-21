import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { format } from 'date-fns';
import { useAccountsQuery, useMovementTemplatesQuery, usePocketsQuery, useSubPocketsQuery } from '../../hooks/queries';
import { useUnsavedChanges } from '../../hooks/useUnsavedChanges';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import AccountPocketSelector from '../selectors/AccountPocketSelector';
import { toDateOnly } from '../../utils/dateUtils';
import { MOVEMENT_TYPES, isFixedMovement } from '../../utils/movementTypes';
import type { Movement, MovementType } from '../../types';

export interface MovementFormData {
  type: MovementType;
  displayedDate: string;
  accountId: string;
  pocketId: string;
  subPocketId: string;
  amount: string;
  notes: string;
  isPending: boolean;
  isTransfer: boolean;
  targetAccountId: string;
  targetPocketId: string;
  saveAsTemplate: boolean;
  templateName: string;
}

export interface MovementFormRef {
  setAmount: (value: string) => void;
}

export interface MovementFormProps {
  initialData?: Movement | null;
  onSubmit: (data: MovementFormData) => Promise<void>;
  onCancel: () => void;
  isSaving: boolean;
  onValuesChange?: (values: Pick<MovementFormData, 'type' | 'accountId' | 'pocketId' | 'subPocketId' | 'amount'>) => void;
  defaultValues?: {
    amount?: number;
    notes?: string;
    date?: string;
    type?: MovementType;
    fixedExpenseId?: string;
    templateId?: string;
  };
  selectedTemplateId?: string;
  onTemplateSelect?: (id: string) => void;
}

const MOVEMENT_TYPE_OPTIONS_WITH_TRANSFER: { value: MovementType | 'Transfer'; label: string }[] = [
  ...MOVEMENT_TYPES,
  { value: 'Transfer', label: 'Transfer' },
];

const MovementForm = forwardRef<MovementFormRef, MovementFormProps>(
  ({ initialData, onSubmit, onCancel, isSaving, onValuesChange, defaultValues: prefillValues, selectedTemplateId = '', onTemplateSelect }, ref) => {
    const { data: accounts = [] } = useAccountsQuery();
    const { data: pockets = [] } = usePocketsQuery();
    const { data: subPockets = [] } = useSubPocketsQuery();
    const { data: movementTemplates = [] } = useMovementTemplatesQuery();

    const defaultDateValue = initialData?.displayedDate
      ? toDateOnly(initialData.displayedDate)
      : prefillValues?.date
        ? toDateOnly(prefillValues.date)
        : format(new Date(), 'yyyy-MM-dd');

    const { register, handleSubmit, control, setValue, watch, formState: { errors, isDirty } } = useForm<MovementFormData>({
      mode: 'onBlur',
      defaultValues: {
        type: initialData?.type ?? prefillValues?.type ?? 'EgresoNormal',
        displayedDate: defaultDateValue,
        accountId: initialData?.accountId ?? '',
        pocketId: initialData?.pocketId ?? '',
        subPocketId: initialData?.subPocketId ?? '',
        amount: initialData ? initialData.amount.toString() : (prefillValues?.amount ? prefillValues.amount.toString() : ''),
        notes: initialData?.notes ?? prefillValues?.notes ?? '',
        isPending: initialData?.isPending ?? false,
        isTransfer: false,
        targetAccountId: '',
        targetPocketId: '',
        saveAsTemplate: false,
        templateName: '',
      },
    });

    useUnsavedChanges(isDirty);

    const [isTransfer, setIsTransfer] = useState(false);

    const watchedType = useWatch({ control, name: 'type' });
    const watchedAccountId = useWatch({ control, name: 'accountId' });
    const watchedPocketId = useWatch({ control, name: 'pocketId' });
    const watchedSubPocketId = useWatch({ control, name: 'subPocketId' });
    const watchedAmount = useWatch({ control, name: 'amount' });
    const watchedTargetAccountId = useWatch({ control, name: 'targetAccountId' });
    const watchedSaveAsTemplate = useWatch({ control, name: 'saveAsTemplate' });

    const isDefaultFixedExpense = isFixedMovement(watchedType);

    // Notify parent of value changes for side panel balance deltas
    useEffect(() => {
      onValuesChange?.({
        type: watchedType,
        accountId: watchedAccountId,
        pocketId: watchedPocketId,
        subPocketId: watchedSubPocketId,
        amount: watchedAmount,
      });
    }, [watchedType, watchedAccountId, watchedPocketId, watchedSubPocketId, watchedAmount, onValuesChange]);

    // Handle fixedExpenseId prefill: resolve subPocket → pocket → account
    const fixedExpenseApplied = useRef(false);
    useEffect(() => {
      if (fixedExpenseApplied.current || !prefillValues?.fixedExpenseId || pockets.length === 0) return;
      const subPocket = subPockets.find(sp => sp.id === prefillValues.fixedExpenseId);
      if (!subPocket) return;
      const pocket = pockets.find(p => p.id === subPocket.pocketId);
      if (!pocket) return;
      fixedExpenseApplied.current = true;
      setValue('accountId', pocket.accountId);
      setValue('pocketId', pocket.id);
      setValue('subPocketId', subPocket.id);
    }, [prefillValues?.fixedExpenseId, pockets, subPockets, setValue]);

    // Expose setAmount for calculator integration
    useImperativeHandle(ref, () => ({
      setAmount: (value: string) => setValue('amount', value, { shouldDirty: true }),
    }));

    // Available target pockets for transfer mode
    const availableTargetPockets = watchedTargetAccountId
      ? pockets.filter((p) => p.accountId === watchedTargetAccountId)
      : [];

    // Template loading
    const handleTemplateChange = (templateId: string) => {
      onTemplateSelect?.(templateId);
      if (!templateId) {
        setValue('accountId', '');
        setValue('pocketId', '');
        setValue('subPocketId', '');
        setValue('amount', '');
        setValue('notes', '');
        setValue('type', 'EgresoNormal');
        return;
      }
      const template = movementTemplates.find((t) => t.id === templateId);
      if (!template) return;
      setValue('accountId', template.accountId);
      setValue('pocketId', template.pocketId);
      setValue('subPocketId', template.subPocketId || '');
      setValue('type', template.type);
      setValue('amount', template.defaultAmount ? template.defaultAmount.toString() : '');
      setValue('notes', template.notes || '');
    };

    const onFormSubmit = async (data: MovementFormData) => {
      await onSubmit({ ...data, isTransfer });
    };

    return (
      <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
        {!initialData && (
          <Select
            label="Load Template"
            value={selectedTemplateId}
            onChange={(e) => handleTemplateChange(e.target.value)}
            options={[
              { value: '', label: 'Start from scratch' },
              ...movementTemplates.map(t => ({ value: t.id, label: t.name }))
            ]}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Select
            label="Type"
            required
            value={isTransfer ? 'Transfer' : watchedType}
            onChange={(e) => {
              const value = e.target.value;
              if (value === 'Transfer') {
                setIsTransfer(true);
                setValue('accountId', '');
                setValue('pocketId', '');
              } else {
                setIsTransfer(false);
                const type = value as MovementType;
                setValue('type', type, { shouldValidate: true });
                if (isFixedMovement(type)) {
                  const hasFixed = pockets.some(p => p.accountId === watchedAccountId && p.type === 'fixed');
                  if (!hasFixed) setValue('accountId', '');
                }
              }
            }}
            options={MOVEMENT_TYPE_OPTIONS_WITH_TRANSFER}
            error={errors.type?.message}
          />

          <Input
            type="date"
            label="Date"
            required
            {...register('displayedDate', { required: 'Date is required' })}
            error={errors.displayedDate?.message}
          />
        </div>

        <AccountPocketSelector
          accountId={watchedAccountId}
          pocketId={watchedPocketId}
          subPocketId={watchedSubPocketId}
          onAccountChange={(id) => {
            setValue('accountId', id, { shouldValidate: true });
            setValue('pocketId', '');
            setValue('subPocketId', '');
          }}
          onPocketChange={(id) => {
            setValue('pocketId', id, { shouldValidate: true });
            setValue('subPocketId', '');
          }}
          onSubPocketChange={(id) => setValue('subPocketId', id)}
          movementType={watchedType}
          enforceMovementType
          showFixedPocketHint
          showSubPocket={!isTransfer && isDefaultFixedExpense}
          showAccountCurrency
          accountLabel={isTransfer ? 'Source Account' : 'Account'}
          pocketLabel={isTransfer ? 'Source Pocket' : 'Pocket'}
          required
        />
        {errors.accountId && (
          <p className="text-sm text-red-600 dark:text-red-400">{errors.accountId.message}</p>
        )}
        {errors.pocketId && (
          <p className="text-sm text-red-600 dark:text-red-400">{errors.pocketId.message}</p>
        )}

        {isTransfer && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
            <Select
              label="Target Account"
              required
              value={watchedTargetAccountId}
              onChange={(e) => {
                setValue('targetAccountId', e.target.value, { shouldValidate: true });
                setValue('targetPocketId', '');
              }}
              options={[
                { value: '', label: 'Select Target Account' },
                ...accounts.map(acc => ({
                  value: acc.id,
                  label: `${acc.name} (${acc.currency})`
                }))
              ]}
              error={errors.targetAccountId?.message}
            />

            <Select
              label="Target Pocket"
              required
              value={watch('targetPocketId')}
              onChange={(e) => setValue('targetPocketId', e.target.value, { shouldValidate: true })}
              options={[
                { value: '', label: 'Select Target Pocket' },
                ...availableTargetPockets
                  .filter(p => !watchedPocketId || p.id !== watchedPocketId)
                  .map(p => ({ value: p.id, label: p.name }))
              ]}
              disabled={!watchedTargetAccountId}
              error={errors.targetPocketId?.message}
            />
          </div>
        )}

        <Input
          type="number"
          label="Amount"
          placeholder={watchedPocketId && pockets.find(p => p.id === watchedPocketId)?.name === 'Shares' ? '0.000000' : '0.00'}
          step={watchedPocketId && pockets.find(p => p.id === watchedPocketId)?.name === 'Shares' ? '0.000001' : '0.01'}
          min="0"
          required
          {...register('amount', {
            required: 'Amount is required',
            min: { value: 0, message: 'Amount must be 0 or greater' },
          })}
          error={errors.amount?.message}
        />

        <Input
          label="Notes"
          placeholder={isTransfer ? "Transfer details..." : "What is this for?"}
          {...register('notes')}
        />

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isPending"
            {...register('isPending')}
            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
          <label htmlFor="isPending" className="text-sm text-gray-700 dark:text-gray-300">
            Mark as Pending (don't apply to balance yet)
          </label>
        </div>

        {!initialData && !isTransfer && (
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                id="saveAsTemplate"
                {...register('saveAsTemplate')}
                className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
              />
              <label htmlFor="saveAsTemplate" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Save as Template
              </label>
            </div>

            {watchedSaveAsTemplate && (
              <Input
                label="Template Name"
                placeholder="e.g., Monthly Rent"
                required
                {...register('templateName', {
                  validate: (val) => !watchedSaveAsTemplate || val.trim().length > 0 || 'Template name is required',
                })}
                error={errors.templateName?.message}
              />
            )}
          </div>
        )}

        {/* Hidden validation for accountId/pocketId/targetAccountId/targetPocketId */}
        <input type="hidden" {...register('accountId', { required: 'Account is required' })} />
        <input type="hidden" {...register('pocketId', { required: 'Pocket is required' })} />
        <input type="hidden" {...register('targetAccountId', {
          validate: (val) => !isTransfer || val.length > 0 || 'Target account is required',
        })} />
        <input type="hidden" {...register('targetPocketId', {
          validate: (val) => !isTransfer || val.length > 0 || 'Target pocket is required',
        })} />

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={isSaving}>
            {initialData ? 'Update Movement' : (isTransfer ? 'Transfer Funds' : 'Create Movement')}
          </Button>
        </div>
      </form>
    );
  }
);

MovementForm.displayName = 'MovementForm';

export default MovementForm;
