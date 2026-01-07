import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../../lib/firebase/admin';

export const runtime = 'nodejs';

export async function GET() {
  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json({ items: [], error: 'Firebase Admin is not configured' }, { status: 500 });
  }

  const cfgSnap = await adminDb.collection('site').doc('featured').get();
  const cfg = cfgSnap.exists ? cfgSnap.data() : null;
  const productIds = Array.isArray(cfg?.productIds)
    ? cfg.productIds.filter((x) => typeof x === 'string' && x.trim()).map((x) => x.trim())
    : [];

  if (!productIds.length) return NextResponse.json({ items: [] });

  const docs = await Promise.all(productIds.map((id) => adminDb.collection('products').doc(id).get()));
  const byId = new Map(docs.filter((d) => d.exists).map((d) => [d.id, { id: d.id, ...d.data() }]));
  const items = productIds.map((id) => byId.get(id)).filter(Boolean);

  return NextResponse.json({ items });
}
