import { useQuery } from '@tanstack/react-query';
import { movementService } from '../../services/movementService';

export const useMovementYearsQuery = () => {
  return useQuery({
    queryKey: ['movements', 'years'],
    queryFn: () => movementService.getMovementYears(),
  });
};
