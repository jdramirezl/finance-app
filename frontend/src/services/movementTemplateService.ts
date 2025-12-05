import type { MovementTemplate, MovementType } from '../types';
import { SupabaseStorageService } from './supabaseStorageService';
import { generateId } from '../utils/idGenerator';

class MovementTemplateService {
  // Get all templates for current user
  async getAllTemplates(): Promise<MovementTemplate[]> {
    return await SupabaseStorageService.getMovementTemplates();
  }

  // Get template by ID
  async getTemplate(id: string): Promise<MovementTemplate | null> {
    const templates = await this.getAllTemplates();
    return templates.find(t => t.id === id) || null;
  }

  // Create new template
  async createTemplate(
    name: string,
    type: MovementType,
    accountId: string,
    pocketId: string,
    defaultAmount?: number | null,
    notes?: string | null,
    subPocketId?: string | null
  ): Promise<MovementTemplate> {
    // Validate name
    if (!name.trim()) {
      throw new Error('Template name is required.');
    }

    // Check for duplicate name
    const templates = await this.getAllTemplates();
    const existing = templates.find(t => t.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      throw new Error(`A template with name "${name}" already exists.`);
    }

    const now = new Date().toISOString();
    const template: MovementTemplate = {
      id: generateId(),
      name: name.trim(),
      type,
      accountId,
      pocketId,
      subPocketId,
      defaultAmount,
      notes: notes?.trim(),
      createdAt: now,
      updatedAt: now,
    };

    await SupabaseStorageService.insertMovementTemplate(template);
    return template;
  }

  // Update template
  async updateTemplate(
    id: string,
    updates: Partial<Pick<MovementTemplate, 'name' | 'type' | 'accountId' | 'pocketId' | 'subPocketId' | 'defaultAmount' | 'notes'>>
  ): Promise<MovementTemplate> {
    const template = await this.getTemplate(id);
    if (!template) {
      throw new Error(`Template with id "${id}" not found.`);
    }

    // Check for duplicate name if name is being updated
    if (updates.name && updates.name !== template.name) {
      const templates = await this.getAllTemplates();
      const existing = templates.find(t => t.name.toLowerCase() === updates.name!.toLowerCase() && t.id !== id);
      if (existing) {
        throw new Error(`A template with name "${updates.name}" already exists.`);
      }
    }

    const updatedTemplate = {
      ...template,
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    await SupabaseStorageService.updateMovementTemplate(id, updatedTemplate);
    return updatedTemplate;
  }

  // Delete template
  async deleteTemplate(id: string): Promise<void> {
    const template = await this.getTemplate(id);
    if (!template) {
      throw new Error(`Template with id "${id}" not found.`);
    }

    await SupabaseStorageService.deleteMovementTemplate(id);
  }
}

export const movementTemplateService = new MovementTemplateService();
