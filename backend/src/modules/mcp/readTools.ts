/**
 * Read-only finance_* tools. Each delegates to an existing use case.
 */
import type { McpServer } from '@modelcontextprotocol/server';
import { z } from 'zod';
import { defineTool, ToolContext } from './tools';
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
import type { ISubPocketRepository } from '../sub-pockets/infrastructure/ISubPocketRepository';
import { GetAllRemindersUseCase } from '../reminders/application/useCases/GetAllRemindersUseCase';
import { ConvertCurrencyUseCase } from '../settings/application/useCases/ConvertCurrencyUseCase';

export const CURRENCIES = ['USD', 'MXN', 'COP', 'EUR', 'GBP'] as const;
export const currency = z.enum(CURRENCIES);
const id = (what: string) => z.string().guid().describe(what);

export const MOVEMENT_TYPES_HELP =
  'Movement types: IngresoNormal = income, EgresoNormal = expense, ' +
  'IngresoFijo / EgresoFijo = income/expense on a fixed-expense (sub-pocket) budget.';

export const DEFAULT_MOVEMENT_LIMIT = 50;
export const MAX_MOVEMENT_LIMIT = 200;

export const listMovementsInput = z.object({
  year: z.number().int().min(1900).max(2100).optional().describe('Calendar year, e.g. 2026. Requires month.'),
  month: z.number().int().min(1).max(12).optional().describe('Month 1-12. Requires year.'),
  accountId: id('Only movements in this account (from finance_list_accounts).').optional(),
  pocketId: id('Only movements in this pocket (from finance_list_pockets).').optional(),
  pendingOnly: z.boolean().optional().describe('Only pending (planned, not yet applied) movements.'),
  category: z.string().min(1).max(50).optional().describe('Exact category match (ignored with year/month, account or pocket filters).'),
  tags: z.array(z.string().min(1).max(30)).max(10).optional().describe('Any of these tags (same restriction as category).'),
  page: z.number().int().min(1).default(1),
  limit: z.number().int().min(1).max(MAX_MOVEMENT_LIMIT).default(DEFAULT_MOVEMENT_LIMIT),
}).strict().refine((v) => (v.year === undefined) === (v.month === undefined), {
  message: 'year and month must be provided together',
  path: ['month'],
});

type ListMovementsInput = z.output<typeof listMovementsInput>;

async function listMovements(input: ListMovementsInput, { userId, di }: ToolContext) {
  const { year, month, accountId, pocketId, pendingOnly, category, tags, page, limit } = input;
  const isPending = pendingOnly ? true : undefined;

  if (year !== undefined && month !== undefined) {
    return di.resolve(GetMovementsByMonthUseCase).execute(year, month, userId, { page, limit, accountId, pocketId, isPending });
  }

  const pagination = { limit, offset: (page - 1) * limit };
  if (accountId) {
    const data = await di.resolve(GetMovementsByAccountUseCase).execute(accountId, userId, { isPending }, pagination);
    return { data, page, limit };
  }
  if (pocketId) {
    const data = await di.resolve(GetMovementsByPocketUseCase).execute(pocketId, userId, { isPending }, pagination);
    return { data, page, limit };
  }
  if (pendingOnly) {
    const all = await di.resolve(GetPendingMovementsUseCase).execute(userId);
    const data = all.slice(pagination.offset, pagination.offset + limit);
    return { data, page, limit, total: all.length, hasMore: pagination.offset + limit < all.length };
  }
  return di.resolve(GetAllMovementsUseCase).execute(userId, { page, limit, category, tags });
}

export function registerReadTools(server: McpServer, ctx: ToolContext): void {
  defineTool(server, ctx, {
    name: 'finance_list_accounts',
    title: 'List accounts',
    description:
      'List the user\'s accounts (bank, cash, investment, CD) with id, name, currency, type and current balance. ' +
      'Account ids are needed by most other finance_* tools.',
    input: z.object({
      includeArchived: z.boolean().default(false),
      includeInvestmentPrices: z.boolean().default(false)
        .describe('Fetch live stock prices for investment accounts (slower, rate-limited).'),
    }).strict(),
    kind: 'read',
    handler: ({ includeArchived, includeInvestmentPrices }, { userId, di }) =>
      di.resolve(GetAllAccountsUseCase).execute(userId, !includeInvestmentPrices, includeArchived),
  });

  defineTool(server, ctx, {
    name: 'finance_list_pockets',
    title: 'List pockets',
    description:
      'List pockets (sub-containers inside an account) with id, accountId, name, type (normal | fixed), currency and balance. ' +
      'Every movement belongs to one account + one pocket of that account.',
    input: z.object({
      accountId: id('Only pockets of this account.').optional(),
      includeArchived: z.boolean().default(false),
    }).strict(),
    kind: 'read',
    handler: ({ accountId, includeArchived }, { userId, di }) =>
      accountId
        ? di.resolve(GetPocketsByAccountUseCase).execute(accountId, userId, includeArchived)
        : di.resolve(GetAllPocketsUseCase).execute(userId, includeArchived),
  });

  defineTool(server, ctx, {
    name: 'finance_list_movements',
    title: 'List movements',
    description:
      'List movements (transactions), newest first, paginated. Filter by year+month, account, pocket, pending, ' +
      `category or tags. Amounts are positive in the account's currency. ${MOVEMENT_TYPES_HELP}`,
    input: listMovementsInput,
    kind: 'read',
    handler: listMovements,
  });

  defineTool(server, ctx, {
    name: 'finance_spending_summary',
    title: 'Spending summary',
    description: 'Totals of income and expenses for today, this week, last week, this month and last month.',
    input: z.object({}).strict(),
    kind: 'read',
    handler: (_input, { userId, di }) => di.resolve(GetSpendingSummaryUseCase).execute(userId),
  });

  defineTool(server, ctx, {
    name: 'finance_list_fixed_expenses',
    title: 'List fixed expenses',
    description:
      'List fixed expenses (sub-pockets of fixed pockets) with total value, periodicity in months, ' +
      'accumulated balance and monthly contribution, plus the groups they are organized in.',
    input: z.object({}).strict(),
    kind: 'read',
    handler: async (_input, { userId, di }) => {
      const [groups, subPockets] = await Promise.all([
        di.resolve(GetAllGroupsUseCase).execute(userId),
        di.resolve<ISubPocketRepository>('SubPocketRepository').findAllByUserId(userId),
      ]);
      return { groups, fixedExpenses: subPockets.map((sp) => sp.toJSON()) };
    },
  });

  defineTool(server, ctx, {
    name: 'finance_list_reminders',
    title: 'List reminders',
    description: 'List payment reminders with title, amount, due date, recurrence and paid status.',
    input: z.object({
      unpaidOnly: z.boolean().default(false),
    }).strict(),
    kind: 'read',
    handler: async ({ unpaidOnly }, { userId, di }) => {
      const reminders = await di.resolve(GetAllRemindersUseCase).execute(userId);
      return reminders
        .filter((r) => !unpaidOnly || !r.isPaid)
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        .map(({ userId: _owner, ...rest }) => rest);
    },
  });

  defineTool(server, ctx, {
    name: 'finance_convert_currency',
    title: 'Convert currency',
    description: `Convert an amount between ${CURRENCIES.join(', ')} using the app's current exchange rates.`,
    input: z.object({
      amount: z.number(),
      fromCurrency: currency,
      toCurrency: currency,
    }).strict(),
    kind: 'read',
    handler: (input, { di }) => di.resolve(ConvertCurrencyUseCase).execute(input),
  });
}
