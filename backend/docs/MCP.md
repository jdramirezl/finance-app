# Finance MCP server (`/mcp`)

The backend exposes the finance app as [MCP](https://modelcontextprotocol.io) tools at `POST /mcp`, so AI clients (the Telegram assistant hub, Claude Code, Claude Desktop, MCP Inspector) can read and record movements through the same use cases and validation as the REST API.

- **Transport:** Streamable HTTP, stateless, JSON responses (no sessions, no SSE). `GET`/`DELETE` return `405`.
- **Auth (v1):** one static bearer token. Every call acts as a single owner user. ChatGPT cannot use static tokens; OAuth is planned for v2 (only `verifyToken` in `src/modules/mcp/auth.ts` changes).
- **Code:** `src/modules/mcp/` — `routes.ts` (endpoint), `auth.ts`, `server.ts` (per-request server), `tools.ts` (helpers, error contract, audit log), `readTools.ts`, `writeTools.ts`.

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

Read tools carry `readOnlyHint: true`; `finance_delete_movement` carries `destructiveHint: true`. There are deliberately no bulk, cascade, reorder or archive tools.

**Errors.** Tool failures return `isError: true` and the same JSON in both `content[0].text` and `structuredContent`:

```json
{ "error": { "code": "VALIDATION_ERROR", "message": "amount: Too small: expected number to be >0", "retryable": false } }
```

Codes: `VALIDATION_ERROR`, `NOT_FOUND`, `CONFLICT`, `FORBIDDEN`, `UNAUTHORIZED`, `BAD_REQUEST`, `DATABASE_ERROR` (retryable), `INTERNAL_ERROR` (retryable, details hidden). HTTP-level auth failures use the same shape with `401` and a `WWW-Authenticate: Bearer resource_metadata="…"` header.

**Audit log.** Every write logs one JSON line (`scope: "mcp"`, `event: "write"`) with tool, user id, entity ids, outcome and duration — never the payload or the token. Find them in Vercel's function logs.

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

**Assistant hub** (`mcp-servers.json`):

```json
{
  "finance": {
    "transport": "http",
    "url": "<URL>",
    "headers": { "Authorization": "Bearer ${FINANCE_MCP_TOKEN}" }
  }
}
```

## Vercel notes

- `vercel.json` sets `maxDuration: 30` for the function.
- Preview deployments are behind Vercel Authentication, so MCP clients cannot reach them directly. Test previews with a [protection bypass](https://vercel.com/docs/deployment-protection/methods-to-bypass-deployment-protection) header, or test locally and on production.
