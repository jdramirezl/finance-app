import { useQuery } from '@tanstack/react-query';
import { fixedExpenseGroupService } from '../../services/fixedExpenseGroupService';

export const useFixedExpenseGroupsQuery = () => {
    return useQuery({
        queryKey: ['fixedExpenseGroups'],
        queryFn: () => fixedExpenseGroupService.getAll(),
        staleTime: 1000 * 60 * 10, // 10 minutes - fixed expense groups change infrequently
    });
};
