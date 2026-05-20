import { useEffect, useRef } from 'react';

/**
 * Runs `effect` after `delay` ms have passed since `deps` last changed.
 *
 * Useful for debouncing side effects such as persisting state to
 * `localStorage`, where rapid input changes (e.g. typing a budget amount or
 * dragging a percentage slider) would otherwise trigger a write on every
 * keystroke. The latest deps "win" — pending writes are cancelled on the
 * next change and on unmount.
 *
 * The effect is intentionally untyped via `effect: () => void` rather than
 * supporting cleanup functions, since the common use cases (writes) don't
 * need them and supporting cleanup adds confusion around what runs when.
 */
export const useDebouncedEffect = (
  effect: () => void,
  deps: ReadonlyArray<unknown>,
  delay: number
): void => {
  // Stash the latest effect so the timeout always runs the freshest closure
  // even if the caller re-creates `effect` each render.
  const effectRef = useRef(effect);

  useEffect(() => {
    effectRef.current = effect;
  }, [effect]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      effectRef.current();
    }, delay);

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, delay]);
};
