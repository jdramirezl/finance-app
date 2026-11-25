import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '../../test/testUtils';
import userEvent from '@testing-library/user-event';
import { AppError } from '../../errors/AppError';
import OAuthConsentPage from '../OAuthConsentPage';

const mocks = vi.hoisted(() => ({ getConsent: vi.fn(), decide: vi.fn(), searchParams: new URLSearchParams() }));

vi.mock('../../services/mcpConnectionService', async () => {
  const actual = await vi.importActual<typeof import('../../services/mcpConnectionService')>('../../services/mcpConnectionService');
  return { ...actual, mcpConnectionService: { getConsent: mocks.getConsent, decide: mocks.decide } };
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return { ...actual, useSearchParams: () => [mocks.searchParams] };
});

const details = {
  clientName: 'ChatGPT',
  redirectHost: 'chatgpt.com',
  scopes: ['finance:read', 'finance:write'],
  createdAt: '2026-11-25T17:00:00.000Z',
  expiresAt: '2026-11-25T17:10:00.000Z',
};

describe('OAuthConsentPage', () => {
  const assign = vi.fn();

  beforeEach(() => {
    mocks.searchParams = new URLSearchParams('request=handle-123');
    vi.stubGlobal('location', { ...window.location, assign });
  });

  it('shows what ChatGPT will be able to do', async () => {
    mocks.getConsent.mockResolvedValue(details);
    render(<OAuthConsentPage />);
    expect(await screen.findByText('ChatGPT quiere acceder a tus finanzas')).toBeInTheDocument();
    expect(mocks.getConsent).toHaveBeenCalledWith('handle-123');
    expect(screen.getByText(/Ver tus cuentas/)).toBeInTheDocument();
    expect(screen.getByText(/Registrar, editar y borrar movimientos/)).toBeInTheDocument();
    expect(screen.getByText(/acabas de pulsar «Conectar» en ChatGPT/)).toBeInTheDocument();
  });

  it('Permitir approves and returns to ChatGPT', async () => {
    mocks.getConsent.mockResolvedValue(details);
    mocks.decide.mockResolvedValue({ redirectTo: 'https://chatgpt.com/connector_platform_oauth_redirect?code=c&state=s' });
    render(<OAuthConsentPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Permitir' }));
    expect(mocks.decide).toHaveBeenCalledWith('handle-123', true);
    await waitFor(() => expect(assign).toHaveBeenCalledWith('https://chatgpt.com/connector_platform_oauth_redirect?code=c&state=s'));
  });

  it('Denegar denies and returns to ChatGPT', async () => {
    mocks.getConsent.mockResolvedValue(details);
    mocks.decide.mockResolvedValue({ redirectTo: 'https://chatgpt.com/connector_platform_oauth_redirect?error=access_denied' });
    render(<OAuthConsentPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Denegar' }));
    expect(mocks.decide).toHaveBeenCalledWith('handle-123', false);
    await waitFor(() => expect(assign).toHaveBeenCalled());
  });

  it('never navigates outside chatgpt.com', async () => {
    mocks.getConsent.mockResolvedValue(details);
    mocks.decide.mockResolvedValue({ redirectTo: 'https://evil.example/?code=c' });
    render(<OAuthConsentPage />);
    await userEvent.click(await screen.findByRole('button', { name: 'Permitir' }));
    expect(await screen.findByRole('alert')).toBeInTheDocument();
    expect(assign).not.toHaveBeenCalled();
  });

  it.each([
    [403, /Esta cuenta no puede conectar ChatGPT/],
    [404, /ya expiró/],
  ])('explains a %i without offering Permitir', async (status, message) => {
    mocks.getConsent.mockRejectedValue(new AppError(status, 'x'));
    render(<OAuthConsentPage />);
    expect(await screen.findByText(message)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Permitir' })).not.toBeInTheDocument();
  });

  it('requires a request handle', async () => {
    mocks.searchParams = new URLSearchParams('');
    render(<OAuthConsentPage />);
    expect(await screen.findByText(/Falta la solicitud/)).toBeInTheDocument();
    expect(mocks.getConsent).not.toHaveBeenCalled();
  });
});
