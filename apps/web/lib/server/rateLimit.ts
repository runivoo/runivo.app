/**
 * Small in-memory limiter for the public form routes (partner applications,
 * waitlist). It is per server instance, so it only slows down a single noisy
 * client; the database caps behind each route are the real guard.
 */

export function makeLimiter(windowMs: number, max: number) {
  const hits = new Map<string, number[]>();
  return function limited(key: string, now = Date.now()): boolean {
    const recent = (hits.get(key) ?? []).filter(t => now - t < windowMs);
    if (recent.length >= max) { hits.set(key, recent); return true; }
    recent.push(now);
    hits.set(key, recent);
    if (hits.size > 5000) {
      for (const [k, v] of hits) if (v.every(t => now - t >= windowMs)) hits.delete(k);
    }
    return false;
  };
}

export function clientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  return (fwd ? fwd.split(',')[0] : req.headers.get('x-real-ip') ?? 'unknown').trim();
}

export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
