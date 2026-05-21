import { useCallback, useState } from 'react';
import type {
  Movement,
  MovementTemplate,
  MovementType,
  Pocket,
} from '../types';

export interface FormDefaultValues {
  amount?: number;
  notes?: string;
  date?: string;
  type?: MovementType;
  fixedExpenseId?: string;
  templateId?: string;
}

/** Live field values reported by MovementForm via onValuesChange. */
export interface LiveFormValues {
  type: MovementType;
  accountId: string;
  pocketId: string;
  subPocketId: string;
  amount: string;
}

export interface MovementFormStateResult {
  // Visibility / mode
  showForm: boolean;
  setShowForm: (value: boolean) => void;
  editingMovement: Movement | null;
  setEditingMovement: (movement: Movement | null) => void;

  // Templates
  selectedTemplateId: string;
  setSelectedTemplateId: (id: string) => void;

  // URL prefill values
  defaultValues: FormDefaultValues;
  setDefaultValues: (values: FormDefaultValues) => void;

  // Reminder linkage
  reminderId: string | null;
  setReminderId: (id: string | null) => void;

  // Live values from the form (for side panel balance deltas)
  liveValues: LiveFormValues;
  setLiveValues: (values: LiveFormValues) => void;

  // Helpers
  resetFormState: () => void;
  openNewForm: () => void;
  openEditForm: (movement: Movement, pocket: Pocket | undefined) => void;
  handleTemplateSelect: (templateId: string) => void;
}

const EMPTY_LIVE_VALUES: LiveFormValues = {
  type: 'EgresoNormal',
  accountId: '',
  pocketId: '',
  subPocketId: '',
  amount: '',
};

/**
 * Encapsulates visibility, editing state, template selection, and URL-driven
 * prefill values for the single-movement form modal.
 *
 * Field state (amount, notes, type, accountId, etc.) is now owned by
 * react-hook-form inside MovementForm. The `liveValues` field is updated
 * via the form's onValuesChange callback for side panel balance previews.
 */
export const useMovementFormState = (
  _movementTemplates: MovementTemplate[]
): MovementFormStateResult => {
  const [showForm, setShowForm] = useState(false);
  const [editingMovement, setEditingMovement] = useState<Movement | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [defaultValues, setDefaultValues] = useState<FormDefaultValues>({});
  const [reminderId, setReminderId] = useState<string | null>(null);
  const [liveValues, setLiveValues] = useState<LiveFormValues>(EMPTY_LIVE_VALUES);

  const handleTemplateSelect = useCallback((templateId: string) => {
    setSelectedTemplateId(templateId);
  }, []);

  const resetFormState = useCallback(() => {
    setShowForm(false);
    setEditingMovement(null);
    setSelectedTemplateId('');
    setDefaultValues({});
    setLiveValues(EMPTY_LIVE_VALUES);
  }, []);

  const openNewForm = useCallback(() => {
    setShowForm(true);
    setEditingMovement(null);
  }, []);

  const openEditForm = useCallback(
    (movement: Movement, _pocket: Pocket | undefined) => {
      setEditingMovement(movement);
      setShowForm(true);
    },
    []
  );

  return {
    showForm,
    setShowForm,
    editingMovement,
    setEditingMovement,

    selectedTemplateId,
    setSelectedTemplateId,

    defaultValues,
    setDefaultValues,

    reminderId,
    setReminderId,

    liveValues,
    setLiveValues,

    resetFormState,
    openNewForm,
    openEditForm,
    handleTemplateSelect,
  };
};
