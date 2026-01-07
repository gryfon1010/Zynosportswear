import { NextResponse } from 'next/server';
import { requireUser } from '../../../../../lib/user/auth';

export const runtime = 'nodejs';

export async function GET(req, { params }) {
  try {
    const auth = await requireUser(req);
    if (!auth.ok) return auth.response;

    const id = params?.id;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const ref = auth.adminDb.collection('orders').doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const order = { id: snap.id, ...snap.data() };
    if (order?.userId !== auth.uid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    return NextResponse.json({ order: normalizeOrder(order) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load order' },
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
