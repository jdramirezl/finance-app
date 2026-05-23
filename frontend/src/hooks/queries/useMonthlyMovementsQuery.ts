import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { movementService } from '../../services/movementService';

export const useMonthlyMovementsQuery = (
  year: number,
  month: number,
  page: number,
  limit: number,
  filters?: { category?: string; tags?: string[] },
) => {
  return useQuery({
    queryKey: ['movements', 'monthly', year, month, page, limit, filters],
    queryFn: () => movementService.getMovementsByMonth(year, month, page, limit, filters),
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
};
