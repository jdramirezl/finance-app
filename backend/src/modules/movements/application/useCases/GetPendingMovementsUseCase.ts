/**
 * Get Pending Movements Use Case
 * 
 * Fetches all pending movements for a user.
 * 
 * Requirements: 11.3
 */

import { injectable, inject } from 'tsyringe';
import type { IMovementRepository } from '../../infrastructure/IMovementRepository';
import type { MovementResponseDTO } from '../dtos/MovementDTO';
import { MovementMapper } from '../mappers/MovementMapper';

@injectable()
export class GetPendingMovementsUseCase {
  constructor(
    @inject('MovementRepository') private movementRepo: IMovementRepository
  ) {}

  async execute(userId: string): Promise<MovementResponseDTO[]> {
    // Fetch pending movements
    const movements = await this.movementRepo.findPending(userId);

    // Convert to DTOs
    return MovementMapper.toDTOArray(movements);
  }
}
