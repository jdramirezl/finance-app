import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBulkSelection } from '../useBulkSelection';

describe('useBulkSelection', () => {
  it('toggles selection on and off', () => {
    const { result } = renderHook(() => useBulkSelection());
    act(() => result.current.toggleSelection('a'));
    expect(result.current.isSelected('a')).toBe(true);
    act(() => result.current.toggleSelection('a'));
    expect(result.current.isSelected('a')).toBe(false);
  });

  it('selects all provided ids', () => {
    const { result } = renderHook(() => useBulkSelection());
    act(() => result.current.selectAll(['a', 'b', 'c']));
    expect(result.current.selectedCount).toBe(3);
    expect(result.current.isSelected('b')).toBe(true);
  });

  it('clears selection with deselectAll', () => {
    const { result } = renderHook(() => useBulkSelection());
    act(() => result.current.selectAll(['a', 'b']));
    act(() => result.current.deselectAll());
    expect(result.current.selectedCount).toBe(0);
  });

  it('reports correct selectedCount', () => {
    const { result } = renderHook(() => useBulkSelection());
    act(() => result.current.toggleSelection('x'));
    act(() => result.current.toggleSelection('y'));
    expect(result.current.selectedCount).toBe(2);
  });
});
