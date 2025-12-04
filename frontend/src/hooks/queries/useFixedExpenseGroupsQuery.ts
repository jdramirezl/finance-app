import { useQuery } from '@tanstack/react-query';
import { fixedExpenseGroupService } from '../../services/fixedExpenseGroupService';

export const useFixedExpenseGroupsQuery = () => {
    return useQuery({
        queryKey: ['fixedExpenseGroups'],
        queryFn: () => fixedExpenseGroupService.getAll(),
    });
};
