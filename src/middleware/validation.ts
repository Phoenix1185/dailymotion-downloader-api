import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export const validate = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        });
      }
      next(error);
    }
  };
};

// Common schemas
export const schemas = {
  register: z.object({
    body: z.object({
      email: z.string().email('Invalid email address'),
      password: z.string().min(8, 'Password must be at least 8 characters'),
      name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    }),
  }),

  login: z.object({
    body: z.object({
      email: z.string().email('Invalid email address'),
      password: z.string().min(1, 'Password is required'),
    }),
  }),

  downloadInfo: z.object({
    body: z.object({
      url: z.string().url('Invalid URL').refine(
        (url) => url.includes('dailymotion.com') || url.includes('dai.ly'),
        'URL must be from DailyMotion'
      ),
    }),
  }),

  downloadUrl: z.object({
    body: z.object({
      url: z.string().url('Invalid URL').refine(
        (url) => url.includes('dailymotion.com') || url.includes('dai.ly'),
        'URL must be from DailyMotion'
      ),
      quality: z.string().optional(),
    }),
  }),

  createApiKey: z.object({
    body: z.object({
      name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
    }),
  }),

  initializePayment: z.object({
    body: z.object({
      planId: z.enum(['free', 'starter', 'pro', 'enterprise']),
    }),
  }),
};
