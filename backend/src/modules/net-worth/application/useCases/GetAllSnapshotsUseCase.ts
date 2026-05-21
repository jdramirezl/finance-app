import { injectable, inject } from 'tsyringe';
import type { INetWorthSnapshotRepository } from '../../infrastructure/INetWorthSnapshotRepository';
import type { NetWorthSnapshot } from '../../domain/NetWorthSnapshot';

@injectable()
export class GetAllSnapshotsUseCase {
  constructor(
    @inject('NetWorthSnapshotRepository') private repo: INetWorthSnapshotRepository
  ) {}

  async execute(userId: string): Promise<NetWorthSnapshot[]> {
    return this.repo.findAll(userId);
  }
}
