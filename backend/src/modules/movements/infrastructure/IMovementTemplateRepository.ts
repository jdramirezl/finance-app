import type { MovementTemplate, CreateTemplateDTO, UpdateTemplateDTO } from '../domain/MovementTemplate';

export interface IMovementTemplateRepository {
  findAll(userId: string): Promise<MovementTemplate[]>;
  findById(id: string, userId: string): Promise<MovementTemplate | null>;
  create(userId: string, data: CreateTemplateDTO): Promise<MovementTemplate>;
  update(id: string, userId: string, data: UpdateTemplateDTO): Promise<MovementTemplate>;
  delete(id: string, userId: string): Promise<void>;
}
