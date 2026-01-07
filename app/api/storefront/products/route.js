import { NextResponse } from 'next/server';
import { getAdminDb } from '../../../../lib/firebase/admin';

export const runtime = 'nodejs';

export async function GET(req) {
  const adminDb = getAdminDb();
  if (!adminDb) {
    return NextResponse.json({ items: [], error: 'Firebase Admin is not configured' }, { status: 500 });
  }

  const url = new URL(req.url);
  const categoryId = url.searchParams.get('categoryId');
  const activeOnly = url.searchParams.get('active') !== 'false';
  const saleOnly = url.searchParams.get('sale') === 'true';
  const q = url.searchParams.get('q');
  const cursor = url.searchParams.get('cursor');
  const limitRaw = url.searchParams.get('limit');
  const limit = Math.min(Math.max(parseInt(limitRaw || '24', 10) || 24, 1), 200);

  // Basic search (non-indexed): fetch and filter in-memory.
  // For production-scale search, use Algolia/Meilisearch later.
  const searchTerm = typeof q === 'string' && q.trim() ? q.trim().toLowerCase() : null;

  // If search is used, we keep things simple and return first page only.
  if (searchTerm) {
    const snap = categoryId
      ? await adminDb.collection('products').where('categoryIds', 'array-contains', categoryId).get()
      : await adminDb.collection('products').get();

    const filtered = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((p) => (activeOnly ? p?.active !== false : true))
      .filter((p) => (saleOnly ? Number(p?.discountPercent || 0) > 0 : true))
      .filter((p) => {
        const name = String(p?.name || '').toLowerCase();
        const sku = String(p?.sku || '').toLowerCase();
        return name.includes(searchTerm) || sku.includes(searchTerm);
      })
      .sort((a, b) => {
        const sa = Number(a?.sortOrder || 0);
        const sb = Number(b?.sortOrder || 0);
        if (sa !== sb) return sa - sb;
        return String(a?.name || '').localeCompare(String(b?.name || ''));
      })
      .slice(0, limit);

    return NextResponse.json({ items: filtered, nextCursor: null });
  }

  let query = adminDb.collection('products');
  if (categoryId) query = query.where('categoryIds', 'array-contains', categoryId);
  // Keep query simple (avoid inequality filters that often require extra indexes).

  // Pagination: cursor is a product document ID.
  if (cursor) {
    const cursorRef = adminDb.collection('products').doc(cursor);
    const cursorSnap = await cursorRef.get();
    if (cursorSnap.exists) {
      query = query.startAfter(cursorSnap);
    }
  }

  const snap = await query.limit(limit + 1).get();
  const docs = snap.docs;
  const pageDocs = docs.slice(0, limit);
  const items = pageDocs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((p) => (activeOnly ? p?.active !== false : true))
    .filter((p) => (saleOnly ? Number(p?.discountPercent || 0) > 0 : true));

  const hasMore = docs.length > limit;
  const nextCursor = hasMore ? pageDocs[pageDocs.length - 1]?.id || null : null;

  return NextResponse.json({ items, nextCursor });
}
