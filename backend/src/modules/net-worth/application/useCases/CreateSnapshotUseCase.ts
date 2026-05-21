import { injectable, inject } from 'tsyringe';
import type { INetWorthSnapshotRepository } from '../../infrastructure/INetWorthSnapshotRepository';
import type { NetWorthSnapshot, CreateSnapshotDTO } from '../../domain/NetWorthSnapshot';

@injectable()
export class CreateSnapshotUseCase {
  constructor(
    @inject('NetWorthSnapshotRepository') private repo: INetWorthSnapshotRepository
  ) {}

  async execute(userId: string, data: CreateSnapshotDTO): Promise<NetWorthSnapshot> {
    return this.repo.create(userId, data);
  }
}
