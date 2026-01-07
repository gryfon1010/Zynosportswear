import { NextResponse } from 'next/server';
import { requireUser } from '../../../../lib/user/auth';

export const runtime = 'nodejs';

export async function GET(req) {
  try {
    const auth = await requireUser(req);
    if (!auth.ok) return auth.response;

    const snap = await auth.adminDb
      .collection('orders')
      .where('userId', '==', auth.uid)
      .get();

    const items = snap.docs
      .map((d) => normalizeOrder({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const ta = a?.createdAt ? Date.parse(a.createdAt) : 0;
        const tb = b?.createdAt ? Date.parse(b.createdAt) : 0;
        return tb - ta;
      });

    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load orders' },
      { status: 500 }
    );
  }
}

function toIsoMaybe(value) {
  if (!value) return null;
  if (typeof value?.toDate === 'function') {
    const d = value.toDate();
    return d instanceof Date ? d.toISOString() : null;
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const seconds = value?.seconds ?? value?._seconds;
    const nanos = value?.nanoseconds ?? value?._nanoseconds;
    if (typeof seconds === 'number') {
      const ms = seconds * 1000 + (typeof nanos === 'number' ? Math.floor(nanos / 1e6) : 0);
      return new Date(ms).toISOString();
    }
  }
  return null;
}

function normalizeOrder(o) {
  return {
    ...o,
    createdAt: toIsoMaybe(o?.createdAt),
    updatedAt: toIsoMaybe(o?.updatedAt),
    accessTokenCreatedAt: toIsoMaybe(o?.accessTokenCreatedAt),
    accessTokenLastUsedAt: toIsoMaybe(o?.accessTokenLastUsedAt),
  };
}
