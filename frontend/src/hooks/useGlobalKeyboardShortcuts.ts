import { useEffect } from 'react';

export interface ShortcutDef {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  meta?: boolean;
  handler: () => void;
  /** Skip when focus is inside an input/textarea/contenteditable. Default true. */
  ignoreInputFocus?: boolean;
}

const INPUT_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

function isInputFocused(): boolean {
  const el = document.activeElement;
  if (!el) return false;
  if (INPUT_TAGS.has(el.tagName)) return true;
  if ((el as HTMLElement).isContentEditable) return true;
  return false;
}

/**
 * Registers global keyboard shortcuts on `document`. Shortcuts do not fire
 * when focus is inside form elements (unless `ignoreInputFocus` is false).
 */
export function useGlobalKeyboardShortcuts(shortcuts: ShortcutDef[]) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      for (const s of shortcuts) {
        const ignoreInput = s.ignoreInputFocus ?? true;
        if (ignoreInput && isInputFocused()) continue;
        if (e.key.toLowerCase() !== s.key.toLowerCase()) continue;
        if (!!s.ctrl !== (e.ctrlKey || e.metaKey)) continue;
        if (!!s.shift !== e.shiftKey) continue;
        e.preventDefault();
        e.stopPropagation();
        s.handler();
        return;
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [shortcuts]);
}
