import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import type { MovementFormStateResult } from '../useMovementFormState';

/**
 * Tests for {@link useURLActions}. The hook reads `?date=` and
 * `?action=new|transfer` (plus prefill params) from the URL, drives
 * filter and form state, and clears the consumed params via navigate.
 *
 * react-router-dom is mocked at the module level: useLocation reads
 * a mutable `mockLocation` so each test can pose a different URL,
 * useNavigate returns a spy. Plain `renderHook` from RTL is used so we
 * don't need a Router provider at all.
 */

const navigate = vi.fn();
let mockLocation: { search: string; pathname: string } = {
  search: '',
  pathname: '/movements',
};

vi.mock('react-router-dom', () => ({
  useNavigate: () => navigate,
  useLocation: () => mockLocation,
}));

import { useURLActions, type UseURLActionsParams } from '../useURLActions';

const setLocation = (search: string, pathname = '/movements') => {
  mockLocation = { search, pathname };
};

const makeFormState = (): MovementFormStateResult => ({
  showForm: false,
  setShowForm: vi.fn(),
  editingMovement: null,
  setEditingMovement: vi.fn(),
  selectedTemplateId: '',
  setSelectedTemplateId: vi.fn(),
  defaultValues: {},
  setDefaultValues: vi.fn(),
  reminderId: null,
  setReminderId: vi.fn(),
  reminderDate: null,
  setReminderDate: vi.fn(),
  reminderRecurring: false,
  setReminderRecurring: vi.fn(),
  liveValues: {
    type: 'EgresoNormal',
    accountId: '',
    pocketId: '',
    subPocketId: '',
    amount: '',
  },
  setLiveValues: vi.fn(),
  resetFormState: vi.fn(),
  openNewForm: vi.fn(),
  openEditForm: vi.fn(),
  handleTemplateSelect: vi.fn(),
});

const makeFilters = () => ({
  setAccount: vi.fn(),
  setPocket: vi.fn(),
  setType: vi.fn(),
  setDateRange: vi.fn(),
  setDateFrom: vi.fn(),
  setDateTo: vi.fn(),
  setSearch: vi.fn(),
  setMinAmount: vi.fn(),
  setMaxAmount: vi.fn(),
  setShowPending: vi.fn(),
  setCategory: vi.fn(),
  setTags: vi.fn(),
});

describe('useURLActions', () => {
  let formState: MovementFormStateResult;
  let setFilters: ReturnType<typeof makeFilters>;
  let expandMonth: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    setLocation('');
    formState = makeFormState();
    setFilters = makeFilters();
    expandMonth = vi.fn();
  });

  const setup = (overrides: Partial<UseURLActionsParams> = {}) => {
    const params: UseURLActionsParams = {
      pockets: [],
      subPockets: [],
      movementTemplates: [],
      templatesLoading: false,
      formState,
      setFilters: setFilters as unknown as UseURLActionsParams['setFilters'],
      expandMonth,
      ...overrides,
    };
    return renderHook(() => useURLActions(params));
  };

  describe('?date=YYYY-MM-DD', () => {
    it('sets a custom date filter and expands the month containing the date', () => {
      setLocation('?date=2025-06-15');
      setup();

      expect(setFilters.setDateRange).toHaveBeenCalledWith('custom');
      expect(setFilters.setDateFrom).toHaveBeenCalledWith('2025-06-15');
      expect(setFilters.setDateTo).toHaveBeenCalledWith('2025-06-15');
      expect(expandMonth).toHaveBeenCalledWith('2025-06');
    });

    it('strips the date param from the URL after handling', () => {
      setLocation('?date=2025-06-15');
      setup();

      expect(navigate).toHaveBeenCalledWith('/movements', { replace: true });
    });

    it('preserves other params when removing the date param', () => {
      setLocation('?date=2025-06-15&keep=this');
      setup();

      expect(navigate).toHaveBeenCalledWith('/movements?keep=this', {
        replace: true,
      });
    });

    it('does not re-process the same date param on re-render', () => {
      setLocation('?date=2025-06-15');
      const { rerender } = setup();

      rerender();
      rerender();

      // Filters set exactly once thanks to the processedDateRef guard
      // (and the unchanged effect deps) — re-renders must be no-ops.
      expect(setFilters.setDateRange).toHaveBeenCalledTimes(1);
      expect(setFilters.setDateFrom).toHaveBeenCalledTimes(1);
      expect(expandMonth).toHaveBeenCalledTimes(1);
    });
  });

  describe('?action=new', () => {
    it('opens a fresh form when no prefill params are supplied', () => {
      setLocation('?action=new');
      setup();

      expect(formState.setShowForm).toHaveBeenCalledWith(true);
      expect(formState.setEditingMovement).toHaveBeenCalledWith(null);
      // No prefill → defaultValues untouched.
      expect(formState.setDefaultValues).not.toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledWith('/movements', { replace: true });
    });

    it('passes amount, notes, and date prefill into defaultValues', () => {
      setLocation('?action=new&amount=199.99&notes=Netflix&date=2025-06-15');
      setup();

      expect(formState.setDefaultValues).toHaveBeenCalledWith({
        amount: 199.99,
        notes: 'Netflix',
        date: '2025-06-15',
        templateId: undefined,
        fixedExpenseId: undefined,
        type: undefined,
      });
    });

    it('forces type=EgresoFijo when arriving from a fixedExpenseId link', () => {
      setLocation('?action=new&fixedExpenseId=fx-1');
      setup();

      expect(formState.setDefaultValues).toHaveBeenCalledWith(
        expect.objectContaining({ fixedExpenseId: 'fx-1', type: 'EgresoFijo' }),
      );
    });

    it('selects a template when templateId is supplied', () => {
      setLocation('?action=new&templateId=tpl-1');
      setup();

      expect(formState.handleTemplateSelect).toHaveBeenCalledWith('tpl-1');
      expect(formState.setDefaultValues).toHaveBeenCalledWith(
        expect.objectContaining({ templateId: 'tpl-1' }),
      );
    });

    it('waits for templates to finish loading before applying templateId', () => {
      setLocation('?action=new&templateId=tpl-1');
      setup({ templatesLoading: true });

      // While templates are still loading the effect must early-return so
      // it doesn't open a form referencing a template that isn't there yet.
      expect(formState.setShowForm).not.toHaveBeenCalled();
      expect(formState.handleTemplateSelect).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
    });

    it('captures reminder linkage when reminderId is present', () => {
      setLocation(
        '?action=new&reminderId=rem-1&date=2025-06-15&reminderRecurring=true',
      );
      setup();

      expect(formState.setReminderId).toHaveBeenCalledWith('rem-1');
      expect(formState.setReminderDate).toHaveBeenCalledWith('2025-06-15');
      expect(formState.setReminderRecurring).toHaveBeenCalledWith(true);
    });

    it('treats a missing reminderRecurring param as false', () => {
      setLocation('?action=new&reminderId=rem-1');
      setup();

      expect(formState.setReminderRecurring).toHaveBeenCalledWith(false);
    });

    it('parses amount as a float', () => {
      setLocation('?action=new&amount=12.34');
      setup();

      expect(formState.setDefaultValues).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 12.34 }),
      );
    });
  });

  describe('?action=transfer', () => {
    it('opens the form without prefill and clears the action param', () => {
      setLocation('?action=transfer');
      setup();

      expect(formState.setShowForm).toHaveBeenCalledWith(true);
      expect(formState.setEditingMovement).toHaveBeenCalledWith(null);
      // Transfer link does not carry prefill values.
      expect(formState.setDefaultValues).not.toHaveBeenCalled();
      expect(navigate).toHaveBeenCalledWith('/movements', { replace: true });
    });
  });

  describe('no actionable params', () => {
    it('does nothing when the query string is empty', () => {
      setLocation('');
      setup();

      expect(setFilters.setDateRange).not.toHaveBeenCalled();
      expect(formState.setShowForm).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
    });

    it('does nothing for unrecognized actions', () => {
      setLocation('?action=delete');
      setup();

      expect(formState.setShowForm).not.toHaveBeenCalled();
      expect(navigate).not.toHaveBeenCalled();
    });
  });
});
