/**
 * Test-only helpers: drive an McpServer through the real stateless HTTP
 * transport. Not part of the production build (*.test-helper.ts is excluded
 * in tsconfig).
 *
 * Servers bind explicitly to 127.0.0.1. supertest's default `listen(0)` binds
 * the dual-stack `::` address but connects to 127.0.0.1:<port>; on macOS that
 * port can already be held on 127.0.0.1 by another local process, so the
 * request intermittently reaches the wrong server (403s, parse errors, hangs).
 */
import http from 'http';
import { AddressInfo } from 'net';
import express from 'express';
import request from 'supertest';
import { McpServer } from '@modelcontextprotocol/server';
import { NodeStreamableHTTPServerTransport } from '@modelcontextprotocol/node';

export type ServerFactory = (userId: string) => McpServer;

/** Run `fn` against `app` served on an IPv4-loopback ephemeral port. */
export async function withLocalServer<T>(app: express.Express, fn: (baseUrl: string) => Promise<T>): Promise<T> {
  const server = http.createServer(app);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  try {
    return await fn(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}

function appFor(factory: ServerFactory, userId: string) {
  const app = express();
  app.use(express.json());
  app.post('/mcp', async (req, res) => {
    const server = factory(userId);
    const transport = new NodeStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    res.on('close', () => { void transport.close(); void server.close(); });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });
  return app;
}

let nextId = 1;
export async function rpc(factory: ServerFactory, userId: string, method: string, params: Record<string, unknown> = {}) {
  const res = await withLocalServer(appFor(factory, userId), (url) =>
    request(url)
      .post('/mcp')
      .set('Accept', 'application/json, text/event-stream')
      .set('Content-Type', 'application/json')
      .set('MCP-Protocol-Version', '2025-06-18')
      .send({ jsonrpc: '2.0', id: nextId++, method, params }),
  );
  if (res.status !== 200) throw new Error(`MCP HTTP ${res.status}: ${res.text}`);
  if (res.body.error) throw new Error(`MCP JSON-RPC error: ${JSON.stringify(res.body.error)}`);
  return res.body.result;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function listTools(factory: ServerFactory, userId: string): Promise<any[]> {
  return (await rpc(factory, userId, 'tools/list')).tools;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function callTool(factory: ServerFactory, userId: string, name: string, args: Record<string, unknown> = {}): Promise<any> {
  return rpc(factory, userId, 'tools/call', { name, arguments: args });
}
