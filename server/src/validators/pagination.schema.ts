import { z } from 'zod';

/**
 * Shared page/limit query validation — every list endpoint in this codebase
 * caps `limit` server-side so a client can never pull an unbounded page.
 */
export function paginationQuerySchema(opts: { maxLimit?: number; defaultLimit?: number } = {}) {
  const { maxLimit = 100, defaultLimit = 20 } = opts;
  return z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(maxLimit).default(defaultLimit),
  });
}
