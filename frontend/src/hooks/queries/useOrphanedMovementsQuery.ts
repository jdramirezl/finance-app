import { useQuery } from '@tanstack/react-query';
import { movementService } from '../../services/movementService';

export const useOrphanedMovementsQuery = () => {
    return useQuery({
        queryKey: ['movements', 'orphaned'],
        queryFn: () => movementService.getOrphanedMovements(),
    });
};
