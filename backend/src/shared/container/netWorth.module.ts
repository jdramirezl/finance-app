import { container } from 'tsyringe';
import { INetWorthSnapshotRepository } from '../../modules/net-worth/infrastructure/INetWorthSnapshotRepository';
import { SupabaseNetWorthSnapshotRepository } from '../../modules/net-worth/infrastructure/SupabaseNetWorthSnapshotRepository';
import { GetAllSnapshotsUseCase } from '../../modules/net-worth/application/useCases/GetAllSnapshotsUseCase';
import { GetLatestSnapshotUseCase } from '../../modules/net-worth/application/useCases/GetLatestSnapshotUseCase';
import { CreateSnapshotUseCase } from '../../modules/net-worth/application/useCases/CreateSnapshotUseCase';
import { UpdateSnapshotUseCase } from '../../modules/net-worth/application/useCases/UpdateSnapshotUseCase';
import { DeleteSnapshotUseCase } from '../../modules/net-worth/application/useCases/DeleteSnapshotUseCase';
import { NetWorthController } from '../../modules/net-worth/presentation/NetWorthController';

export function registerNetWorthModule(): void {
  container.register<INetWorthSnapshotRepository>('NetWorthSnapshotRepository', {
    useClass: SupabaseNetWorthSnapshotRepository,
  });
  container.register(GetAllSnapshotsUseCase, { useClass: GetAllSnapshotsUseCase });
  container.register(GetLatestSnapshotUseCase, { useClass: GetLatestSnapshotUseCase });
  container.register(CreateSnapshotUseCase, { useClass: CreateSnapshotUseCase });
  container.register(UpdateSnapshotUseCase, { useClass: UpdateSnapshotUseCase });
  container.register(DeleteSnapshotUseCase, { useClass: DeleteSnapshotUseCase });
  container.register(NetWorthController, { useClass: NetWorthController });
}
