import { NextResponse } from 'next/server';
import { requireUser } from '../../../../lib/user/auth';

export const runtime = 'nodejs';

export async function GET(req) {
  const auth = await requireUser(req);
  if (!auth.ok) return auth.response;

  return NextResponse.json({ uid: auth.uid, email: auth.email });
}
