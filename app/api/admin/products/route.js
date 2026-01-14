import { NextResponse } from 'next/server';
import { requireAdmin, slugify } from '../../../../lib/admin/auth';
import { checkRateLimit } from '../../../../lib/security/rateLimit';
import { assertCurrency, assertIdArray, assertNumber, assertSlug, assertString, assertUrl, optionalString } from '../../../../lib/security/validate';

export async function GET(req) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;

    const snap = await auth.adminDb.collection('products').get();
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
      { error: err instanceof Error ? err.message : 'Failed to load products' },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;

    const rl = await checkRateLimit(req, { keyPrefix: 'admin_products_write', limit: 120, windowMs: 60_000 });
    if (!rl.ok) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

    const body = await req.json().catch(() => ({}));

    const name = assertString(body?.name, { field: 'name', min: 1, max: 120 });
    const slugRaw = typeof body?.slug === 'string' && body.slug.trim() ? slugify(body.slug) : slugify(name);
    const slug = assertSlug(slugRaw, { field: 'slug', min: 1, max: 120 });
    const sku = optionalString(body?.sku, { field: 'sku', min: 1, max: 64, pattern: /^[a-z0-9._-]+$/i });

    const categoryIds = Array.isArray(body?.categoryIds) ? assertIdArray(body.categoryIds, { field: 'categoryIds', max: 50 }) : [];

    const unitAmount = body?.unitAmount === undefined ? 0 : assertNumber(body.unitAmount, { field: 'unitAmount', min: 0, max: 10_000_000 });
    const currency = body?.currency ? assertCurrency(body.currency, { field: 'currency' }) : 'usd';
    const discountPercent = body?.discountPercent === undefined ? 0 : assertNumber(body.discountPercent, { field: 'discountPercent', min: 0, max: 95 });
    const active = body?.active === false ? false : true;
    const sortOrder = body?.sortOrder === undefined ? 0 : assertNumber(body.sortOrder, { field: 'sortOrder', min: -100000, max: 100000 });

    const images = Array.isArray(body?.images)
      ? body.images
          .filter((it) => it && typeof it === 'object')
          .map((it) => ({
            url: it?.url ? assertUrl(it.url, { field: 'image url', max: 1000 }) : null,
            alt: typeof it?.alt === 'string' ? it.alt.trim().slice(0, 120) : null,
            // Optional color tag so we can show color-specific image sets on the product page.
            color: typeof it?.color === 'string' && it.color.trim() ? it.color.trim().slice(0, 80) : null,
          }))
          .filter((it) => it.url)
          .slice(0, 20)
      : [];

    const inStock = body?.inStock === false ? false : true;

    const colors = Array.isArray(body?.colors)
      ? body.colors
          .filter((v) => typeof v === 'string')
          .map((v) => v.trim())
          .filter((v) => v.length)
          .slice(0, 50)
      : [];

    const sizes = Array.isArray(body?.sizes)
      ? body.sizes
          .filter((v) => typeof v === 'string')
          .map((v) => v.trim())
          .filter((v) => v.length)
          .slice(0, 50)
      : [];

    const material = typeof body?.material === 'string' && body.material.trim()
      ? assertString(body.material.trim(), { field: 'material', min: 1, max: 120 })
      : null;

    // Optional long-form product description (may contain HTML). Trim but otherwise allow free text.
    const description = typeof body?.description === 'string'
      ? String(body.description).slice(0, 20000)
      : '';

    const isBestSeller = body?.isBestSeller === true ? true : false;

    const now = new Date();

    const existing = await auth.adminDb.collection('products').where('slug', '==', slug).limit(1).get();
    if (!existing.empty) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
    }

    const doc = {
      name,
      slug,
      sku,
      categoryIds,
      pricing: {
        unitAmount,
        currency,
      },
      discountPercent,
      images,
      description,
      inStock,
      colors,
      sizes,
      material,
      isBestSeller,
      active,
      sortOrder,
      createdAt: now,
      updatedAt: now,
    };

    const ref = await auth.adminDb.collection('products').add(doc);
    return NextResponse.json({ id: ref.id, ...doc });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create product' },
      { status: 500 }
    );
  }
}
