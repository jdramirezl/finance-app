import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { MovementTemplate, Pocket, SubPocket } from '../types';
import type { MovementFormStateResult } from './useMovementFormState';
import type { useMovementsFilter } from './useMovementsFilter';
import { toMonthKey } from '../utils/dateUtils';

type FilterSetters = ReturnType<typeof useMovementsFilter>['setFilters'];

export interface UseURLActionsParams {
  pockets: Pocket[];
  subPockets: SubPocket[];
  movementTemplates: MovementTemplate[];
  templatesLoading: boolean;
  formState: MovementFormStateResult;
  setFilters: FilterSetters;
  expandMonth: (monthKey: string) => void;
}

/**
 * Reads URL query params (`?date=...`, `?action=new|transfer`, plus
 * prefill params) and translates them into filter changes and form opens.
 * Clears the params from the URL once handled.
 */
export const useURLActions = ({
  pockets,
  subPockets,
  movementTemplates,
  templatesLoading,
  formState,
  setFilters,
  expandMonth,
}: UseURLActionsParams): void => {
  const location = useLocation();
  const navigate = useNavigate();

  // Track date param processing to avoid re-applying the same filter.
  const processedDateRef = useRef<string | null>(null);

  // Destructure stable setters/callbacks so the effects can list them
  // explicitly in their deps (the wrapping objects are recreated each
  // render, but their inner function references are stable).
  const { setDateRange, setDateFrom, setDateTo } = setFilters;
  const {
    setShowForm,
    setEditingMovement,
    setDefaultValues,
    handleTemplateSelect,
    setSelectedAccountId,
    setSelectedPocketId,
    setIsFixedExpense,
    setReminderId,
  } = formState;

  // Effect 1: handle ?date=YYYY-MM-DD by setting custom date filter and
  // expanding the month containing that date.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const dateParam = params.get('date');

    if (dateParam && processedDateRef.current !== dateParam) {
      processedDateRef.current = dateParam;

      setDateRange('custom');
      setDateFrom(dateParam);
      setDateTo(dateParam);

      // Use toMonthKey so the YYYY-MM portion of the date is preserved
      // exactly as written, regardless of the user's timezone.
      expandMonth(toMonthKey(dateParam));

      const newParams = new URLSearchParams(location.search);
      newParams.delete('date');
      const newSearch = newParams.toString();
      navigate(location.pathname + (newSearch ? `?${newSearch}` : ''), {
        replace: true,
      });
    }
  }, [
    location.search,
    location.pathname,
    navigate,
    setDateRange,
    setDateFrom,
    setDateTo,
    expandMonth,
  ]);

  // Effect 2: handle ?action=new|transfer with optional prefill params
  // (amount, notes, date, templateId, fixedExpenseId, reminderId).
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const action = params.get('action');

    if (action === 'new') {
      const amountParam = params.get('amount');
      const notesParam = params.get('notes');
      const dateParam = params.get('date');
      const templateIdParam = params.get('templateId');
      const fixedExpenseIdParam = params.get('fixedExpenseId');
      const reminderIdParam = params.get('reminderId');

      // Wait for templates to finish loading if we need to apply one.
      if (templateIdParam && templatesLoading) {
        return;
      }

      setShowForm(true);
      setEditingMovement(null);

      if (
        amountParam ||
        notesParam ||
        dateParam ||
        templateIdParam ||
        fixedExpenseIdParam
      ) {
        setDefaultValues({
          amount: amountParam ? parseFloat(amountParam) : undefined,
          notes: notesParam || undefined,
          date: dateParam || undefined,
          templateId: templateIdParam || undefined,
          fixedExpenseId: fixedExpenseIdParam || undefined,
          // Force EgresoFijo when arriving from a fixed-expense link.
          type: fixedExpenseIdParam ? 'EgresoFijo' : undefined,
        });

        if (templateIdParam) {
          handleTemplateSelect(templateIdParam);
        } else if (fixedExpenseIdParam) {
          // fixedExpenseId is actually a subPocket id — find the pocket and
          // account it belongs to so the form can pre-select them.
          const subPocket = subPockets.find(
            (sp) => sp.id === fixedExpenseIdParam
          );
          if (subPocket) {
            const pocket = pockets.find((p) => p.id === subPocket.pocketId);
            if (pocket) {
              setSelectedAccountId(pocket.accountId);
              setSelectedPocketId(pocket.id);
              setIsFixedExpense(true);
            }
          }
        }
      }

      if (reminderIdParam) {
        setReminderId(reminderIdParam);
      }

      navigate(location.pathname, { replace: true });
    } else if (action === 'transfer') {
      setShowForm(true);
      setEditingMovement(null);
      navigate(location.pathname, { replace: true });
    }
  }, [
    location.search,
    location.pathname,
    navigate,
    subPockets,
    pockets,
    movementTemplates,
    templatesLoading,
    setShowForm,
    setEditingMovement,
    setDefaultValues,
    handleTemplateSelect,
    setSelectedAccountId,
    setSelectedPocketId,
    setIsFixedExpense,
    setReminderId,
  ]);
};
