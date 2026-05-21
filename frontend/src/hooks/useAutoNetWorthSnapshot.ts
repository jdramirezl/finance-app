/**
 * useAutoNetWorthSnapshot Hook
 *
 * Automatically takes a net worth snapshot on app load if:
 * 1. User has not set frequency to 'manual'
 * 2. Enough time has passed since the last snapshot
 */

import { useEffect, useRef } from 'react';
import { useAccountsQuery, useSettingsQuery } from './queries';
import { useLatestSnapshotQuery, useNetWorthSnapshotMutations } from './queries/useNetWorthSnapshotQueries';
import { currencyService } from '../services/currencyService';
import { parseDate } from '../utils/dateUtils';
import type { Currency } from '../types';

export const useAutoNetWorthSnapshot = () => {
    const { data: accounts = [] } = useAccountsQuery();
    const { data: settings } = useSettingsQuery();
    const { data: latestSnapshot, isLoading: loadingSnapshot } = useLatestSnapshotQuery();
    const { createMutation } = useNetWorthSnapshotMutations();
    const hasRun = useRef(false);

    useEffect(() => {
        // Only run once per app session
        if (hasRun.current) return;
        if (loadingSnapshot) return;
        if (accounts.length === 0) return;
        if (!settings) return;

        const frequency = settings.snapshotFrequency || 'weekly';
        if (frequency === 'manual') return;

        const shouldTakeSnapshot = () => {
            if (!latestSnapshot) return true; // No snapshots yet

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
            hasRun.current = true;

            // Calculate net worth using a single batched currency conversion
            // call so we don't fan out one HTTP request per account.
            const calculateNetWorth = async () => {
                const primaryCurrency = (settings.primaryCurrency || 'USD') as Currency;
                let totalNetWorth = 0;
                const breakdown: Record<string, number> = {};

                // Per-account jobs that need a cross-currency conversion. We
                // record the original sign and raw balance so we can apply
                // them to the converted amount, and fall back gracefully if
                // the batch call fails.
                type ConvertJob = { sign: number; rawBalance: number };
                const conversions: Array<{ amount: number; from: string; to: string }> = [];
                const jobs: ConvertJob[] = [];

                for (const account of accounts) {
                    const currency = account.currency as Currency;
                    breakdown[currency] = (breakdown[currency] || 0) + account.balance;

                    // Convert to primary currency for total. Negative
                    // balances convert their absolute value and re-apply the
                    // sign to preserve the conversion direction.
                    const sign = account.balance >= 0 ? 1 : -1;
                    const absBalance = Math.abs(account.balance);

                    if (absBalance === 0) {
                        // Skip zero balances entirely.
                        continue;
                    }

                    if (currency === primaryCurrency) {
                        // No conversion needed for accounts already in the
                        // primary currency.
                        totalNetWorth += sign * absBalance;
                        continue;
                    }

                    conversions.push({
                        amount: absBalance,
                        from: currency,
                        to: primaryCurrency,
                    });
                    jobs.push({ sign, rawBalance: account.balance });
                }

                if (conversions.length > 0) {
                    try {
                        const results = await currencyService.convertBatch(conversions);
                        for (let i = 0; i < results.length; i += 1) {
                            totalNetWorth += jobs[i].sign * results[i].convertedAmount;
                        }
                    } catch {
                        // If the batch conversion fails, fall back to raw
                        // (unconverted) balances. This mirrors the previous
                        // per-account fallback at a coarser granularity, so
                        // a snapshot is still recorded rather than silently
                        // dropped.
                        for (const job of jobs) {
                            totalNetWorth += job.rawBalance;
                        }
                    }
                }

                createMutation.mutate({
                    totalNetWorth,
                    baseCurrency: primaryCurrency,
                    breakdown
                });
            };

            calculateNetWorth();
        }
    }, [accounts, settings, latestSnapshot, loadingSnapshot, createMutation]);
};
