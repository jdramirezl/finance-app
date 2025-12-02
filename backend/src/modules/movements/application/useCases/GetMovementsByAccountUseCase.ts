/**
 * Get Movements By Account Use Case
 * 
 * Fetches and filters movements for a specific account.
 * 
 * Requirements: 10.5
 */

import { injectable, inject } from 'tsyringe';
import type { IMovementRepository, MovementFilters } from '../../infrastructure/IMovementRepository';
import type { MovementResponseDTO } from '../dtos/MovementDTO';
import { MovementMapper } from '../mappers/MovementMapper';
import { ValidationError } from '../../../../shared/errors/AppError';

@injectable()
export class GetMovementsByAccountUseCase {
  constructor(
    @inject('MovementRepository') private movementRepo: IMovementRepository
  ) {}

  async execute(
    accountId: string,
    userId: string,
    filters?: {
      isPending?: boolean;
      startDate?: string;
      endDate?: string;
      year?: number;
      month?: number;
    }
  ): Promise<MovementResponseDTO[]> {
    // Validate accountId
    if (!accountId?.trim()) {
      throw new ValidationError('Account ID is required');
    }

    // Build filters
    const movementFilters: MovementFilters = {
      accountId,
      isPending: filters?.isPending,
      year: filters?.year,
      month: filters?.month,
    };

    // Parse date filters if provided
    if (filters?.startDate) {
      const startDate = new Date(filters.startDate);
      if (isNaN(startDate.getTime())) {
        throw new ValidationError('Invalid start date format');
      }
      movementFilters.startDate = startDate;
    }

    if (filters?.endDate) {
      const endDate = new Date(filters.endDate);
      if (isNaN(endDate.getTime())) {
        throw new ValidationError('Invalid end date format');
      }
      movementFilters.endDate = endDate;
    }

    // Fetch movements
    const movements = await this.movementRepo.findAll(userId, movementFilters);

    // Convert to DTOs
    return MovementMapper.toDTOArray(movements);
  }
}
