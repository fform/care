import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../lib/httpError';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Invalid request',
      status: 400,
      details: err.flatten(),
    });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({
      error: err.message,
      status: err.status,
      ...(err.code ? { code: err.code } : {}),
    });
    return;
  }
  console.error(err);
  res.status(500).json({
    error: 'Internal server error',
    status: 500,
  });
}
