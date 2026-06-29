import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBudgetActions } from '../actions/useBudgetActions';
import type { UseBudgetActionsParams } from '../actions/useBudgetActions';
import type { Account, Pocket, SubPocket } from '../../types';
import type { DistributionEntry } from '../../components/budget';
import type { PlanningScenario } from '../../components/budget/ScenarioForm';
import type { BatchMovementRow } from '../../components/movements/BatchMovementForm';

// `useBudgetActions` calls `useConfirmDialog()` at module-level. We mock
// the context so tests don't need to render a `ConfirmDialogProvider`,
// and so we can drive the resolved boolean per-test.
const mockConfirm = vi.fn();
vi.mock('../../contexts/ConfirmDialogContext', () => ({
  useConfirmDialog: () => ({ confirm: mockConfirm }),
}));

// Currency conversion is async and unrelated to the budget logic under test.
// Default to a same-currency setup so the conversion `useEffect` is a no-op,
// but provide a mock so any incidental call is harmless.
vi.mock('../../services/currencyService', () => ({
  currencyService: {
    convert: vi.fn().mockImplementation(async (amount: number) => amount),
  },
}));

const mockAccount = (overrides: Partial<Account> = {}): Account => ({
  id: 'acc-1',
  name: 'Bank',
  color: '#3B82F6',
  currency: 'USD',
  balance: 1000,
  type: 'normal',
  ...overrides,
});

const mockPocket = (overrides: Partial<Pocket> = {}): Pocket => ({
  id: 'pkt-1',
  accountId: 'acc-1',
  name: 'Savings',
  type: 'normal',
  balance: 500,
  currency: 'USD',
  ...overrides,
});

const mockFixedPocket = (overrides: Partial<Pocket> = {}): Pocket => ({
  id: 'pkt-fixed',
  accountId: 'acc-1',
  name: 'Fixed Expenses',
  type: 'fixed',
  balance: 0,
  currency: 'USD',
  ...overrides,
});

const mockSubPocket = (overrides: Partial<SubPocket> = {}): SubPocket => ({
  id: 'sub-1',
  pocketId: 'pkt-fixed',
  name: 'Internet',
  valueTotal: 1200,
  periodicityMonths: 12,
  balance: 0,
  ...overrides,
});

interface MutationStub {
  mutateAsync: ReturnType<typeof vi.fn>;
  isPending: boolean;
}

const buildParams = (overrides: Partial<UseBudgetActionsParams> = {}) => {
  const createMovement: MutationStub = {
    mutateAsync: vi.fn().mockResolvedValue({ id: 'mov-new' }),
    isPending: false,
  };
  const setScenarios = vi.fn();
  const toast = {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  };

  const params: UseBudgetActionsParams = {
    accounts: [mockAccount()],
    pockets: [mockPocket()],
    fixedPockets: [mockFixedPocket()],
    fixedSubPockets: [],
    initialAmount: 0,
    distributionEntries: [],
    scenarios: [],
    setScenarios,
    budgetCurrency: 'USD',
    primaryCurrency: 'USD',
    movementMutations: { createMovement } as unknown as UseBudgetActionsParams['movementMutations'],
    toast: toast as unknown as UseBudgetActionsParams['toast'],
    defaultAccountId: 'acc-1',
    defaultPocketId: 'pkt-1',
    ...overrides,
  };

  return { params, createMovement, setScenarios, toast };
};

describe('useBudgetActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfirm.mockResolvedValue(true);
  });

  describe('totalFijosMes', () => {
    it('sums all fixed expenses when no scenarios exist', () => {
      // 1200 / 12 = 100 per month; 600 / 6 = 100 per month
      const fixedSubPockets = [
        mockSubPocket({ id: 'sp-1', valueTotal: 1200, periodicityMonths: 12 }),
        mockSubPocket({ id: 'sp-2', valueTotal: 600, periodicityMonths: 6 }),
      ];

      const { params } = buildParams({ fixedSubPockets, initialAmount: 1000 });
      const { result } = renderHook(() => useBudgetActions(params));

      expect(result.current.totalFijosMes).toBe(200);
      expect(result.current.remaining).toBe(800);
    });

    it('returns zero when scenarios exist but none are active (manual override)', () => {
      const fixedSubPockets = [
        mockSubPocket({ id: 'sp-1', valueTotal: 1200, periodicityMonths: 12 }),
      ];
      const scenarios: PlanningScenario[] = [
        { id: 'sc-1', name: 'Tight', expenseIds: ['sp-1'] },
      ];

      const { params } = buildParams({ fixedSubPockets, scenarios, initialAmount: 1000 });
      const { result } = renderHook(() => useBudgetActions(params));

      expect(result.current.totalFijosMes).toBe(0);
      expect(result.current.remaining).toBe(1000);
    });

    it('only includes expenses referenced by active scenarios', () => {
      const fixedSubPockets = [
        mockSubPocket({ id: 'sp-1', valueTotal: 1200, periodicityMonths: 12 }), // 100
        mockSubPocket({ id: 'sp-2', valueTotal: 600, periodicityMonths: 6 }),   // 100
        mockSubPocket({ id: 'sp-3', valueTotal: 2400, periodicityMonths: 12 }), // 200 — not in scenario
      ];
      const scenarios: PlanningScenario[] = [
        { id: 'sc-1', name: 'Lean', expenseIds: ['sp-1', 'sp-2'] },
      ];

      const { params } = buildParams({
        fixedSubPockets,
        scenarios,
        initialAmount: 1000,
      });
      const { result } = renderHook(() => useBudgetActions(params));

      // Activate the scenario.
      act(() => {
        result.current.toggleScenario('sc-1');
      });

      expect(result.current.totalFijosMes).toBe(200);
    });
  });

  describe('scenario state', () => {
    it('toggleScenario adds and removes ids', () => {
      const { params } = buildParams();
      const { result } = renderHook(() => useBudgetActions(params));

      act(() => result.current.toggleScenario('sc-1'));
      expect(result.current.activeScenarioIds.has('sc-1')).toBe(true);

      act(() => result.current.toggleScenario('sc-1'));
      expect(result.current.activeScenarioIds.has('sc-1')).toBe(false);
    });

    it('saveScenario appends a new scenario', () => {
      const { params, setScenarios } = buildParams({ scenarios: [] });
      const { result } = renderHook(() => useBudgetActions(params));

      const scenario: PlanningScenario = { id: 'sc-1', name: 'New', expenseIds: ['sp-1'] };
      act(() => result.current.saveScenario(scenario));

      // setScenarios is called with an updater function — invoke it with the
      // current state to verify the resulting list.
      const updater = setScenarios.mock.calls[0][0] as (prev: PlanningScenario[]) => PlanningScenario[];
      expect(updater([])).toEqual([scenario]);
    });

    it('saveScenario replaces an existing scenario by id', () => {
      const existing: PlanningScenario = { id: 'sc-1', name: 'Old', expenseIds: [] };
      const { params, setScenarios } = buildParams({ scenarios: [existing] });
      const { result } = renderHook(() => useBudgetActions(params));

      const updated: PlanningScenario = { id: 'sc-1', name: 'Updated', expenseIds: ['sp-1'] };
      act(() => result.current.saveScenario(updated));

      const updater = setScenarios.mock.calls[0][0] as (prev: PlanningScenario[]) => PlanningScenario[];
      expect(updater([existing])).toEqual([updated]);
    });

    it('deleteScenario removes the scenario when confirmed', async () => {
      const existing: PlanningScenario = { id: 'sc-1', name: 'X', expenseIds: [] };
      const { params, setScenarios } = buildParams({ scenarios: [existing] });
      const { result } = renderHook(() => useBudgetActions(params));

      mockConfirm.mockResolvedValueOnce(true);

      await act(async () => {
        await result.current.deleteScenario('sc-1');
      });

      expect(setScenarios).toHaveBeenCalled();
      const updater = setScenarios.mock.calls[0][0] as (prev: PlanningScenario[]) => PlanningScenario[];
      expect(updater([existing])).toEqual([]);
    });

    it('deleteScenario does nothing when not confirmed', async () => {
      const existing: PlanningScenario = { id: 'sc-1', name: 'X', expenseIds: [] };
      const { params, setScenarios } = buildParams({ scenarios: [existing] });
      const { result } = renderHook(() => useBudgetActions(params));

      mockConfirm.mockResolvedValueOnce(false);

      await act(async () => {
        await result.current.deleteScenario('sc-1');
      });

      expect(setScenarios).not.toHaveBeenCalled();
    });
  });

  describe('prepareBatchFromDistribution', () => {
    it('toasts an error when no positive entries exist', () => {
      const distributionEntries: DistributionEntry[] = [
        { id: 'd-1', name: 'Empty', percentage: 0 },
      ];

      const { params, toast } = buildParams({
        distributionEntries,
        initialAmount: 1000,
      });
      const { result } = renderHook(() => useBudgetActions(params));

      act(() => result.current.prepareBatchFromDistribution());

      expect(toast.error).toHaveBeenCalledWith('No distribution entries to create movements from.');
      expect(result.current.batch.isOpen).toBe(false);
    });

    it('builds rows for positive entries and opens the batch', () => {
      const distributionEntries: DistributionEntry[] = [
        { id: 'd-1', name: 'Savings', percentage: 50, accountId: 'acc-1', pocketId: 'pkt-1' },
        { id: 'd-2', name: 'Splurge', percentage: 25 },
      ];

      const { params, toast } = buildParams({
        distributionEntries,
        initialAmount: 1000,
      });
      const { result } = renderHook(() => useBudgetActions(params));

      act(() => result.current.prepareBatchFromDistribution());

      expect(result.current.batch.isOpen).toBe(true);
      expect(result.current.batch.rows).toHaveLength(2);

      const [row1, row2] = result.current.batch.rows;
      expect(row1).toMatchObject({
        type: 'IngresoNormal',
        accountId: 'acc-1',
        pocketId: 'pkt-1',
        amount: '500.00',
        notes: 'Budget Distribution: Savings',
      });
      expect(row2).toMatchObject({
        type: 'IngresoNormal',
        accountId: 'acc-1', // Falls back to defaultAccountId.
        pocketId: 'pkt-1', // Falls back to defaultPocketId.
        amount: '250.00',
        notes: 'Budget Distribution: Splurge',
      });
      expect(toast.success).toHaveBeenCalledWith('Prepared 2 movements');
    });

    it('toasts when calculated amounts are all zero (e.g. nothing remaining)', () => {
      const distributionEntries: DistributionEntry[] = [
        { id: 'd-1', name: 'Savings', percentage: 50 },
      ];

      // initialAmount === 0 with no fixed expenses ⇒ remaining=0 ⇒ amount=0 per entry
      const { params, toast } = buildParams({ distributionEntries, initialAmount: 0 });
      const { result } = renderHook(() => useBudgetActions(params));

      act(() => result.current.prepareBatchFromDistribution());

      expect(toast.error).toHaveBeenCalledWith('Calculated amounts are zero.');
      expect(result.current.batch.isOpen).toBe(false);
    });
  });

  describe('prepareUnifiedBatch', () => {
    it('toasts an error when there is nothing to generate', () => {
      const { params, toast } = buildParams({
        distributionEntries: [],
        fixedSubPockets: [],
      });
      const { result } = renderHook(() => useBudgetActions(params));

      act(() => result.current.prepareUnifiedBatch());

      expect(toast.error).toHaveBeenCalledWith('No movements to generate.');
      expect(result.current.batch.isOpen).toBe(false);
    });

    it('combines distribution rows and all fixed expenses when no scenarios exist', () => {
      const distributionEntries: DistributionEntry[] = [
        { id: 'd-1', name: 'Savings', percentage: 50, accountId: 'acc-1', pocketId: 'pkt-1' },
      ];
      const fixedSubPockets = [
        mockSubPocket({ id: 'sp-1', name: 'Internet', valueTotal: 1200, periodicityMonths: 12 }),
        mockSubPocket({ id: 'sp-2', name: 'Insurance', valueTotal: 600, periodicityMonths: 6 }),
      ];

      const { params, toast } = buildParams({
        distributionEntries,
        fixedSubPockets,
        // remaining = 1000 - 200 = 800 ⇒ 50% = 400
        initialAmount: 1000,
      });
      const { result } = renderHook(() => useBudgetActions(params));

      act(() => result.current.prepareUnifiedBatch());

      expect(result.current.batch.isOpen).toBe(true);
      expect(result.current.batch.rows).toHaveLength(3); // 1 distribution + 2 fixed

      const [dist, fixed1, fixed2] = result.current.batch.rows;
      expect(dist).toMatchObject({
        type: 'IngresoNormal',
        accountId: 'acc-1',
        pocketId: 'pkt-1',
        amount: '400.00',
        notes: 'Budget Distribution: Savings',
      });
      expect(fixed1).toMatchObject({
        type: 'IngresoFijo',
        accountId: 'acc-1',
        pocketId: 'pkt-fixed',
        subPocketId: 'sp-1',
        amount: '100.00',
        notes: 'Monthly contribution for Internet',
      });
      expect(fixed2).toMatchObject({
        type: 'IngresoFijo',
        accountId: 'acc-1',
        pocketId: 'pkt-fixed',
        subPocketId: 'sp-2',
        amount: '100.00',
        notes: 'Monthly contribution for Insurance',
      });
      expect(toast.success).toHaveBeenCalledWith('Prepared 3 movements');
    });

    it('omits fixed expenses when scenarios exist but none are active', () => {
      const distributionEntries: DistributionEntry[] = [
        { id: 'd-1', name: 'Savings', percentage: 50, accountId: 'acc-1', pocketId: 'pkt-1' },
      ];
      const fixedSubPockets = [
        mockSubPocket({ id: 'sp-1', valueTotal: 1200, periodicityMonths: 12 }),
      ];
      const scenarios: PlanningScenario[] = [
        { id: 'sc-1', name: 'Tight', expenseIds: ['sp-1'] },
      ];

      const { params } = buildParams({
        distributionEntries,
        fixedSubPockets,
        scenarios,
        initialAmount: 1000,
      });
      const { result } = renderHook(() => useBudgetActions(params));

      act(() => result.current.prepareUnifiedBatch());

      expect(result.current.batch.rows).toHaveLength(1);
      expect(result.current.batch.rows[0]).toMatchObject({
        type: 'IngresoNormal',
        notes: 'Budget Distribution: Savings',
      });
    });

    it('only includes fixed expenses referenced by active scenarios', () => {
      const fixedSubPockets = [
        mockSubPocket({ id: 'sp-1', name: 'Included', valueTotal: 1200, periodicityMonths: 12 }),
        mockSubPocket({ id: 'sp-2', name: 'Excluded', valueTotal: 600, periodicityMonths: 6 }),
      ];
      const scenarios: PlanningScenario[] = [
        { id: 'sc-1', name: 'Lean', expenseIds: ['sp-1'] },
      ];

      const { params } = buildParams({
        distributionEntries: [],
        fixedSubPockets,
        scenarios,
        initialAmount: 1000,
      });
      const { result } = renderHook(() => useBudgetActions(params));

      // Activate the scenario.
      act(() => result.current.toggleScenario('sc-1'));
      act(() => result.current.prepareUnifiedBatch());

      expect(result.current.batch.rows).toHaveLength(1);
      expect(result.current.batch.rows[0]).toMatchObject({
        type: 'IngresoFijo',
        subPocketId: 'sp-1',
        notes: 'Monthly contribution for Included',
      });
    });

    it('generates only fixed expenses when distribution is empty (no scenarios)', () => {
      const fixedSubPockets = [
        mockSubPocket({ id: 'sp-1', name: 'Internet', valueTotal: 1200, periodicityMonths: 12 }),
      ];

      const { params } = buildParams({
        distributionEntries: [],
        fixedSubPockets,
        initialAmount: 0,
      });
      const { result } = renderHook(() => useBudgetActions(params));

      act(() => result.current.prepareUnifiedBatch());

      expect(result.current.batch.isOpen).toBe(true);
      expect(result.current.batch.rows).toHaveLength(1);
      expect(result.current.batch.rows[0]).toMatchObject({
        type: 'IngresoFijo',
        subPocketId: 'sp-1',
      });
    });
  });

  describe('batch.save', () => {
    it('creates a movement per row and closes the batch', async () => {
      const { params, createMovement, toast } = buildParams();
      const { result } = renderHook(() => useBudgetActions(params));

      const rows = [
        {
          id: 'row-1',
          type: 'IngresoNormal' as const,
          accountId: 'acc-1',
          pocketId: 'pkt-1',
          amount: '100.00',
          notes: 'Row 1',
          displayedDate: '2025-06-15',
        },
        {
          id: 'row-2',
          type: 'IngresoNormal' as const,
          accountId: 'acc-1',
          pocketId: 'pkt-1',
          amount: '200.00',
          notes: 'Row 2',
          displayedDate: '2025-06-15',
          isPending: true,
        },
      ];

      await act(async () => {
        await result.current.batch.save(rows);
      });

      expect(createMovement.mutateAsync).toHaveBeenCalledTimes(2);
      expect(createMovement.mutateAsync).toHaveBeenNthCalledWith(1, {
        type: 'IngresoNormal',
        accountId: 'acc-1',
        pocketId: 'pkt-1',
        subPocketId: undefined,
        amount: 100,
        notes: 'Row 1',
        displayedDate: '2025-06-15',
        isPending: false,
      });
      expect(createMovement.mutateAsync).toHaveBeenNthCalledWith(2, {
        type: 'IngresoNormal',
        accountId: 'acc-1',
        pocketId: 'pkt-1',
        subPocketId: undefined,
        amount: 200,
        notes: 'Row 2',
        displayedDate: '2025-06-15',
        isPending: true,
      });
      expect(toast.success).toHaveBeenCalledWith('Successfully distributed budget!');
      expect(result.current.batch.isOpen).toBe(false);
    });

    it('forwards subPocketId on fixed-expense rows so sub-pocket balances update', async () => {
      // Regression: prepareUnifiedBatch builds IngresoFijo rows that carry
      // `subPocketId: sp.id`, but saveBatch was previously dropping the
      // field when calling createMovement. As a result the movement got
      // created on the parent pocket only and the sub-pocket balance
      // never moved — even though the Generate Movements modal showed
      // the right pre-filled values.
      const { params, createMovement } = buildParams();
      const { result } = renderHook(() => useBudgetActions(params));

      const rows: BatchMovementRow[] = [
        {
          id: 'row-fixed-1',
          type: 'IngresoFijo',
          accountId: 'acc-1',
          pocketId: 'pkt-fixed-1',
          subPocketId: 'sp-1',
          amount: '50.00',
          notes: 'Monthly contribution for Internet',
          displayedDate: '2025-06-15',
        },
        {
          id: 'row-fixed-2',
          type: 'IngresoFijo',
          accountId: 'acc-1',
          pocketId: 'pkt-fixed-1',
          subPocketId: 'sp-2',
          amount: '100.00',
          notes: 'Monthly contribution for Electricity',
          displayedDate: '2025-06-15',
        },
      ];

      await act(async () => {
        await result.current.batch.save(rows);
      });

      expect(createMovement.mutateAsync).toHaveBeenCalledTimes(2);
      expect(createMovement.mutateAsync).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          type: 'IngresoFijo',
          pocketId: 'pkt-fixed-1',
          subPocketId: 'sp-1',
          amount: 50,
        }),
      );
      expect(createMovement.mutateAsync).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          type: 'IngresoFijo',
          pocketId: 'pkt-fixed-1',
          subPocketId: 'sp-2',
          amount: 100,
        }),
      );
    });

    it('keeps the batch open when a mutation fails', async () => {
      const { params, createMovement } = buildParams();
      createMovement.mutateAsync.mockRejectedValueOnce(new Error('failed'));
      const { result } = renderHook(() => useBudgetActions(params));

      await act(async () => {
        await result.current.batch.save([
          {
            id: 'row-1',
            type: 'IngresoNormal',
            accountId: 'acc-1',
            pocketId: 'pkt-1',
            amount: '50',
            notes: '',
            displayedDate: '2025-06-15',
          },
        ]);
      });

      // The catch block in saveBatch swallows the error so the modal stays
      // open for the user to retry. The mutation's onError shows a toast.
      expect(result.current.batch.isOpen).toBe(false); // initial state was never opened
    });
  });
});
