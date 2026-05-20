import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import ConfirmDialog from '../components/ConfirmDialog';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
}

interface ConfirmDialogContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

interface DialogState extends ConfirmOptions {
  isOpen: boolean;
}

const DEFAULT_STATE: DialogState = {
  isOpen: false,
  title: '',
  message: '',
  confirmText: 'Confirm',
  cancelText: 'Cancel',
  variant: 'danger',
};

type ConfirmResolver = (value: boolean) => void;

const ConfirmDialogContext = createContext<ConfirmDialogContextType | undefined>(undefined);

/**
 * Centralized provider for confirmation dialogs.
 *
 * Renders a single `ConfirmDialog` at the provider level so consumers can
 * imperatively trigger confirmations via `useConfirmDialog().confirm(options)`
 * without each component owning its own dialog instance and state.
 *
 * The returned promise resolves `true` when the user confirms and `false`
 * when the user cancels or dismisses the dialog.
 */
export const ConfirmDialogProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<DialogState>(DEFAULT_STATE);

  // Holds the pending Promise's resolver so we can flip it `false` when the
  // dialog is closed/cancelled. A ref (not state) keeps the value stable
  // across renders without triggering re-renders when it changes.
  const resolverRef = useRef<ConfirmResolver | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      // If a previous prompt is still pending (edge case — provider only
      // shows one at a time), resolve it as cancelled before replacing.
      if (resolverRef.current) {
        resolverRef.current(false);
      }
      resolverRef.current = resolve;
      setState({
        isOpen: true,
        title: options.title,
        message: options.message,
        confirmText: options.confirmText ?? 'Confirm',
        cancelText: options.cancelText ?? 'Cancel',
        variant: options.variant ?? 'danger',
      });
    });
  }, []);

  const handleClose = useCallback(() => {
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const handleConfirm = useCallback(() => {
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
    setState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  // Memoize the context value so consumers don't re-render on every
  // dialog state change — only when the `confirm` identity changes
  // (which it never does, since it's wrapped in useCallback).
  const value = useMemo<ConfirmDialogContextType>(() => ({ confirm }), [confirm]);

  return (
    <ConfirmDialogContext.Provider value={value}>
      {children}
      <ConfirmDialog
        isOpen={state.isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={state.title}
        message={state.message}
        confirmText={state.confirmText}
        cancelText={state.cancelText}
        variant={state.variant}
      />
    </ConfirmDialogContext.Provider>
  );
};

/**
 * Access the centralized confirm dialog.
 *
 * Returns an object containing a `confirm(options)` function that opens
 * a managed dialog and resolves with `true` if the user confirms,
 * `false` if they cancel or dismiss.
 *
 * Must be used within a `ConfirmDialogProvider`.
 */
export const useConfirmDialog = () => {
  const context = useContext(ConfirmDialogContext);
  if (context === undefined) {
    throw new Error('useConfirmDialog must be used within a ConfirmDialogProvider');
  }
  return context;
};
