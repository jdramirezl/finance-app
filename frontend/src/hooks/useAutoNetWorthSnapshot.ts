/**
 * useAutoNetWorthSnapshot Hook
 *
 * Automatically takes a net worth snapshot on app load if:
 * 1. User has not set frequency to 'manual'
 * 2. Enough time has passed since the last snapshot
 * 3. The consolidated total is ready (all currency conversions settled)
 *
 * This hook consumes the consolidated total from useConsolidatedTotal rather
 * than computing its own currency conversion, eliminating the race condition
 * where snapshots could capture partial/stale exchange rate data.
 *
 * Multi-tab race condition: If multiple tabs open simultaneously, each may
 * attempt to create a snapshot. This is safe because the backend uses upsert
 * with a unique constraint on (user_id, snapshot_date) — concurrent writes
 * for the same day resolve to a single row.
 */

import { useEffect, useRef, useCallback } from 'react';
import { useSettingsQuery } from './queries';
import { useLatestSnapshotQuery, useNetWorthSnapshotMutations } from './queries/useNetWorthSnapshotQueries';
import { parseDate } from '../utils/dateUtils';
import type { Currency } from '../types';

export interface UseAutoNetWorthSnapshotParams {
  consolidatedTotal: number;
  totalsByCurrency: Record<Currency, number>;
  isConsolidatedReady: boolean;
}

export const useAutoNetWorthSnapshot = ({
  consolidatedTotal,
  totalsByCurrency,
  isConsolidatedReady,
}: UseAutoNetWorthSnapshotParams) => {
  const { data: settings } = useSettingsQuery();
  const { data: latestSnapshot, isLoading: loadingSnapshot } = useLatestSnapshotQuery();
  const { createMutation } = useNetWorthSnapshotMutations();
  const hasRun = useRef(false);
  const totalRef = useRef(consolidatedTotal);
  const breakdownRef = useRef(totalsByCurrency);

  // Keep refs in sync without triggering re-renders
  totalRef.current = consolidatedTotal;
  breakdownRef.current = totalsByCurrency;

  const takeSnapshot = useCallback(() => {
    if (!settings) return;
    const primaryCurrency = (settings.primaryCurrency || 'USD') as Currency;
    createMutation.mutate(
      {
        totalNetWorth: totalRef.current,
        baseCurrency: primaryCurrency,
        breakdown: breakdownRef.current as Record<string, number>,
      },
      {
        onSuccess: () => { hasRun.current = true; },
        onError: () => { /* Allow retry on next effect cycle */ },
      }
    );
  }, [settings, createMutation]);

  useEffect(() => {
    if (hasRun.current) return;
    if (loadingSnapshot) return;
    if (!settings) return;
    if (!isConsolidatedReady) return;

    const frequency = settings.snapshotFrequency || 'weekly';
    if (frequency === 'manual') return;

    const shouldTakeSnapshot = (): boolean => {
      if (!latestSnapshot) return true;

      const lastDate = parseDate(latestSnapshot.snapshotDate);
      const now = new Date();
      const daysDiff = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

      switch (frequency) {
        case 'daily':
          return daysDiff >= 1;
        case 'weekly':
          return daysDiff >= 7;
        case 'monthly':
          return daysDiff >= 30;
        default:
          return false;
      }
    };

    if (shouldTakeSnapshot()) {
      takeSnapshot();
    } else {
      hasRun.current = true;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings, latestSnapshot, loadingSnapshot, isConsolidatedReady, takeSnapshot]);
};
