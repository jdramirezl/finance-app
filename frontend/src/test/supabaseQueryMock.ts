import { vi } from 'vitest';

/**
 * Shape of a result returned from a Supabase query — captures the union of
 * fields used by the services under test (`data`, `count`, `error`).
 */
export interface SupabaseQueryResult {
  data?: unknown;
  error?: { message: string; code?: string } | null;
  count?: number;
}

/**
 * Methods on the Supabase query builder that return the same builder so
 * callers can keep chaining (e.g. `.select().order().eq()`). Each of these
 * is a `vi.fn` on the returned mock so tests can assert call arguments.
 */
const PASSTHROUGH_METHODS = [
  'select',
  'eq',
  'is',
  'order',
  'range',
  'gte',
  'lte',
  'overlaps',
] as const;

type PassthroughMethod = (typeof PASSTHROUGH_METHODS)[number];

/**
 * Mock chainable Supabase query builder.
 *
 * Every chain method is a `vi.fn` (so callers can assert on it) and returns
 * the same mock instance so subsequent `.eq().order()...` keeps working.
 *
 * The builder itself is a thenable: `await chain` resolves to the configured
 * `result`, mirroring the real client where the chain is awaitable once no
 * more terminal methods (`.single()`) are appended. `.single()` is also a
 * `vi.fn` that resolves to the same `result`.
 */
export type SupabaseQueryMock = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [K in PassthroughMethod]: ReturnType<typeof vi.fn> & ((...args: any[]) => SupabaseQueryMock);
} & {
  single: ReturnType<typeof vi.fn>;
  then: <TResolved>(
    onFulfilled: (value: SupabaseQueryResult) => TResolved | PromiseLike<TResolved>,
    onRejected?: (reason: unknown) => TResolved | PromiseLike<TResolved>,
  ) => Promise<TResolved>;
};

/**
 * Build a mock Supabase query that resolves to `result` for any awaited or
 * `.single()`-terminated chain. Tests configure this once per call:
 *
 * ```ts
 * const query = makeSupabaseQuery({ data: [row], error: null });
 * vi.mocked(supabase.from).mockReturnValue(query);
 * ```
 */
export function makeSupabaseQuery(result: SupabaseQueryResult): SupabaseQueryMock {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const chain: any = {};
  for (const method of PASSTHROUGH_METHODS) {
    chain[method] = vi.fn(() => chain);
  }
  chain.single = vi.fn(() => Promise.resolve(result));
  chain.then = (
    onFulfilled: (value: SupabaseQueryResult) => unknown,
    onRejected?: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(onFulfilled, onRejected);
  return chain as SupabaseQueryMock;
}
