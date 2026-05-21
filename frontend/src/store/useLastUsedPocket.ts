import { create } from 'zustand';
import type { Account, Pocket, MovementType } from '../types';

type SimpleType = 'expense' | 'income';

interface PocketRef {
  accountId: string;
  pocketId: string;
}

interface LastUsedPocketStore {
  expense: PocketRef | null;
  income: PocketRef | null;
  setLastUsed: (type: SimpleType, accountId: string, pocketId: string) => void;
  getLastUsed: (type: SimpleType) => PocketRef | null;
}

const STORAGE_KEY = 'finance-app-last-used-pocket';

const load = (): Pick<LastUsedPocketStore, 'expense' | 'income'> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { expense: null, income: null };
    const parsed = JSON.parse(raw);
    return {
      expense: parsed.expense ?? null,
      income: parsed.income ?? null,
    };
  } catch {
    return { expense: null, income: null };
  }
};

const save = (state: Pick<LastUsedPocketStore, 'expense' | 'income'>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ expense: state.expense, income: state.income }));
  } catch {
    // localStorage may be unavailable
  }
};

export const useLastUsedPocket = create<LastUsedPocketStore>((set, get) => ({
  ...load(),
  setLastUsed: (type, accountId, pocketId) => {
    set({ [type]: { accountId, pocketId } });
    save({ ...get(), [type]: { accountId, pocketId } });
  },
  getLastUsed: (type) => get()[type],
}));

/**
 * Resolve the last-used pocket for a movement type, falling back to the
 * first available account+pocket if the stored reference is stale.
 */
export function resolveLastUsedPocket(
  type: SimpleType,
  accounts: Account[],
  pockets: Pocket[],
): PocketRef | null {
  const stored = useLastUsedPocket.getState().getLastUsed(type);
  if (stored) {
    const accountExists = accounts.some((a) => a.id === stored.accountId);
    const pocketExists = pockets.some((p) => p.id === stored.pocketId && p.accountId === stored.accountId);
    if (accountExists && pocketExists) return stored;
  }
  // Fallback: first account's first pocket
  const firstAccount = accounts[0];
  if (!firstAccount) return null;
  const firstPocket = pockets.find((p) => p.accountId === firstAccount.id);
  if (!firstPocket) return null;
  return { accountId: firstAccount.id, pocketId: firstPocket.id };
}

/** Map MovementType to the simple type used by the store. */
export function toSimpleType(type: MovementType): SimpleType {
  return type.startsWith('Ingreso') ? 'income' : 'expense';
}
