import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMovementsFilter } from '../useMovementsFilter';
import type { Movement } from '../../types';

const makeMovement = (overrides: Partial<Movement> = {}): Movement => ({
  id: 'mov-1',
  type: 'EgresoNormal',
  accountId: 'acc-1',
  pocketId: 'pkt-1',
  amount: 100,
  notes: 'groceries',
  displayedDate: '2025-03-15',
  createdAt: '2025-03-15T10:00:00.000Z',
  isPending: false,
  ...overrides,
});

const movements: Movement[] = [
  makeMovement({ id: '1', type: 'IngresoNormal', accountId: 'acc-1', amount: 500, displayedDate: '2025-03-10' }),
  makeMovement({ id: '2', type: 'EgresoNormal', accountId: 'acc-2', amount: 200, displayedDate: '2025-03-12' }),
  makeMovement({ id: '3', type: 'EgresoFijo', accountId: 'acc-1', amount: 50, displayedDate: '2025-01-05', isPending: true }),
  makeMovement({ id: '4', type: 'IngresoNormal', accountId: 'acc-2', amount: 1000, notes: 'salary', displayedDate: '2025-03-14' }),
];

describe('useMovementsFilter', () => {
  it('returns all movements when no filters applied', () => {
    const { result } = renderHook(() => useMovementsFilter({ movements }));
    expect(result.current.filteredMovements).toHaveLength(4);
  });

  it('filters by account', () => {
    const { result } = renderHook(() => useMovementsFilter({ movements }));
    act(() => result.current.setFilters.setAccount('acc-2'));
    expect(result.current.filteredMovements).toHaveLength(2);
    expect(result.current.filteredMovements.every((m) => m.accountId === 'acc-2')).toBe(true);
  });

  it('filters by movement type', () => {
    const { result } = renderHook(() => useMovementsFilter({ movements }));
    act(() => result.current.setFilters.setType('IngresoNormal'));
    expect(result.current.filteredMovements).toHaveLength(2);
  });

  it('filters by pending status', () => {
    const { result } = renderHook(() => useMovementsFilter({ movements }));
    act(() => result.current.setFilters.setShowPending('pending'));
    expect(result.current.filteredMovements).toHaveLength(1);
    expect(result.current.filteredMovements[0].id).toBe('3');
  });

  it('filters by search text in notes', () => {
    const { result } = renderHook(() => useMovementsFilter({ movements }));
    act(() => result.current.setFilters.setSearch('salary'));
    expect(result.current.filteredMovements).toHaveLength(1);
    expect(result.current.filteredMovements[0].id).toBe('4');
  });
});
