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

export interface MovementFormStateResult {
  // Visibility / mode
  showForm: boolean;
  setShowForm: (value: boolean) => void;
  editingMovement: Movement | null;
  setEditingMovement: (movement: Movement | null) => void;

  // Field state
  selectedAccountId: string;
  setSelectedAccountId: (id: string) => void;
  selectedPocketId: string;
  setSelectedPocketId: (id: string) => void;
  selectedSubPocketId: string;
  setSelectedSubPocketId: (id: string) => void;
  selectedType: MovementType;
  setSelectedType: (type: MovementType) => void;
  amount: string;
  setAmount: (value: string) => void;
  notes: string;
  setNotes: (value: string) => void;
  isFixedExpense: boolean;
  setIsFixedExpense: (value: boolean) => void;

  // Templates / save options
  selectedTemplateId: string;
  setSelectedTemplateId: (id: string) => void;
  saveAsTemplate: boolean;
  setSaveAsTemplate: (value: boolean) => void;
  templateName: string;
  setTemplateName: (name: string) => void;
  handleTemplateSelect: (templateId: string) => void;

  // URL prefill values
  defaultValues: FormDefaultValues;
  setDefaultValues: (values: FormDefaultValues) => void;

  // Reminder linkage
  reminderId: string | null;
  setReminderId: (id: string | null) => void;

  // Helpers
  resetFormState: () => void;
  openNewForm: () => void;
  openEditForm: (movement: Movement, pocket: Pocket | undefined) => void;
}

/**
 * Encapsulates all controlled state for the single-movement form modal,
 * including template selection and URL-driven prefill values.
 *
 * Batch form state (rows, active row, etc.) is intentionally NOT included —
 * it has different lifecycles and lives alongside the page.
 */
export const useMovementFormState = (
  movementTemplates: MovementTemplate[]
): MovementFormStateResult => {
  const [showForm, setShowForm] = useState(false);
  const [editingMovement, setEditingMovement] = useState<Movement | null>(null);

  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedPocketId, setSelectedPocketId] = useState<string>('');
  const [selectedSubPocketId, setSelectedSubPocketId] = useState<string>('');
  const [selectedType, setSelectedType] = useState<MovementType>('EgresoNormal');
  const [amount, setAmount] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isFixedExpense, setIsFixedExpense] = useState(false);

  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');

  const [defaultValues, setDefaultValues] = useState<FormDefaultValues>({});
  const [reminderId, setReminderId] = useState<string | null>(null);

  const handleTemplateSelect = useCallback(
    (templateId: string) => {
      setSelectedTemplateId(templateId);

      if (!templateId) {
        setSelectedAccountId('');
        setSelectedPocketId('');
        setSelectedSubPocketId('');
        setAmount('');
        setNotes('');
        setIsFixedExpense(false);
        return;
      }

      const template = movementTemplates.find((t) => t.id === templateId);
      if (!template) return;

      setSelectedAccountId(template.accountId);
      setSelectedPocketId(template.pocketId);
      setSelectedSubPocketId(template.subPocketId || '');
      setSelectedType(template.type);
      setAmount(template.defaultAmount ? template.defaultAmount.toString() : '');
      setNotes(template.notes || '');
      setIsFixedExpense(
        template.type === 'IngresoFijo' || template.type === 'EgresoFijo'
      );
    },
    [movementTemplates]
  );

  const resetFormState = useCallback(() => {
    setShowForm(false);
    setEditingMovement(null);
    setSelectedAccountId('');
    setSelectedPocketId('');
    setSelectedSubPocketId('');
    setSelectedType('EgresoNormal');
    setAmount('');
    setNotes('');
    setIsFixedExpense(false);
    setSelectedTemplateId('');
    setSaveAsTemplate(false);
    setTemplateName('');
    setDefaultValues({});
  }, []);

  const openNewForm = useCallback(() => {
    setShowForm(true);
    setEditingMovement(null);
    setSelectedAccountId('');
    setSelectedPocketId('');
    setSelectedSubPocketId('');
    setSelectedType('EgresoNormal');
    setIsFixedExpense(false);
  }, []);

  const openEditForm = useCallback(
    (movement: Movement, pocket: Pocket | undefined) => {
      setEditingMovement(movement);
      setSelectedAccountId(movement.accountId);
      setSelectedSubPocketId(movement.subPocketId || '');
      setSelectedType(movement.type);
      setAmount(movement.amount.toString());
      setNotes(movement.notes || '');
      if (pocket) {
        setSelectedPocketId(movement.pocketId);
        setIsFixedExpense(pocket.type === 'fixed');
      }
      setShowForm(true);
    },
    []
  );

  return {
    showForm,
    setShowForm,
    editingMovement,
    setEditingMovement,

    selectedAccountId,
    setSelectedAccountId,
    selectedPocketId,
    setSelectedPocketId,
    selectedSubPocketId,
    setSelectedSubPocketId,
    selectedType,
    setSelectedType,
    amount,
    setAmount,
    notes,
    setNotes,
    isFixedExpense,
    setIsFixedExpense,

    selectedTemplateId,
    setSelectedTemplateId,
    saveAsTemplate,
    setSaveAsTemplate,
    templateName,
    setTemplateName,
    handleTemplateSelect,

    defaultValues,
    setDefaultValues,

    reminderId,
    setReminderId,

    resetFormState,
    openNewForm,
    openEditForm,
  };
};
