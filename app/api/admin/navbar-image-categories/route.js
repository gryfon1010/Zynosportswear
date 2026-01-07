import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/admin/auth';
import { checkRateLimit } from '../../../../lib/security/rateLimit';
import { assertNumber, assertSlug, assertString, optionalString, assertUrl } from '../../../../lib/security/validate';

export const runtime = 'nodejs';

const COLLECTION = 'navbarCategoryImages';

export async function GET(req) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;

    const snap = await auth.adminDb.collection(COLLECTION).get();
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
      { error: err instanceof Error ? err.message : 'Failed to load navbar image categories' },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;

    const rl = await checkRateLimit(req, { keyPrefix: 'admin_navbar_image_categories_write', limit: 120, windowMs: 60_000 });
    if (!rl.ok) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

    const body = await req.json().catch(() => ({}));

    const mainSlug = assertSlug(body?.mainSlug, { field: 'mainSlug', min: 1, max: 80 });
    const name = assertString(body?.name, { field: 'name', min: 1, max: 120 });
    const sortOrder = body?.sortOrder === undefined ? 0 : assertNumber(body.sortOrder, { field: 'sortOrder', min: -100000, max: 100000 });
    const imageUrl = assertUrl(body?.imageUrl, { field: 'imageUrl', max: 1000 });
    const hrefRaw = optionalString(body?.href, { field: 'href', min: 1, max: 1000 });

    let href = null;
    if (hrefRaw) {
      if (hrefRaw.startsWith('/')) href = hrefRaw;
      else href = assertUrl(hrefRaw, { field: 'href', max: 1000 });
    }

    const now = new Date();

    const doc = {
      mainSlug,
      name,
      imageUrl,
      href,
      sortOrder,
      createdAt: now,
      updatedAt: now,
    };

    const ref = await auth.adminDb.collection(COLLECTION).add(doc);
    return NextResponse.json({ id: ref.id, ...doc });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create navbar image category' },
      { status: 500 }
    );
  }
}
