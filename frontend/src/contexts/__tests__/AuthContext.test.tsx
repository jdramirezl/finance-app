import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider, useAuth } from '../AuthContext';
import { supabase } from '../../test/__mocks__/supabase';

// Test component that exposes auth context values
const AuthConsumer = () => {
  const { user, loading, signIn, signOut, signUp } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="user">{user ? user.email : 'null'}</span>
      <button onClick={() => signIn('a@b.com', 'pass')}>signIn</button>
      <button onClick={() => signOut()}>signOut</button>
      <button onClick={() => signUp('a@b.com', 'pass')}>signUp</button>
    </div>
  );
};

const renderWithProviders = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AuthProvider>
        <BrowserRouter>
          <AuthConsumer />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>,
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: session exists
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'tok', user: { id: '1', email: 'test@example.com' } } },
    });
    supabase.auth.onAuthStateChange.mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    });
  });

  it('starts with loading true and user null', () => {
    // Make getSession hang so loading stays true
    supabase.auth.getSession.mockReturnValue(new Promise(() => {}));
    renderWithProviders();
    expect(screen.getByTestId('loading').textContent).toBe('true');
    expect(screen.getByTestId('user').textContent).toBe('null');
  });

  it('sets user after session loads', async () => {
    renderWithProviders();
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(screen.getByTestId('user').textContent).toBe('test@example.com');
  });

  it('sets user to null when no session exists', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    renderWithProviders();
    await waitFor(() => {
      expect(screen.getByTestId('loading').textContent).toBe('false');
    });
    expect(screen.getByTestId('user').textContent).toBe('null');
  });

  it('signIn calls supabase.auth.signInWithPassword', async () => {
    renderWithProviders();
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    await act(async () => {
      screen.getByText('signIn').click();
    });
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'pass',
    });
  });

  it('signOut calls supabase.auth.signOut', async () => {
    renderWithProviders();
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    await act(async () => {
      screen.getByText('signOut').click();
    });
    expect(supabase.auth.signOut).toHaveBeenCalled();
  });

  it('signUp calls supabase.auth.signUp', async () => {
    renderWithProviders();
    await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
    await act(async () => {
      screen.getByText('signUp').click();
    });
    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'pass',
    });
  });
});
