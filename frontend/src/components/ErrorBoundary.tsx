import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import Button from './ui/Button';

/**
 * Render-time error boundary.
 *
 * React 19 still surfaces render/lifecycle errors only through the
 * legacy class-component lifecycle methods, so this stays a class
 * component on purpose.
 */

type FallbackRenderer = (error: Error, reset: () => void) => ReactNode;

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional custom fallback. Either a node or a render-prop receiving the error and reset callback. */
  fallback?: ReactNode | FallbackRenderer;
  /** Called after the boundary clears its error and re-renders its children. */
  onReset?: () => void;
  /** Reported once when the boundary first catches an error. Useful for logging. */
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // The fallback UI exposes `error.message` to the user; consumers can
    // wire up `onError` for richer reporting (e.g. a logging service).
    this.props.onError?.(error, info);
  }

  private reset = (): void => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    const { error } = this.state;
    const { fallback, children } = this.props;

    if (!error) return children;

    if (fallback !== undefined) {
      return typeof fallback === 'function'
        ? (fallback as FallbackRenderer)(error, this.reset)
        : fallback;
    }

    return (
      <div
        role="alert"
        className="flex items-center justify-center min-h-[300px] p-6"
      >
        <div className="max-w-md w-full text-center">
          <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <AlertTriangle
              className="w-7 h-7 text-red-600 dark:text-red-400"
              aria-hidden="true"
            />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 break-words">
            {error.message ||
              'An unexpected error occurred while rendering this section.'}
          </p>
          <div className="flex justify-center">
            <Button variant="primary" onClick={this.reset}>
              <RefreshCw className="w-4 h-4" />
              Try Again
            </Button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
