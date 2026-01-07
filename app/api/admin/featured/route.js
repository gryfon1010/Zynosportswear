import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/admin/auth';

export const runtime = 'nodejs';

const DOC_REF = { collection: 'site', id: 'featured' };

export async function GET(req) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;

    const snap = await auth.adminDb.collection(DOC_REF.collection).doc(DOC_REF.id).get();
    const data = snap.exists ? snap.data() : null;
    const productIds = Array.isArray(data?.productIds)
      ? data.productIds.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim())
      : [];

    return NextResponse.json({ productIds });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load featured config' },
      { status: 500 }
    );
  }
}

export async function PUT(req) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => ({}));
    const productIds = Array.isArray(body?.productIds)
      ? body.productIds.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim())
      : [];

    await auth.adminDb
      .collection(DOC_REF.collection)
      .doc(DOC_REF.id)
      .set({ productIds, updatedAt: new Date() }, { merge: true });

    return NextResponse.json({ productIds });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to update featured config' },
      { status: 500 }
    );
  }
}
