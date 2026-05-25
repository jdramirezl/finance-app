import { container } from 'tsyringe';
import { IPocketRepository } from '../../modules/pockets/infrastructure/IPocketRepository';
import { SupabasePocketRepository } from '../../modules/pockets/infrastructure/SupabasePocketRepository';
import { CreatePocketUseCase } from '../../modules/pockets/application/useCases/CreatePocketUseCase';
import { GetPocketsByAccountUseCase } from '../../modules/pockets/application/useCases/GetPocketsByAccountUseCase';
import { GetPocketByIdUseCase } from '../../modules/pockets/application/useCases/GetPocketByIdUseCase';
import { UpdatePocketUseCase } from '../../modules/pockets/application/useCases/UpdatePocketUseCase';
import { DeletePocketUseCase } from '../../modules/pockets/application/useCases/DeletePocketUseCase';
import { MigrateFixedPocketUseCase } from '../../modules/pockets/application/useCases/MigrateFixedPocketUseCase';
import { ReorderPocketsUseCase } from '../../modules/pockets/application/useCases/ReorderPocketsUseCase';
import { ArchivePocketUseCase } from '../../modules/pockets/application/useCases/ArchivePocketUseCase';
import { UnarchivePocketUseCase } from '../../modules/pockets/application/useCases/UnarchivePocketUseCase';
import { PocketController } from '../../modules/pockets/presentation/PocketController';

export function registerPocketModule(): void {
  container.register<IPocketRepository>('PocketRepository', { useClass: SupabasePocketRepository });
  container.register(CreatePocketUseCase, { useClass: CreatePocketUseCase });
  container.register(GetPocketsByAccountUseCase, { useClass: GetPocketsByAccountUseCase });
  container.register(GetPocketByIdUseCase, { useClass: GetPocketByIdUseCase });
  container.register(UpdatePocketUseCase, { useClass: UpdatePocketUseCase });
  container.register(DeletePocketUseCase, { useClass: DeletePocketUseCase });
  container.register(MigrateFixedPocketUseCase, { useClass: MigrateFixedPocketUseCase });
  container.register(ReorderPocketsUseCase, { useClass: ReorderPocketsUseCase });
  container.register(ArchivePocketUseCase, { useClass: ArchivePocketUseCase });
  container.register(UnarchivePocketUseCase, { useClass: UnarchivePocketUseCase });
  container.register(PocketController, { useClass: PocketController });
}
