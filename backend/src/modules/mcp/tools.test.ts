import 'reflect-metadata';
import { McpServer } from '@modelcontextprotocol/server';
import { container } from 'tsyringe';
import { z } from 'zod';
import { ConflictError, DatabaseError, ForbiddenError, NotFoundError, UnauthorizedError, ValidationError, AppError } from '../../shared/errors/AppError';
import { defineTool, toToolError, okResult } from './tools';
import { callTool, listTools } from './testkit.test-helper';

describe('toToolError', () => {
  it.each([
    [new ValidationError('bad'), 'VALIDATION_ERROR', false, 'bad'],
    [new NotFoundError('nope'), 'NOT_FOUND', false, 'nope'],
    [new ConflictError('dup'), 'CONFLICT', false, 'dup'],
    [new ForbiddenError('no'), 'FORBIDDEN', false, 'no'],
    [new UnauthorizedError('who'), 'UNAUTHORIZED', false, 'who'],
    [new DatabaseError('pg: secret detail'), 'DATABASE_ERROR', true, 'A database error occurred'],
    [new AppError(422, 'odd'), 'BAD_REQUEST', false, 'odd'],
    [new Error('boom at /internal/path'), 'INTERNAL_ERROR', true, 'Unexpected server error'],
    ['string thrown', 'INTERNAL_ERROR', true, 'Unexpected server error'],
  ])('maps %p → %s', (err, code, retryable, message) => {
    expect(toToolError(err)).toEqual({ error: { code, message, retryable } });
  });
});

describe('okResult', () => {
  it('wraps arrays and primitives in { result } for structuredContent', () => {
    expect(okResult([1]).structuredContent).toEqual({ result: [1] });
    expect(okResult(undefined).structuredContent).toEqual({ result: null });
    expect(okResult({ a: 1 }).structuredContent).toEqual({ a: 1 });
  });
});

describe('defineTool', () => {
  const USER = 'user-123';
  let logSpy: jest.SpyInstance;
  let errSpy: jest.SpyInstance;
  const handler = jest.fn();

  const build = (kind: 'read' | 'write' | 'destructive') => (userId: string) => {
    const server = new McpServer({ name: 't', version: '0' }, { capabilities: { tools: {} } });
    defineTool(server, { userId, di: container }, {
      name: 'finance_ping',
      title: 'Ping',
      description: 'test',
      input: z.object({ id: z.string().guid(), fail: z.enum(['none', 'notfound', 'crash']).default('none') }).strict(),
      kind,
      auditIds: (input) => ({ id: input.id }),
      handler,
    });
    return server;
  };

  beforeEach(() => {
    handler.mockReset();
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    errSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });
  afterEach(() => { logSpy.mockRestore(); errSpy.mockRestore(); });

  const ID = '7f0f6a52-1c55-4c7b-9c0e-2f6c4d3b9a10';
  const auditLines = () => logSpy.mock.calls.map((c) => JSON.parse(c[0])).filter((l) => l.event === 'write');

  it('advertises JSON schema and annotations in tools/list', async () => {
    const [tool] = await listTools(build('read'), USER);
    expect(tool.name).toBe('finance_ping');
    expect(tool.inputSchema).toMatchObject({ type: 'object', required: ['id'], additionalProperties: false });
    expect(tool.annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false });
    const [destructive] = await listTools(build('destructive'), USER);
    expect(destructive.annotations).toMatchObject({ readOnlyHint: false, destructiveHint: true });
  });

  it('passes parsed input and the authenticated userId; returns JSON + structuredContent', async () => {
    handler.mockResolvedValue({ pong: true });
    const res = await callTool(build('read'), USER, 'finance_ping', { id: ID });
    expect(handler).toHaveBeenCalledWith({ id: ID, fail: 'none' }, { userId: USER, di: container });
    expect(res.isError).toBeFalsy();
    expect(res.structuredContent).toEqual({ pong: true });
    expect(JSON.parse(res.content[0].text)).toEqual({ pong: true });
    expect(auditLines()).toHaveLength(0);
  });

  it('returns VALIDATION_ERROR in the shared shape without calling the handler', async () => {
    const res = await callTool(build('write'), USER, 'finance_ping', { id: 'nope', userId: 'evil' });
    expect(handler).not.toHaveBeenCalled();
    expect(res.isError).toBe(true);
    expect(res.structuredContent.error).toMatchObject({ code: 'VALIDATION_ERROR', retryable: false });
    expect(res.structuredContent.error.message).toMatch(/id: /);
    expect(JSON.parse(res.content[0].text)).toEqual(res.structuredContent);
    expect(auditLines()).toEqual([expect.objectContaining({ tool: 'finance_ping', userId: USER, outcome: 'error', errorCode: 'VALIDATION_ERROR' })]);
  });

  it('maps thrown AppErrors and audits writes', async () => {
    handler.mockRejectedValue(new NotFoundError('Movement not found'));
    const res = await callTool(build('write'), USER, 'finance_ping', { id: ID });
    expect(res.structuredContent).toEqual({ error: { code: 'NOT_FOUND', message: 'Movement not found', retryable: false } });
    expect(auditLines()).toEqual([expect.objectContaining({ outcome: 'error', errorCode: 'NOT_FOUND' })]);
  });

  it('hides unexpected error details', async () => {
    handler.mockRejectedValue(new Error('SUPABASE_SERVICE_KEY=xyz leaked'));
    const res = await callTool(build('read'), USER, 'finance_ping', { id: ID });
    expect(res.structuredContent.error).toEqual({ code: 'INTERNAL_ERROR', message: 'Unexpected server error', retryable: true });
    expect(res.content[0].text).not.toMatch(/SUPABASE/);
  });

  it('audits successful writes with entity ids and no payload', async () => {
    handler.mockResolvedValue({ id: ID, notes: 'private' });
    await callTool(build('destructive'), USER, 'finance_ping', { id: ID });
    const [line] = auditLines();
    expect(line).toMatchObject({ scope: 'mcp', tool: 'finance_ping', userId: USER, outcome: 'ok', ids: { id: ID } });
    expect(typeof line.durationMs).toBe('number');
    expect(JSON.stringify(line)).not.toMatch(/private/);
  });
});
