import { v2 as cloudinary } from 'cloudinary';
import path from 'path';

function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function main() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error(
      'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME (or NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME), CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env.local'
    );
  }

  const folder = process.env.CLOUDINARY_UPLOAD_FOLDER || 'zynosportswear/promos';

  const file1 = process.argv[2];
  const file2 = process.argv[3];
  if (!file1 || !file2) {
    throw new Error(
      'Usage: node --env-file .env.local ./scripts/uploadApparelPromosToCloudinary.mjs <path-to-promo-1> <path-to-promo-2>'
    );
  }

  cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

  const uploads = [
    { file: file1, publicId: 'apparel-promo-1' },
    { file: file2, publicId: 'apparel-promo-2' },
  ];

  const results = [];
  for (const u of uploads) {
    const res = await cloudinary.uploader.upload(path.resolve(u.file), {
      folder,
      public_id: u.publicId,
      overwrite: true,
      resource_type: 'image',
    });
    results.push({ publicId: res.public_id, url: res.secure_url || res.url });
  }

  const promo1 = results[0]?.url;
  const promo2 = results[1]?.url;

  console.log('\nUpload complete. Paste these into your .env.local and restart the dev server:\n');
  console.log(`NEXT_PUBLIC_APPAREL_PROMO_1_IMAGE_URL=${promo1}`);
  console.log(`NEXT_PUBLIC_APPAREL_PROMO_2_IMAGE_URL=${promo2}`);

  console.log('\nOptional (set where promos should link):\n');
  console.log('NEXT_PUBLIC_APPAREL_PROMO_1_HREF=/category/apparel');
  console.log('NEXT_PUBLIC_APPAREL_PROMO_2_HREF=/category/apparel');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
