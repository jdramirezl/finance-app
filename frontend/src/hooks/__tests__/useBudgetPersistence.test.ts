import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { DistributionEntry } from '../../components/budget';
import type { PlanningScenario } from '../../components/budget/ScenarioForm';
import { useBudgetPersistence } from '../useBudgetPersistence';

/**
 * Tests for {@link useBudgetPersistence}. The hook owns purely device-local
 * UI state for the budget planner and persists it to localStorage. The
 * non-obvious bits we want pinned down:
 *   - Loads from localStorage once on mount, falling back to defaults when
 *     the key is missing or the JSON is corrupt.
 *   - The first effect run (load → set) does NOT write back; only
 *     subsequent state changes are persisted.
 *   - Writes are debounced by 500ms — rapid edits coalesce into one
 *     `setItem` call.
 *   - Persists each tracked field (initialAmount, distributionEntries,
 *     scenarios, defaultAccountId, defaultPocketId).
 */

const STORAGE_KEY = 'finance_app_budget_planning';

const flushDebounce = () => {
  // Push past the 500ms PERSIST_DELAY_MS in the hook.
  act(() => {
    vi.advanceTimersByTime(500);
  });
};

const sampleEntry = (overrides: Partial<DistributionEntry> = {}): DistributionEntry => ({
  id: 'dist-1',
  name: 'Rent',
  percentage: 30,
  ...overrides,
});

const sampleScenario = (overrides: Partial<PlanningScenario> = {}): PlanningScenario => ({
  id: 'sce-1',
  name: 'Cancel streaming',
  expenseIds: ['exp-1'],
  ...overrides,
});

describe('useBudgetPersistence', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('initial load', () => {
    it('returns defaults when localStorage is empty', () => {
      const { result } = renderHook(() => useBudgetPersistence());

      expect(result.current.initialAmount).toBe(0);
      expect(result.current.distributionEntries).toEqual([]);
      expect(result.current.scenarios).toEqual([]);
      expect(result.current.defaultAccountId).toBe('');
      expect(result.current.defaultPocketId).toBe('');
    });

    it('hydrates from localStorage when a saved payload exists', () => {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          initialAmount: 5000,
          distributionEntries: [sampleEntry()],
          scenarios: [sampleScenario()],
          defaultAccountId: 'acc-1',
          defaultPocketId: 'pkt-1',
        }),
      );

      const { result } = renderHook(() => useBudgetPersistence());

      expect(result.current.initialAmount).toBe(5000);
      expect(result.current.distributionEntries).toEqual([sampleEntry()]);
      expect(result.current.scenarios).toEqual([sampleScenario()]);
      expect(result.current.defaultAccountId).toBe('acc-1');
      expect(result.current.defaultPocketId).toBe('pkt-1');
    });

    it('falls back to defaults when the stored payload is invalid JSON', () => {
      localStorage.setItem(STORAGE_KEY, '{not valid json');

      const { result } = renderHook(() => useBudgetPersistence());

      expect(result.current.initialAmount).toBe(0);
      expect(result.current.distributionEntries).toEqual([]);
    });

    it('merges partial saved payloads with defaults', () => {
      // Older payload that only saved a couple of fields — the hook should
      // still return sensible defaults for the missing ones.
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ initialAmount: 1234 }),
      );

      const { result } = renderHook(() => useBudgetPersistence());

      expect(result.current.initialAmount).toBe(1234);
      expect(result.current.distributionEntries).toEqual([]);
      expect(result.current.scenarios).toEqual([]);
      expect(result.current.defaultAccountId).toBe('');
    });
  });

  describe('debounced persistence', () => {
    it('does not write to localStorage on the first effect run (mount only)', () => {
      const setItemSpy = vi.spyOn(localStorage, 'setItem');

      renderHook(() => useBudgetPersistence());
      flushDebounce();

      expect(setItemSpy).not.toHaveBeenCalled();
    });

    it('persists initialAmount changes after the 500ms debounce', () => {
      const setItemSpy = vi.spyOn(localStorage, 'setItem');
      const { result } = renderHook(() => useBudgetPersistence());

      act(() => {
        result.current.setInitialAmount(2500);
      });

      // Before the debounce fires, nothing has been written.
      expect(setItemSpy).not.toHaveBeenCalled();

      flushDebounce();

      expect(setItemSpy).toHaveBeenCalledTimes(1);
      const [key, value] = setItemSpy.mock.calls[0];
      expect(key).toBe(STORAGE_KEY);
      expect(JSON.parse(value as string)).toEqual({
        initialAmount: 2500,
        distributionEntries: [],
        scenarios: [],
        defaultAccountId: '',
        defaultPocketId: '',
        budgetCurrency: '',
      });
    });

    it('coalesces rapid edits into a single write', () => {
      const setItemSpy = vi.spyOn(localStorage, 'setItem');
      const { result } = renderHook(() => useBudgetPersistence());

      act(() => {
        result.current.setInitialAmount(100);
      });
      act(() => {
        vi.advanceTimersByTime(200);
        result.current.setInitialAmount(200);
      });
      act(() => {
        vi.advanceTimersByTime(200);
        result.current.setInitialAmount(300);
      });

      // No write yet — every edit reset the timer.
      expect(setItemSpy).not.toHaveBeenCalled();

      flushDebounce();

      expect(setItemSpy).toHaveBeenCalledTimes(1);
      const lastValue = JSON.parse(setItemSpy.mock.calls[0][1] as string);
      expect(lastValue.initialAmount).toBe(300);
    });

    it('persists distributionEntries updates', () => {
      const setItemSpy = vi.spyOn(localStorage, 'setItem');
      const { result } = renderHook(() => useBudgetPersistence());

      act(() => {
        result.current.setDistributionEntries([sampleEntry({ id: 'a', percentage: 40 })]);
      });
      flushDebounce();

      const stored = JSON.parse(setItemSpy.mock.calls[0][1] as string);
      expect(stored.distributionEntries).toEqual([
        sampleEntry({ id: 'a', percentage: 40 }),
      ]);
    });

    it('persists scenarios updates (supports functional setState)', () => {
      const setItemSpy = vi.spyOn(localStorage, 'setItem');
      const { result } = renderHook(() => useBudgetPersistence());

      act(() => {
        result.current.setScenarios((prev) => [...prev, sampleScenario({ id: 's-new' })]);
      });
      flushDebounce();

      const stored = JSON.parse(setItemSpy.mock.calls[0][1] as string);
      expect(stored.scenarios).toEqual([sampleScenario({ id: 's-new' })]);
    });

    it('persists defaultAccountId and defaultPocketId', () => {
      const setItemSpy = vi.spyOn(localStorage, 'setItem');
      const { result } = renderHook(() => useBudgetPersistence());

      act(() => {
        result.current.setDefaultAccountId('acc-9');
        result.current.setDefaultPocketId('pkt-9');
      });
      flushDebounce();

      // Both updates land in the same debounced write.
      expect(setItemSpy).toHaveBeenCalledTimes(1);
      const stored = JSON.parse(setItemSpy.mock.calls[0][1] as string);
      expect(stored.defaultAccountId).toBe('acc-9');
      expect(stored.defaultPocketId).toBe('pkt-9');
    });

    it('cancels the pending write when the hook unmounts before the debounce fires', () => {
      const setItemSpy = vi.spyOn(localStorage, 'setItem');
      const { result, unmount } = renderHook(() => useBudgetPersistence());

      act(() => {
        result.current.setInitialAmount(42);
      });

      unmount();
      flushDebounce();

      expect(setItemSpy).not.toHaveBeenCalled();
    });
  });

  describe('error tolerance', () => {
    it('swallows setItem failures so the UI is not broken by quota errors', () => {
      const setItemSpy = vi
        .spyOn(localStorage, 'setItem')
        .mockImplementation(() => {
          throw new Error('QuotaExceeded');
        });

      const { result } = renderHook(() => useBudgetPersistence());

      expect(() => {
        act(() => {
          result.current.setInitialAmount(7);
        });
        flushDebounce();
      }).not.toThrow();

      expect(setItemSpy).toHaveBeenCalled();
    });
  });
});
