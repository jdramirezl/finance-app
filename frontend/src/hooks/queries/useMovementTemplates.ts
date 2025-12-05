import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { movementTemplateService } from '../../services/movementTemplateService';
import type { MovementType } from '../../types';

export const useMovementTemplatesQuery = () => {
    return useQuery({
        queryKey: ['movementTemplates'],
        queryFn: () => movementTemplateService.getAllTemplates(),
    });
};

export const useMovementTemplateMutations = () => {
    const queryClient = useQueryClient();

    const createMovementTemplate = useMutation({
        mutationFn: (data: {
            name: string;
            type: MovementType;
            accountId: string;
            pocketId: string;
            defaultAmount?: number | null;
            notes?: string | null;
            subPocketId?: string | null;
        }) =>
            movementTemplateService.createTemplate(
                data.name,
                data.type,
                data.accountId,
                data.pocketId,
                data.defaultAmount,
                data.notes,
                data.subPocketId
            ),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['movementTemplates'] });
        },
    });

    const updateMovementTemplate = useMutation({
        mutationFn: (data: {
            id: string;
            updates: Partial<{
                name: string;
                type: MovementType;
                accountId: string;
                pocketId: string;
                subPocketId: string | null;
                defaultAmount: number | null;
                notes: string | null;
            }>;
        }) => movementTemplateService.updateTemplate(data.id, data.updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['movementTemplates'] });
        },
    });

    const deleteMovementTemplate = useMutation({
        mutationFn: (id: string) => movementTemplateService.deleteTemplate(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['movementTemplates'] });
        },
    });

    return {
        createMovementTemplate,
        updateMovementTemplate,
        deleteMovementTemplate,
    };
};
