/**
 * Net Worth Snapshot Query Hooks
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { netWorthSnapshotService, type CreateSnapshotDTO } from '../../services/netWorthSnapshotService';
import { useToast } from '../useToast';

const errorMessage = (error: unknown, fallback: string): string =>
    error instanceof Error && error.message ? error.message : fallback;

export const useNetWorthSnapshotsQuery = () => {
    return useQuery({
        queryKey: ['netWorthSnapshots'],
        queryFn: netWorthSnapshotService.getAll,
        staleTime: 1000 * 60 * 10, // 10 minutes - snapshots are daily at most
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
        onError: (error) => {
            toast.error(errorMessage(error, 'Failed to create snapshot'));
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string, data: Partial<CreateSnapshotDTO> }) =>
            netWorthSnapshotService.update(id, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['netWorthSnapshots'] });
            toast.success('Snapshot updated');
        },
        onError: (error) => {
            toast.error(errorMessage(error, 'Failed to update snapshot'));
        },
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => netWorthSnapshotService.delete(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['netWorthSnapshots'] });
            toast.success('Snapshot deleted');
        },
        onError: (error) => {
            toast.error(errorMessage(error, 'Failed to delete snapshot'));
        },
    });

    return { createMutation, updateMutation, deleteMutation };
};
