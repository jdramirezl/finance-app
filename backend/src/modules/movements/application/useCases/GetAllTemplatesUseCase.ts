import { injectable, inject } from 'tsyringe';
import type { IMovementTemplateRepository } from '../../infrastructure/IMovementTemplateRepository';
import type { MovementTemplate } from '../../domain/MovementTemplate';

@injectable()
export class GetAllTemplatesUseCase {
  constructor(
    @inject('MovementTemplateRepository') private repo: IMovementTemplateRepository
  ) {}

  async execute(userId: string): Promise<MovementTemplate[]> {
    return this.repo.findAll(userId);
  }
}
