import { container } from 'tsyringe';
import { IMovementRepository } from '../../modules/movements/infrastructure/IMovementRepository';
import { SupabaseMovementRepository } from '../../modules/movements/infrastructure/SupabaseMovementRepository';
import { CreateMovementUseCase } from '../../modules/movements/application/useCases/CreateMovementUseCase';
import { GetAllMovementsUseCase } from '../../modules/movements/application/useCases/GetAllMovementsUseCase';
import { GetMovementsByAccountUseCase } from '../../modules/movements/application/useCases/GetMovementsByAccountUseCase';
import { GetMovementsByPocketUseCase } from '../../modules/movements/application/useCases/GetMovementsByPocketUseCase';
import { GetMovementsByMonthUseCase } from '../../modules/movements/application/useCases/GetMovementsByMonthUseCase';
import { GetPendingMovementsUseCase } from '../../modules/movements/application/useCases/GetPendingMovementsUseCase';
import { GetOrphanedMovementsUseCase } from '../../modules/movements/application/useCases/GetOrphanedMovementsUseCase';
import { UpdateMovementUseCase } from '../../modules/movements/application/useCases/UpdateMovementUseCase';
import { DeleteMovementUseCase } from '../../modules/movements/application/useCases/DeleteMovementUseCase';
import { ApplyPendingMovementUseCase } from '../../modules/movements/application/useCases/ApplyPendingMovementUseCase';
import { MarkAsPendingUseCase } from '../../modules/movements/application/useCases/MarkAsPendingUseCase';
import { RestoreOrphanedMovementsUseCase } from '../../modules/movements/application/useCases/RestoreOrphanedMovementsUseCase';
import { CreateTransferUseCase } from '../../modules/movements/application/useCases/CreateTransferUseCase';
import { DeleteMovementsByAccountUseCase } from '../../modules/movements/application/useCases/DeleteMovementsByAccountUseCase';
import { DeleteMovementsByPocketUseCase } from '../../modules/movements/application/useCases/DeleteMovementsByPocketUseCase';
import { MarkMovementsAsOrphanedUseCase } from '../../modules/movements/application/useCases/MarkMovementsAsOrphanedUseCase';
import { UpdateMovementsAccountForPocketUseCase } from '../../modules/movements/application/useCases/UpdateMovementsAccountForPocketUseCase';
import { MovementController } from '../../modules/movements/presentation/MovementController';
import { IMovementTemplateRepository } from '../../modules/movements/infrastructure/IMovementTemplateRepository';
import { SupabaseMovementTemplateRepository } from '../../modules/movements/infrastructure/SupabaseMovementTemplateRepository';
import { GetAllTemplatesUseCase } from '../../modules/movements/application/useCases/GetAllTemplatesUseCase';
import { GetTemplateByIdUseCase } from '../../modules/movements/application/useCases/GetTemplateByIdUseCase';
import { CreateTemplateUseCase } from '../../modules/movements/application/useCases/CreateTemplateUseCase';
import { UpdateTemplateUseCase } from '../../modules/movements/application/useCases/UpdateTemplateUseCase';
import { DeleteTemplateUseCase } from '../../modules/movements/application/useCases/DeleteTemplateUseCase';
import { TemplateController } from '../../modules/movements/presentation/TemplateController';

export function registerMovementModule(): void {
  container.register<IMovementRepository>('MovementRepository', {
    useClass: SupabaseMovementRepository,
  });
  container.register(CreateMovementUseCase, { useClass: CreateMovementUseCase });
  container.register(GetAllMovementsUseCase, { useClass: GetAllMovementsUseCase });
  container.register(GetMovementsByAccountUseCase, { useClass: GetMovementsByAccountUseCase });
  container.register(GetMovementsByPocketUseCase, { useClass: GetMovementsByPocketUseCase });
  container.register(GetMovementsByMonthUseCase, { useClass: GetMovementsByMonthUseCase });
  container.register(GetPendingMovementsUseCase, { useClass: GetPendingMovementsUseCase });
  container.register(GetOrphanedMovementsUseCase, { useClass: GetOrphanedMovementsUseCase });
  container.register(UpdateMovementUseCase, { useClass: UpdateMovementUseCase });
  container.register(DeleteMovementUseCase, { useClass: DeleteMovementUseCase });
  container.register(ApplyPendingMovementUseCase, { useClass: ApplyPendingMovementUseCase });
  container.register(MarkAsPendingUseCase, { useClass: MarkAsPendingUseCase });
  container.register(RestoreOrphanedMovementsUseCase, { useClass: RestoreOrphanedMovementsUseCase });
  container.register(CreateTransferUseCase, { useClass: CreateTransferUseCase });
  container.register(DeleteMovementsByAccountUseCase, { useClass: DeleteMovementsByAccountUseCase });
  container.register(DeleteMovementsByPocketUseCase, { useClass: DeleteMovementsByPocketUseCase });
  container.register(MarkMovementsAsOrphanedUseCase, { useClass: MarkMovementsAsOrphanedUseCase });
  container.register(UpdateMovementsAccountForPocketUseCase, { useClass: UpdateMovementsAccountForPocketUseCase });
  container.register(MovementController, { useClass: MovementController });

  // Templates
  container.register<IMovementTemplateRepository>('MovementTemplateRepository', {
    useClass: SupabaseMovementTemplateRepository,
  });
  container.register(GetAllTemplatesUseCase, { useClass: GetAllTemplatesUseCase });
  container.register(GetTemplateByIdUseCase, { useClass: GetTemplateByIdUseCase });
  container.register(CreateTemplateUseCase, { useClass: CreateTemplateUseCase });
  container.register(UpdateTemplateUseCase, { useClass: UpdateTemplateUseCase });
  container.register(DeleteTemplateUseCase, { useClass: DeleteTemplateUseCase });
  container.register(TemplateController, { useClass: TemplateController });
}
