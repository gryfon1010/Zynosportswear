import { getAdminDb } from '../lib/firebase/admin.js';

function slugify(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function hasEnv(name) {
  const v = process.env[name];
  return typeof v === 'string' && v.trim().length > 0;
}

const TOP_CATEGORIES = [
  { name: 'Boxing', slug: 'boxing', sortOrder: 0 },
  { name: 'MMA', slug: 'mma', sortOrder: 10 },
  { name: 'Fitness', slug: 'fitness', sortOrder: 20 },
  { name: 'Yoga', slug: 'yoga', sortOrder: 30 },
  { name: 'Apparel', slug: 'apparel', sortOrder: 40 },
  { name: 'Collections', slug: 'collections', sortOrder: 50 },
  { name: 'Kids', slug: 'kids', sortOrder: 60 },
  { name: 'Sale', slug: 'sale', sortOrder: 70 },
];

async function upsertCategory(db, cat) {
  const now = new Date();
  const slug = slugify(cat.slug || cat.name);
  const name = String(cat.name || '').trim();

  const existing = await db.collection('categories').where('slug', '==', slug).limit(1).get();
  if (!existing.empty) {
    const doc = existing.docs[0];
    await doc.ref.update({
      name,
      slug,
      parentId: null,
      sortOrder: Number(cat.sortOrder || 0),
      updatedAt: now,
    });
    return { id: doc.id, action: 'updated', slug };
  }

  const doc = {
    name,
    slug,
    parentId: null,
    sortOrder: Number(cat.sortOrder || 0),
    createdAt: now,
    updatedAt: now,
  };

  const ref = await db.collection('categories').add(doc);
  return { id: ref.id, action: 'created', slug };
}

async function main() {
  const db = getAdminDb();
  if (!db) {
    const missing = [];
    if (!hasEnv('FIREBASE_ADMIN_PROJECT_ID') && !hasEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID') && !hasEnv('GOOGLE_CLOUD_PROJECT') && !hasEnv('GCLOUD_PROJECT')) {
      missing.push('FIREBASE_ADMIN_PROJECT_ID');
    }
    if (!hasEnv('FIREBASE_ADMIN_CLIENT_EMAIL') && !hasEnv('FIREBASE_CLIENT_EMAIL') && !hasEnv('GOOGLE_CLIENT_EMAIL')) {
      missing.push('FIREBASE_ADMIN_CLIENT_EMAIL');
    }
    if (!hasEnv('FIREBASE_ADMIN_PRIVATE_KEY') && !hasEnv('FIREBASE_PRIVATE_KEY') && !hasEnv('FIREBASE_ADMIN_PRIVATE_KEY_BASE64') && !hasEnv('GOOGLE_APPLICATION_CREDENTIALS')) {
      missing.push('FIREBASE_ADMIN_PRIVATE_KEY (or GOOGLE_APPLICATION_CREDENTIALS)');
    }

    throw new Error(
      `Firebase Admin is not configured for this process. Missing: ${missing.length ? missing.join(', ') : 'unknown'}\n` +
        `Make sure your .env.local contains FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY.\n` +
        `Then run: node --env-file .env.local .\\scripts\\seedTopCategories.mjs`
    );
  }

  const results = [];
  for (const cat of TOP_CATEGORIES) {
    results.push(await upsertCategory(db, cat));
  }

  console.log('Seed complete:', results);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
