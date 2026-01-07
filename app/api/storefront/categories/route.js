import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../../lib/firebase/admin';

export const runtime = 'nodejs';

export async function GET() {
  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json({ items: [], error: 'Firebase Admin is not configured' }, { status: 500 });
  }

  const snap = await adminDb.collection('categories').get();
  const items = snap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((c) => c?.parentId === null || c?.parentId === undefined)
    .sort((a, b) => {
      const sa = Number(a?.sortOrder || 0);
      const sb = Number(b?.sortOrder || 0);
      if (sa !== sb) return sa - sb;
      return String(a?.name || '').localeCompare(String(b?.name || ''));
    });

  return NextResponse.json({ items });
}
