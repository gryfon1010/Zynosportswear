import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../../lib/firebase/admin';

export const runtime = 'nodejs';

export async function GET(req) {
  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json({ items: [], error: 'Firebase Admin is not configured' }, { status: 500 });
  }

  const url = new URL(req.url);
  const activeOnly = url.searchParams.get('active') !== 'false';

  const [catSnap, prodSnap] = await Promise.all([
    adminDb.collection('categories').get(),
    adminDb.collection('products').get(),
  ]);

  const categories = catSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const products = prodSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((p) => (activeOnly ? p?.active !== false : true));

  const countByCategoryId = new Map();
  for (const p of products) {
    const ids = Array.isArray(p?.categoryIds) ? p.categoryIds : [];
    for (const cid of ids) {
      if (typeof cid !== 'string') continue;
      countByCategoryId.set(cid, (countByCategoryId.get(cid) || 0) + 1);
    }
  }

  const byParent = new Map();
  for (const c of categories) {
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
    const childItems = children.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      sortOrder: c.sortOrder || 0,
      productCount: countByCategoryId.get(c.id) || 0,
    }));

    const productCount = (countByCategoryId.get(p.id) || 0) + childItems.reduce((sum, x) => sum + (x.productCount || 0), 0);

    return {
      id: p.id,
      name: p.name,
      slug: p.slug,
      sortOrder: p.sortOrder || 0,
      productCount,
      children: childItems,
    };
  });

  return NextResponse.json({ items });
}
