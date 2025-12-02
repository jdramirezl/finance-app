/**
 * Shared Types for Backend
 * 
 * Core type definitions used across the backend.
 */

// Currency types
export type Currency = 'USD' | 'MXN' | 'COP' | 'EUR' | 'GBP';

// Pocket types
export type PocketType = 'normal' | 'fixed';

// Movement types
export type MovementType = 
  | 'IngresoNormal' 
  | 'EgresoNormal' 
  | 'IngresoFijo' 
  | 'EgresoFijo';
