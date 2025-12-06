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

            const lastDate = new Date(latestSnapshot.snapshotDate);
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

            // Calculate net worth
            const calculateNetWorth = async () => {
                const primaryCurrency = settings.primaryCurrency || 'USD';
                let totalNetWorth = 0;
                const breakdown: Record<string, number> = {};

                for (const account of accounts) {
                    // Add to breakdown per currency
                    const currency = account.currency;
                    breakdown[currency] = (breakdown[currency] || 0) + account.balance;

                    // Convert to primary currency for total
                    // Handle negative balances by converting absolute value and applying sign
                    const sign = account.balance >= 0 ? 1 : -1;
                    const absBalance = Math.abs(account.balance);

                    if (absBalance === 0) {
                        // Skip zero balances
                        continue;
                    }

                    try {
                        const converted = await currencyService.convert(
                            absBalance,
                            currency as Currency,
                            primaryCurrency as Currency
                        );
                        totalNetWorth += sign * converted;
                    } catch {
                        // If conversion fails, use raw balance
                        totalNetWorth += account.balance;
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
