import { NextResponse } from 'next/server';
import { requireUser } from '../../../../lib/user/auth';
import { constantTimeEqualHex, sha256Hex } from '../../../../lib/crypto';

export const runtime = 'nodejs';

export async function POST(req) {
  try {
    const auth = await requireUser(req);
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => ({}));
    const orderId = typeof body?.orderId === 'string' ? body.orderId.trim() : null;
    const token = typeof body?.token === 'string' ? body.token.trim() : null;

    if (!orderId || !token) {
      return NextResponse.json({ error: 'Missing orderId or token' }, { status: 400 });
    }

    const ref = auth.adminDb.collection('orders').doc(orderId);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const order = snap.data() || {};
    if (!order?.accessTokenHash) {
      return NextResponse.json({ error: 'Order is not claimable' }, { status: 409 });
    }

    const tokenHash = sha256Hex(token);
    const ok = constantTimeEqualHex(order.accessTokenHash, tokenHash);
    if (!ok) return NextResponse.json({ error: 'Invalid token' }, { status: 403 });

    if (order?.userId && order.userId !== auth.uid) {
      return NextResponse.json({ error: 'Order already claimed' }, { status: 409 });
    }

    const now = new Date();

    await ref.update({
      customerType: 'user',
      userId: auth.uid,
      email: order?.email || auth.email || null,
      guestClaimedAt: now,
      accessTokenHash: null,
      accessTokenLastUsedAt: now,
      updatedAt: now,
    });

    return NextResponse.json({ ok: true, orderId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to claim order' },
      { status: 500 }
    );
  }
}
