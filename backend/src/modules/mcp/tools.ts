/**
 * Shared plumbing for finance_* MCP tools.
 *
 * - Inputs are validated here (not by the SDK) so validation failures use
 *   the shared error contract: { error: { code, message, retryable } }.
 * - Every handler runs as the authenticated user; clients never send user ids.
 * - Write tools are audit-logged (tool, user, entity ids, outcome, duration).
 */
import type { McpServer, ToolAnnotations, CallToolResult, StandardSchemaWithJSON } from '@modelcontextprotocol/server';
import { z } from 'zod';
import type { DependencyContainer } from 'tsyringe';
import {
  AppError,
  ConflictError,
  DatabaseError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../shared/errors/AppError';
import { mcpError, McpErrorBody } from './auth';

export interface ToolContext {
  userId: string;
  /** DI container to resolve use cases from (child container with mocks in tests). */
  di: DependencyContainer;
}

export interface ToolDefinition<S extends z.ZodType> {
  name: `finance_${string}`;
  title: string;
  description: string;
  input: S;
  /** 'read' → readOnlyHint; 'write' → audited; 'destructive' → audited + destructiveHint */
  kind: 'read' | 'write' | 'destructive';
  /** For writes: pull the entity id(s) out of the input and the JSON-serialized result for the audit log. */
  auditIds?: (input: z.output<S>, result: unknown) => Record<string, unknown>;
  handler: (input: z.output<S>, ctx: ToolContext) => Promise<unknown>;
}

/** Map any thrown error to the shared tool error contract. Never leaks stacks. */
export function toToolError(err: unknown): McpErrorBody {
  if (err instanceof ValidationError) return mcpError('VALIDATION_ERROR', err.message);
  if (err instanceof NotFoundError) return mcpError('NOT_FOUND', err.message);
  if (err instanceof ConflictError) return mcpError('CONFLICT', err.message);
  if (err instanceof ForbiddenError) return mcpError('FORBIDDEN', err.message);
  if (err instanceof UnauthorizedError) return mcpError('UNAUTHORIZED', err.message);
  if (err instanceof DatabaseError) return mcpError('DATABASE_ERROR', 'A database error occurred', true);
  if (err instanceof AppError && err.isOperational && err.statusCode < 500) {
    return mcpError('BAD_REQUEST', err.message);
  }
  return mcpError('INTERNAL_ERROR', 'Unexpected server error', true);
}

export function formatZodError(error: z.ZodError): string {
  return error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ');
}

export const errorResult = (body: McpErrorBody): CallToolResult => ({
  content: [{ type: 'text', text: JSON.stringify(body) }],
  structuredContent: body as unknown as Record<string, unknown>,
  isError: true,
});

export const okResult = (data: unknown): CallToolResult => {
  // Round-trip through JSON so domain objects (toJSON) and Dates become plain data.
  const text = JSON.stringify(data ?? null);
  const plain: unknown = JSON.parse(text);
  const structured = (Array.isArray(plain) || plain === null || typeof plain !== 'object')
    ? { result: plain }
    : (plain as Record<string, unknown>);
  return {
    content: [{ type: 'text', text }],
    structuredContent: structured,
  };
};

export function auditWrite(entry: {
  tool: string;
  userId: string;
  outcome: 'ok' | 'error';
  durationMs: number;
  ids?: Record<string, unknown>;
  errorCode?: string;
}): void {
  console.log(JSON.stringify({ scope: 'mcp', event: 'write', ts: new Date().toISOString(), ...entry }));
}

/**
 * Wraps a Zod schema so the SDK advertises its JSON Schema in tools/list but
 * does not reject input itself; we validate in defineTool for a uniform error shape.
 */
function advertiseOnly(schema: z.ZodType): StandardSchemaWithJSON<unknown, unknown> {
  const std = schema['~standard'];
  return {
    '~standard': { ...std, validate: (value: unknown) => ({ value }) },
  } as unknown as StandardSchemaWithJSON<unknown, unknown>;
}

export function annotationsFor(kind: ToolDefinition<z.ZodType>['kind']): ToolAnnotations {
  if (kind === 'read') return { readOnlyHint: true, destructiveHint: false, openWorldHint: false };
  return { readOnlyHint: false, destructiveHint: kind === 'destructive', openWorldHint: false };
}

export function defineTool<S extends z.ZodType>(server: McpServer, ctx: ToolContext, def: ToolDefinition<S>): void {
  server.registerTool(
    def.name,
    {
      title: def.title,
      description: def.description,
      inputSchema: advertiseOnly(def.input),
      annotations: { title: def.title, ...annotationsFor(def.kind) },
    },
    async (rawArgs: unknown): Promise<CallToolResult> => {
      const started = Date.now();
      const isWrite = def.kind !== 'read';
      const parsed = def.input.safeParse(rawArgs ?? {});
      if (!parsed.success) {
        const body = mcpError('VALIDATION_ERROR', formatZodError(parsed.error));
        if (isWrite) auditWrite({ tool: def.name, userId: ctx.userId, outcome: 'error', durationMs: Date.now() - started, errorCode: body.error.code });
        return errorResult(body);
      }
      try {
        const ok = okResult(await def.handler(parsed.data, ctx));
        if (isWrite) {
          // auditIds sees the same plain JSON the client receives (domain objects already serialized).
          const plain = JSON.parse((ok.content[0] as { text: string }).text);
          auditWrite({ tool: def.name, userId: ctx.userId, outcome: 'ok', durationMs: Date.now() - started, ids: def.auditIds?.(parsed.data, plain) });
        }
        return ok;
      } catch (err) {
        const body = toToolError(err);
        if (body.error.code === 'INTERNAL_ERROR' || body.error.code === 'DATABASE_ERROR') {
          console.error({ scope: 'mcp', tool: def.name, error: (err as Error)?.message });
        }
        if (isWrite) {
          auditWrite({ tool: def.name, userId: ctx.userId, outcome: 'error', durationMs: Date.now() - started, errorCode: body.error.code });
        }
        return errorResult(body);
      }
    },
  );
}
