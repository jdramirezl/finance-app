# Finance MCP server (`/mcp`)

The backend exposes the finance app as [MCP](https://modelcontextprotocol.io) tools at `POST /mcp`, so AI clients (ChatGPT, Claude Code, Claude Desktop, MCP Inspector) can read and record movements through the same use cases and validation as the REST API.

- **Transport:** Streamable HTTP, stateless, JSON responses (no sessions, no SSE). `GET`/`DELETE` return `405`.
- **Auth:** two credentials, both acting as the single owner user (`MCP_OWNER_USER_ID`):
  - a static bearer token (`MCP_TOKEN`) for Claude Desktop, Claude Code and scripts;
  - OAuth 2.1 access tokens from the backend's own authorization server, for ChatGPT. See [OAuth (ChatGPT)](#oauth-chatgpt).
- **Code:** `src/modules/mcp/` — `routes.ts` (endpoint), `auth.ts`, `server.ts` (per-request server), `tools.ts` (helpers, error contract, audit log), `readTools.ts`, `writeTools.ts`, `oauth/` (authorization server).

## Configuration

| Variable | Description |
|---|---|
| `MCP_TOKEN` | Bearer token clients must send. Generate with `openssl rand -hex 32`. |
| `MCP_OWNER_USER_ID` | Supabase auth user id (UUID) that every MCP call acts as. |

If either is missing, `/mcp` fails closed with `500 MCP_NOT_CONFIGURED`.

Current setup in the `finance-app-backend` Vercel project: **Production** acts as the main account, **Preview** acts as the test account, each with its own token (a production token is rejected by previews and vice versa). Local copies live in `~/.config/finance-mcp/` (mode 600): `prod.token`, `preview.token`, and matching `*-headers.txt` files for `mcp-remote --header-file`. Set both in `backend/.env` locally and in the backend Vercel project (Preview and Production) for deploys. Treat `MCP_TOKEN` like a password: anyone holding it can read and write your finance data.

To rotate the token, set a new value in Vercel, redeploy, and update each client.

## Tools

| Tool | Kind | Notes |
|---|---|---|
| `finance_list_accounts` | read | Ids, names, currency, type, balance. Live stock prices only with `includeInvestmentPrices`. |
| `finance_list_pockets` | read | Optional `accountId`. |
| `finance_list_movements` | read | Filters: `year`+`month`, `accountId`, `pocketId`, `pendingOnly`, `category`, `tags`; `page`, `limit` (default 50, max 200). |
| `finance_spending_summary` | read | Today / this week / last week / this month / last month. |
| `finance_list_fixed_expenses` | read | Fixed-expense sub-pockets and their groups. |
| `finance_list_reminders` | read | Optional `unpaidOnly`. |
| `finance_convert_currency` | read | USD, MXN, COP, EUR, GBP. |
| `finance_create_movement` | write | Same body as `POST /api/movements`. |
| `finance_create_transfer` | write | Same body as `POST /api/movements/transfer`. |
| `finance_update_movement` | write | `id` + fields from `PUT /api/movements/:id` (no `isPending`). |
| `finance_delete_movement` | destructive | One `id` only. Clients should confirm first. |
| `finance_apply_pending_movement` | write | Pending → applied. |
| `finance_mark_reminder_paid` | write | `reminderId`, optional `movementId`. |

Read tools carry `readOnlyHint: true`; `finance_delete_movement` carries `destructiveHint: true`; all carry `openWorldHint: false`. ChatGPT treats every tool without `readOnlyHint` as a write and asks for confirmation before running it. Each tool also advertises `_meta.securitySchemes` (`oauth2` with `finance:read` or `finance:write`); a write from an OAuth connection without `finance:write` returns `FORBIDDEN` plus `_meta["mcp/www_authenticate"]` (`error="insufficient_scope"`). There are deliberately no bulk, cascade, reorder or archive tools.

**Errors.** Tool failures return `isError: true` and the same JSON in both `content[0].text` and `structuredContent`:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "amount: Too small: expected number to be >0", "retryable": false } }
```

Codes: `VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`, `FORBIDDEN`, `UNAUTHORIZED`, `BAD_REQUEST`, `DATABASE_ERROR` (retryable), `INTERNAL_ERROR` (retryable, details hidden). HTTP-level auth failures use the same shape with `401` and a `WWW-Authenticate: Bearer resource_metadata="…/.well-known/oauth-protected-resource/mcp", scope="finance:read finance:write"` header (plus `error="invalid_token"` when a token was sent).

**Audit log.** Every write logs one JSON line (`scope: "mcp"`, `event: "write"`) with tool, user id, entity ids, outcome and duration — never the payload or the token. Find them in Vercel's function logs.

## OAuth (ChatGPT)

ChatGPT custom MCP connectors cannot send a static token; they run OAuth 2.1 (authorization code + PKCE). The backend is its own small authorization server for a **single user**: only `MCP_OWNER_USER_ID` can ever approve a request or use a token. Login reuses the normal finance-app Supabase session.

### Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /.well-known/oauth-protected-resource` and `…/mcp` | RFC 9728 metadata: `resource` = `<base>/mcp`, `authorization_servers` = `[<base>]`, scopes. |
| `GET /.well-known/oauth-authorization-server` | RFC 8414 metadata: S256 only, `token_endpoint_auth_methods_supported: ["none"]`, `client_id_metadata_document_supported: true`, `authorization_response_iss_parameter_supported: true`. No `registration_endpoint` (no DCR). |
| `GET /oauth/authorize` | Validates the client and PKCE, stores a pending request (10 min), redirects to the frontend consent page. |
| `GET /oauth/requests/:handle` | Consent details. Requires the finance-app Supabase session. |
| `POST /oauth/requests/:handle/decision` | `{ approve }`. Owner only; returns `redirectTo` (code + `state` + `iss`). |
| `POST /oauth/token` | `authorization_code` and `refresh_token` grants. |
| `POST /oauth/revoke` | RFC 7009. Revokes the whole connection. |
| `GET /api/mcp/grants`, `POST /api/mcp/grants/revoke-all` | Settings → ChatGPT status and the **Revocar acceso de ChatGPT** button. |

`<base>` is the host the client called (`MCP_PUBLIC_URL` overrides it). Tokens are bound to `<base>/mcp`, so a token from one deployment URL does not work on another.

### Rules

- **Clients:** only ChatGPT. `client_id` must be one of ChatGPT's Client ID Metadata Document URLs (`https://chatgpt.com/oauth/client.json` or `https://chatgpt.com/oauth/{callback_id}/client.json`); the server fetches only that URL, and redirect URIs must be on `https://chatgpt.com/`. Anything else gets an error page, never a redirect. Adding another client (e.g. claude.ai) is a code change in `oauth/config.ts`.
- **Owner only:** checked when the user approves, when the code is exchanged, and on every `/mcp` call. Another finance-app user who reaches the consent page gets 403 and the request is burned. Changing `MCP_OWNER_USER_ID` invalidates every OAuth token.
- **Lifetimes:** consent request 10 min; code 2 min, single use; access token 1 h; refresh token 30 days, rotated on every use. A replayed code, or a rotated refresh token reused more than 60 s later, revokes the whole connection.
- **Scopes:** `finance:read`, `finance:write` (write implies read). `offline_access` is advertised so ChatGPT keeps a refresh token.
- **Storage:** `migrations/033_mcp_oauth.sql` (`mcp_oauth_authorizations`, `mcp_oauth_grants`, `mcp_oauth_tokens`). Only SHA-256 hashes of tokens, codes and request handles are stored. RLS is on with no policies; only the service key can read them.
- **Logout does not revoke.** Use Settings → ChatGPT → **Revocar acceso de ChatGPT**, or remove the plugin in ChatGPT.
- **Audit:** JSON log lines with `scope: "mcp-oauth"` (`authorize_started`, `consent_approved`, `consent_denied`, `consent_rejected_not_owner`, `grant_created`, `refresh_reuse_revoked`, `code_replay_revoked`, `grant_revoked`, `grants_revoked_all`). Never a token or code.

| Variable | Default | Description |
|---|---|---|
| `MCP_PUBLIC_URL` | request host | Optional fixed issuer/base URL. |
| `MCP_CONSENT_URL` | `https://finance-app-five-navy.vercel.app/oauth/consent` in production, `http://localhost:5173/oauth/consent` otherwise | Frontend consent page. |

Previews are behind Vercel Authentication, so ChatGPT can only connect to production. Preview deployments share the production database but have a different owner, so even a preview consent cannot produce a token that works on production.

### Conectar ChatGPT (paso a paso)

Antes: la migración `033_mcp_oauth.sql` debe estar aplicada en Supabase y el PR desplegado en producción.

**Agregar el conector (solo desde la web, en el computador):**

1. Abre [chatgpt.com/plugins](https://chatgpt.com/plugins). Desde la app del celular no se puede agregar.
2. Pulsa el botón **+** y elige **Add custom MCP server**.
3. **Name:** `Finanzas`. **Description** (opcional): `Mis cuentas y movimientos de finance-app`.
4. En **Connection** → **Server URL** pega exactamente:
   ```
   https://finance-app-backend-ten.vercel.app/mcp
   ```
5. En **Authentication** elige **OAuth**. Deja **Client ID** y **Client secret** vacíos (ChatGPT se identifica solo). No elijas **No authentication** ni **OAuth or no authentication**: son tus datos financieros.
6. Marca **I understand and want to continue** y pulsa **Create as a plugin**.
7. ChatGPT abre una página de finance-app (`finance-app-five-navy.vercel.app/oauth/consent`):
   - Si no tienes sesión, verás la pantalla normal **Finance App → Sign in**. Entra con tu correo y contraseña de siempre.
   - Después verás un escudo azul y el título **«ChatGPT quiere acceder a tus finanzas»**, tu correo, la lista de permisos («Ver tus cuentas, bolsillos, movimientos…» y «Registrar, editar y borrar movimientos…»), un aviso amarillo **«Permite solo si acabas de pulsar «Conectar» en ChatGPT»** con la hora, y dos botones: **Denegar** y **Permitir**.
   - Pulsa **Permitir**. Vuelves solo a ChatGPT.
   - Si dice **«Esta cuenta no puede conectar ChatGPT»**, entraste con otra cuenta: cierra sesión en finance-app, entra con la tuya y vuelve a conectar desde ChatGPT.
   - Si dice **«La solicitud no existe o ya expiró»**, pasaron más de 10 minutos: vuelve a ChatGPT y conecta de nuevo.
8. ChatGPT muestra las herramientas encontradas. Deben ser 13, todas `finance_*`. Si te lo pide, pulsa **Install**.

**Prueba de lectura:**

1. Abre una conversación nueva, escribe `@` y elige **Finanzas**.
2. Escribe: `Usa solo la herramienta finance_list_accounts de Finanzas y lista mis cuentas con su saldo.`
3. Debe responder con tus cuentas reales, sin pedir confirmación (es solo lectura). Puedes expandir el detalle de la llamada para ver el JSON.

**Prueba de escritura (crear y borrar un movimiento de prueba):**

1. En la misma conversación: `@Finanzas usa finance_list_pockets y dime los bolsillos de mi cuenta principal con sus ids.`
2. Luego: `@Finanzas usa finance_create_movement para crear un movimiento PENDIENTE (isPending: true) tipo EgresoNormal de 1000 en esa cuenta y bolsillo, con fecha de hoy y nota "[mcp-test]".` Al ser pendiente no cambia tus saldos.
3. ChatGPT mostrará una tarjeta de confirmación con los datos. Revisa monto, nota `[mcp-test]` e `isPending: true`, y confirma. No marques «recordar para esta conversación».
4. En finance-app → Movimientos, revisa que aparece el pendiente `[mcp-test]`.
5. Bórralo: `@Finanzas usa finance_delete_movement para borrar el movimiento [mcp-test] que acabas de crear.` Confirma. Revisa en la app que desapareció. Si ChatGPT no pudo borrarlo, bórralo desde la app.

**¿Plus permite escrituras?** La ayuda de OpenAI dice que las acciones de escritura de servidores MCP propios son para Business/Enterprise/Edu y que Pro solo tiene lectura; para Plus no lo dice. La prueba de escritura lo decide:

- **Funciona** si aparece la tarjeta de confirmación y el movimiento existe en la app.
- **Está bloqueado** si pasa algo de esto: en los detalles del plugin las herramientas de escritura salen desactivadas o no aparecen; ChatGPT contesta que no puede hacer cambios o que la herramienta no está disponible; o la confirmación falla con un error. Copia el texto exacto (o haz captura) y comprueba en la app que no se creó nada. En los logs de Vercel (`finance-app-backend` → Logs, buscar `"event":"write"`): si no hay línea, ChatGPT nunca llamó a la herramienta (bloqueo de ChatGPT); si hay una con `"outcome":"error"`, el problema es del servidor y el `errorCode` dice cuál.
- **Si está bloqueado:** las lecturas siguen sirviendo en ChatGPT. Para escribir puedes usar Claude Desktop o Claude Code con el token estático (ver abajo), que ya funciona; o conectar claude.ai, que usa el mismo OAuth pero necesita un cambio pequeño en el backend para permitir su `client_id`.

**En el celular:** una vez agregado desde la web, el plugin aparece en la app de ChatGPT con la misma cuenta. Las lecturas deberían funcionar; las escrituras desde el celular podrían no estar soportadas.

**Desconectar:** finance-app → **Settings → ChatGPT → Revocar acceso de ChatGPT → Sí, revocar**. Elimina también el plugin en chatgpt.com/plugins. Cerrar sesión en finance-app **no** desconecta ChatGPT.

## Running locally

```bash
cd backend
# in .env: MCP_TOKEN=<openssl rand -hex 32>, MCP_OWNER_USER_ID=<your user id>
npm run dev            # http://localhost:3001/mcp
```

Quick check:

```bash
curl -s http://localhost:3001/mcp \
  -H "Authorization: Bearer $MCP_TOKEN" \
  -H 'Content-Type: application/json' -H 'Accept: application/json, text/event-stream' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
```

### Smoke test against real data

```bash
MCP_URL=http://localhost:3001/mcp MCP_TOKEN=... npx ts-node --transpile-only scripts/mcp-smoke.ts
# against a protected preview, add VERCEL_PROTECTION_BYPASS=<project bypass secret>
# also create → update → delete one pending "[mcp-test]" movement (always cleaned up):
MCP_SMOKE_WRITE=1 MCP_URL=... MCP_TOKEN=... npx ts-node --transpile-only scripts/mcp-smoke.ts
```

## Connecting clients

Replace `<URL>` with `http://localhost:3001/mcp` or the deployed backend URL plus `/mcp`.

**MCP Inspector**

```bash
npx @modelcontextprotocol/inspector
```

Choose transport **Streamable HTTP**, URL `<URL>`, and add the header `Authorization: Bearer <token>`.

**Claude Code**

```bash
claude mcp add --transport http finance <URL> --header "Authorization: Bearer $MCP_TOKEN"
```

**Claude Desktop** (via [`mcp-remote`](https://github.com/geelen/mcp-remote)). Put the header in a file readable only by you (`chmod 600`), so the token is not visible in the process list:

```text
# ~/.config/finance-mcp/headers.txt
Authorization: Bearer <token>
```

```json
{
  "mcpServers": {
    "finance": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "<URL>", "--header-file", "/Users/<you>/.config/finance-mcp/headers.txt"]
    }
  }
}
```

**ChatGPT:** OAuth, see [Conectar ChatGPT](#conectar-chatgpt-paso-a-paso).

## Vercel notes

- `vercel.json` sets `maxDuration: 30` for the function.
- Preview deployments are behind Vercel Authentication, so MCP clients (including ChatGPT) cannot reach them directly. Test previews with a [protection bypass](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection) header, or test locally and on production.

## Sources

- ⚠️ External link — [OpenAI: Authentication for plugin MCP servers](https://developers.openai.com/plugins/build/auth) — accessed 2026-11-20
- ⚠️ External link — [OpenAI: Add custom MCP server](https://developers.openai.com/api/docs/guides/custom-mcp-server) — accessed 2026-11-20
- ⚠️ External link — [OpenAI Help: Connecting custom MCP servers in ChatGPT](https://help.openai.com/en/articles/12584461-connecting-custom-mcp-servers-in-chatgpt) — accessed 2026-11-20
- ⚠️ External link — [MCP specification: Authorization (2026-07-28)](https://modelcontextprotocol.io/specification/latest/basic/authorization) — accessed 2026-11-20
- ⚠️ External link — [ChatGPT Client ID Metadata Document](https://chatgpt.com/oauth/client.json) — accessed 2026-11-20
