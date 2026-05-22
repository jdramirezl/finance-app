/**
 * Get Movement Years Use Case
 *
 * Returns distinct years that have movements for the authenticated user,
 * along with the count of movements per year.
 */

import { injectable, inject } from 'tsyringe';
import type { IMovementRepository } from '../../infrastructure/IMovementRepository';
import { ValidationError } from '../../../../shared/errors/AppError';

export interface MovementYearsDTO {
  years: { year: number; count: number; months: number[] }[];
}

@injectable()
export class GetMovementYearsUseCase {
  constructor(
    @inject('MovementRepository') private movementRepo: IMovementRepository
  ) {}

  async execute(userId: string): Promise<MovementYearsDTO> {
    if (!userId?.trim()) {
      throw new ValidationError('User ID is required');
    }

    const years = await this.movementRepo.getDistinctYears(userId);
    return { years };
  }
}
