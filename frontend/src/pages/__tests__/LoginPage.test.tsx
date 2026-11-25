import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '../../test/testUtils';
import userEvent from '@testing-library/user-event';
import LoginPage from '../LoginPage';
import { supabase } from '../../test/__mocks__/supabase';

const mockNavigate = vi.fn();
const mockLocation = vi.hoisted(() => ({ current: { state: null as unknown } }));
vi.mock('react-router', async () => {
  const actual = await vi.importActual<typeof import('react-router')>('react-router');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => ({ ...actual.useLocation(), state: mockLocation.current.state }),
  };
});
describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockLocation.current.state = null;
    supabase.auth.signInWithPassword.mockResolvedValue({ data: { session: {} }, error: null });
  });

  it('renders email and password inputs', async () => {
    render(<LoginPage />);
    await waitFor(() => expect(screen.getByLabelText(/email/i)).toBeInTheDocument());
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('calls signIn with form values on submit', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);
    await waitFor(() => expect(screen.getByLabelText(/email/i)).toBeInTheDocument());

    await user.type(screen.getByLabelText(/email/i), 'user@test.com');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
        email: 'user@test.com',
        password: 'secret123',
      });
    });
  });

  it('shows error message on failed login', async () => {
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: null,
      error: { message: 'Invalid credentials' },
    });
    const user = userEvent.setup();
    render(<LoginPage />);
    await waitFor(() => expect(screen.getByLabelText(/email/i)).toBeInTheDocument());

    await user.type(screen.getByLabelText(/email/i), 'bad@test.com');
    await user.type(screen.getByLabelText(/password/i), 'wrong');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });

  it('disables button while loading', async () => {
    // Make signIn hang to keep loading state
    supabase.auth.signInWithPassword.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();
    render(<LoginPage />);
    await waitFor(() => expect(screen.getByLabelText(/email/i)).toBeInTheDocument());

    await user.type(screen.getByLabelText(/email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/password/i), 'pass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled();
    });
  });

  it('returns to the page that required login (ChatGPT consent)', async () => {
    mockLocation.current.state = { from: '/oauth/consent?request=abc' };
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(await screen.findByLabelText(/email/i), 'user@test.com');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/oauth/consent?request=abc'));
  });

  it('ignores an off-site return path', async () => {
    mockLocation.current.state = { from: '//evil.example' };
    const user = userEvent.setup();
    render(<LoginPage />);
    await user.type(await screen.findByLabelText(/email/i), 'user@test.com');
    await user.type(screen.getByLabelText(/password/i), 'secret123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));
    await waitFor(() => expect(mockNavigate).toHaveBeenCalledWith('/'));
  });
});
