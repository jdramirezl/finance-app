/**
 * Zod major-version parity tests.
 *
 * These pin the observable behavior of the request schemas and the
 * validate middleware so that a Zod upgrade cannot silently change what
 * the API accepts or rejects. They assert outcomes (accepted/rejected,
 * parsed data, error paths) rather than Zod's human-readable messages,
 * which are allowed to differ between major versions.
 */
import { randomUUID } from 'crypto';
import { Request, Response } from 'express';
import { validateBody, validateQuery } from './validate';
import { ValidationError } from '../errors/AppError';
import {
  createMovementSchema,
  updateMovementSchema,
  createTransferSchema,
} from '../../modules/movements/presentation/schemas';
import { createSnapshotSchema, updateSnapshotSchema } from '../../modules/net-worth/presentation/schemas';
import { updateSettingsSchema, convertCurrencySchema } from '../../modules/settings/presentation/schemas';
import { monthlyTrendQuerySchema, exchangeRateHistoryQuerySchema } from '../../modules/reports/presentation/schemas';
import { splitSeriesSchema, markAsPaidSchema } from '../../modules/reminders/presentation/schemas';
import { moveToGroupSchema } from '../../modules/sub-pockets/presentation/schemas';
import { createPocketSchema } from '../../modules/pockets/presentation/schemas';

const id = () => randomUUID();

const validMovement = () => ({
  type: 'EgresoNormal',
  accountId: id(),
  pocketId: id(),
  amount: 25000,
  displayedDate: '2026-10-18',
});

describe('Zod parity: ID fields', () => {
  it('accepts RFC 4122 v4 UUIDs', () => {
    expect(createMovementSchema.safeParse(validMovement()).success).toBe(true);
  });

  it.each([
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'AAAAAAAA-BBBB-1CCC-DDDD-EEEEEEEEEEEE',
  ])('keeps accepting any 8-4-4-4-12 hex id (%s)', (value) => {
    expect(createPocketSchema.safeParse({ accountId: value, name: 'x', type: 'normal' }).success).toBe(true);
  });

  it.each(['not-a-uuid', '', '1234', `${randomUUID()}x`])('rejects malformed id %p', (value) => {
    const result = createPocketSchema.safeParse({ accountId: value, name: 'x', type: 'normal' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toEqual(['accountId']);
  });
});

describe('Zod parity: object strictness', () => {
  it('strict schemas reject unknown keys', () => {
    const result = createMovementSchema.safeParse({ ...validMovement(), userId: 'x' });
    expect(result.success).toBe(false);
  });

  it('passthrough schemas keep unknown keys', () => {
    const result = updateSettingsSchema.safeParse({ primaryCurrency: 'USD', somethingNew: 1 });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual({ primaryCurrency: 'USD', somethingNew: 1 });
  });

  it('non-strict schemas strip unknown keys', () => {
    const result = monthlyTrendQuerySchema.safeParse({ months: '3', extra: 'y' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual({ months: 3 });
  });

  it('.omit() on a strict schema stays strict', () => {
    const base = { title: 'Rent', amount: 1, dueDate: '2026-11-01', recurrence: { type: 'monthly', interval: 1, endType: 'never' } };
    expect(splitSeriesSchema.safeParse({ splitDate: '2026-11-01', newDetails: base }).success).toBe(true);
    expect(splitSeriesSchema.safeParse({ splitDate: '2026-11-01', newDetails: { ...base, fixedExpenseId: id() } }).success).toBe(false);
  });
});

describe('Zod parity: optional / nullable', () => {
  it('optional fields may be omitted', () => {
    expect(updateMovementSchema.safeParse({}).success).toBe(true);
    expect(markAsPaidSchema.safeParse({}).success).toBe(true);
  });

  it('nullable fields accept null, non-nullable optional fields reject null', () => {
    expect(updateMovementSchema.safeParse({ subPocketId: null, category: null, tags: null }).success).toBe(true);
    expect(updateMovementSchema.safeParse({ notes: null }).success).toBe(false);
    expect(moveToGroupSchema.safeParse({ groupId: null }).success).toBe(true);
    expect(moveToGroupSchema.safeParse({}).success).toBe(false);
  });

  it('enforces numeric and string constraints', () => {
    expect(createMovementSchema.safeParse({ ...validMovement(), amount: 0 }).success).toBe(false);
    expect(createMovementSchema.safeParse({ ...validMovement(), amount: '10' }).success).toBe(false);
    expect(createMovementSchema.safeParse({ ...validMovement(), tags: Array(11).fill('a') }).success).toBe(false);
    expect(createTransferSchema.safeParse({
      sourceAccountId: id(), sourcePocketId: id(), targetAccountId: id(), targetPocketId: id(),
      amount: 5, displayedDate: '2026-10-18',
    }).success).toBe(true);
  });

  it('enums reject unknown values', () => {
    expect(createMovementSchema.safeParse({ ...validMovement(), type: 'Other' }).success).toBe(false);
    expect(convertCurrencySchema.safeParse({ amount: 1, fromCurrency: 'USD', toCurrency: 'JPY' }).success).toBe(false);
  });
});

describe('Zod parity: records keyed by currency enum', () => {
  it('accepts a partial breakdown (not every currency required)', () => {
    expect(createSnapshotSchema.safeParse({ totalNetWorth: 1, baseCurrency: 'USD', breakdown: { USD: 1 } }).success).toBe(true);
    expect(createSnapshotSchema.safeParse({ totalNetWorth: 1, baseCurrency: 'USD', breakdown: {} }).success).toBe(true);
    expect(updateSnapshotSchema.safeParse({ breakdown: { COP: 1, MXN: 2 } }).success).toBe(true);
  });

  it('rejects unknown currency keys and non-numeric values', () => {
    expect(createSnapshotSchema.safeParse({ totalNetWorth: 1, baseCurrency: 'USD', breakdown: { JPY: 1 } }).success).toBe(false);
    expect(createSnapshotSchema.safeParse({ totalNetWorth: 1, baseCurrency: 'USD', breakdown: { USD: 'x' } }).success).toBe(false);
  });
});

describe('Zod parity: coerced query params with defaults', () => {
  it('applies defaults when missing', () => {
    const result = monthlyTrendQuerySchema.safeParse({});
    expect(result.success && result.data).toEqual({ months: 6 });
  });

  it('coerces numeric strings and enforces bounds', () => {
    const ok = exchangeRateHistoryQuerySchema.safeParse({ base: 'USD', target: 'COP', days: '30' });
    expect(ok.success && ok.data).toEqual({ base: 'USD', target: 'COP', days: 30 });
    expect(exchangeRateHistoryQuerySchema.safeParse({ base: 'USD', target: 'COP', days: 'abc' }).success).toBe(false);
    expect(exchangeRateHistoryQuerySchema.safeParse({ base: 'USD', target: 'COP', days: '0' }).success).toBe(false);
  });

  it('keeps custom error messages', () => {
    const result = exchangeRateHistoryQuerySchema.safeParse({ base: '', target: 'COP' });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].message).toBe('base is required');
  });
});

describe('Zod parity: validate middleware', () => {
  const run = (mw: ReturnType<typeof validateBody>, req: Partial<Request>) => {
    const next = jest.fn();
    mw(req as Request, {} as Response, next);
    return next;
  };

  it('replaces req.body with parsed data on success', () => {
    const body = validMovement();
    const req: Partial<Request> = { body: { ...body } };
    const next = run(validateBody(createMovementSchema), req);
    expect(next).toHaveBeenCalledWith();
    expect(req.body).toEqual(body);
  });

  it('replaces req.query with parsed data on success', () => {
    const req = { query: { months: '12' } } as unknown as Partial<Request>;
    const next = run(validateQuery(monthlyTrendQuerySchema), req);
    expect(next).toHaveBeenCalledWith();
    expect(req.query).toEqual({ months: 12 });
  });

  it('passes a ValidationError formatted as "path: message; ..."', () => {
    const next = run(validateBody(createMovementSchema), { body: { ...validMovement(), amount: -1, accountId: 'bad' } });
    const err = next.mock.calls[0][0];
    expect(err).toBeInstanceOf(ValidationError);
    expect(err.message).toMatch(/^accountId: .+; amount: .+$/);
  });

  it('formats nested paths with dots', () => {
    const next = run(validateBody(splitSeriesSchema), {
      body: { splitDate: 'x', newDetails: { title: 'a', amount: 1, dueDate: 'd', recurrence: { type: 'monthly', interval: 0, endType: 'never' } } },
    });
    expect(next.mock.calls[0][0].message).toMatch(/^newDetails\.recurrence\.interval: .+$/);
  });
});
