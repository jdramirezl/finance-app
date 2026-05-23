/**
 * Get All Movements Use Case
 *
 * Fetches a paginated list of every movement belonging to the authenticated
 * user, ordered by displayed date descending. This use case is invoked when
 * the caller does not supply a specific filter (accountId, pocketId, or
 * year+month) on the GET /api/movements endpoint.
 *
 * Page numbering is 1-based. The total count is returned alongside the page
 * data so the frontend can render pagination controls without an extra
 * round-trip.
 *
 * Requirements: 10.5
 */

import { injectable, inject } from 'tsyringe';
import type { IMovementRepository, MovementFilters } from '../../infrastructure/IMovementRepository';
import type { PaginatedMovementsDTO } from '../dtos/MovementDTO';
import { MovementMapper } from '../mappers/MovementMapper';
import { ValidationError } from '../../../../shared/errors/AppError';

/**
 * Default page (1-based) when the caller omits ?page=
 */
export const GET_ALL_MOVEMENTS_DEFAULT_PAGE = 1;

/**
 * Default page size when the caller omits ?limit=
 */
export const GET_ALL_MOVEMENTS_DEFAULT_LIMIT = 50;

/**
 * Hard upper bound on page size. Prevents the caller from accidentally
 * pulling the entire table in a single request.
 */
export const GET_ALL_MOVEMENTS_MAX_LIMIT = 200;

/**
 * Options accepted by GetAllMovementsUseCase.execute()
 */
export interface GetAllMovementsOptions {
  /** 1-based page number. Defaults to 1 when omitted. */
  page?: number;
  /** Maximum number of rows to return. Defaults to 50 when omitted. */
  limit?: number;
  /** Filter by exact category match. */
  category?: string;
  /** Filter by tags (OR logic — movements containing ANY of the listed tags). */
  tags?: string[];
}

@injectable()
export class GetAllMovementsUseCase {
  constructor(
    @inject('MovementRepository') private movementRepo: IMovementRepository
  ) { }

  async execute(
    userId: string,
    options?: GetAllMovementsOptions
  ): Promise<PaginatedMovementsDTO> {
    if (!userId?.trim()) {
      throw new ValidationError('User ID is required');
    }

    const page = this.normalisePage(options?.page);
    const limit = this.normaliseLimit(options?.limit);
    const offset = (page - 1) * limit;

    // Build filters from options (only include defined values)
    const filters: MovementFilters | undefined =
      (options?.category || options?.tags?.length)
        ? { category: options.category, tags: options.tags }
        : undefined;

    // Fetch the page and the total count in parallel so the request only
    // pays for one round-trip's worth of latency.
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
    if (page === undefined || page === null) {
      return GET_ALL_MOVEMENTS_DEFAULT_PAGE;
    }
    if (!Number.isFinite(page) || !Number.isInteger(page) || page < 1) {
      throw new ValidationError('page must be a positive integer');
    }
    return page;
  }

  private normaliseLimit(limit?: number): number {
    if (limit === undefined || limit === null) {
      return GET_ALL_MOVEMENTS_DEFAULT_LIMIT;
    }
    if (!Number.isFinite(limit) || !Number.isInteger(limit) || limit < 1) {
      return GET_ALL_MOVEMENTS_DEFAULT_LIMIT;
    }
    // Cap at max instead of rejecting — frontend may request more for legacy reasons
    return Math.min(limit, GET_ALL_MOVEMENTS_MAX_LIMIT);
  }
}
