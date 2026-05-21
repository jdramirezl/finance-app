import { useQuery } from '@tanstack/react-query';
import { reportService } from '../../services/reportService';

export const useSpendingByCategoryQuery = (startDate: string, endDate: string) => {
  return useQuery({
    queryKey: ['reports', 'spending-by-category', startDate, endDate],
    queryFn: () => reportService.getSpendingByCategory(startDate, endDate),
    staleTime: 1000 * 60 * 5,
    enabled: !!startDate && !!endDate,
  });
};

export const useMonthlyTrendQuery = (months: number = 6) => {
  return useQuery({
    queryKey: ['reports', 'monthly-trend', months],
    queryFn: () => reportService.getMonthlyTrend(months),
    staleTime: 1000 * 60 * 5,
  });
};

export const useCategoryTrendQuery = (category: string, months: number = 6) => {
  return useQuery({
    queryKey: ['reports', 'category-trend', category, months],
    queryFn: () => reportService.getCategoryTrend(category, months),
    staleTime: 1000 * 60 * 5,
    enabled: !!category,
  });
};

export const useExchangeRateHistoryQuery = (base: string, target: string, days: number = 90) => {
  return useQuery({
    queryKey: ['reports', 'exchange-rate-history', base, target, days],
    queryFn: () => reportService.getExchangeRateHistory(base, target, days),
    staleTime: 1000 * 60 * 30, // 30 min — rates don't change fast
    enabled: !!base && !!target && base !== target,
  });
};
