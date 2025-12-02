/**
 * Supabase Settings Repository Implementation
 * 
 * Implements ISettingsRepository using Supabase as the data store.
 */

import { injectable } from 'tsyringe';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { ISettingsRepository } from './ISettingsRepository';
import { Settings } from '../domain/Settings';
import { SettingsMapper } from '../application/mappers/SettingsMapper';
import { DatabaseError } from '../../../shared/errors/AppError';
import { generateId } from '../../../shared/utils/idGenerator';

@injectable()
export class SupabaseSettingsRepository implements ISettingsRepository {
  private supabase: SupabaseClient | null;

  constructor() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    // Only throw error in non-test environments
    if ((!supabaseUrl || !supabaseKey) && process.env.NODE_ENV !== 'test') {
      throw new Error('Supabase configuration missing: SUPABASE_URL and SUPABASE_SERVICE_KEY required');
    }

    // Create client only if credentials are available
    this.supabase = supabaseUrl && supabaseKey 
      ? createClient(supabaseUrl, supabaseKey)
      : null;
  }

  private ensureClient(): SupabaseClient {
    if (!this.supabase) {
      throw new DatabaseError('Supabase client not configured');
    }
    return this.supabase;
  }

  /**
   * Find settings by user ID
   */
  async findByUserId(userId: string): Promise<Settings | null> {
    const { data, error } = await this.ensureClient()
      .from('settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // Not found is not an error - return null
      if (error.code === 'PGRST116') {
        return null;
      }
      throw new DatabaseError(`Failed to find settings: ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return SettingsMapper.toDomain(data);
  }

  /**
   * Save or update settings for a user
   */
  async save(settings: Settings): Promise<void> {
    const data = SettingsMapper.toPersistence(settings);
    
    // Use upsert to handle both insert and update
    const { error } = await this.ensureClient()
      .from('settings')
      .upsert(data, {
        onConflict: 'user_id',
        ignoreDuplicates: false,
      });

    if (error) {
      throw new DatabaseError(`Failed to save settings: ${error.message}`);
    }
  }

  /**
   * Update existing settings
   */
  async update(settings: Settings): Promise<void> {
    // For settings, update is the same as save (upsert)
    await this.save(settings);
  }

  /**
   * Create default settings for a new user
   */
  async createDefault(userId: string): Promise<Settings> {
    const settings = new Settings(
      generateId(),
      userId,
      'USD' // Default primary currency
    );

    await this.save(settings);
    return settings;
  }
}
