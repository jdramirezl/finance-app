import { injectable, inject } from 'tsyringe';
import type { IMovementTemplateRepository } from '../../infrastructure/IMovementTemplateRepository';

@injectable()
export class DeleteTemplateUseCase {
  constructor(
    @inject('MovementTemplateRepository') private repo: IMovementTemplateRepository
  ) {}

  async execute(id: string, userId: string): Promise<void> {
    await this.repo.delete(id, userId);
  }
}
