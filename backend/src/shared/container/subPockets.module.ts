import { container } from 'tsyringe';
import { ISubPocketRepository } from '../../modules/sub-pockets/infrastructure/ISubPocketRepository';
import { SupabaseSubPocketRepository } from '../../modules/sub-pockets/infrastructure/SupabaseSubPocketRepository';
import { CreateSubPocketUseCase } from '../../modules/sub-pockets/application/useCases/CreateSubPocketUseCase';
import { GetSubPocketsByPocketUseCase } from '../../modules/sub-pockets/application/useCases/GetSubPocketsByPocketUseCase';
import { GetSubPocketsByGroupUseCase } from '../../modules/sub-pockets/application/useCases/GetSubPocketsByGroupUseCase';
import { UpdateSubPocketUseCase } from '../../modules/sub-pockets/application/useCases/UpdateSubPocketUseCase';
import { DeleteSubPocketUseCase } from '../../modules/sub-pockets/application/useCases/DeleteSubPocketUseCase';
import { MoveSubPocketToGroupUseCase } from '../../modules/sub-pockets/application/useCases/MoveSubPocketToGroupUseCase';
import { ReorderSubPocketsUseCase } from '../../modules/sub-pockets/application/useCases/ReorderSubPocketsUseCase';
import { SubPocketController } from '../../modules/sub-pockets/presentation/SubPocketController';
import { IFixedExpenseGroupRepository } from '../../modules/sub-pockets/infrastructure/IFixedExpenseGroupRepository';
import { SupabaseFixedExpenseGroupRepository } from '../../modules/sub-pockets/infrastructure/SupabaseFixedExpenseGroupRepository';
import { CreateFixedExpenseGroupUseCase } from '../../modules/sub-pockets/application/useCases/CreateFixedExpenseGroupUseCase';
import { GetAllGroupsUseCase } from '../../modules/sub-pockets/application/useCases/GetAllGroupsUseCase';
import { UpdateGroupUseCase } from '../../modules/sub-pockets/application/useCases/UpdateGroupUseCase';
import { DeleteGroupUseCase } from '../../modules/sub-pockets/application/useCases/DeleteGroupUseCase';
import { ReorderFixedExpenseGroupsUseCase } from '../../modules/sub-pockets/application/useCases/ReorderFixedExpenseGroupsUseCase';
import { FixedExpenseGroupController } from '../../modules/sub-pockets/presentation/FixedExpenseGroupController';

export function registerSubPocketModule(): void {
  container.register<ISubPocketRepository>('SubPocketRepository', {
    useClass: SupabaseSubPocketRepository,
  });
  container.register(CreateSubPocketUseCase, { useClass: CreateSubPocketUseCase });
  container.register(GetSubPocketsByPocketUseCase, { useClass: GetSubPocketsByPocketUseCase });
  container.register(GetSubPocketsByGroupUseCase, { useClass: GetSubPocketsByGroupUseCase });
  container.register(UpdateSubPocketUseCase, { useClass: UpdateSubPocketUseCase });
  container.register(DeleteSubPocketUseCase, { useClass: DeleteSubPocketUseCase });
  container.register(MoveSubPocketToGroupUseCase, { useClass: MoveSubPocketToGroupUseCase });
  container.register(ReorderSubPocketsUseCase, { useClass: ReorderSubPocketsUseCase });
  container.register(SubPocketController, { useClass: SubPocketController });

  // Fixed Expense Groups (part of sub-pockets domain)
  container.register<IFixedExpenseGroupRepository>('FixedExpenseGroupRepository', {
    useClass: SupabaseFixedExpenseGroupRepository,
  });
  container.register(CreateFixedExpenseGroupUseCase, { useClass: CreateFixedExpenseGroupUseCase });
  container.register(GetAllGroupsUseCase, { useClass: GetAllGroupsUseCase });
  container.register(UpdateGroupUseCase, { useClass: UpdateGroupUseCase });
  container.register(DeleteGroupUseCase, { useClass: DeleteGroupUseCase });
  container.register(ReorderFixedExpenseGroupsUseCase, { useClass: ReorderFixedExpenseGroupsUseCase });
  container.register(FixedExpenseGroupController, { useClass: FixedExpenseGroupController });
}