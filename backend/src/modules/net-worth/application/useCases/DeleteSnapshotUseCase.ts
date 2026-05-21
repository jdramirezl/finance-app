import { injectable, inject } from 'tsyringe';
import type { INetWorthSnapshotRepository } from '../../infrastructure/INetWorthSnapshotRepository';
import { NotFoundError } from '../../../../shared/errors/AppError';

@injectable()
export class DeleteSnapshotUseCase {
  constructor(
    @inject('NetWorthSnapshotRepository') private repo: INetWorthSnapshotRepository
  ) {}

  async execute(id: string, userId: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing || existing.userId !== userId) {
      throw new NotFoundError('Snapshot not found');
    }
    return this.repo.delete(id);
  }
}
