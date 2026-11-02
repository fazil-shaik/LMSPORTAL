import { Request, Response, NextFunction } from 'express';

// Simple, high-performance in-memory rate limiter for authentication endpoints (FR-12)
interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup stale records every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Rate Limiter Middleware (PRD Section 4.2 FR-12: Rate limiting on auth endpoints)
 * @param windowMs Time window in milliseconds (e.g. 15 minutes)
 * @param maxAttempts Max allowed requests within the time window
 */
export function rateLimiter(windowMs: number = 15 * 60 * 1000, maxAttempts: number = 10) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Identify by IP address or X-Forwarded-For
    const clientIp =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      'unknown-ip';

    const key = `${clientIp}:${req.baseUrl}${req.path}`;
    const now = Date.now();

    const record = rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      res.setHeader('X-RateLimit-Limit', maxAttempts);
      res.setHeader('X-RateLimit-Remaining', maxAttempts - 1);
      return next();
    }

    if (record.count >= maxAttempts) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      res.setHeader('X-RateLimit-Limit', maxAttempts);
      res.setHeader('X-RateLimit-Remaining', 0);
      return res.status(429).json({
        success: false,
        message: `Too many attempts. Please try again after ${Math.ceil(retryAfterSeconds / 60)} minutes.`,
        retryAfter: retryAfterSeconds,
      });
    }

    record.count += 1;
    res.setHeader('X-RateLimit-Limit', maxAttempts);
    res.setHeader('X-RateLimit-Remaining', maxAttempts - record.count);
    next();
  };
}
