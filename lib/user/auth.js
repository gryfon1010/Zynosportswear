import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '../firebase/admin';

function getBearerToken(req) {
  const authHeader = req.headers.get('authorization') || '';
  return authHeader.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
}

export async function requireUser(req) {
  const token = getBearerToken(req);
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
    return {
      ok: true,
      uid: decoded.uid,
      email: decoded.email || null,
      decoded,
      adminDb,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unauthorized';
    return { ok: false, response: NextResponse.json({ error: msg }, { status: 401 }) };
  }
}

export async function tryGetUser(req) {
  const token = getBearerToken(req);
  if (!token) return { ok: true, user: null };

  const adminAuth = getAdminAuth();
  if (!adminAuth) return { ok: true, user: null };

  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return { ok: true, user: { uid: decoded.uid, email: decoded.email || null } };
  } catch {
    return { ok: true, user: null };
  }
}
