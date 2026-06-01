import type { ErrorRequestHandler, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from './AppError.js';
import { env } from '../config/env.js';

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: err.flatten(),
      },
    });
    return;
  }

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details !== undefined ? { details: err.details } : {}),
      },
    });
    return;
  }

  console.error('[error]', err);
  res.status(500).json({
    error: {
      code: 'INTERNAL',
      message:
        env.NODE_ENV === 'production'
          ? 'Internal server error'
          : err instanceof Error
            ? err.message
            : String(err),
    },
  });
};

export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  });
};
