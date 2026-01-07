import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../../lib/firebase/admin';

export const runtime = 'nodejs';

const COLLECTION = 'navbarCategoryImages';

export async function GET() {
  try {
    const db = getAdminDb();
    if (!db) {
      return NextResponse.json({ items: [] }, { status: 200 });
    }

    const snap = await db.collection(COLLECTION).get();
    const items = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((it) => typeof it?.mainSlug === 'string' && typeof it?.imageUrl === 'string')
      .map((it) => ({
        id: it.id,
        mainSlug: String(it.mainSlug || '').toLowerCase(),
        name: String(it.name || ''),
        imageUrl: String(it.imageUrl || ''),
        href: typeof it.href === 'string' ? it.href : null,
        sortOrder: Number(it.sortOrder || 0),
      }))
      .sort((a, b) => {
        const sa = Number(a?.sortOrder || 0);
        const sb = Number(b?.sortOrder || 0);
        if (sa !== sb) return sa - sb;
        return String(a?.name || '').localeCompare(String(b?.name || ''));
      });

    return NextResponse.json({ items }, { status: 200 });
  } catch {
    return NextResponse.json({ items: [] }, { status: 200 });
  }
}
