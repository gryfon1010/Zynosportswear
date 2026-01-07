import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '../firebase/admin';

export async function requireAdmin(req) {
  const authHeader = req.headers.get('authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;

  if (!token) {
    return { ok: false, response: NextResponse.json({ error: 'Missing Authorization Bearer token' }, { status: 401 }) };
  }

  const adminAuth = getAdminAuth();
  const adminDb = getAdminDb();
  if (!adminAuth || !adminDb) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error:
            'Firebase Admin is not configured. Set FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY in .env.local and restart the dev server.',
        },
        { status: 500 }
      ),
    };
  }

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;

    const adminSnap = await adminDb.collection('admins').doc(uid).get();
    const adminData = adminSnap.exists ? adminSnap.data() : null;

    const enabled = adminData?.enabled !== false;
    const isAdmin = Boolean(adminData) && enabled;

    if (!isAdmin) {
      return { ok: false, response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) };
    }

    return {
      ok: true,
      uid,
      email: decoded.email || null,
      role: adminData?.role || null,
      adminDb,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unauthorized';
    return { ok: false, response: NextResponse.json({ error: msg }, { status: 401 }) };
  }
}

export function slugify(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}
