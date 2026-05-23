import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useNetWorthChartData } from '../useNetWorthChartData';
import type { NetWorthSnapshot } from '../../services/netWorthSnapshotService';

const makeSnapshot = (overrides: Partial<NetWorthSnapshot> = {}): NetWorthSnapshot => ({
  id: 'snap-1',
  userId: 'user-1',
  snapshotDate: '2025-01-15',
  totalNetWorth: 10000,
  baseCurrency: 'USD',
  breakdown: { USD: 8000, MXN: 2000 },
  createdAt: '2025-01-15T00:00:00Z',
  ...overrides,
});

describe('useNetWorthChartData', () => {
  it('returns empty chartData and currencies for empty snapshots', () => {
    const { result } = renderHook(() =>
      useNetWorthChartData({
        snapshots: [],
        primaryCurrency: 'USD',
        dateRange: 'all',
        viewMode: 'total',
        showVariation: false,
      }),
    );

    expect(result.current.chartData).toEqual([]);
    expect(result.current.currencies).toEqual([]);
  });

  it('transforms snapshots into chart data with formatted dates', () => {
    const snapshots = [
      makeSnapshot({ id: 's1', snapshotDate: '2025-03-10', totalNetWorth: 5000, breakdown: { USD: 5000 } }),
      makeSnapshot({ id: 's2', snapshotDate: '2025-04-15', totalNetWorth: 7000, breakdown: { USD: 7000 } }),
    ];

    const { result } = renderHook(() =>
      useNetWorthChartData({
        snapshots,
        primaryCurrency: 'USD',
        dateRange: 'all',
        viewMode: 'total',
        showVariation: false,
      }),
    );

    expect(result.current.chartData).toHaveLength(2);
    expect(result.current.chartData[0].date).toBe('Mar 10');
    expect(result.current.chartData[0].total).toBe(5000);
    expect(result.current.chartData[0].snapshotId).toBe('s1');
    expect(result.current.chartData[1].date).toBe('Apr 15');
    expect(result.current.chartData[1].total).toBe(7000);
  });

  it('discovers all currencies from snapshot breakdowns', () => {
    const snapshots = [
      makeSnapshot({ id: 's1', breakdown: { USD: 5000, EUR: 2000 } }),
      makeSnapshot({ id: 's2', breakdown: { USD: 6000, MXN: 1000 } }),
    ];

    const { result } = renderHook(() =>
      useNetWorthChartData({
        snapshots,
        primaryCurrency: 'USD',
        dateRange: 'all',
        viewMode: 'breakdown',
        showVariation: false,
      }),
    );

    expect(result.current.currencies).toContain('USD');
    expect(result.current.currencies).toContain('EUR');
    expect(result.current.currencies).toContain('MXN');
    expect(result.current.currencies).toHaveLength(3);
  });

  it('filters snapshots by date range', () => {
    const now = new Date();
    const recent = new Date(now);
    recent.setDate(recent.getDate() - 10);
    const old = new Date(now);
    old.setDate(old.getDate() - 60);

    const snapshots = [
      makeSnapshot({ id: 'old', snapshotDate: old.toISOString().split('T')[0], totalNetWorth: 1000, breakdown: { USD: 1000 } }),
      makeSnapshot({ id: 'recent', snapshotDate: recent.toISOString().split('T')[0], totalNetWorth: 2000, breakdown: { USD: 2000 } }),
    ];

    const { result } = renderHook(() =>
      useNetWorthChartData({
        snapshots,
        primaryCurrency: 'USD',
        dateRange: '30d',
        viewMode: 'total',
        showVariation: false,
      }),
    );

    expect(result.current.chartData).toHaveLength(1);
    expect(result.current.chartData[0].snapshotId).toBe('recent');
  });

  it('computes variation percentages relative to first datum', () => {
    const snapshots = [
      makeSnapshot({ id: 's1', snapshotDate: '2025-01-01', totalNetWorth: 1000, breakdown: { USD: 1000 } }),
      makeSnapshot({ id: 's2', snapshotDate: '2025-02-01', totalNetWorth: 1500, breakdown: { USD: 1500 } }),
    ];

    const { result } = renderHook(() =>
      useNetWorthChartData({
        snapshots,
        primaryCurrency: 'USD',
        dateRange: 'all',
        viewMode: 'total',
        showVariation: true,
      }),
    );

    expect(result.current.chartData[0].total).toBe(0); // baseline = 0%
    expect(result.current.chartData[1].total).toBe(50); // 50% increase
    expect(result.current.chartData[1].total_original).toBe(1500);
  });
});
