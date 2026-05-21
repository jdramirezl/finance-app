import { injectable, inject } from 'tsyringe';
import type { INetWorthSnapshotRepository } from '../../infrastructure/INetWorthSnapshotRepository';
import type { NetWorthSnapshot, CreateSnapshotDTO } from '../../domain/NetWorthSnapshot';
import { NotFoundError } from '../../../../shared/errors/AppError';

@injectable()
export class UpdateSnapshotUseCase {
  constructor(
    @inject('NetWorthSnapshotRepository') private repo: INetWorthSnapshotRepository
  ) {}

  async execute(id: string, data: Partial<CreateSnapshotDTO>, userId: string): Promise<NetWorthSnapshot> {
    const existing = await this.repo.findById(id);
    if (!existing || existing.userId !== userId) {
      throw new NotFoundError('Snapshot not found');
    }
    return this.repo.update(id, data);
  }
}
