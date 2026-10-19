import 'reflect-metadata';
import { container, DependencyContainer } from 'tsyringe';
import { buildMcpServer } from './server';
import { callTool, listTools } from './testkit.test-helper';
import { NotFoundError } from '../../shared/errors/AppError';
import { GetAllAccountsUseCase } from '../accounts/application/useCases/GetAllAccountsUseCase';
import { GetAllPocketsUseCase } from '../pockets/application/useCases/GetAllPocketsUseCase';
import { GetPocketsByAccountUseCase } from '../pockets/application/useCases/GetPocketsByAccountUseCase';
import { GetAllMovementsUseCase } from '../movements/application/useCases/GetAllMovementsUseCase';
import { GetMovementsByAccountUseCase } from '../movements/application/useCases/GetMovementsByAccountUseCase';
import { GetMovementsByPocketUseCase } from '../movements/application/useCases/GetMovementsByPocketUseCase';
import { GetMovementsByMonthUseCase } from '../movements/application/useCases/GetMovementsByMonthUseCase';
import { GetPendingMovementsUseCase } from '../movements/application/useCases/GetPendingMovementsUseCase';
import { GetSpendingSummaryUseCase } from '../movements/application/useCases/GetSpendingSummaryUseCase';
import { GetAllGroupsUseCase } from '../sub-pockets/application/useCases/GetAllGroupsUseCase';
import { GetAllRemindersUseCase } from '../reminders/application/useCases/GetAllRemindersUseCase';
import { ConvertCurrencyUseCase } from '../settings/application/useCases/ConvertCurrencyUseCase';

const USER = 'owner-user-id';
const ACC = '0b6f3c1e-8f2a-4d5b-9c7e-1a2b3c4d5e6f';
const POC = '1c7a4d2f-9a3b-4e6c-8d8f-2b3c4d5e6f70';

type Mock = { execute: jest.Mock };
const mock = (): Mock => ({ execute: jest.fn() });

describe('MCP read tools', () => {
  let di: DependencyContainer;
  let m: Record<string, Mock>;
  let subPocketRepo: { findAllByUserId: jest.Mock };
  const factory = (userId: string) => buildMcpServer(userId, di);

  beforeEach(() => {
    di = container.createChildContainer();
    m = {
      accounts: mock(), pockets: mock(), pocketsByAccount: mock(),
      all: mock(), byAccount: mock(), byPocket: mock(), byMonth: mock(), pending: mock(),
      summary: mock(), groups: mock(), reminders: mock(), convert: mock(),
    };
    subPocketRepo = { findAllByUserId: jest.fn() };
    di.registerInstance(GetAllAccountsUseCase, m.accounts as never);
    di.registerInstance(GetAllPocketsUseCase, m.pockets as never);
    di.registerInstance(GetPocketsByAccountUseCase, m.pocketsByAccount as never);
    di.registerInstance(GetAllMovementsUseCase, m.all as never);
    di.registerInstance(GetMovementsByAccountUseCase, m.byAccount as never);
    di.registerInstance(GetMovementsByPocketUseCase, m.byPocket as never);
    di.registerInstance(GetMovementsByMonthUseCase, m.byMonth as never);
    di.registerInstance(GetPendingMovementsUseCase, m.pending as never);
    di.registerInstance(GetSpendingSummaryUseCase, m.summary as never);
    di.registerInstance(GetAllGroupsUseCase, m.groups as never);
    di.registerInstance(GetAllRemindersUseCase, m.reminders as never);
    di.registerInstance(ConvertCurrencyUseCase, m.convert as never);
    di.registerInstance('SubPocketRepository', subPocketRepo);
  });

  it('advertises the read tools, all read-only', async () => {
    const tools = (await listTools(factory, USER)).filter((t) => t.annotations.readOnlyHint);
    expect(tools.map((t) => t.name).sort()).toEqual([
      'finance_convert_currency',
      'finance_list_accounts',
      'finance_list_fixed_expenses',
      'finance_list_movements',
      'finance_list_pockets',
      'finance_list_reminders',
      'finance_spending_summary',
    ]);
    for (const t of tools) {
      expect(t.annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false });
      expect(t.inputSchema.type).toBe('object');
      expect(t.description.length).toBeGreaterThan(20);
    }
  });

  describe('finance_list_accounts', () => {
    it('skips live prices and archived accounts by default', async () => {
      m.accounts.execute.mockResolvedValue([{ id: ACC, name: 'Nequi' }]);
      const res = await callTool(factory, USER, 'finance_list_accounts');
      expect(m.accounts.execute).toHaveBeenCalledWith(USER, true, false);
      expect(res.structuredContent).toEqual({ result: [{ id: ACC, name: 'Nequi' }] });
    });

    it('passes flags through', async () => {
      m.accounts.execute.mockResolvedValue([]);
      await callTool(factory, USER, 'finance_list_accounts', { includeArchived: true, includeInvestmentPrices: true });
      expect(m.accounts.execute).toHaveBeenCalledWith(USER, false, true);
    });
  });

  describe('finance_list_pockets', () => {
    it('lists all pockets without accountId', async () => {
      m.pockets.execute.mockResolvedValue([]);
      await callTool(factory, USER, 'finance_list_pockets');
      expect(m.pockets.execute).toHaveBeenCalledWith(USER, false);
      expect(m.pocketsByAccount.execute).not.toHaveBeenCalled();
    });

    it('filters by account', async () => {
      m.pocketsByAccount.execute.mockResolvedValue([{ id: POC }]);
      const res = await callTool(factory, USER, 'finance_list_pockets', { accountId: ACC });
      expect(m.pocketsByAccount.execute).toHaveBeenCalledWith(ACC, USER, false);
      expect(res.structuredContent.result).toEqual([{ id: POC }]);
    });

    it('rejects a malformed accountId', async () => {
      const res = await callTool(factory, USER, 'finance_list_pockets', { accountId: 'nequi' });
      expect(res.isError).toBe(true);
      expect(res.structuredContent.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('finance_list_movements', () => {
    const page = { data: [], total: 0, page: 1, limit: 50, hasMore: false };

    it('defaults to all movements, page 1, limit 50', async () => {
      m.all.execute.mockResolvedValue(page);
      const res = await callTool(factory, USER, 'finance_list_movements');
      expect(m.all.execute).toHaveBeenCalledWith(USER, { page: 1, limit: 50, category: undefined, tags: undefined });
      expect(res.structuredContent).toEqual(page);
    });

    it('routes year+month to the month use case with filters', async () => {
      m.byMonth.execute.mockResolvedValue(page);
      await callTool(factory, USER, 'finance_list_movements', { year: 2026, month: 10, accountId: ACC, pendingOnly: true, limit: 10, page: 2 });
      expect(m.byMonth.execute).toHaveBeenCalledWith(2026, 10, USER, { page: 2, limit: 10, accountId: ACC, pocketId: undefined, isPending: true });
    });

    it('routes accountId / pocketId with offset pagination', async () => {
      m.byAccount.execute.mockResolvedValue([{ id: 'm1' }]);
      const res = await callTool(factory, USER, 'finance_list_movements', { accountId: ACC, page: 3, limit: 20 });
      expect(m.byAccount.execute).toHaveBeenCalledWith(ACC, USER, { isPending: undefined }, { limit: 20, offset: 40 });
      expect(res.structuredContent).toEqual({ data: [{ id: 'm1' }], page: 3, limit: 20 });

      m.byPocket.execute.mockResolvedValue([]);
      await callTool(factory, USER, 'finance_list_movements', { pocketId: POC });
      expect(m.byPocket.execute).toHaveBeenCalledWith(POC, USER, { isPending: undefined }, { limit: 50, offset: 0 });
    });

    it('paginates pending movements', async () => {
      m.pending.execute.mockResolvedValue([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
      const res = await callTool(factory, USER, 'finance_list_movements', { pendingOnly: true, limit: 2 });
      expect(res.structuredContent).toEqual({ data: [{ id: 'a' }, { id: 'b' }], page: 1, limit: 2, total: 3, hasMore: true });
    });

    it.each([
      [{ year: 2026 }, 'month'],
      [{ limit: 500 }, 'limit'],
      [{ month: 13, year: 2026 }, 'month'],
      [{ userId: 'someone-else' }, ''],
    ])('rejects invalid input %p', async (args, path) => {
      const res = await callTool(factory, USER, 'finance_list_movements', args);
      expect(res.structuredContent.error.code).toBe('VALIDATION_ERROR');
      expect(res.structuredContent.error.message).toContain(path);
      expect(m.all.execute).not.toHaveBeenCalled();
    });
  });

  it('finance_spending_summary returns the summary', async () => {
    m.summary.execute.mockResolvedValue({ thisMonth: { income: 1, expenses: 2 } });
    const res = await callTool(factory, USER, 'finance_spending_summary');
    expect(m.summary.execute).toHaveBeenCalledWith(USER);
    expect(res.structuredContent).toEqual({ thisMonth: { income: 1, expenses: 2 } });
  });

  it('finance_list_fixed_expenses returns groups and serialized sub-pockets', async () => {
    m.groups.execute.mockResolvedValue([{ id: 'g1', name: 'Home' }]);
    subPocketRepo.findAllByUserId.mockResolvedValue([{ toJSON: () => ({ id: 's1', name: 'Rent', monthlyContribution: 100 }) }]);
    const res = await callTool(factory, USER, 'finance_list_fixed_expenses');
    expect(subPocketRepo.findAllByUserId).toHaveBeenCalledWith(USER);
    expect(res.structuredContent).toEqual({
      groups: [{ id: 'g1', name: 'Home' }],
      fixedExpenses: [{ id: 's1', name: 'Rent', monthlyContribution: 100 }],
    });
  });

  it('finance_list_reminders strips userId and filters unpaid', async () => {
    m.reminders.execute.mockResolvedValue([
      { id: 'r1', userId: USER, title: 'Rent', isPaid: false },
      { id: 'r2', userId: USER, title: 'Gym', isPaid: true },
    ]);
    const all = await callTool(factory, USER, 'finance_list_reminders');
    expect(all.structuredContent.result).toEqual([
      { id: 'r1', title: 'Rent', isPaid: false },
      { id: 'r2', title: 'Gym', isPaid: true },
    ]);
    const unpaid = await callTool(factory, USER, 'finance_list_reminders', { unpaidOnly: true });
    expect(unpaid.structuredContent.result).toEqual([{ id: 'r1', title: 'Rent', isPaid: false }]);
  });

  describe('finance_convert_currency', () => {
    it('converts', async () => {
      m.convert.execute.mockResolvedValue({ amount: 10, fromCurrency: 'USD', toCurrency: 'COP', convertedAmount: 40000, rate: 4000 });
      const res = await callTool(factory, USER, 'finance_convert_currency', { amount: 10, fromCurrency: 'USD', toCurrency: 'COP' });
      expect(m.convert.execute).toHaveBeenCalledWith({ amount: 10, fromCurrency: 'USD', toCurrency: 'COP' });
      expect(res.structuredContent.convertedAmount).toBe(40000);
    });

    it('rejects unsupported currencies', async () => {
      const res = await callTool(factory, USER, 'finance_convert_currency', { amount: 10, fromCurrency: 'USD', toCurrency: 'JPY' });
      expect(res.structuredContent.error.code).toBe('VALIDATION_ERROR');
    });
  });

  it('maps use case errors to the shared shape', async () => {
    m.pocketsByAccount.execute.mockRejectedValue(new NotFoundError('Account not found'));
    const res = await callTool(factory, USER, 'finance_list_pockets', { accountId: ACC });
    expect(res.structuredContent).toEqual({ error: { code: 'NOT_FOUND', message: 'Account not found', retryable: false } });
  });

  it('every call runs as the authenticated user only', async () => {
    m.summary.execute.mockResolvedValue({});
    await callTool(factory, 'another-user', 'finance_spending_summary');
    expect(m.summary.execute).toHaveBeenCalledWith('another-user');
  });
});
