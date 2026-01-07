import { NextResponse } from 'next/server';
import { requireAdmin, slugify } from '../../../../../lib/admin/auth';
import { checkRateLimit } from '../../../../../lib/security/rateLimit';
import { assertNumber, assertSlug, assertString, optionalString, optionalString as optionalUrl } from '../../../../../lib/security/validate';

export async function PATCH(req, { params }) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const rl = await checkRateLimit(req, { keyPrefix: 'admin_categories_write', limit: 120, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  const id = params?.id;
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const updates = {};

  if (typeof body?.name === 'string') updates.name = assertString(body.name, { field: 'name', min: 1, max: 80 });
  if (typeof body?.slug === 'string') updates.slug = assertSlug(slugify(body.slug), { field: 'slug', min: 1, max: 80 });
  if (body?.parentId === null) updates.parentId = null;
  if (typeof body?.parentId === 'string') updates.parentId = optionalString(body.parentId, { field: 'parentId', min: 1, max: 80 });
  if (body?.sortOrder !== undefined) updates.sortOrder = assertNumber(body.sortOrder, { field: 'sortOrder', min: -100000, max: 100000 });
  if (body?.imageUrl === null) updates.imageUrl = null;
  if (typeof body?.imageUrl === 'string') updates.imageUrl = optionalUrl(body.imageUrl, { field: 'imageUrl', min: 1, max: 500 });

  const ref = auth.adminDb.collection('categories').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (updates.parentId && updates.parentId === id) {
    return NextResponse.json({ error: 'Invalid parentId' }, { status: 400 });
  }

  if (updates.slug) {
    const existing = await auth.adminDb.collection('categories').where('slug', '==', updates.slug).limit(1).get();
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

  const ref = auth.adminDb.collection('categories').doc(id);
  const snap = await ref.get();
  if (!snap.exists) return NextResponse.json({ ok: true });

  const children = await auth.adminDb.collection('categories').where('parentId', '==', id).limit(1).get();
  if (!children.empty) {
    return NextResponse.json({ error: 'Category has children. Remove/move children first.' }, { status: 409 });
  }

  await ref.delete();
  return NextResponse.json({ ok: true });
}
