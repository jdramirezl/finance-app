import { injectable, inject } from 'tsyringe';
import { SupabaseClient } from '@supabase/supabase-js';
import type { IMovementTemplateRepository } from './IMovementTemplateRepository';
import type { MovementTemplate, CreateTemplateDTO, UpdateTemplateDTO } from '../domain/MovementTemplate';
import { DatabaseError, NotFoundError, ConflictError } from '../../../shared/errors/AppError';
import { generateId } from '../../../shared/utils/idGenerator';

interface MovementTemplateRow {
  id: string;
  user_id: string;
  name: string;
  type: string;
  account_id: string | null;
  pocket_id: string | null;
  sub_pocket_id: string | null;
  default_amount: string | number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

function rowToDomain(row: MovementTemplateRow): MovementTemplate {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    type: row.type,
    accountId: row.account_id,
    pocketId: row.pocket_id,
    subPocketId: row.sub_pocket_id,
    defaultAmount: row.default_amount !== null && row.default_amount !== undefined
      ? Number(row.default_amount)
      : null,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

@injectable()
export class SupabaseMovementTemplateRepository implements IMovementTemplateRepository {
  constructor(@inject('SupabaseClient') private supabase: SupabaseClient) {}

  async findAll(userId: string): Promise<MovementTemplate[]> {
    const { data, error } = await this.supabase
      .from('movement_templates')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) throw new DatabaseError(`Failed to fetch movement templates: ${error.message}`);
    return (data ?? []).map(rowToDomain);
  }

  async findById(id: string, userId: string): Promise<MovementTemplate | null> {
    const { data, error } = await this.supabase
      .from('movement_templates')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new DatabaseError(`Failed to fetch movement template: ${error.message}`);
    }
    return rowToDomain(data);
  }

  async create(userId: string, data: CreateTemplateDTO): Promise<MovementTemplate> {
    const now = new Date().toISOString();
    const row = {
      id: generateId(),
      user_id: userId,
      name: data.name,
      type: data.type,
      account_id: data.accountId,
      pocket_id: data.pocketId,
      sub_pocket_id: data.subPocketId ?? null,
      default_amount: data.defaultAmount ?? null,
      notes: data.notes ?? null,
      created_at: now,
      updated_at: now,
    };

    const { data: result, error } = await this.supabase
      .from('movement_templates')
      .insert(row)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new ConflictError(`A movement template named "${data.name}" already exists`);
      }
      throw new DatabaseError(`Failed to create movement template: ${error.message}`);
    }
    return rowToDomain(result);
  }

  async update(id: string, userId: string, data: UpdateTemplateDTO): Promise<MovementTemplate> {
    const updates: Record<string, unknown> = {};
    if (data.name !== undefined) updates.name = data.name;
    if (data.type !== undefined) updates.type = data.type;
    if (data.accountId !== undefined) updates.account_id = data.accountId;
    if (data.pocketId !== undefined) updates.pocket_id = data.pocketId;
    if (data.subPocketId !== undefined) updates.sub_pocket_id = data.subPocketId;
    if (data.defaultAmount !== undefined) updates.default_amount = data.defaultAmount;
    if (data.notes !== undefined) updates.notes = data.notes;
    updates.updated_at = new Date().toISOString();

    const { data: result, error } = await this.supabase
      .from('movement_templates')
      .update(updates)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError(`Movement template ${id} not found`);
      }
      if (error.code === '23505') {
        throw new ConflictError(`A movement template with that name already exists`);
      }
      throw new DatabaseError(`Failed to update movement template: ${error.message}`);
    }
    return rowToDomain(result);
  }

  async delete(id: string, userId: string): Promise<void> {
    const { error, count } = await this.supabase
      .from('movement_templates')
      .delete({ count: 'exact' })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw new DatabaseError(`Failed to delete movement template: ${error.message}`);
    if ((count ?? 0) === 0) throw new NotFoundError(`Movement template ${id} not found`);
  }
}
