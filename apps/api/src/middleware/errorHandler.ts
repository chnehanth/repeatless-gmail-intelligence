import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import type { ApiError } from '@repeatless/shared';
import { AppError, isAppError } from '../lib/errors.js';
import { getRequestId } from '../observability/context.js';
import { childLogger } from '../observability/logger.js';

const log = childLogger('error-handler');

/** 404 handler for unmatched routes. */
export function notFoundHandler(req: Request, res: Response): void {
  const requestId = getRequestId() ?? 'unknown';
  const body: ApiError = {
    error: { code: 'NOT_FOUND', message: `No route for ${req.method} ${req.path}`, requestId },
  };
  res.status(404).json(body);
}

/**
 * Terminal error handler. Maps Zod and AppError into the standard envelope and
 * never leaks internal messages/stacks to clients for 5xx errors. Logs the full
 * error server-side with the correlation id for debugging.
 */
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  const requestId = getRequestId() ?? 'unknown';

  if (err instanceof ZodError) {
    const body: ApiError = {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        requestId,
        details: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
    };
    res.status(422).json(body);
    return;
  }

  const appErr: AppError = isAppError(err)
    ? err
    : new AppError('INTERNAL', 500, 'Internal server error', { cause: err });

  if (appErr.status >= 500) {
    log.error({ err: appErr, code: appErr.code, cause: appErr.cause }, appErr.message);
  } else {
    log.warn({ code: appErr.code, status: appErr.status }, appErr.message);
  }

  if (appErr.retryAfter !== undefined) {
    res.setHeader('Retry-After', String(appErr.retryAfter));
  }

  const body: ApiError = {
    error: {
      code: appErr.code,
      message: appErr.expose ? appErr.message : 'Something went wrong. Please try again.',
      requestId,
      ...(appErr.expose && appErr.details !== undefined ? { details: appErr.details } : {}),
    },
  };
  res.status(appErr.status).json(body);
}
