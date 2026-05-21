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
