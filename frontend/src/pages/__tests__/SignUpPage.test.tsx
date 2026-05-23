import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '../../test/testUtils';
import userEvent from '@testing-library/user-event';
import SignUpPage from '../SignUpPage';
import { supabase } from '../../test/__mocks__/supabase';

const mockNavigate = vi.fn();
vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router');
  return { ...actual, useNavigate: () => mockNavigate };
});
describe('SignUpPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabase.auth.signUp.mockResolvedValue({ data: { user: { id: '1' } }, error: null });
  });

  it('renders email, password, and confirm password inputs', async () => {
    render(<SignUpPage />);
    await waitFor(() => expect(screen.getByLabelText(/^email/i)).toBeInTheDocument());
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it('shows error when passwords do not match', async () => {
    const user = userEvent.setup();
    render(<SignUpPage />);
    await waitFor(() => expect(screen.getByLabelText(/^email/i)).toBeInTheDocument());

    await user.type(screen.getByLabelText(/^email/i), 'a@b.com');
    await user.type(screen.getByLabelText(/^password/i), 'password1');
    await user.type(screen.getByLabelText(/confirm password/i), 'password2');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
    });
    expect(supabase.auth.signUp).not.toHaveBeenCalled();
  });

  it('calls signUp on valid submission', async () => {
    const user = userEvent.setup();
    render(<SignUpPage />);
    await waitFor(() => expect(screen.getByLabelText(/^email/i)).toBeInTheDocument());

    await user.type(screen.getByLabelText(/^email/i), 'new@test.com');
    await user.type(screen.getByLabelText(/^password/i), 'goodpass');
    await user.type(screen.getByLabelText(/confirm password/i), 'goodpass');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(supabase.auth.signUp).toHaveBeenCalledWith({
        email: 'new@test.com',
        password: 'goodpass',
      });
    });
  });

  it('shows error on signup failure', async () => {
    supabase.auth.signUp.mockResolvedValue({
      data: { user: null },
      error: { message: 'Email already registered' },
    });
    const user = userEvent.setup();
    render(<SignUpPage />);
    await waitFor(() => expect(screen.getByLabelText(/^email/i)).toBeInTheDocument());

    await user.type(screen.getByLabelText(/^email/i), 'dup@test.com');
    await user.type(screen.getByLabelText(/^password/i), 'goodpass');
    await user.type(screen.getByLabelText(/confirm password/i), 'goodpass');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText('Email already registered')).toBeInTheDocument();
    });
  });
});
