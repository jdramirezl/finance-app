/**
 * The single-use guarantees live in the query filters, so assert them:
 * every state transition must be a conditional UPDATE (… WHERE status/used_at …).
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseOAuthStore } from './supabaseStore';
import { DatabaseError } from '../../../shared/errors/AppError';

type Call = { table: string; ops: Array<[string, unknown[]]> };

function fakeDb(result: { data?: unknown; error?: { message: string } | null } = {}) {
  const calls: Call[] = [];
  const db = {
    from(table: string) {
      const call: Call = { table, ops: [] };
      calls.push(call);
      const chain: Record<string, unknown> = {};
      for (const op of ['select', 'insert', 'update', 'delete', 'eq', 'is', 'lt', 'order', 'maybeSingle', 'single']) {
        chain[op] = (...args: unknown[]) => { call.ops.push([op, args]); return chain; };
      }
      chain.then = (resolve: (v: unknown) => unknown) => resolve({ data: result.data ?? null, error: result.error ?? null });
      return chain;
    },
  };
  return { db: db as unknown as SupabaseClient, calls };
}

const ops = (c: Call) => c.ops.map(([op, args]) => `${op}(${args.map((a) => JSON.stringify(a)).join(',')})`);

describe('SupabaseOAuthStore', () => {
  it('consumeCode only flips approved → used', async () => {
    const { db, calls } = fakeDb({ data: [] });
    expect(await new SupabaseOAuthStore(db).consumeCode('h')).toBeNull();
    expect(calls[0].table).toBe('mcp_oauth_authorizations');
    expect(ops(calls[0])).toEqual(['update({"status":"used"})', 'eq("code_hash","h")', 'eq("status","approved")', 'select("*")']);
  });

  it('decideAuthorization only updates pending rows and reports whether it won', async () => {
    const { db, calls } = fakeDb({ data: [{ id: 'a' }] });
    const won = await new SupabaseOAuthStore(db).decideAuthorization('a', {
      status: 'approved', userId: 'u', codeHash: 'c', expiresAt: new Date(0),
    });
    expect(won).toBe(true);
    expect(ops(calls[0])).toEqual(expect.arrayContaining(['eq("id","a")', 'eq("status","pending")']));
  });

  it('markRefreshUsed only marks unused refresh tokens', async () => {
    const { db, calls } = fakeDb({ data: [] });
    expect(await new SupabaseOAuthStore(db).markRefreshUsed('h', new Date(0))).toBe(false);
    expect(ops(calls[0])).toEqual(expect.arrayContaining(['eq("token_hash","h")', 'eq("kind","refresh")', 'is("used_at",null)']));
  });

  it('revokeAllGrantsForUser scopes to the user and active grants', async () => {
    const { db, calls } = fakeDb({ data: [{ id: 1 }, { id: 2 }] });
    expect(await new SupabaseOAuthStore(db).revokeAllGrantsForUser('u')).toBe(2);
    expect(ops(calls[0])).toEqual(expect.arrayContaining(['eq("user_id","u")', 'is("revoked_at",null)']));
  });

  it('maps a token row with its embedded grant', async () => {
    const { db } = fakeDb({
      data: {
        token_hash: 'h', grant_id: 'g', kind: 'access', expires_at: '2026-01-01T00:00:00Z', used_at: null,
        grant: { id: 'g', user_id: 'u', client_id: 'c', scope: 'finance:read', resource: 'r', issuer: 'i', created_at: '2026-01-01T00:00:00Z', revoked_at: null, last_used_at: null },
      },
    });
    const t = await new SupabaseOAuthStore(db).findToken('h');
    expect(t).toMatchObject({ tokenHash: 'h', kind: 'access', grant: { id: 'g', userId: 'u', revokedAt: null } });
    expect(t?.expiresAt).toEqual(new Date('2026-01-01T00:00:00Z'));
  });

  it('turns database errors into DatabaseError without leaking details', async () => {
    const errSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const { db } = fakeDb({ error: { message: 'relation "mcp_oauth_tokens" does not exist' } });
    await expect(new SupabaseOAuthStore(db).findToken('h')).rejects.toThrow(DatabaseError);
    await expect(new SupabaseOAuthStore(db).findToken('h')).rejects.toThrow('OAuth store findToken failed');
    errSpy.mockRestore();
  });
});
