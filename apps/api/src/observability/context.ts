import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Request-scoped context propagated via AsyncLocalStorage. Lets any layer
 * (services, repositories, AI clients) read the correlation id and acting
 * user without threading them through every function signature.
 */
export interface RequestContext {
  requestId: string;
  userId: string | null;
  /** Logical operation name, e.g. "chat.ask" — used in logs/metrics. */
  operation?: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithContext<T>(ctx: RequestContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

export function getContext(): RequestContext | undefined {
  return storage.getStore();
}

export function getRequestId(): string | undefined {
  return storage.getStore()?.requestId;
}

export function getUserId(): string | null {
  return storage.getStore()?.userId ?? null;
}

/** Mutate the current context (e.g. attach userId after authentication). */
export function setContextUser(userId: string | null): void {
  const store = storage.getStore();
  if (store) store.userId = userId;
}

export function setOperation(operation: string): void {
  const store = storage.getStore();
  if (store) store.operation = operation;
}
