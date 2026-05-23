import { injectable, inject } from 'tsyringe';
import type { IMovementTemplateRepository } from '../../infrastructure/IMovementTemplateRepository';
import type { MovementTemplate, UpdateTemplateDTO } from '../../domain/MovementTemplate';
import { ValidationError } from '../../../../shared/errors/AppError';

@injectable()
export class UpdateTemplateUseCase {
  constructor(
    @inject('MovementTemplateRepository') private repo: IMovementTemplateRepository
  ) {}

  async execute(id: string, dto: UpdateTemplateDTO, userId: string): Promise<MovementTemplate> {
    const cleaned: UpdateTemplateDTO = {};

    if (dto.name !== undefined) {
      if (!dto.name.trim()) throw new ValidationError('name is required');
      cleaned.name = dto.name.trim();
    }
    if (dto.type !== undefined) {
      if (!dto.type.trim()) throw new ValidationError('type is required');
      cleaned.type = dto.type.trim();
    }
    if (dto.accountId !== undefined) {
      if (!dto.accountId.trim()) throw new ValidationError('accountId is required');
      cleaned.accountId = dto.accountId.trim();
    }
    if (dto.pocketId !== undefined) {
      if (!dto.pocketId.trim()) throw new ValidationError('pocketId is required');
      cleaned.pocketId = dto.pocketId.trim();
    }
    if (dto.subPocketId !== undefined) {
      cleaned.subPocketId = dto.subPocketId?.trim() || null;
    }
    if (dto.defaultAmount !== undefined) {
      cleaned.defaultAmount = toFiniteNumber(dto.defaultAmount);
    }
    if (dto.notes !== undefined) {
      cleaned.notes = dto.notes?.trim() || null;
    }

    if (Object.keys(cleaned).length === 0) {
      throw new ValidationError('No updatable fields provided');
    }

    return this.repo.update(id, userId, cleaned);
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
