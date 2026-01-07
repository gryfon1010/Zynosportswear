const store = (globalThis.__ZYN_RATE_LIMIT_STORE__ = globalThis.__ZYN_RATE_LIMIT_STORE__ || new Map());

function getClientIp(req) {
  const xf = req.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0].trim();
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  const cf = req.headers.get('cf-connecting-ip');
  if (cf) return cf.trim();
  return 'unknown';
}

export async function checkRateLimit(req, { keyPrefix, limit, windowMs }) {
  const ip = getClientIp(req);
  const key = `${keyPrefix}:${ip}`;

  const mode = (process.env.RATE_LIMIT_MODE || 'memory').toLowerCase();
  const useUpstash = mode === 'upstash';

  if (useUpstash) {
    try {
      const url = process.env.UPSTASH_REDIS_REST_URL;
      const token = process.env.UPSTASH_REDIS_REST_TOKEN;
      if (url && token) {
        return await upstashFixedWindow({ url, token, key, limit, windowMs });
      }
    } catch {
      // fall back to memory
    }
  }

  return memoryFixedWindow({ key, limit, windowMs });
}

function memoryFixedWindow({ key, limit, windowMs }) {
  const now = Date.now();
  const existing = store.get(key);
  if (!existing || now > existing.resetAt) {
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return { ok: true, remaining: limit - 1, resetAt, source: 'memory' };
  }

  existing.count += 1;
  store.set(key, existing);

  if (existing.count > limit) {
    return { ok: false, remaining: 0, resetAt: existing.resetAt, source: 'memory' };
  }

  return { ok: true, remaining: limit - existing.count, resetAt: existing.resetAt, source: 'memory' };
}

async function upstashRequest({ url, token, body }) {
  const res = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(typeof data?.error === 'string' ? data.error : `Upstash error (${res.status})`);
  }
  return data;
}

async function upstashFixedWindow({ url, token, key, limit, windowMs }) {
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  const now = Date.now();
  const resetAt = now + windowSec * 1000;

  const windowId = Math.floor(now / (windowSec * 1000));
  const bucketKey = `rl:${key}:${windowId}`;

  const result = await upstashRequest({
    url,
    token,
    body: [
      ['INCR', bucketKey],
      ['EXPIRE', bucketKey, windowSec],
    ],
  });

  const count = Number(result?.[0]?.result || 0);
  if (!Number.isFinite(count) || count <= 0) {
    return { ok: true, remaining: limit - 1, resetAt, source: 'upstash' };
  }

  if (count > limit) {
    return { ok: false, remaining: 0, resetAt, source: 'upstash' };
  }

  return { ok: true, remaining: limit - count, resetAt, source: 'upstash' };
}
