import { z } from 'zod';

// SubPocket schemas
export const createSubPocketSchema = z.object({
  pocketId: z.string().guid(),
  name: z.string().min(1).max(100),
  valueTotal: z.number().positive(),
  periodicityMonths: z.number().int().positive(),
  groupId: z.string().guid().optional(),
}).strict();

export const updateSubPocketSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  valueTotal: z.number().positive().optional(),
  periodicityMonths: z.number().int().positive().optional(),
}).strict();

export const moveToGroupSchema = z.object({
  groupId: z.string().guid().nullable(),
}).strict();

export const reorderSubPocketsSchema = z.object({
  subPocketIds: z.array(z.string().guid()).min(1),
}).strict();

// FixedExpenseGroup schemas
export const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().min(1),
}).strict();

export const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().min(1).optional(),
}).strict();

export const reorderGroupsSchema = z.object({
  ids: z.array(z.string().guid()).min(1),
}).strict();
