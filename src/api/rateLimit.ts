import type { MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";

export interface RateLimitOptions {
  windowMs: number;
  max: number;
}

/**
 * Basit bellek-içi rate limit middleware'i. Anahtar: oturum id'si (yoksa IP).
 * Pencere içinde `max` isteği aşınca 429 döner.
 */
export function createRateLimit(options: RateLimitOptions): MiddlewareHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();

  return async (c, next) => {
    const key = getCookie(c, "session") ?? c.req.header("x-forwarded-for") ?? "anon";
    const now = Date.now();
    const entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      hits.set(key, { count: 1, resetAt: now + options.windowMs });
      return next();
    }
    if (entry.count >= options.max) {
      return c.json({ error: "rate_limited" }, 429);
    }
    entry.count++;
    return next();
  };
}
