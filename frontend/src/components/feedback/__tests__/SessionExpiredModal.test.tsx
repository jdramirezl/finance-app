import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act, waitFor } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import SessionExpiredModal from '../SessionExpiredModal';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual =
    await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockSignOut = vi.fn();
vi.mock('../../../contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({ signOut: mockSignOut }),
}));

describe('SessionExpiredModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSignOut.mockResolvedValue(undefined);
  });

  it('renders nothing before the session-expired event fires', () => {
    render(<SessionExpiredModal />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Session Expired')).not.toBeInTheDocument();
  });

  it('opens the modal when the auth:session-expired event is dispatched', () => {
    render(<SessionExpiredModal />);

    act(() => {
      window.dispatchEvent(new Event('auth:session-expired'));
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Session Expired' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Your session has expired. Please sign in again.'),
    ).toBeInTheDocument();
  });

  it('renders a Sign In button when the modal is open', () => {
    render(<SessionExpiredModal />);

    act(() => {
      window.dispatchEvent(new Event('auth:session-expired'));
    });

    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('signs the user out and navigates to /login when Sign In is clicked', async () => {
    const user = userEvent.setup();
    render(<SessionExpiredModal />);

    act(() => {
      window.dispatchEvent(new Event('auth:session-expired'));
    });

    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1);
    });
    expect(mockNavigate).toHaveBeenCalledWith('/login', { replace: true });
  });

  it('closes the modal after a successful sign-in flow', async () => {
    const user = userEvent.setup();
    render(<SessionExpiredModal />);

    act(() => {
      window.dispatchEvent(new Event('auth:session-expired'));
    });

    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('removes the event listener when unmounted', () => {
    const removeSpy = vi.spyOn(window, 'removeEventListener');
    const { unmount } = render(<SessionExpiredModal />);

    unmount();

    expect(removeSpy).toHaveBeenCalledWith(
      'auth:session-expired',
      expect.any(Function),
    );
    removeSpy.mockRestore();
  });

  it('only opens once even if the event fires multiple times', () => {
    render(<SessionExpiredModal />);

    act(() => {
      window.dispatchEvent(new Event('auth:session-expired'));
      window.dispatchEvent(new Event('auth:session-expired'));
      window.dispatchEvent(new Event('auth:session-expired'));
    });

    expect(screen.getAllByRole('dialog')).toHaveLength(1);
  });
});
