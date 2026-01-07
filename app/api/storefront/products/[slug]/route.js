import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../../../lib/firebase/admin';

export const runtime = 'nodejs';

export async function GET(req, { params }) {
  const slug = params?.slug;
  if (!slug) return NextResponse.json({ error: 'Missing slug' }, { status: 400 });

  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json({ error: 'Firebase Admin is not configured' }, { status: 500 });
  }

  const snap = await adminDb.collection('products').where('slug', '==', slug).limit(1).get();
  if (snap.empty) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const doc = snap.docs[0];
  return NextResponse.json({ item: { id: doc.id, ...doc.data() } });
}
