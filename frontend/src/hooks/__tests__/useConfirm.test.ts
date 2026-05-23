import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useConfirm } from '../useConfirm';

describe('useConfirm', () => {
  it('returns a confirm function that opens the dialog', () => {
    const { result } = renderHook(() => useConfirm());
    act(() => {
      result.current.confirm({ title: 'Delete?', message: 'Are you sure?' });
    });
    expect(result.current.confirmState.isOpen).toBe(true);
    expect(result.current.confirmState.title).toBe('Delete?');
  });

  it('resolves true when confirmed', async () => {
    const { result } = renderHook(() => useConfirm());
    let resolved: boolean | undefined;
    let promise: Promise<boolean>;
    act(() => {
      promise = result.current.confirm({ title: 'T', message: 'M' });
      promise.then((v) => { resolved = v; });
    });
    // onConfirm is now set in state after the act above
    await act(async () => {
      result.current.handleConfirm();
      await promise!;
    });
    expect(resolved).toBe(true);
    expect(result.current.confirmState.isOpen).toBe(false);
  });

  it('resolves false when closed/cancelled', async () => {
    const { result } = renderHook(() => useConfirm());
    let resolved: boolean | undefined;
    let promise: Promise<boolean>;
    act(() => {
      promise = result.current.confirm({ title: 'T', message: 'M' });
      promise.then((v) => { resolved = v; });
    });
    await act(async () => {
      result.current.handleClose();
      await promise!;
    });
    expect(resolved).toBe(false);
    expect(result.current.confirmState.isOpen).toBe(false);
  });
});
