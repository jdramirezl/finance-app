import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '../../../test/testUtils';
import userEvent from '@testing-library/user-event';
import ChatGptConnectionSection from '../ChatGptConnectionSection';

const mocks = vi.hoisted(() => ({ listGrants: vi.fn(), revokeAll: vi.fn() }));

vi.mock('../../../services/mcpConnectionService', () => ({
  mcpConnectionService: { listGrants: mocks.listGrants, revokeAll: mocks.revokeAll },
}));

const grant = { id: 'g1', clientId: 'https://chatgpt.com/oauth/client.json', scope: 'finance:read finance:write', createdAt: '2026-11-25T17:00:00Z', lastUsedAt: null };

describe('ChatGptConnectionSection', () => {
  it('shows "not connected" and disables the button when there is no grant', async () => {
    mocks.listGrants.mockResolvedValue([]);
    render(<ChatGptConnectionSection />);
    expect(await screen.findByText('ChatGPT no está conectado.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Revocar acceso de ChatGPT' })).toBeDisabled();
  });

  it('revokes all ChatGPT access after confirming', async () => {
    mocks.listGrants.mockResolvedValueOnce([grant]).mockResolvedValueOnce([]);
    mocks.revokeAll.mockResolvedValue({ revoked: 1 });
    render(<ChatGptConnectionSection />);
    expect(await screen.findByText(/ChatGPT está conectado/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Revocar acceso de ChatGPT' }));
    expect(mocks.revokeAll).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Sí, revocar' }));

    expect(mocks.revokeAll).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByText('ChatGPT no está conectado.')).toBeInTheDocument());
  });

  it('Cancelar backs out without revoking', async () => {
    mocks.listGrants.mockResolvedValue([grant]);
    render(<ChatGptConnectionSection />);
    await userEvent.click(await screen.findByRole('button', { name: 'Revocar acceso de ChatGPT' }));
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(mocks.revokeAll).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Revocar acceso de ChatGPT' })).toBeInTheDocument();
  });
});
