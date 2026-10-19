import 'reflect-metadata';
import { container, DependencyContainer } from 'tsyringe';
import { buildMcpServer } from './server';
import { callTool, listTools } from './testkit.test-helper';
import { ForbiddenError, NotFoundError, ValidationError } from '../../shared/errors/AppError';
import { CreateMovementUseCase } from '../movements/application/useCases/CreateMovementUseCase';
import { CreateTransferUseCase } from '../movements/application/useCases/CreateTransferUseCase';
import { UpdateMovementUseCase } from '../movements/application/useCases/UpdateMovementUseCase';
import { DeleteMovementUseCase } from '../movements/application/useCases/DeleteMovementUseCase';
import { ApplyPendingMovementUseCase } from '../movements/application/useCases/ApplyPendingMovementUseCase';
import { MarkReminderAsPaidUseCase } from '../reminders/application/useCases/MarkReminderAsPaidUseCase';

const USER = 'owner-user-id';
const ACC = '0b6f3c1e-8f2a-4d5b-9c7e-1a2b3c4d5e6f';
const POC = '1c7a4d2f-9a3b-4e6c-8d8f-2b3c4d5e6f70';
const ACC2 = '2d8b5e3a-0b4c-4f7d-9e9a-3c4d5e6f7081';
const POC2 = '3e9c6f4b-1c5d-4a8e-8f0b-4d5e6f708192';
const MOV = '4fad7a5c-2d6e-4b9f-9a1c-5e6f708192a3';
const REM = '5abe8b6d-3e7f-4cab-8b2d-6f708192a3b4';

const WRITE_TOOLS = [
  'finance_apply_pending_movement',
  'finance_create_movement',
  'finance_create_transfer',
  'finance_delete_movement',
  'finance_mark_reminder_paid',
  'finance_update_movement',
];

describe('MCP write tools', () => {
  let di: DependencyContainer;
  const m = {
    create: { execute: jest.fn() },
    transfer: { execute: jest.fn() },
    update: { execute: jest.fn() },
    del: { execute: jest.fn() },
    apply: { execute: jest.fn() },
    paid: { execute: jest.fn() },
  };
  let logSpy: jest.SpyInstance;
  const factory = (userId: string) => buildMcpServer(userId, di);
  const audits = () => logSpy.mock.calls.map((c) => JSON.parse(c[0])).filter((l) => l.event === 'write');

  beforeEach(() => {
    Object.values(m).forEach((x) => x.execute.mockReset());
    di = container.createChildContainer();
    di.registerInstance(CreateMovementUseCase, m.create as never);
    di.registerInstance(CreateTransferUseCase, m.transfer as never);
    di.registerInstance(UpdateMovementUseCase, m.update as never);
    di.registerInstance(DeleteMovementUseCase, m.del as never);
    di.registerInstance(ApplyPendingMovementUseCase, m.apply as never);
    di.registerInstance(MarkReminderAsPaidUseCase, m.paid as never);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });
  afterEach(() => logSpy.mockRestore());

  describe('registration', () => {
    it('advertises write tools with correct annotations', async () => {
      const tools = await listTools(factory, USER);
      const writes = tools.filter((t) => !t.annotations.readOnlyHint);
      expect(writes.map((t) => t.name).sort()).toEqual(WRITE_TOOLS);
      for (const t of writes) {
        expect(t.annotations.destructiveHint).toBe(t.name === 'finance_delete_movement');
      }
    });

    it('exposes no bulk, cascade, reorder or archive tools', async () => {
      const names = (await listTools(factory, USER)).map((t) => t.name);
      expect(names.every((n) => n.startsWith('finance_'))).toBe(true);
      expect(names.filter((n) => /batch|bulk|cascade|reorder|archive|orphan|by_account|by_pocket|_all/.test(n))).toEqual([]);
      expect(names).toHaveLength(13);
    });
  });

  describe('finance_create_movement', () => {
    const body = { type: 'EgresoNormal', accountId: ACC, pocketId: POC, amount: 25000, displayedDate: '2026-10-18', notes: '[mcp-test] lunch' };

    it('creates via the use case as the authenticated user and audits ids only', async () => {
      m.create.execute.mockResolvedValue({ id: MOV, ...body, isPending: false });
      const res = await callTool(factory, USER, 'finance_create_movement', body);
      expect(m.create.execute).toHaveBeenCalledWith(body, USER);
      expect(res.isError).toBeFalsy();
      expect(res.structuredContent).toMatchObject({ id: MOV, amount: 25000 });
      const [a] = audits();
      expect(a).toMatchObject({ tool: 'finance_create_movement', userId: USER, outcome: 'ok', ids: { movementId: MOV, accountId: ACC, pocketId: POC } });
      expect(JSON.stringify(a)).not.toContain('lunch');
    });

    it.each([
      [{ ...body, amount: -5 }, 'amount'],
      [{ ...body, amount: 0 }, 'amount'],
      [{ ...body, type: 'Gasto' }, 'type'],
      [{ ...body, accountId: 'nequi' }, 'accountId'],
      [{ ...body, userId: 'someone-else' }, ''],
      [{ type: 'EgresoNormal', amount: 1 }, 'accountId'],
    ])('rejects invalid input (%#) with VALIDATION_ERROR on %s', async (args, path) => {
      const res = await callTool(factory, USER, 'finance_create_movement', args);
      expect(m.create.execute).not.toHaveBeenCalled();
      expect(res.structuredContent.error.code).toBe('VALIDATION_ERROR');
      expect(res.structuredContent.error.message).toContain(path);
      expect(audits()).toEqual([expect.objectContaining({ outcome: 'error', errorCode: 'VALIDATION_ERROR' })]);
    });

    it('maps a missing pocket to NOT_FOUND', async () => {
      m.create.execute.mockRejectedValue(new NotFoundError('Pocket not found'));
      const res = await callTool(factory, USER, 'finance_create_movement', body);
      expect(res.structuredContent).toEqual({ error: { code: 'NOT_FOUND', message: 'Pocket not found', retryable: false } });
    });
  });

  it('finance_create_transfer serializes both sides and audits their ids', async () => {
    const input = { sourceAccountId: ACC, sourcePocketId: POC, targetAccountId: ACC2, targetPocketId: POC2, amount: 100, displayedDate: '2026-10-18' };
    m.transfer.execute.mockResolvedValue({
      expense: { toJSON: () => ({ id: 'e1', type: 'EgresoNormal' }) },
      income: { toJSON: () => ({ id: 'i1', type: 'IngresoNormal' }) },
    });
    const res = await callTool(factory, USER, 'finance_create_transfer', input);
    expect(m.transfer.execute).toHaveBeenCalledWith(input, USER);
    expect(res.structuredContent).toEqual({ expense: { id: 'e1', type: 'EgresoNormal' }, income: { id: 'i1', type: 'IngresoNormal' } });
    expect(audits()[0].ids).toEqual({ expenseId: 'e1', incomeId: 'i1', sourcePocketId: POC, targetPocketId: POC2 });
  });

  describe('finance_update_movement', () => {
    it('passes id separately and only the provided fields', async () => {
      m.update.execute.mockResolvedValue({ id: MOV, amount: 30000 });
      await callTool(factory, USER, 'finance_update_movement', { id: MOV, amount: 30000, category: null });
      expect(m.update.execute).toHaveBeenCalledWith(MOV, { amount: 30000, category: null }, USER);
      expect(audits()[0].ids).toEqual({ movementId: MOV, fields: ['amount', 'category'] });
    });

    it('requires id and rejects isPending (use apply_pending instead)', async () => {
      expect((await callTool(factory, USER, 'finance_update_movement', { amount: 1 })).structuredContent.error.code).toBe('VALIDATION_ERROR');
      expect((await callTool(factory, USER, 'finance_update_movement', { id: MOV, isPending: false })).structuredContent.error.code).toBe('VALIDATION_ERROR');
      expect(m.update.execute).not.toHaveBeenCalled();
    });
  });

  describe('finance_delete_movement', () => {
    it('deletes a single movement and audits it', async () => {
      m.del.execute.mockResolvedValue(undefined);
      const res = await callTool(factory, USER, 'finance_delete_movement', { id: MOV });
      expect(m.del.execute).toHaveBeenCalledWith(MOV, USER);
      expect(res.structuredContent).toEqual({ deleted: true, id: MOV });
      expect(audits()[0]).toMatchObject({ tool: 'finance_delete_movement', outcome: 'ok', ids: { movementId: MOV } });
    });

    it('accepts exactly one id (no arrays)', async () => {
      const res = await callTool(factory, USER, 'finance_delete_movement', { id: [MOV, MOV] });
      expect(res.structuredContent.error.code).toBe('VALIDATION_ERROR');
      expect(m.del.execute).not.toHaveBeenCalled();
    });

    it('reports NOT_FOUND for another user\'s or a missing movement', async () => {
      m.del.execute.mockRejectedValue(new NotFoundError(`Movement with ID ${MOV} not found`));
      const res = await callTool(factory, USER, 'finance_delete_movement', { id: MOV });
      expect(res.structuredContent.error.code).toBe('NOT_FOUND');
      expect(audits()[0]).toMatchObject({ outcome: 'error', errorCode: 'NOT_FOUND' });
    });
  });

  it('finance_apply_pending_movement applies by id', async () => {
    m.apply.execute.mockResolvedValue({ id: MOV, isPending: false });
    const res = await callTool(factory, USER, 'finance_apply_pending_movement', { id: MOV });
    expect(m.apply.execute).toHaveBeenCalledWith(MOV, USER);
    expect(res.structuredContent).toEqual({ id: MOV, isPending: false });
  });

  it('maps a non-pending movement error to VALIDATION_ERROR', async () => {
    m.apply.execute.mockRejectedValue(new ValidationError('Movement is not pending'));
    const res = await callTool(factory, USER, 'finance_apply_pending_movement', { id: MOV });
    expect(res.structuredContent.error).toEqual({ code: 'VALIDATION_ERROR', message: 'Movement is not pending', retryable: false });
  });

  describe('finance_mark_reminder_paid', () => {
    it('marks paid, links the movement and strips userId', async () => {
      m.paid.execute.mockResolvedValue({ id: REM, userId: USER, isPaid: true, linkedMovementId: MOV });
      const res = await callTool(factory, USER, 'finance_mark_reminder_paid', { reminderId: REM, movementId: MOV });
      expect(m.paid.execute).toHaveBeenCalledWith(REM, USER, MOV);
      expect(res.structuredContent).toEqual({ id: REM, isPaid: true, linkedMovementId: MOV });
      expect(audits()[0].ids).toEqual({ reminderId: REM, movementId: MOV });
    });

    it('maps ForbiddenError', async () => {
      m.paid.execute.mockRejectedValue(new ForbiddenError('Not authorized'));
      const res = await callTool(factory, USER, 'finance_mark_reminder_paid', { reminderId: REM });
      expect(m.paid.execute).toHaveBeenCalledWith(REM, USER, undefined);
      expect(res.structuredContent.error.code).toBe('FORBIDDEN');
    });
  });

  it('read tools are not audited', async () => {
    await callTool(factory, USER, 'finance_convert_currency', { amount: 1, fromCurrency: 'USD', toCurrency: 'XXX' });
    expect(audits()).toEqual([]);
  });
});
