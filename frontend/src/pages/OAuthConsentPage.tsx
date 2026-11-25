import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import { useAuth } from '../contexts/AuthContext';
import { AppError } from '../errors/AppError';
import { isSafeOAuthRedirect, mcpConnectionService, type ConsentDetails } from '../services/mcpConnectionService';

const SCOPE_LABELS: Record<string, string> = {
  'finance:read': 'Ver tus cuentas, bolsillos, movimientos, recordatorios y resúmenes',
  'finance:write': 'Registrar, editar y borrar movimientos, y marcar recordatorios como pagados',
};

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; details: ConsentDetails }
  | { kind: 'error'; message: string }
  | { kind: 'redirecting' };

const errorMessage = (err: unknown): string => {
  if (err instanceof AppError && err.statusCode === 403) {
    return 'Esta cuenta no puede conectar ChatGPT. Cierra sesión e ingresa con la cuenta dueña de las finanzas.';
  }
  if (err instanceof AppError && err.statusCode === 404) {
    return 'La solicitud no existe o ya expiró (duran 10 minutos). Vuelve a ChatGPT y conecta de nuevo.';
  }
  return 'No se pudo cargar la solicitud. Vuelve a ChatGPT e inténtalo de nuevo.';
};

/**
 * OAuth consent screen for the ChatGPT connector. Reached from the backend's
 * /oauth/authorize with ?request=<handle>; requires the normal login.
 */
const OAuthConsentPage = () => {
  const [params] = useSearchParams();
  const handle = params.get('request') ?? '';
  const { user } = useAuth();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [busy, setBusy] = useState<'approve' | 'deny' | null>(null);

  useEffect(() => {
    if (!handle) {
      setState({ kind: 'error', message: 'Falta la solicitud de ChatGPT. Abre este enlace desde ChatGPT.' });
      return;
    }
    let cancelled = false;
    mcpConnectionService
      .getConsent(handle)
      .then((details) => { if (!cancelled) setState({ kind: 'ready', details }); })
      .catch((err) => { if (!cancelled) setState({ kind: 'error', message: errorMessage(err) }); });
    return () => { cancelled = true; };
  }, [handle]);

  const decide = async (approve: boolean) => {
    setBusy(approve ? 'approve' : 'deny');
    try {
      const { redirectTo } = await mcpConnectionService.decide(handle, approve);
      if (!isSafeOAuthRedirect(redirectTo)) throw new Error('unexpected redirect');
      setState({ kind: 'redirecting' });
      window.location.assign(redirectTo);
    } catch (err) {
      setState({ kind: 'error', message: errorMessage(err) });
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
      <Card className="w-full max-w-md bg-gray-800 border border-gray-700">
        {state.kind === 'loading' && <p className="text-gray-400 text-center">Cargando solicitud…</p>}

        {state.kind === 'redirecting' && <p className="text-gray-400 text-center">Volviendo a ChatGPT…</p>}

        {state.kind === 'error' && (
          <div className="text-center space-y-3" role="alert">
            <ShieldAlert className="w-10 h-10 mx-auto text-[#ffb4ab]" />
            <h1 className="text-xl font-semibold text-gray-100">No se puede conectar</h1>
            <p className="text-sm text-gray-400">{state.message}</p>
          </div>
        )}

        {state.kind === 'ready' && (
          <div className="space-y-5">
            <div className="text-center">
              <ShieldCheck className="w-10 h-10 mx-auto text-blue-400 mb-2" />
              <h1 className="text-xl font-semibold text-gray-100">
                {state.details.clientName} quiere acceder a tus finanzas
              </h1>
              <p className="text-sm text-gray-400 mt-1">Cuenta: {user?.email}</p>
            </div>

            <div>
              <p className="text-sm text-gray-300 mb-2">Si lo permites, {state.details.clientName} podrá:</p>
              <ul className="list-disc pl-5 space-y-1 text-sm text-gray-300">
                {state.details.scopes.map((s) => <li key={s}>{SCOPE_LABELS[s] ?? s}</li>)}
              </ul>
              <p className="text-xs text-gray-500 mt-2">
                ChatGPT te pedirá confirmación antes de cada cambio. Puedes revocar el acceso en Ajustes → ChatGPT.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-200">
              Permite solo si acabas de pulsar «Conectar» en ChatGPT. Solicitud creada a las{' '}
              {new Date(state.details.createdAt).toLocaleTimeString()}; se envía a {state.details.redirectHost}.
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => decide(false)} loading={busy === 'deny'} disabled={busy !== null}>
                Denegar
              </Button>
              <Button variant="primary" className="flex-1" onClick={() => decide(true)} loading={busy === 'approve'} disabled={busy !== null}>
                Permitir
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default OAuthConsentPage;
