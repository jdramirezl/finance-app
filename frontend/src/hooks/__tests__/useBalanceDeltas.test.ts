import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useBalanceDeltas } from '../useBalanceDeltas';
import type { MovementFormStateResult } from '../useMovementFormState';
import type { BatchMovementRow } from '../../components/movements/BatchMovementForm';

const makeLiveValues = (overrides = {}) => ({
  type: 'EgresoNormal' as const,
  accountId: 'acc-1',
  pocketId: 'pock-1',
  subPocketId: '',
  amount: '0',
  ...overrides,
});

const makeFormState = (overrides: Partial<MovementFormStateResult & { liveValues: ReturnType<typeof makeLiveValues> }> = {}): MovementFormStateResult => {
  const { liveValues, ...rest } = overrides;
  return {
    showForm: false,
    setShowForm: () => {},
    editingMovement: null,
    setEditingMovement: () => {},
    selectedTemplateId: '',
    setSelectedTemplateId: () => {},
    defaultValues: {},
    setDefaultValues: () => {},
    liveValues: liveValues ?? makeLiveValues(),
    setLiveValues: () => {},
    openForm: () => {},
    closeForm: () => {},
    editMovement: () => {},
    applyTemplate: () => {},
    ...rest,
  } as unknown as MovementFormStateResult;
};

const makeBatchRow = (overrides: Partial<BatchMovementRow> = {}): BatchMovementRow => ({
  id: 'row-1',
  type: 'EgresoNormal',
  accountId: 'acc-1',
  pocketId: 'pock-1',
  amount: '100',
  notes: '',
  displayedDate: '2025-01-01',
  ...overrides,
});

describe('useBalanceDeltas', () => {
  it('returns empty deltas when form is hidden and batch is off', () => {
    const { result } = renderHook(() =>
      useBalanceDeltas({
        formState: makeFormState({ showForm: false }),
        showBatchForm: false,
        batchRows: [],
      }),
    );

    expect(result.current.accountDeltas).toEqual({});
    expect(result.current.pocketDeltas).toEqual({});
    expect(result.current.subPocketDeltas).toEqual({});
  });

  it('computes negative delta for expense movement', () => {
    const { result } = renderHook(() =>
      useBalanceDeltas({
        formState: makeFormState({
          showForm: true,
          liveValues: makeLiveValues({ type: 'EgresoNormal', amount: '500', accountId: 'acc-1', pocketId: 'pock-1' }),
        }),
        showBatchForm: false,
        batchRows: [],
      }),
    );

    expect(result.current.accountDeltas['acc-1']).toBe(-500);
    expect(result.current.pocketDeltas['pock-1']).toBe(-500);
  });

  it('computes positive delta for income movement', () => {
    const { result } = renderHook(() =>
      useBalanceDeltas({
        formState: makeFormState({
          showForm: true,
          liveValues: makeLiveValues({ type: 'IngresoNormal', amount: '200', accountId: 'acc-2', pocketId: 'pock-2' }),
        }),
        showBatchForm: false,
        batchRows: [],
      }),
    );

    expect(result.current.accountDeltas['acc-2']).toBe(200);
    expect(result.current.pocketDeltas['pock-2']).toBe(200);
  });

  it('returns empty deltas when amount is zero', () => {
    const { result } = renderHook(() =>
      useBalanceDeltas({
        formState: makeFormState({
          showForm: true,
          liveValues: makeLiveValues({ type: 'EgresoNormal', amount: '0', accountId: 'acc-1', pocketId: 'pock-1' }),
        }),
        showBatchForm: false,
        batchRows: [],
      }),
    );

    expect(result.current.accountDeltas).toEqual({});
  });

  it('aggregates deltas from multiple batch rows', () => {
    const rows: BatchMovementRow[] = [
      makeBatchRow({ id: 'r1', type: 'EgresoNormal', accountId: 'acc-1', pocketId: 'pock-1', amount: '100' }),
      makeBatchRow({ id: 'r2', type: 'IngresoFijo', accountId: 'acc-1', pocketId: 'pock-2', amount: '50' }),
    ];

    const { result } = renderHook(() =>
      useBalanceDeltas({
        formState: makeFormState(),
        showBatchForm: true,
        batchRows: rows,
      }),
    );

    // acc-1: -100 + 50 = -50
    expect(result.current.accountDeltas['acc-1']).toBe(-50);
    expect(result.current.pocketDeltas['pock-1']).toBe(-100);
    expect(result.current.pocketDeltas['pock-2']).toBe(50);
  });

  it('tracks subPocket deltas when subPocketId is provided', () => {
    const { result } = renderHook(() =>
      useBalanceDeltas({
        formState: makeFormState({
          showForm: true,
          liveValues: makeLiveValues({
            type: 'EgresoFijo',
            amount: '75',
            accountId: 'acc-1',
            pocketId: 'pock-1',
            subPocketId: 'sub-1',
          }),
        }),
        showBatchForm: false,
        batchRows: [],
      }),
    );

    expect(result.current.subPocketDeltas['sub-1']).toBe(-75);
    expect(result.current.pocketDeltas['pock-1']).toBe(-75);
  });
});
