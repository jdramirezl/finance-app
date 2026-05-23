import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMovementsSort } from '../useMovementsSort';
import type { Movement } from '../../types';

const makeMovement = (overrides: Partial<Movement> = {}): Movement => ({
  id: 'mov-1',
  type: 'EgresoNormal',
  accountId: 'acc-1',
  pocketId: 'pkt-1',
  amount: 100,
  notes: '',
  displayedDate: '2025-03-15',
  createdAt: '2025-03-15T10:00:00.000Z',
  isPending: false,
  ...overrides,
});

const movements: Movement[] = [
  makeMovement({ id: '1', amount: 300, displayedDate: '2025-03-10', createdAt: '2025-03-10T08:00:00.000Z' }),
  makeMovement({ id: '2', amount: 100, displayedDate: '2025-03-15', createdAt: '2025-03-15T12:00:00.000Z' }),
  makeMovement({ id: '3', amount: 500, displayedDate: '2025-03-05', createdAt: '2025-03-05T09:00:00.000Z' }),
];

describe('useMovementsSort', () => {
  it('sorts by displayedDate descending by default', () => {
    const { result } = renderHook(() => useMovementsSort({ movements }));
    const allMovements = result.current.sortedMovementsByMonth.flatMap(([, m]) => m);
    expect(allMovements[0].id).toBe('2');
    expect(allMovements[2].id).toBe('3');
  });

  it('sorts by amount ascending', () => {
    const { result } = renderHook(() => useMovementsSort({ movements }));
    act(() => {
      result.current.setSortField('amount');
      result.current.setSortOrder('asc');
    });
    const allMovements = result.current.sortedMovementsByMonth.flatMap(([, m]) => m);
    expect(allMovements[0].amount).toBe(100);
    expect(allMovements[2].amount).toBe(500);
  });

  it('persists sort preferences to localStorage', () => {
    renderHook(() => useMovementsSort({ movements, initialSortField: 'amount', initialSortOrder: 'asc' }));
    expect(localStorage.getItem('movementSortField')).toBe('amount');
    expect(localStorage.getItem('movementSortOrder')).toBe('asc');
  });
});
