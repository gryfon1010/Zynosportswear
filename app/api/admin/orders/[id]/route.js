import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/admin/auth';

export const runtime = 'nodejs';

export async function GET(req, { params }) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;

    const id = params?.id;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const ref = auth.adminDb.collection('orders').doc(id);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ item: normalizeOrder({ id: snap.id, ...snap.data() }) });
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

export async function PATCH(req, { params }) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;

    const id = params?.id;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const body = await req.json().catch(() => ({}));

    const paymentStatus = typeof body?.paymentStatus === 'string' ? body.paymentStatus.trim().toLowerCase() : null;
    const fulfillmentStatus =
      typeof body?.fulfillmentStatus === 'string' ? body.fulfillmentStatus.trim().toLowerCase() : null;

    const allowedPayment = new Set(['pending', 'paid', 'failed', 'refunded']);
    const allowedFulfillment = new Set(['unfulfilled', 'processing', 'shipped', 'delivered', 'canceled']);

    const updates = {};
    if (paymentStatus !== null) {
      if (!allowedPayment.has(paymentStatus)) return NextResponse.json({ error: 'Invalid paymentStatus' }, { status: 400 });
      updates['payment.status'] = paymentStatus;
    }
    if (fulfillmentStatus !== null) {
      if (!allowedFulfillment.has(fulfillmentStatus)) {
        return NextResponse.json({ error: 'Invalid fulfillmentStatus' }, { status: 400 });
      }
      updates['fulfillment.status'] = fulfillmentStatus;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid updates' }, { status: 400 });
    }

    const ref = auth.adminDb.collection('orders').doc(id);
    const beforeSnap = await ref.get();
    if (!beforeSnap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const before = beforeSnap.data() || {};

    const now = new Date();
    await ref.update({ ...updates, updatedAt: now });

    // Optional: enqueue notification records (no provider required yet)
    const customerEmail = before?.email || before?.customer?.email || null;

    if (customerEmail) {
      const notify = [];
      if (updates['payment.status'] === 'paid' && before?.payment?.status !== 'paid') {
        notify.push({ type: 'order_paid', orderId: id, email: customerEmail, createdAt: now, status: 'pending' });
      }
      if (updates['fulfillment.status'] === 'shipped' && before?.fulfillment?.status !== 'shipped') {
        notify.push({ type: 'order_shipped', orderId: id, email: customerEmail, createdAt: now, status: 'pending' });
      }
      if (notify.length) {
        const batch = auth.adminDb.batch();
        for (const n of notify) {
          const qref = auth.adminDb.collection('email_queue').doc();
          batch.set(qref, n);
        }
        await batch.commit();
      }
    }

    const afterSnap = await ref.get();
    return NextResponse.json({ item: normalizeOrder({ id: afterSnap.id, ...afterSnap.data() }) });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update order' },
      { status: 500 }
    );
  }
}
