import type { User } from '@supabase/supabase-js';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '../../../test/testUtils';
import ProtectedRoute from '../ProtectedRoute';

// Replace the Navigate component with a marker so tests can detect a
// redirect without actually triggering router-level navigation.
vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    Navigate: ({ to, replace }: { to: string; replace?: boolean }) => (
      <div
        data-testid="navigate"
        data-to={to}
        data-replace={replace ? 'true' : 'false'}
      >
        Navigate to {to}
      </div>
    ),
  };
});

type AuthState = {
  user: User | null;
  loading: boolean;
};

let authState: AuthState = { user: null, loading: false };

vi.mock('../../../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => authState,
}));

const makeUser = (overrides: Partial<User> = {}): User =>
  ({
    id: 'user-1',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: '2025-01-01T00:00:00.000Z',
    ...overrides,
  }) as User;

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authState = { user: null, loading: false };
  });

  it('renders the loading state while auth is initializing', () => {
    authState = { user: null, loading: true };

    render(
      <ProtectedRoute>
        <div data-testid="protected-content">secret</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    // Children should not be rendered while loading
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    // No redirect while loading
    expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
  });

  it('shows a spinner element while loading', () => {
    authState = { user: null, loading: true };

    const { container } = render(
      <ProtectedRoute>
        <div>secret</div>
      </ProtectedRoute>,
    );

    expect(container.querySelector('.animate-spin')).not.toBeNull();
  });

  it('redirects unauthenticated users to /login with replace', () => {
    authState = { user: null, loading: false };

    render(
      <ProtectedRoute>
        <div data-testid="protected-content">secret</div>
      </ProtectedRoute>,
    );

    const navigate = screen.getByTestId('navigate');
    expect(navigate).toBeInTheDocument();
    expect(navigate).toHaveAttribute('data-to', '/login');
    expect(navigate).toHaveAttribute('data-replace', 'true');
    // Children should not render when redirecting
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });

  it('renders children when an authenticated user is present', () => {
    authState = { user: makeUser(), loading: false };

    render(
      <ProtectedRoute>
        <div data-testid="protected-content">secret</div>
      </ProtectedRoute>,
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.getByText('secret')).toBeInTheDocument();
    expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
    expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  });

  it('passes through complex children when authenticated', () => {
    authState = { user: makeUser(), loading: false };

    render(
      <ProtectedRoute>
        <header>Header</header>
        <main data-testid="main">Main content</main>
        <footer>Footer</footer>
      </ProtectedRoute>,
    );

    expect(screen.getByText('Header')).toBeInTheDocument();
    expect(screen.getByTestId('main')).toBeInTheDocument();
    expect(screen.getByText('Footer')).toBeInTheDocument();
  });

  it('prefers the loading state over the redirect when loading is true', () => {
    // Even with no user, while loading we should see the spinner — never the redirect
    authState = { user: null, loading: true };

    render(
      <ProtectedRoute>
        <div data-testid="protected-content">secret</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByTestId('navigate')).not.toBeInTheDocument();
  });

  it('prefers the loading state over rendering children even when a user exists', () => {
    // Edge case: the auth provider can briefly report user + loading together
    // during a refresh. The loading branch should still win.
    authState = { user: makeUser(), loading: true };

    render(
      <ProtectedRoute>
        <div data-testid="protected-content">secret</div>
      </ProtectedRoute>,
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
  });
});
