import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { ValidationError } from '../errors/AppError';

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const message = result.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join('; ');
      next(new ValidationError(message));
      return;
    }
    req.body = result.data;
    next();
  };
}
