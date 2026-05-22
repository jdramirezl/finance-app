/**
 * Get Movements By Month Use Case
 *
 * Fetches movements for a specific year+month with pagination support.
 * Returns a PaginatedMovementsDTO envelope.
 *
 * Requirements: 10.5
 */

import { injectable, inject } from 'tsyringe';
import type { IMovementRepository } from '../../infrastructure/IMovementRepository';
import type { PaginatedMovementsDTO } from '../dtos/MovementDTO';
import { MovementMapper } from '../mappers/MovementMapper';
import { ValidationError } from '../../../../shared/errors/AppError';

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export interface GetMovementsByMonthOptions {
  page?: number;
  limit?: number;
  accountId?: string;
  pocketId?: string;
  isPending?: boolean;
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
    options?: GetMovementsByMonthOptions
  ): Promise<PaginatedMovementsDTO> {
    if (!year || year < 1900 || year > 2100) {
      throw new ValidationError('Invalid year - must be between 1900 and 2100');
    }

    if (!month || month < 1 || month > 12) {
      throw new ValidationError('Invalid month - must be between 1 and 12');
    }

    const page = this.normalisePage(options?.page);
    const limit = this.normaliseLimit(options?.limit);
    const offset = (page - 1) * limit;

    const filters = {
      year,
      month,
      accountId: options?.accountId,
      pocketId: options?.pocketId,
      isPending: options?.isPending,
    };

    const [movements, total] = await Promise.all([
      this.movementRepo.findAll(userId, filters, { limit, offset }),
      this.movementRepo.count(userId, filters),
    ]);

    return {
      data: MovementMapper.toDTOArray(movements),
      total,
      page,
      limit,
      hasMore: offset + movements.length < total,
    };
  }

  private normalisePage(page?: number): number {
    if (page === undefined || page === null) return DEFAULT_PAGE;
    if (!Number.isFinite(page) || !Number.isInteger(page) || page < 1) {
      throw new ValidationError('page must be a positive integer');
    }
    return page;
  }

  private normaliseLimit(limit?: number): number {
    if (limit === undefined || limit === null) return DEFAULT_LIMIT;
    if (!Number.isFinite(limit) || !Number.isInteger(limit) || limit < 1) return DEFAULT_LIMIT;
    return Math.min(limit, MAX_LIMIT);
  }
}
