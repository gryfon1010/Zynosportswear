import { NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';
import { requireAdmin } from '../../../../../lib/admin/auth';
import { checkRateLimit } from '../../../../../lib/security/rateLimit';
import { assertFolder } from '../../../../../lib/security/validate';

export const runtime = 'nodejs';

export async function POST(req) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  const rl = await checkRateLimit(req, { keyPrefix: 'admin_cloudinary_sign', limit: 120, windowMs: 60_000 });
  if (!rl.ok) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const defaultFolder = process.env.CLOUDINARY_UPLOAD_FOLDER || process.env.CLOUDINARY_UPLOAD_Folder || 'zynosportswear';
  const body = await req.json().catch(() => ({}));
  const folder = body?.folder ? assertFolder(body.folder, { field: 'folder', max: 64 }) : assertFolder(defaultFolder, { field: 'folder', max: 64 });

  if (!cloudName || !apiKey || !apiSecret) {
    const missing = [];
    if (!cloudName) missing.push('CLOUDINARY_CLOUD_NAME (or NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME)');
    if (!apiKey) missing.push('CLOUDINARY_API_KEY');
    if (!apiSecret) missing.push('CLOUDINARY_API_SECRET');

    return NextResponse.json(
      {
        error:
          'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME (or NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME), CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env.local and restart the dev server.',
        missing,
      },
      { status: 500 }
    );
  }

  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

  const timestamp = Math.floor(Date.now() / 1000);

  const signature = cloudinary.utils.api_sign_request(
    {
      folder,
      timestamp,
    },
    apiSecret
  );

  return NextResponse.json({
    cloudName,
    apiKey,
    timestamp,
    signature,
    folder,
  });
}
