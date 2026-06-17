/**
 * Typed application errors. The HTTP error handler maps these to status codes
 * and the standard ApiError envelope. Throw these from any layer; never leak
 * raw provider/database errors to clients.
 */
export type ErrorCode =
  | 'BAD_REQUEST'
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'UPSTREAM_ERROR'
  | 'AI_ERROR'
  | 'GMAIL_ERROR'
  | 'INTERNAL';

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;
  /** If true, the message is safe to show to end users. */
  readonly expose: boolean;
  /** Optional Retry-After hint in seconds for rate-limit responses. */
  readonly retryAfter?: number;

  constructor(
    code: ErrorCode,
    status: number,
    message: string,
    opts: { details?: unknown; expose?: boolean; cause?: unknown; retryAfter?: number } = {},
  ) {
    super(message, opts.cause ? { cause: opts.cause } : undefined);
    this.name = 'AppError';
    this.code = code;
    this.status = status;
    this.details = opts.details;
    this.expose = opts.expose ?? status < 500;
    this.retryAfter = opts.retryAfter;
  }
}

export const badRequest = (message: string, details?: unknown): AppError =>
  new AppError('BAD_REQUEST', 400, message, { details, expose: true });

export const validationError = (message: string, details?: unknown): AppError =>
  new AppError('VALIDATION_ERROR', 422, message, { details, expose: true });

export const unauthorized = (message = 'Authentication required'): AppError =>
  new AppError('UNAUTHORIZED', 401, message, { expose: true });

export const forbidden = (message = 'Forbidden'): AppError =>
  new AppError('FORBIDDEN', 403, message, { expose: true });

export const notFound = (message = 'Resource not found'): AppError =>
  new AppError('NOT_FOUND', 404, message, { expose: true });

export const conflict = (message: string): AppError =>
  new AppError('CONFLICT', 409, message, { expose: true });

export const rateLimited = (message = 'Rate limited', retryAfter?: number): AppError =>
  new AppError('RATE_LIMITED', 429, message, { expose: true, retryAfter });

export const upstreamError = (message: string, cause?: unknown): AppError =>
  new AppError('UPSTREAM_ERROR', 502, message, { cause, expose: false });

export const aiError = (message: string, cause?: unknown): AppError =>
  new AppError('AI_ERROR', 502, message, { cause, expose: false });

export const gmailError = (message: string, cause?: unknown): AppError =>
  new AppError('GMAIL_ERROR', 502, message, { cause, expose: false });

export const internal = (message = 'Internal server error', cause?: unknown): AppError =>
  new AppError('INTERNAL', 500, message, { cause, expose: false });

export function isAppError(err: unknown): err is AppError {
  return err instanceof AppError;
}
