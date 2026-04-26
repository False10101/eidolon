import redis from './redis.js';

/**
 * Sliding-window rate limiter backed by Redis.
 * Returns a NextResponse 429 if the limit is exceeded, otherwise null.
 *
 * @param {string} key    - Unique key, e.g. `rl:generate:${userId}`
 * @param {number} limit  - Max requests allowed in the window
 * @param {number} window - Window size in seconds
 */
export async function rateLimit(key, limit, window) {
    const now = Date.now();
    const windowMs = window * 1000;
    const cutoff = now - windowMs;

    const pipe = redis.pipeline();
    pipe.zremrangebyscore(key, '-inf', cutoff);
    pipe.zadd(key, now, `${now}-${Math.random()}`);
    pipe.zcard(key);
    pipe.expire(key, window + 1);
    const results = await pipe.exec();

    const count = results[2][1];
    if (count > limit) {
        const { NextResponse } = await import('next/server');
        return NextResponse.json(
            { error: 'Too many requests. Please slow down.' },
            { status: 429 }
        );
    }
    return null;
}
