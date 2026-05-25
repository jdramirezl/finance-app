/**
 * Archive Pocket Use Case
 *
 * Soft-deletes a pocket by setting its archived_at timestamp.
 * Historical movements remain intact and stay attached to the pocket.
 */

import { injectable, inject } from 'tsyringe';
import type { IPocketRepository } from '../../infrastructure/IPocketRepository';
import { NotFoundError } from '../../../../shared/errors/AppError';

@injectable()
export class ArchivePocketUseCase {
  constructor(
    @inject('PocketRepository') private pocketRepo: IPocketRepository
  ) {}

  /**
   * Execute the archive use case.
   *
   * @param pocketId - Pocket ID to archive
   * @param userId - User ID from authentication (for ownership verification)
   * @throws NotFoundError if pocket doesn't exist or user doesn't own it
   */
  async execute(pocketId: string, userId: string): Promise<void> {
    const pocket = await this.pocketRepo.findById(pocketId, userId);
    if (!pocket) {
      throw new NotFoundError('Pocket not found');
    }

    await this.pocketRepo.archive(pocketId, userId);
  }
}
