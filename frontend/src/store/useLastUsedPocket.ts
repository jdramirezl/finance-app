import { create } from 'zustand';
import type { Account, Pocket, MovementType, Settings } from '../types';

type SimpleType = 'expense' | 'income';

interface PocketRef {
  accountId: string;
  pocketId: string;
}

interface ResolvedPocket extends PocketRef {
  lastType: MovementType;
}

interface LastUsedPocketStore {
  expense: PocketRef | null;
  income: PocketRef | null;
  lastType: MovementType | null;
  setLastUsed: (
    type: SimpleType,
    accountId: string,
    pocketId: string,
    movementType?: MovementType,
  ) => void;
  getLastUsed: (type: SimpleType) => PocketRef | null;
  getLastType: () => MovementType | null;
}

const STORAGE_KEY = 'finance-app-last-used-pocket';

const DEFAULT_MOVEMENT_TYPE: MovementType = 'EgresoNormal';

const VALID_MOVEMENT_TYPES: ReadonlySet<MovementType> = new Set([
  'IngresoNormal',
  'EgresoNormal',
  'IngresoFijo',
  'EgresoFijo',
]);

const isMovementType = (value: unknown): value is MovementType =>
  typeof value === 'string' && VALID_MOVEMENT_TYPES.has(value as MovementType);

type PersistedState = Pick<LastUsedPocketStore, 'expense' | 'income' | 'lastType'>;

const load = (): PersistedState => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { expense: null, income: null, lastType: null };
    const parsed = JSON.parse(raw);
    return {
      expense: parsed.expense ?? null,
      income: parsed.income ?? null,
      lastType: isMovementType(parsed.lastType) ? parsed.lastType : null,
    };
  } catch {
    return { expense: null, income: null, lastType: null };
  }
};

const save = (state: PersistedState) => {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        expense: state.expense,
        income: state.income,
        lastType: state.lastType,
      }),
    );
  } catch {
    // localStorage may be unavailable
  }
};

export const useLastUsedPocket = create<LastUsedPocketStore>((set, get) => ({
  ...load(),
  setLastUsed: (type, accountId, pocketId, movementType) => {
    const next: Partial<PersistedState> = { [type]: { accountId, pocketId } };
    if (movementType !== undefined) {
      next.lastType = movementType;
    }
    set(next);
    const current = get();
    save({
      expense: current.expense,
      income: current.income,
      lastType: current.lastType,
    });
  },
  getLastUsed: (type) => get()[type],
  getLastType: () => get().lastType,
}));

/**
 * Resolve the last-used pocket for a movement type, falling back to the
 * DB-configured default, then to the first available account+pocket.
 *
 * Also returns the last-used MovementType from the store (defaults to
 * `'EgresoNormal'` when nothing is stored).
 *
 * Priority for the pocket: last-used (localStorage) → DB default (settings)
 * → first account.
 */
export function resolveLastUsedPocket(
  type: SimpleType,
  accounts: Account[],
  pockets: Pocket[],
  settings?: Settings,
): ResolvedPocket | null {
  const state = useLastUsedPocket.getState();
  const lastType = state.getLastType() ?? DEFAULT_MOVEMENT_TYPE;

  const stored = state.getLastUsed(type);
  if (stored) {
    const accountExists = accounts.some((a) => a.id === stored.accountId);
    const pocketExists = pockets.some((p) => p.id === stored.pocketId && p.accountId === stored.accountId);
    if (accountExists && pocketExists) return { ...stored, lastType };
  }

  // Fallback: DB-configured default
  if (settings) {
    const defaultAccountId = type === 'expense'
      ? settings.defaultExpenseAccountId
      : settings.defaultIncomeAccountId;
    const defaultPocketId = type === 'expense'
      ? settings.defaultExpensePocketId
      : settings.defaultIncomePocketId;
    if (defaultAccountId && defaultPocketId) {
      const accountExists = accounts.some((a) => a.id === defaultAccountId);
      const pocketExists = pockets.some((p) => p.id === defaultPocketId && p.accountId === defaultAccountId);
      if (accountExists && pocketExists) {
        return { accountId: defaultAccountId, pocketId: defaultPocketId, lastType };
      }
    }
  }

  // Final fallback: first account's first pocket
  const firstAccount = accounts[0];
  if (!firstAccount) return null;
  const firstPocket = pockets.find((p) => p.accountId === firstAccount.id);
  if (!firstPocket) return null;
  return { accountId: firstAccount.id, pocketId: firstPocket.id, lastType };
}

/** Map MovementType to the simple type used by the store. */
export function toSimpleType(type: MovementType): SimpleType {
  return type.startsWith('Ingreso') ? 'income' : 'expense';
}
