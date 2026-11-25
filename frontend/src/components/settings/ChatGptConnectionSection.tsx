import { useCallback, useEffect, useState } from 'react';
import { Bot } from 'lucide-react';
import Button from '../ui/Button';
import Card from '../ui/Card';
import { useToast } from '../../hooks/useToast';
import { mcpConnectionService, type McpGrant } from '../../services/mcpConnectionService';

/**
 * Shows active ChatGPT connections and the "Revocar acceso de ChatGPT"
 * button. Logging out does NOT disconnect ChatGPT; this button does.
 */
const ChatGptConnectionSection = () => {
  const toastError = useToast((s) => s.error);
  const toastSuccess = useToast((s) => s.success);
  const [grants, setGrants] = useState<McpGrant[] | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const load = useCallback(async () => {
    try {
      setGrants(await mcpConnectionService.listGrants());
    } catch {
      setGrants([]);
      toastError('No se pudo cargar el estado de la conexión con ChatGPT');
    }
  }, [toastError]);

  useEffect(() => { void load(); }, [load]);

  const revoke = async () => {
    setRevoking(true);
    try {
      const { revoked } = await mcpConnectionService.revokeAll();
      toastSuccess(revoked > 0 ? 'Acceso de ChatGPT revocado' : 'ChatGPT no tenía acceso');
      setConfirming(false);
      await load();
    } catch (err) {
      toastError(err instanceof Error ? err.message : 'No se pudo revocar el acceso');
    } finally {
      setRevoking(false);
    }
  };

  const active = grants?.length ?? 0;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-2xl font-semibold text-gray-100 mb-1">ChatGPT</h3>
        <p className="text-gray-400 text-sm">Conexión de ChatGPT con tus finanzas (conector MCP).</p>
      </div>

      <Card>
        <div className="flex items-start justify-between gap-4">
          <div className="flex gap-3">
            <Bot className="w-6 h-6 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="font-semibold text-gray-100">Estado</h4>
              <p className="text-sm text-gray-400" data-testid="chatgpt-status">
                {grants === null
                  ? 'Cargando…'
                  : active === 0
                    ? 'ChatGPT no está conectado.'
                    : `ChatGPT está conectado (desde ${new Date(grants[0].createdAt).toLocaleDateString()}).`}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Cerrar sesión no desconecta ChatGPT. Usa este botón si perdiste el control de tu cuenta de ChatGPT o ya no quieres usarlo.
              </p>
            </div>
          </div>

          {!confirming ? (
            <Button variant="danger" onClick={() => setConfirming(true)} disabled={active === 0}>
              Revocar acceso de ChatGPT
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => setConfirming(false)} disabled={revoking}>Cancelar</Button>
              <Button variant="danger" onClick={revoke} loading={revoking}>Sí, revocar</Button>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ChatGptConnectionSection;
