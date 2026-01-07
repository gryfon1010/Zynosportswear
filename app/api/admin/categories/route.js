import { NextResponse } from 'next/server';
import { requireAdmin, slugify } from '../../../../lib/admin/auth';
import { checkRateLimit } from '../../../../lib/security/rateLimit';
import { assertNumber, assertSlug, assertString, optionalString, optionalString as optionalUrl } from '../../../../lib/security/validate';

export async function GET(req) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;

    const snap = await auth.adminDb.collection('categories').get();
    const items = snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const sa = Number(a?.sortOrder || 0);
        const sb = Number(b?.sortOrder || 0);
        if (sa !== sb) return sa - sb;
        return String(a?.name || '').localeCompare(String(b?.name || ''));
      });

    return NextResponse.json({ items });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to load categories' },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;

    const rl = await checkRateLimit(req, { keyPrefix: 'admin_categories_write', limit: 120, windowMs: 60_000 });
    if (!rl.ok) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

    const body = await req.json().catch(() => ({}));
    const name = assertString(body?.name, { field: 'name', min: 1, max: 80 });
    const parentId = optionalString(body?.parentId, { field: 'parentId', min: 1, max: 80 });
    const sortOrder = body?.sortOrder === undefined ? 0 : assertNumber(body.sortOrder, { field: 'sortOrder', min: -100000, max: 100000 });
    const imageUrl = body?.imageUrl ? optionalUrl(body.imageUrl, { field: 'imageUrl', min: 1, max: 500 }) : null;
    const slugRaw = typeof body?.slug === 'string' && body.slug.trim() ? slugify(body.slug) : slugify(name);
    const slug = assertSlug(slugRaw, { field: 'slug', min: 1, max: 80 });

    const now = new Date();

    const existing = await auth.adminDb.collection('categories').where('slug', '==', slug).limit(1).get();
    if (!existing.empty) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
    }

    const doc = {
      name,
      slug,
      parentId,
      sortOrder,
      imageUrl: imageUrl || null,
      createdAt: now,
      updatedAt: now,
    };

    const ref = await auth.adminDb.collection('categories').add(doc);
    return NextResponse.json({ id: ref.id, ...doc });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create category' },
      { status: 500 }
    );
  }
}
