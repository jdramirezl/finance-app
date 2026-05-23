import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useGlobalKeyboardShortcuts, type ShortcutDef } from '../useGlobalKeyboardShortcuts';

/**
 * Tests for {@link useGlobalKeyboardShortcuts}. The hook attaches a single
 * `keydown` listener to `document` and dispatches to the first shortcut
 * whose modifiers and key match.
 *
 * Behaviors we want pinned:
 *   - Plain keys, modifier combinations (ctrl, shift, meta), and the
 *     ctrl-OR-meta normalization (so Cmd+K on macOS triggers ctrl: true).
 *   - Case-insensitive key matching.
 *   - `preventDefault` + `stopPropagation` are called when a shortcut runs.
 *   - Focus inside inputs/textareas/selects/contenteditable suppresses the
 *     handler unless `ignoreInputFocus: false` opts back in.
 *   - The first matching shortcut wins (later shortcuts are not invoked).
 *   - The listener is removed on unmount.
 */

const dispatchKey = (init: KeyboardEventInit) => {
  const event = new KeyboardEvent('keydown', { cancelable: true, bubbles: true, ...init });
  document.dispatchEvent(event);
  return event;
};

const focusInput = (tag: 'input' | 'textarea' | 'select' = 'input'): HTMLElement => {
  const el = document.createElement(tag);
  if (tag === 'select') {
    const opt = document.createElement('option');
    opt.value = 'a';
    el.appendChild(opt);
  }
  document.body.appendChild(el);
  el.focus();
  return el;
};

const focusContentEditable = (): HTMLElement => {
  const el = document.createElement('div');
  el.contentEditable = 'true';
  // jsdom requires tabindex for a non-form element to be focusable.
  el.tabIndex = 0;
  // jsdom does not derive `isContentEditable` from the contentEditable
  // attribute, so the hook's check would otherwise see `false`. Pin it.
  Object.defineProperty(el, 'isContentEditable', { value: true });
  document.body.appendChild(el);
  el.focus();
  return el;
};

describe('useGlobalKeyboardShortcuts', () => {
  beforeEach(() => {
    // Some tests focus elements; reset between tests so leftover focus doesn't
    // affect the next assertion.
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('matching', () => {
    it('invokes the handler when the key matches and no modifiers are required', () => {
      const handler = vi.fn();
      const shortcuts: ShortcutDef[] = [{ key: 'n', handler }];
      renderHook(() => useGlobalKeyboardShortcuts(shortcuts));

      dispatchKey({ key: 'n' });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('matches keys case-insensitively (e.g. Shift held producing "N")', () => {
      const handler = vi.fn();
      const shortcuts: ShortcutDef[] = [{ key: 'n', handler }];
      renderHook(() => useGlobalKeyboardShortcuts(shortcuts));

      dispatchKey({ key: 'N' });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('does not invoke the handler when a non-required modifier is pressed', () => {
      const handler = vi.fn();
      const shortcuts: ShortcutDef[] = [{ key: 'n', handler }];
      renderHook(() => useGlobalKeyboardShortcuts(shortcuts));

      // Shortcut declares no shift requirement, but shift is down.
      dispatchKey({ key: 'n', shiftKey: true });

      expect(handler).not.toHaveBeenCalled();
    });

    it('respects the ctrl modifier when required', () => {
      const handler = vi.fn();
      renderHook(() =>
        useGlobalKeyboardShortcuts([{ key: 'k', ctrl: true, handler }]),
      );

      dispatchKey({ key: 'k' });
      expect(handler).not.toHaveBeenCalled();

      dispatchKey({ key: 'k', ctrlKey: true });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('treats meta (Cmd) as ctrl for cross-platform shortcuts', () => {
      const handler = vi.fn();
      renderHook(() =>
        useGlobalKeyboardShortcuts([{ key: 'k', ctrl: true, handler }]),
      );

      dispatchKey({ key: 'k', metaKey: true });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('respects the shift modifier when required', () => {
      const handler = vi.fn();
      renderHook(() =>
        useGlobalKeyboardShortcuts([{ key: '/', shift: true, handler }]),
      );

      dispatchKey({ key: '/' });
      expect(handler).not.toHaveBeenCalled();

      dispatchKey({ key: '/', shiftKey: true });
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('event side effects', () => {
    it('calls preventDefault and stopPropagation on a matching shortcut', () => {
      const handler = vi.fn();
      renderHook(() =>
        useGlobalKeyboardShortcuts([{ key: 'k', ctrl: true, handler }]),
      );

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true,
        cancelable: true,
        bubbles: true,
      });
      const preventDefault = vi.spyOn(event, 'preventDefault');
      const stopPropagation = vi.spyOn(event, 'stopPropagation');
      document.dispatchEvent(event);

      expect(handler).toHaveBeenCalledTimes(1);
      expect(preventDefault).toHaveBeenCalled();
      expect(stopPropagation).toHaveBeenCalled();
    });

    it('does not call preventDefault when no shortcut matches', () => {
      renderHook(() =>
        useGlobalKeyboardShortcuts([{ key: 'k', ctrl: true, handler: vi.fn() }]),
      );

      const event = new KeyboardEvent('keydown', {
        key: 'q',
        cancelable: true,
        bubbles: true,
      });
      const preventDefault = vi.spyOn(event, 'preventDefault');
      document.dispatchEvent(event);

      expect(preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('focus suppression', () => {
    it.each(['input', 'textarea', 'select'] as const)(
      'suppresses the handler when focus is inside a %s',
      (tag) => {
        const handler = vi.fn();
        renderHook(() => useGlobalKeyboardShortcuts([{ key: 'n', handler }]));

        focusInput(tag);
        dispatchKey({ key: 'n' });

        expect(handler).not.toHaveBeenCalled();
      },
    );

    it('suppresses the handler when focus is inside a contenteditable element', () => {
      const handler = vi.fn();
      renderHook(() => useGlobalKeyboardShortcuts([{ key: 'n', handler }]));

      focusContentEditable();
      dispatchKey({ key: 'n' });

      expect(handler).not.toHaveBeenCalled();
    });

    it('still fires when ignoreInputFocus is false (e.g. Escape)', () => {
      const handler = vi.fn();
      renderHook(() =>
        useGlobalKeyboardShortcuts([
          { key: 'Escape', ignoreInputFocus: false, handler },
        ]),
      );

      focusInput('input');
      dispatchKey({ key: 'Escape' });

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('multi-shortcut dispatch', () => {
    it('runs only the first matching shortcut', () => {
      const first = vi.fn();
      const second = vi.fn();
      renderHook(() =>
        useGlobalKeyboardShortcuts([
          { key: 'k', handler: first },
          { key: 'k', handler: second },
        ]),
      );

      dispatchKey({ key: 'k' });

      expect(first).toHaveBeenCalledTimes(1);
      expect(second).not.toHaveBeenCalled();
    });

    it('routes by modifier — same key with different modifiers fire different handlers', () => {
      const plain = vi.fn();
      const withCtrl = vi.fn();
      renderHook(() =>
        useGlobalKeyboardShortcuts([
          { key: 'k', handler: plain },
          { key: 'k', ctrl: true, handler: withCtrl },
        ]),
      );

      dispatchKey({ key: 'k' });
      dispatchKey({ key: 'k', ctrlKey: true });

      expect(plain).toHaveBeenCalledTimes(1);
      expect(withCtrl).toHaveBeenCalledTimes(1);
    });
  });

  describe('lifecycle', () => {
    it('removes the listener on unmount', () => {
      const handler = vi.fn();
      const { unmount } = renderHook(() =>
        useGlobalKeyboardShortcuts([{ key: 'n', handler }]),
      );

      unmount();
      dispatchKey({ key: 'n' });

      expect(handler).not.toHaveBeenCalled();
    });

    it('updates the listener when the shortcuts array reference changes', () => {
      const initialHandler = vi.fn();
      const updatedHandler = vi.fn();

      const { rerender } = renderHook(
        ({ shortcuts }: { shortcuts: ShortcutDef[] }) =>
          useGlobalKeyboardShortcuts(shortcuts),
        { initialProps: { shortcuts: [{ key: 'n', handler: initialHandler }] } },
      );

      dispatchKey({ key: 'n' });
      expect(initialHandler).toHaveBeenCalledTimes(1);

      rerender({ shortcuts: [{ key: 'n', handler: updatedHandler }] });
      dispatchKey({ key: 'n' });

      expect(updatedHandler).toHaveBeenCalledTimes(1);
      // The original handler was swapped out — it should not fire again.
      expect(initialHandler).toHaveBeenCalledTimes(1);
    });
  });
});
