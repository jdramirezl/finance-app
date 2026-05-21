import { injectable, inject } from 'tsyringe';
import type { IMovementTemplateRepository } from '../../infrastructure/IMovementTemplateRepository';
import type { MovementTemplate, CreateTemplateDTO } from '../../domain/MovementTemplate';
import { ValidationError } from '../../../../shared/errors/AppError';

@injectable()
export class CreateTemplateUseCase {
  constructor(
    @inject('MovementTemplateRepository') private repo: IMovementTemplateRepository
  ) {}

  async execute(dto: CreateTemplateDTO, userId: string): Promise<MovementTemplate> {
    if (!dto.name?.trim()) throw new ValidationError('name is required');
    if (!dto.type?.trim()) throw new ValidationError('type is required');
    if (!dto.accountId?.trim()) throw new ValidationError('accountId is required');
    if (!dto.pocketId?.trim()) throw new ValidationError('pocketId is required');

    const cleaned: CreateTemplateDTO = {
      name: dto.name.trim(),
      type: dto.type.trim(),
      accountId: dto.accountId.trim(),
      pocketId: dto.pocketId.trim(),
      subPocketId: dto.subPocketId?.trim() || null,
      defaultAmount: toFiniteNumber(dto.defaultAmount),
      notes: dto.notes?.trim() || null,
    };

    return this.repo.create(userId, cleaned);
  }
}

function toFiniteNumber(value: unknown): number | null {
  if (value === undefined || value === null) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}
