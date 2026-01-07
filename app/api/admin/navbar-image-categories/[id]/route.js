import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../../lib/admin/auth';
import { checkRateLimit } from '../../../../../lib/security/rateLimit';
import { assertNumber, assertSlug, assertString, optionalString, assertUrl } from '../../../../../lib/security/validate';

export const runtime = 'nodejs';

const COLLECTION = 'navbarCategoryImages';

export async function PATCH(req, { params }) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const rl = await checkRateLimit(req, { keyPrefix: 'admin_navbar_image_categories_write', limit: 120, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const updates = {};

  if (typeof body?.mainSlug === 'string') updates.mainSlug = assertSlug(body.mainSlug, { field: 'mainSlug', min: 1, max: 80 });
  if (typeof body?.name === 'string') updates.name = assertString(body.name, { field: 'name', min: 1, max: 120 });
  if (body?.sortOrder !== undefined) updates.sortOrder = assertNumber(body.sortOrder, { field: 'sortOrder', min: -100000, max: 100000 });
  if (typeof body?.imageUrl === 'string') updates.imageUrl = assertUrl(body.imageUrl, { field: 'imageUrl', max: 1000 });
  if (body?.href !== undefined) {
    const hrefRaw = optionalString(body.href, { field: 'href', min: 1, max: 1000 });
    if (!hrefRaw) updates.href = null;
    else if (hrefRaw.startsWith('/')) updates.href = hrefRaw;
    else updates.href = assertUrl(hrefRaw, { field: 'href', max: 1000 });
  }

  const ref = auth.adminDb.collection(COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  await ref.update({ ...updates, updatedAt: new Date() });
  const after = await ref.get();
  return NextResponse.json({ id: after.id, ...after.data() });
}

export async function DELETE(req, { params }) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const ref = auth.adminDb.collection(COLLECTION).doc(id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ ok: true });

  await ref.delete();
  return NextResponse.json({ ok: true });
}
