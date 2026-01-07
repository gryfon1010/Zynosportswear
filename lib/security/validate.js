export function assertString(value, { field, min = 0, max = 200, pattern } = {}) {
  if (typeof value !== 'string') throw new Error(`Invalid ${field}`);
  const v = value.trim();
  if (v.length < min) throw new Error(`Invalid ${field}`);
  if (v.length > max) throw new Error(`Invalid ${field}`);
  if (pattern && !pattern.test(v)) throw new Error(`Invalid ${field}`);
  return v;
}

export function optionalString(value, { field, min = 0, max = 200, pattern } = {}) {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') throw new Error(`Invalid ${field}`);
  const v = value.trim();
  if (!v) return null;
  if (v.length < min) throw new Error(`Invalid ${field}`);
  if (v.length > max) throw new Error(`Invalid ${field}`);
  if (pattern && !pattern.test(v)) throw new Error(`Invalid ${field}`);
  return v;
}

export function assertNumber(value, { field, min = -Infinity, max = Infinity } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new Error(`Invalid ${field}`);
  if (n < min || n > max) throw new Error(`Invalid ${field}`);
  return n;
}

export function assertSlug(value, { field = 'slug', min = 1, max = 80 } = {}) {
  const v = assertString(value, { field, min, max });
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/i.test(v)) throw new Error(`Invalid ${field}`);
  return v.toLowerCase();
}

export function assertCurrency(value, { field = 'currency' } = {}) {
  const v = assertString(value, { field, min: 3, max: 3 });
  if (!/^[a-z]{3}$/i.test(v)) throw new Error(`Invalid ${field}`);
  return v.toLowerCase();
}

export function assertUrl(value, { field = 'url', max = 1000 } = {}) {
  const v = assertString(value, { field, min: 1, max });
  let u;
  try {
    u = new URL(v);
  } catch {
    throw new Error(`Invalid ${field}`);
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') throw new Error(`Invalid ${field}`);
  return v;
}

export function assertIdArray(value, { field = 'ids', max = 50 } = {}) {
  if (!Array.isArray(value)) throw new Error(`Invalid ${field}`);
  if (value.length > max) throw new Error(`Invalid ${field}`);
  const out = value
    .filter((x) => typeof x === 'string' && x.trim())
    .map((x) => x.trim());
  return Array.from(new Set(out));
}

export function assertFolder(value, { field = 'folder', max = 64 } = {}) {
  const v = assertString(value, { field, min: 1, max });
  if (v.includes('..')) throw new Error(`Invalid ${field}`);
  if (!/^[a-z0-9/_-]+$/i.test(v)) throw new Error(`Invalid ${field}`);
  return v;
}
