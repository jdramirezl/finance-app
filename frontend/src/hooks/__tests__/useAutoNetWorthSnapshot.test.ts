import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

/**
 * Tests for {@link useAutoNetWorthSnapshot}. The hook is fire-once-per-mount:
 * after the consolidated total settles and the user's settings + last
 * snapshot are loaded, it decides whether enough time has passed to take
 * a fresh snapshot and calls the create mutation if so.
 *
 * The query hooks it depends on are mocked at module-level. We share a
 * single mutable state object per hook so each test can stage settings
 * and the latest snapshot before rendering.
 *
 * Frequency thresholds in the hook:
 *   - daily   → daysDiff >= 1
 *   - weekly  → daysDiff >= 7
 *   - monthly → daysDiff >= 30
 *   - manual  → never auto-snapshot
 */

const settingsState: { data: unknown; isLoading: boolean } = {
  data: undefined,
  isLoading: false,
};
const latestSnapshotState: { data: unknown; isLoading: boolean } = {
  data: undefined,
  isLoading: false,
};
const createMutation = { mutate: vi.fn(), isPending: false };

vi.mock('../queries', () => ({
  useSettingsQuery: () => settingsState,
}));

vi.mock('../queries/useNetWorthSnapshotQueries', () => ({
  useLatestSnapshotQuery: () => latestSnapshotState,
  useNetWorthSnapshotMutations: () => ({ createMutation }),
}));

import { useAutoNetWorthSnapshot } from '../useAutoNetWorthSnapshot';
import type { Currency } from '../../types';

const daysAgoISO = (days: number): string => {
  const d = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return d.toISOString().split('T')[0];
};

interface SetupArgs {
  consolidatedTotal?: number;
  totalsByCurrency?: Record<Currency, number>;
  isConsolidatedReady?: boolean;
}

const setup = ({
  consolidatedTotal = 5000,
  totalsByCurrency = { USD: 5000 } as Record<Currency, number>,
  isConsolidatedReady = true,
}: SetupArgs = {}) =>
  renderHook(() =>
    useAutoNetWorthSnapshot({
      consolidatedTotal,
      totalsByCurrency,
      isConsolidatedReady,
    }),
  );

describe('useAutoNetWorthSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsState.data = undefined;
    settingsState.isLoading = false;
    latestSnapshotState.data = undefined;
    latestSnapshotState.isLoading = false;
  });

  describe('preconditions', () => {
    it('does not mutate while the latest snapshot query is loading', () => {
      latestSnapshotState.isLoading = true;
      settingsState.data = { primaryCurrency: 'USD', snapshotFrequency: 'weekly' };

      setup();

      expect(createMutation.mutate).not.toHaveBeenCalled();
    });

    it('does not mutate when settings have not loaded yet', () => {
      settingsState.data = undefined;

      setup();

      expect(createMutation.mutate).not.toHaveBeenCalled();
    });

    it('does not mutate while the consolidated total is not ready', () => {
      settingsState.data = { primaryCurrency: 'USD', snapshotFrequency: 'weekly' };

      setup({ isConsolidatedReady: false });

      expect(createMutation.mutate).not.toHaveBeenCalled();
    });

    it('does not mutate when the user has chosen manual snapshots', () => {
      settingsState.data = { primaryCurrency: 'USD', snapshotFrequency: 'manual' };

      setup();

      expect(createMutation.mutate).not.toHaveBeenCalled();
    });
  });

  describe('first snapshot (no prior snapshot exists)', () => {
    it('takes a snapshot using consolidated total and breakdown', () => {
      settingsState.data = { primaryCurrency: 'USD', snapshotFrequency: 'weekly' };
      latestSnapshotState.data = undefined;

      setup({
        consolidatedTotal: 7500,
        totalsByCurrency: { USD: 7500 } as Record<Currency, number>,
      });

      expect(createMutation.mutate).toHaveBeenCalledWith({
        totalNetWorth: 7500,
        baseCurrency: 'USD',
        breakdown: { USD: 7500 },
      });
    });
  });

  describe('frequency thresholds', () => {
    it('takes a weekly snapshot when last one is 8 days old', () => {
      settingsState.data = { primaryCurrency: 'USD', snapshotFrequency: 'weekly' };
      latestSnapshotState.data = { snapshotDate: daysAgoISO(8) };

      setup();

      expect(createMutation.mutate).toHaveBeenCalledTimes(1);
    });

    it('skips when last weekly snapshot is only 3 days old', () => {
      settingsState.data = { primaryCurrency: 'USD', snapshotFrequency: 'weekly' };
      latestSnapshotState.data = { snapshotDate: daysAgoISO(3) };

      setup();

      expect(createMutation.mutate).not.toHaveBeenCalled();
    });

    it('takes a daily snapshot when last one is 2 days old', () => {
      settingsState.data = { primaryCurrency: 'USD', snapshotFrequency: 'daily' };
      latestSnapshotState.data = { snapshotDate: daysAgoISO(2) };

      setup();

      expect(createMutation.mutate).toHaveBeenCalledTimes(1);
    });

    it('takes a monthly snapshot when last one is 40 days old', () => {
      settingsState.data = { primaryCurrency: 'USD', snapshotFrequency: 'monthly' };
      latestSnapshotState.data = { snapshotDate: daysAgoISO(40) };

      setup();

      expect(createMutation.mutate).toHaveBeenCalledTimes(1);
    });

    it('skips when last monthly snapshot is 10 days old', () => {
      settingsState.data = { primaryCurrency: 'USD', snapshotFrequency: 'monthly' };
      latestSnapshotState.data = { snapshotDate: daysAgoISO(10) };

      setup();

      expect(createMutation.mutate).not.toHaveBeenCalled();
    });
  });

  describe('defaults', () => {
    it('falls back to weekly when snapshotFrequency is missing', () => {
      // No frequency set → hook defaults to weekly. With no prior snapshot
      // the first-snapshot path kicks in and a snapshot is taken.
      settingsState.data = { primaryCurrency: 'USD' };

      setup();

      expect(createMutation.mutate).toHaveBeenCalledTimes(1);
    });

    it('falls back to USD when primaryCurrency is missing', () => {
      settingsState.data = { snapshotFrequency: 'weekly' };

      setup({
        consolidatedTotal: 100,
        totalsByCurrency: { MXN: 1900 } as Record<Currency, number>,
      });

      expect(createMutation.mutate).toHaveBeenCalledWith({
        totalNetWorth: 100,
        baseCurrency: 'USD',
        breakdown: { MXN: 1900 },
      });
    });
  });

  describe('hasRun guard', () => {
    it('runs at most once per mount even when consolidatedTotal changes', () => {
      settingsState.data = { primaryCurrency: 'USD', snapshotFrequency: 'weekly' };

      const { rerender } = renderHook(
        ({ consolidatedTotal }: { consolidatedTotal: number }) =>
          useAutoNetWorthSnapshot({
            consolidatedTotal,
            totalsByCurrency: { USD: consolidatedTotal } as Record<Currency, number>,
            isConsolidatedReady: true,
          }),
        { initialProps: { consolidatedTotal: 100 } },
      );

      expect(createMutation.mutate).toHaveBeenCalledTimes(1);

      // consolidatedTotal lives in a ref and is NOT in the effect's deps, so
      // these re-renders don't even re-run the effect — and even if they
      // did, hasRun.current would short-circuit it.
      rerender({ consolidatedTotal: 200 });
      rerender({ consolidatedTotal: 300 });

      expect(createMutation.mutate).toHaveBeenCalledTimes(1);
    });

    it('captures the latest consolidatedTotal at the moment of mutation', () => {
      // First render sets refs and runs the effect immediately. The mutation
      // sees whatever consolidatedTotal was on first render — so we just
      // assert it lined up with the props we mounted with.
      settingsState.data = { primaryCurrency: 'USD', snapshotFrequency: 'weekly' };

      setup({
        consolidatedTotal: 12345,
        totalsByCurrency: { USD: 12345 } as Record<Currency, number>,
      });

      expect(createMutation.mutate).toHaveBeenCalledWith({
        totalNetWorth: 12345,
        baseCurrency: 'USD',
        breakdown: { USD: 12345 },
      });
    });
  });
});
