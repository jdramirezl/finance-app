import { useEffect, useRef } from 'react';

/**
 * Warns users before navigating away from a dirty form.
 *
 * - `beforeunload`: triggers native browser dialog on tab close/refresh
 * - `popstate` + sentinel history entry: intercepts in-app back navigation
 *   with a confirm dialog (useBlocker unavailable under BrowserRouter)
 */
export function useUnsavedChanges(isDirty: boolean): void {
  const sentinelPushed = useRef(false);

  // beforeunload — browser close/refresh protection
  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  // popstate — in-app back navigation protection via sentinel history entry
  useEffect(() => {
    if (!isDirty) {
      sentinelPushed.current = false;
      return;
    }

    // Push a sentinel entry so pressing back triggers popstate instead of leaving
    window.history.pushState({ __unsavedGuard: true }, '');
    sentinelPushed.current = true;

    const handlePopState = () => {
      if (!sentinelPushed.current) return;

      const leave = window.confirm('You have unsaved changes. Leave anyway?');
      if (leave) {
        sentinelPushed.current = false;
        // Let the navigation proceed by going back again
        window.history.back();
      } else {
        // Re-push sentinel to keep blocking
        window.history.pushState({ __unsavedGuard: true }, '');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      // Clean up sentinel entry on unmount if still present
      if (sentinelPushed.current) {
        sentinelPushed.current = false;
        window.history.back();
      }
    };
  }, [isDirty]);
}
