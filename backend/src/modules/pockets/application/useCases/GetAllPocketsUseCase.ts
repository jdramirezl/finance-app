/**
 * Get All Pockets Use Case
 *
 * Fetches every pocket for the authenticated user, optionally including
 * soft-archived ones. Mirrors {@link GetAllAccountsUseCase} so the
 * presentation layer never reaches into the repository directly.
 *
 * Sorting follows the same display-order convention as
 * {@link GetPocketsByAccountUseCase} — nulls sort last so newly created
 * pockets without an explicit order still render at the bottom rather
 * than at the top of the list.
 */

import { injectable, inject } from 'tsyringe';
import type { IPocketRepository } from '../../infrastructure/IPocketRepository';
import type { PocketResponseDTO } from '../dtos/PocketDTO';
import { PocketMapper } from '../mappers/PocketMapper';

@injectable()
export class GetAllPocketsUseCase {
  constructor(
    @inject('PocketRepository') private pocketRepo: IPocketRepository
  ) {}

  /**
   * Execute the use case.
   *
   * @param userId - User ID from authentication
   * @param includeArchived - Optional flag to include soft-archived pockets.
   *                          Defaults to false; the Accounts page passes true
   *                          to render archived pocket rows in its Archived
   *                          section.
   * @returns Array of pocket DTOs sorted by display order
   */
  async execute(
    userId: string,
    includeArchived: boolean = false
  ): Promise<PocketResponseDTO[]> {
    const pockets = await this.pocketRepo.findAllByUserId(userId, includeArchived);

    // Stable sort by display order, with `undefined` at the bottom — same
    // tiebreaker GetPocketsByAccountUseCase uses for per-account lists.
    const sorted = pockets.sort((a, b) => {
      if (a.displayOrder === undefined && b.displayOrder === undefined) return 0;
      if (a.displayOrder === undefined) return 1;
      if (b.displayOrder === undefined) return -1;
      return a.displayOrder - b.displayOrder;
    });

    return PocketMapper.toDTOArray(sorted);
  }
}
