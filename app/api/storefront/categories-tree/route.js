import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../../lib/firebase/admin';

export const runtime = 'nodejs';

export async function GET() {
  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json({ items: [], error: 'Firebase Admin is not configured' }, { status: 500 });
  }

  const snap = await adminDb.collection('categories').get();
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const byParent = new Map();
  for (const c of all) {
    const key = c?.parentId || null;
    const arr = byParent.get(key) || [];
    arr.push(c);
    byParent.set(key, arr);
  }

  function sortCats(arr) {
    return arr.sort((a, b) => {
      const sa = Number(a?.sortOrder || 0);
      const sb = Number(b?.sortOrder || 0);
      if (sa !== sb) return sa - sb;
      return String(a?.name || '').localeCompare(String(b?.name || ''));
    });
  }

  const parents = sortCats(byParent.get(null) || []);
  const items = parents.map((p) => {
    const children = sortCats((byParent.get(p.id) || []).slice());
    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      imageUrl: p.imageUrl || null,
      sortOrder: p.sortOrder || 0,
      children: children.map((c) => {
        const grandchildren = sortCats((byParent.get(c.id) || []).slice());
        return {
          id: c.id,
          name: c.name,
          slug: c.slug,
          imageUrl: c.imageUrl || null,
          sortOrder: c.sortOrder || 0,
          children: grandchildren.map((gc) => ({
            id: gc.id,
            name: gc.name,
            slug: gc.slug,
            imageUrl: gc.imageUrl || null,
            sortOrder: gc.sortOrder || 0,
          })),
        };
      }),
    };
  });

  return NextResponse.json({ items });
}
