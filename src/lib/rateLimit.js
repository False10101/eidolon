import redis from './redis.js';

async function incrementWindow(key, limit, window) {
    const now = Date.now();
    const windowMs = window * 1000;
    const cutoff = now - windowMs;

    const pipe = redis.pipeline();
    pipe.zremrangebyscore(key, '-inf', cutoff);
    pipe.zadd(key, now, `${now}-${Math.random()}`);
    pipe.zcard(key);
    pipe.expire(key, window + 1);
    const results = await pipe.exec();

    const count = Number(results?.[2]?.[1] ?? limit + 1);
    return count <= limit;
}

/**
 * Sliding-window rate limiter backed by Redis.
 * Returns a NextResponse 429 if the limit is exceeded, otherwise null.
 *
 * @param {string} key    - Unique key, e.g. `rl:generate:${userId}`
 * @param {number} limit  - Max requests allowed in the window
 * @param {number} window - Window size in seconds
 */
export async function rateLimit(key, limit, window) {
    const isUnderLimit = await incrementWindow(key, limit, window);
    if (!isUnderLimit) {
        const { NextResponse } = await import('next/server');
        return NextResponse.json(
            { error: 'Too many requests. Please slow down.' },
            { status: 429 }
        );
    }
    return null;
}

export async function checkRateLimit(identifier, limit, window) {
    return incrementWindow(`rl:ip:${identifier}`, limit, window);
}

export function getClientIp(req) {
    const forwardedFor = req.headers.get('x-forwarded-for');
    const value = req.headers.get('cf-connecting-ip')
        || forwardedFor?.split(',')[0]
        || req.headers.get('x-real-ip');

    return value?.trim() || null;
}

function getConcurrencyKey(userId) {
    return `lock:transcription:${userId}`;
}

export async function acquireConcurrencyLock(userId, scope, ttlSeconds = 30 * 60) {
    const result = await redis.set(
        getConcurrencyKey(userId),
        String(scope || 'transcription'),
        'EX',
        ttlSeconds,
        'NX'
    );

    return result === 'OK';
}

export async function releaseConcurrencyLock(userId, scope) {
    const key = getConcurrencyKey(userId);
    const value = String(scope || 'transcription');

    await redis.eval(
        `
            if redis.call('get', KEYS[1]) == ARGV[1] then
                return redis.call('del', KEYS[1])
            end
            return 0
        `,
        1,
        key,
        value
    );
}
