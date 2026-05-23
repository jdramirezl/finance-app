import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import { Home, Wallet, type LucideIcon } from 'lucide-react';
import Sidebar from '../Sidebar';
import { useThemeStore } from '../../../store/useThemeStore';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>(
    'react-router-dom',
  );
  return { ...actual, useNavigate: () => mockNavigate };
});

const items = [
  { path: '/', label: 'Home', icon: Home as LucideIcon },
  { path: '/movements', label: 'Movements', icon: Wallet as LucideIcon },
];

describe('Sidebar', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    useThemeStore.setState({ theme: 'light' });
    window.history.pushState({}, '', '/');
  });

  it('renders the brand title and tagline', () => {
    render(<Sidebar items={items} />);

    expect(screen.getByText('Finance App')).toBeInTheDocument();
    expect(screen.getByText('Manage your money')).toBeInTheDocument();
  });

  it('renders one link per nav item with the correct hrefs', () => {
    render(<Sidebar items={items} />);

    items.forEach((item) => {
      const link = screen.getByRole('link', { name: new RegExp(item.label, 'i') });
      expect(link).toHaveAttribute('href', item.path);
    });
  });

  it('marks the link matching the current pathname as active', () => {
    window.history.pushState({}, '', '/movements');
    render(<Sidebar items={items} />);

    const activeLink = screen.getByRole('link', { name: /Movements/i });
    const inactiveLink = screen.getByRole('link', { name: /Home/i });

    expect(activeLink.className).toMatch(/from-blue-500/);
    expect(inactiveLink.className).not.toMatch(/from-blue-500/);
  });

  it('exposes the "switch to dark mode" toggle when theme is light', () => {
    useThemeStore.setState({ theme: 'light' });
    render(<Sidebar items={items} />);

    expect(
      screen.getByRole('button', { name: /switch to dark mode/i }),
    ).toBeInTheDocument();
  });

  it('exposes the "switch to light mode" toggle when theme is dark', () => {
    useThemeStore.setState({ theme: 'dark' });
    render(<Sidebar items={items} />);

    expect(
      screen.getByRole('button', { name: /switch to light mode/i }),
    ).toBeInTheDocument();
  });

  it('toggles the theme store when the theme button is clicked', async () => {
    const user = userEvent.setup();
    useThemeStore.setState({ theme: 'light' });
    render(<Sidebar items={items} />);

    await user.click(screen.getByRole('button', { name: /switch to dark mode/i }));

    expect(useThemeStore.getState().theme).toBe('dark');
  });

  it('signs out and navigates to /login when the sign-out button is clicked', async () => {
    const user = userEvent.setup();
    render(<Sidebar items={items} />);

    await user.click(screen.getByRole('button', { name: /sign out/i }));

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/login');
    });
  });

  it('displays the signed-in user email in the footer', async () => {
    render(<Sidebar items={items} />);

    expect(await screen.findByText('test@example.com')).toBeInTheDocument();
  });

  it('renders no links when the items array is empty', () => {
    render(<Sidebar items={[]} />);

    expect(screen.queryAllByRole('link')).toHaveLength(0);
    // Brand and chrome should still render.
    expect(screen.getByText('Finance App')).toBeInTheDocument();
  });
});
