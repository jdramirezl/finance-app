import { describe, it, expect, beforeEach } from 'vitest';
import { useToast } from '../useToast';

describe('useToast', () => {
  beforeEach(() => {
    useToast.setState({ toasts: [] });
  });

  it('adds a toast with default type and duration', () => {
    const { addToast } = useToast.getState();
    addToast('Hello');
    const { toasts } = useToast.getState();
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toMatchObject({ message: 'Hello', type: 'info', duration: 5000 });
  });

  it('removes a toast by id', () => {
    const { addToast } = useToast.getState();
    addToast('msg1');
    const id = useToast.getState().toasts[0].id;
    useToast.getState().removeToast(id);
    expect(useToast.getState().toasts).toHaveLength(0);
  });

  it('deduplicates toasts with same message and type', () => {
    const { addToast } = useToast.getState();
    addToast('duplicate', 'error');
    addToast('duplicate', 'error');
    expect(useToast.getState().toasts).toHaveLength(1);
  });

  it('caps toasts at MAX_TOASTS (3)', () => {
    const { addToast } = useToast.getState();
    addToast('one', 'info');
    addToast('two', 'info');
    addToast('three', 'info');
    addToast('four', 'info');
    const { toasts } = useToast.getState();
    expect(toasts).toHaveLength(3);
    expect(toasts[0].message).toBe('two');
  });

  it('provides convenience methods for each type', () => {
    const state = useToast.getState();
    state.success('ok');
    state.error('fail');
    state.warning('warn');
    const { toasts } = useToast.getState();
    expect(toasts.map((t) => t.type)).toEqual(['success', 'error', 'warning']);
  });
});
