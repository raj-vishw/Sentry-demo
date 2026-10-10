import type { Request } from 'express';

/**
 * Express types `req.params[key]` as `string | string[]` to account for
 * repeated route segments, which none of this API's routes use — this
 * narrows it back to the plain string every param actually is at runtime.
 */
export function getParam(req: Request, key: string): string {
  const value = req.params[key];
  return Array.isArray(value) ? value[0] : value;
}
