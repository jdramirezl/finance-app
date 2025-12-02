/**
 * Get Movements By Month Use Case
 * 
 * Fetches and groups movements by month.
 * 
 * Requirements: 10.5
 */

import { injectable, inject } from 'tsyringe';
import type { IMovementRepository } from '../../infrastructure/IMovementRepository';
import type { MovementResponseDTO } from '../dtos/MovementDTO';
import { MovementMapper } from '../mappers/MovementMapper';
import { ValidationError } from '../../../../shared/errors/AppError';

/**
 * Grouped movements by month
 */
export interface MovementsByMonthDTO {
  year: number;
  month: number;
  movements: MovementResponseDTO[];
}

@injectable()
export class GetMovementsByMonthUseCase {
  constructor(
    @inject('MovementRepository') private movementRepo: IMovementRepository
  ) {}

  async execute(
    year: number,
    month: number,
    userId: string,
    filters?: {
      accountId?: string;
      pocketId?: string;
      isPending?: boolean;
    }
  ): Promise<MovementsByMonthDTO> {
    // Validate year
    if (!year || year < 1900 || year > 2100) {
      throw new ValidationError('Invalid year - must be between 1900 and 2100');
    }

    // Validate month
    if (!month || month < 1 || month > 12) {
      throw new ValidationError('Invalid month - must be between 1 and 12');
    }

    // Fetch movements for the specified month
    const movements = await this.movementRepo.findByMonth(year, month, userId);

    // Apply additional filters if provided
    let filteredMovements = movements;

    if (filters?.accountId) {
      filteredMovements = filteredMovements.filter(m => m.accountId === filters.accountId);
    }

    if (filters?.pocketId) {
      filteredMovements = filteredMovements.filter(m => m.pocketId === filters.pocketId);
    }

    if (filters?.isPending !== undefined) {
      filteredMovements = filteredMovements.filter(m => m.isPending === filters.isPending);
    }

    // Convert to DTOs
    return {
      year,
      month,
      movements: MovementMapper.toDTOArray(filteredMovements),
    };
  }
}
