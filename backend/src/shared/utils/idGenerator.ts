/**
 * ID Generator Utility
 * 
 * Generates unique IDs compatible with Supabase UUID format.
 */

import { randomUUID } from 'crypto';

export const generateId = (): string => {
  return randomUUID();
};
