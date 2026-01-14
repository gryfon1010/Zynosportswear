import { NextResponse } from 'next/server';
import { requireAdmin, slugify } from '../../../../../lib/admin/auth';
import { checkRateLimit } from '../../../../../lib/security/rateLimit';
import { assertCurrency, assertIdArray, assertNumber, assertSlug, assertString, assertUrl, optionalString } from '../../../../../lib/security/validate';

export async function PATCH(req, { params }) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const rl = await checkRateLimit(req, { keyPrefix: 'admin_products_write', limit: 120, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const updates = {};

  if (typeof body?.name === 'string') updates.name = assertString(body.name, { field: 'name', min: 1, max: 120 });
  if (typeof body?.slug === 'string') updates.slug = assertSlug(slugify(body.slug), { field: 'slug', min: 1, max: 120 });
  if (typeof body?.sku === 'string') updates.sku = optionalString(body.sku, { field: 'sku', min: 1, max: 64, pattern: /^[a-z0-9._-]+$/i });
  if (body?.sku === null) updates.sku = null;

  if (Array.isArray(body?.categoryIds)) {
    updates.categoryIds = assertIdArray(body.categoryIds, { field: 'categoryIds', max: 50 });
  }

  if (body?.unitAmount !== undefined || body?.currency !== undefined) {
    const unitAmount = body?.unitAmount === undefined ? 0 : assertNumber(body.unitAmount, { field: 'unitAmount', min: 0, max: 10_000_000 });
    const currency = body?.currency ? assertCurrency(body.currency, { field: 'currency' }) : 'usd';
    updates.pricing = { unitAmount, currency };
  }

  if (body?.discountPercent !== undefined) {
    updates.discountPercent = assertNumber(body.discountPercent, { field: 'discountPercent', min: 0, max: 95 });
  }

  if (body?.active !== undefined) updates.active = body.active === false ? false : true;
  if (body?.sortOrder !== undefined) updates.sortOrder = assertNumber(body.sortOrder, { field: 'sortOrder', min: -100000, max: 100000 });

  if (Array.isArray(body?.images)) {
    updates.images = body.images
      .filter((it) => it && typeof it === 'object')
      .map((it) => ({
        url: it?.url ? assertUrl(it.url, { field: 'image url', max: 1000 }) : null,
        alt: typeof it?.alt === 'string' ? it.alt.trim().slice(0, 120) : null,
        color: typeof it?.color === 'string' && it.color.trim() ? it.color.trim().slice(0, 80) : null,
      }))
      .filter((it) => it.url)
      .slice(0, 20);
  }

  if (body?.inStock !== undefined) {
    updates.inStock = body.inStock === false ? false : true;
  }

  if (Array.isArray(body?.colors)) {
    updates.colors = body.colors
      .filter((v) => typeof v === 'string')
      .map((v) => v.trim())
      .filter((v) => v.length)
      .slice(0, 50);
  }

  if (body?.description !== undefined) {
    if (typeof body.description === 'string') {
      updates.description = String(body.description).slice(0, 20000);
    } else {
      updates.description = '';
    }
  }

  if (Array.isArray(body?.sizes)) {
    updates.sizes = body.sizes
      .filter((v) => typeof v === 'string')
      .map((v) => v.trim())
      .filter((v) => v.length)
      .slice(0, 50);
  }

  if (body?.material !== undefined) {
    if (typeof body.material === 'string' && body.material.trim()) {
      updates.material = assertString(body.material.trim(), { field: 'material', min: 1, max: 120 });
    } else {
      updates.material = null;
    }
  }

  if (body?.isBestSeller !== undefined) {
    updates.isBestSeller = body.isBestSeller === true;
  }

  const ref = auth.adminDb.collection('products').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (updates.slug) {
    const existing = await auth.adminDb.collection('products').where('slug', '==', updates.slug).limit(1).get();
    const conflict = existing.docs.find((d) => d.id !== id);
    if (conflict) {
      return NextResponse.json({ error: 'Slug already exists' }, { status: 409 });
    }
  }

  await ref.update({ ...updates, updatedAt: new Date() });
  const after = await ref.get();
  return NextResponse.json({ id: after.id, ...after.data() });
}

export async function DELETE(req, { params }) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const ref = auth.adminDb.collection('products').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ ok: true });

  await ref.delete();
  return NextResponse.json({ ok: true });
}
