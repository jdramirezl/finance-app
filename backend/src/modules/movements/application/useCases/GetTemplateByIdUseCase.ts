import { injectable, inject } from 'tsyringe';
import type { IMovementTemplateRepository } from '../../infrastructure/IMovementTemplateRepository';
import type { MovementTemplate } from '../../domain/MovementTemplate';
import { NotFoundError } from '../../../../shared/errors/AppError';

@injectable()
export class GetTemplateByIdUseCase {
  constructor(
    @inject('MovementTemplateRepository') private repo: IMovementTemplateRepository
  ) {}

  async execute(id: string, userId: string): Promise<MovementTemplate> {
    const template = await this.repo.findById(id, userId);
    if (!template) throw new NotFoundError(`Movement template ${id} not found`);
    return template;
  }
}
