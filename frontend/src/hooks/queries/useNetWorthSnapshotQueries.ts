/**
 * Net Worth Snapshot Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { netWorthSnapshotService, type CreateSnapshotDTO } from '../../services/netWorthSnapshotService';
import { useToast } from '../useToast';

export const useNetWorthSnapshotsQuery = () => {
    return useQuery({
        queryKey: ['netWorthSnapshots'],
        queryFn: netWorthSnapshotService.getAll,
    });
};

export const useLatestSnapshotQuery = () => {
    return useQuery({
        queryKey: ['netWorthSnapshots', 'latest'],
        queryFn: netWorthSnapshotService.getLatest,
    });
};

export const useNetWorthSnapshotMutations = () => {
    const queryClient = useQueryClient();
    const toast = useToast();

    const createMutation = useMutation({
        mutationFn: (data: CreateSnapshotDTO) => netWorthSnapshotService.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['netWorthSnapshots'] });
            toast.success('Snapshot created');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to create snapshot');
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => netWorthSnapshotService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['netWorthSnapshots'] });
            toast.success('Snapshot deleted');
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.error || 'Failed to delete snapshot');
        },
    });

    return { createMutation, deleteMutation };
};
