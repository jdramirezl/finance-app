/**
 * Opt-in end-to-end smoke test for the /mcp endpoint against REAL data.
 *
 *   MCP_URL=http://localhost:3001/mcp MCP_TOKEN=... npx ts-node --transpile-only scripts/mcp-smoke.ts
 *
 * Read-only by default. Set MCP_SMOKE_WRITE=1 to also create → update → delete
 * one movement labeled "[mcp-test]" (always deleted, even if a step fails).
 * Optional: MCP_SMOKE_ACCOUNT_ID / MCP_SMOKE_POCKET_ID (default: first normal pocket).
 */
/* eslint-disable no-console */

const url = process.env.MCP_URL;
const token = process.env.MCP_TOKEN;
if (!url || !token) {
  console.error('Set MCP_URL and MCP_TOKEN');
  process.exit(2);
}

let rpcId = 0;
async function rpc(method: string, params: Record<string, unknown> = {}) {
  const res = await fetch(url as string, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      'MCP-Protocol-Version': '2025-06-18',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: ++rpcId, method, params }),
  });
  const body = await res.json();
  if (!res.ok || body.error) throw new Error(`${method} → HTTP ${res.status} ${JSON.stringify(body.error ?? body)}`);
  return body.result;
}

async function tool(name: string, args: Record<string, unknown> = {}) {
  const result = await rpc('tools/call', { name, arguments: args });
  if (result.isError) throw new Error(`${name} → ${result.content?.[0]?.text}`);
  return result.structuredContent;
}

const ok = (msg: string) => console.log(`✓ ${msg}`);

async function main() {
  const init = await rpc('initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'mcp-smoke', version: '1.0.0' },
  });
  ok(`initialize → ${init.serverInfo.name} ${init.serverInfo.version}`);

  const { tools } = await rpc('tools/list');
  ok(`tools/list → ${tools.length} tools`);

  const accounts = (await tool('finance_list_accounts')).result as Array<{ id: string; name: string; currency: string }>;
  ok(`finance_list_accounts → ${accounts.length} accounts`);
  const pockets = (await tool('finance_list_pockets')).result as Array<{ id: string; accountId: string; type: string }>;
  ok(`finance_list_pockets → ${pockets.length} pockets`);
  const now = new Date();
  const month = await tool('finance_list_movements', { year: now.getFullYear(), month: now.getMonth() + 1, limit: 5 });
  ok(`finance_list_movements (this month) → ${(month.data as unknown[]).length} shown of ${month.total}`);
  await tool('finance_spending_summary');
  ok('finance_spending_summary');
  await tool('finance_list_fixed_expenses');
  ok('finance_list_fixed_expenses');
  await tool('finance_list_reminders', { unpaidOnly: true });
  ok('finance_list_reminders');

  const bad = await rpc('tools/call', { name: 'finance_create_movement', arguments: { amount: -1 } });
  if (!bad.isError || bad.structuredContent?.error?.code !== 'VALIDATION_ERROR') throw new Error('expected VALIDATION_ERROR');
  ok('invalid input → VALIDATION_ERROR (nothing written)');

  if (process.env.MCP_SMOKE_WRITE !== '1') {
    console.log('\nRead-only run complete. Set MCP_SMOKE_WRITE=1 to exercise writes.');
    return;
  }

  const pocket = process.env.MCP_SMOKE_POCKET_ID
    ? pockets.find((p) => p.id === process.env.MCP_SMOKE_POCKET_ID)
    : pockets.find((p) => p.type === 'normal' && (!process.env.MCP_SMOKE_ACCOUNT_ID || p.accountId === process.env.MCP_SMOKE_ACCOUNT_ID));
  if (!pocket) throw new Error('No suitable normal pocket found');

  let createdId: string | undefined;
  try {
    const created = await tool('finance_create_movement', {
      type: 'EgresoNormal',
      accountId: pocket.accountId,
      pocketId: pocket.id,
      amount: 1,
      displayedDate: now.toISOString().slice(0, 10),
      notes: '[mcp-test] smoke',
      isPending: true,
    });
    createdId = created.id as string;
    ok(`finance_create_movement → ${createdId} (pending, amount 1)`);

    const updated = await tool('finance_update_movement', { id: createdId, amount: 2, notes: '[mcp-test] smoke updated' });
    if (updated.amount !== 2) throw new Error('update did not apply');
    ok('finance_update_movement → amount 2');
  } finally {
    if (createdId) {
      await tool('finance_delete_movement', { id: createdId });
      ok(`finance_delete_movement → ${createdId} removed`);
    }
  }
  console.log('\nWrite run complete; no test data left behind.');
}

main().catch((err) => {
  console.error(`✗ ${(err as Error).message}`);
  process.exit(1);
});
