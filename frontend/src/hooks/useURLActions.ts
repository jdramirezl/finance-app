import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import type { MovementTemplate, Pocket, SubPocket } from '../types';
import type { MovementFormStateResult } from './useMovementFormState';
import type { useMovementsFilter } from './useMovementsFilter';

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

  // Effect 1: handle ?date=YYYY-MM-DD by setting custom date filter and
  // expanding the month containing that date.
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const dateParam = params.get('date');

    if (dateParam && processedDateRef.current !== dateParam) {
      processedDateRef.current = dateParam;

      setFilters.setDateRange('custom');
      setFilters.setDateFrom(dateParam);
      setFilters.setDateTo(dateParam);

      const monthKey = format(new Date(dateParam), 'yyyy-MM');
      expandMonth(monthKey);

      const newParams = new URLSearchParams(location.search);
      newParams.delete('date');
      const newSearch = newParams.toString();
      navigate(location.pathname + (newSearch ? `?${newSearch}` : ''), {
        replace: true,
      });
    }
    // setFilters/expandMonth intentionally excluded — they are stable callbacks
    // and including them caused infinite loops in the original page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, navigate]);

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

      formState.setShowForm(true);
      formState.setEditingMovement(null);

      if (
        amountParam ||
        notesParam ||
        dateParam ||
        templateIdParam ||
        fixedExpenseIdParam
      ) {
        formState.setDefaultValues({
          amount: amountParam ? parseFloat(amountParam) : undefined,
          notes: notesParam || undefined,
          date: dateParam || undefined,
          templateId: templateIdParam || undefined,
          fixedExpenseId: fixedExpenseIdParam || undefined,
          // Force EgresoFijo when arriving from a fixed-expense link.
          type: fixedExpenseIdParam ? 'EgresoFijo' : undefined,
        });

        if (templateIdParam) {
          formState.handleTemplateSelect(templateIdParam);
        } else if (fixedExpenseIdParam) {
          // fixedExpenseId is actually a subPocket id — find the pocket and
          // account it belongs to so the form can pre-select them.
          const subPocket = subPockets.find(
            (sp) => sp.id === fixedExpenseIdParam
          );
          if (subPocket) {
            const pocket = pockets.find((p) => p.id === subPocket.pocketId);
            if (pocket) {
              formState.setSelectedAccountId(pocket.accountId);
              formState.setSelectedPocketId(pocket.id);
              formState.setIsFixedExpense(true);
            }
          }
        }
      }

      if (reminderIdParam) {
        formState.setReminderId(reminderIdParam);
      }

      navigate(location.pathname, { replace: true });
    } else if (action === 'transfer') {
      formState.setShowForm(true);
      formState.setEditingMovement(null);
      navigate(location.pathname, { replace: true });
    }
    // formState is intentionally excluded — its setters are stable but the
    // object identity changes every render. Including it would re-run the
    // effect every render and instantly clear the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    location.search,
    navigate,
    subPockets,
    pockets,
    movementTemplates,
    templatesLoading,
  ]);
};
