import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import ErrorBoundary from '../ErrorBoundary';

// React logs caught errors to console.error during the boundary's componentDidCatch.
// Silence it so tests stay readable.
let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

const ThrowOnRender = ({ message = 'boom' }: { message?: string }) => {
  throw new Error(message);
};

describe('ErrorBoundary', () => {
  beforeEach(() => {
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Healthy child</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText('Healthy child')).toBeInTheDocument();
  });

  it('catches errors thrown by children and renders the default fallback', () => {
    render(
      <ErrorBoundary>
        <ThrowOnRender message="render failed" />
      </ErrorBoundary>,
    );
    const alert = screen.getByRole('alert');
    expect(alert).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('render failed')).toBeInTheDocument();
  });

  it('shows a generic message when the error has no message', () => {
    const ThrowEmpty = () => {
      throw new Error('');
    };
    render(
      <ErrorBoundary>
        <ThrowEmpty />
      </ErrorBoundary>,
    );
    expect(
      screen.getByText(/an unexpected error occurred/i),
    ).toBeInTheDocument();
  });

  it('renders a custom ReactNode fallback when provided', () => {
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowOnRender />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('renders a render-prop fallback with the caught error and a reset callback', () => {
    const fallback = vi.fn((error: Error, reset: () => void) => (
      <div>
        <span>Caught: {error.message}</span>
        <button onClick={reset}>Reset</button>
      </div>
    ));

    render(
      <ErrorBoundary fallback={fallback}>
        <ThrowOnRender message="render-prop error" />
      </ErrorBoundary>,
    );

    expect(fallback).toHaveBeenCalled();
    const [errorArg, resetArg] = fallback.mock.calls[0];
    expect(errorArg).toBeInstanceOf(Error);
    expect(errorArg.message).toBe('render-prop error');
    expect(typeof resetArg).toBe('function');
    expect(screen.getByText('Caught: render-prop error')).toBeInTheDocument();
  });

  it('calls onError with the caught error and component info', () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary onError={onError}>
        <ThrowOnRender message="report me" />
      </ErrorBoundary>,
    );

    expect(onError).toHaveBeenCalledTimes(1);
    const [errorArg, infoArg] = onError.mock.calls[0];
    expect(errorArg).toBeInstanceOf(Error);
    expect(errorArg.message).toBe('report me');
    expect(infoArg).toHaveProperty('componentStack');
  });

  it('clears the error and re-renders children when the user clicks Try Again', async () => {
    const user = userEvent.setup();

    let allowRender = false;
    const ToggleableChild = () => {
      if (!allowRender) throw new Error('first time');
      return <div>recovered</div>;
    };

    render(
      <ErrorBoundary>
        <ToggleableChild />
      </ErrorBoundary>,
    );

    // Default fallback visible.
    expect(screen.getByText('first time')).toBeInTheDocument();

    // Allow the next render to succeed before clicking Try Again.
    allowRender = true;
    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(screen.getByText('recovered')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('invokes onReset when the boundary clears its error', async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();

    let allowRender = false;
    const ToggleableChild = () => {
      if (!allowRender) throw new Error('reset me');
      return <div>ok</div>;
    };

    render(
      <ErrorBoundary onReset={onReset}>
        <ToggleableChild />
      </ErrorBoundary>,
    );

    allowRender = true;
    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('exposes a working reset callback through the render-prop fallback', async () => {
    const user = userEvent.setup();

    let allowRender = false;
    const ToggleableChild = () => {
      if (!allowRender) throw new Error('boom');
      return <div>recovered via render prop</div>;
    };

    render(
      <ErrorBoundary
        fallback={(error, reset) => (
          <div>
            <span>captured: {error.message}</span>
            <button onClick={reset}>retry</button>
          </div>
        )}
      >
        <ToggleableChild />
      </ErrorBoundary>,
    );

    expect(screen.getByText('captured: boom')).toBeInTheDocument();

    allowRender = true;
    await user.click(screen.getByRole('button', { name: 'retry' }));

    expect(screen.getByText('recovered via render prop')).toBeInTheDocument();
  });
});
