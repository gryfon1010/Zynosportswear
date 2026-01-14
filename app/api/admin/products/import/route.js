'use server';

import { NextResponse } from 'next/server';
import { requireAdmin, slugify } from '../../../../../lib/admin/auth';
import { checkRateLimit } from '../../../../../lib/security/rateLimit';
import { getAdminDb } from '../../../../../lib/firebase/admin';
import { assertUrl } from '../../../../../lib/security/validate';

export const runtime = 'nodejs';

// Minimal CSV parser that supports quoted fields with commas and newlines.
function parseCsv(text) {
  const rows = [];
  let current = [];
  let field = '';
  let inQuotes = false;

  function pushField() {
    current.push(field);
    field = '';
  }

  function pushRow() {
    // Skip empty trailing row
    if (current.length === 1 && current[0].trim() === '') {
      current = [];
      return;
    }
    rows.push(current);
    current = [];
  }

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        const next = text[i + 1];
        if (next === '"') {
          // Escaped quote
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        pushField();
      } else if (ch === '\n') {
        pushField();
        pushRow();
      } else if (ch === '\r') {
        // ignore, handle on \n
      } else {
        field += ch;
      }
    }
  }

  // Flush last field/row
  pushField();
  if (current.length) pushRow();

  return rows;
}

function normalizeHeader(name) {
  return String(name || '')
    .trim()
    .toLowerCase();
}

function buildRows(text) {
  const rows = parseCsv(text);
  if (!rows.length) return [];
  const header = rows[0].map((h) => normalizeHeader(h));
  const dataRows = rows.slice(1);

  return dataRows
    .filter((r) => r.some((v) => String(v || '').trim().length))
    .map((r) => {
      const obj = {};
      for (let i = 0; i < header.length; i++) {
        const key = header[i];
        if (!key) continue;
        obj[key] = i < r.length ? r[i] : '';
      }
      return obj;
    });
}

function normalizeCategoryName(value) {
  return slugify(String(value || ''));
}

export async function POST(req) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;

    const rl = await checkRateLimit(req, { keyPrefix: 'admin_products_import', limit: 10, windowMs: 60_000 });
    if (!rl.ok) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || typeof file === 'string') {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const text = await file.text();
    const rows = buildRows(text);
    if (!rows.length) {
      return NextResponse.json({ error: 'CSV is empty or invalid' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    if (!adminDb) {
      return NextResponse.json({ error: 'Firebase Admin is not configured' }, { status: 500 });
    }

    // Load categories once and build lookup maps
    const catSnap = await adminDb.collection('categories').get();
    const categories = catSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

    const categoriesBySlug = new Map();
    const categoriesByNameNorm = new Map();

    for (const c of categories) {
      if (c.slug) categoriesBySlug.set(String(c.slug), c);
      if (c.name) categoriesByNameNorm.set(normalizeCategoryName(c.name), c);
    }

    function resolveCategoryId(categoryValue) {
      if (!categoryValue) return null;
      const norm = normalizeCategoryName(categoryValue);
      const byName = categoriesByNameNorm.get(norm);
      if (byName) return byName.id;

      const bySlug = categoriesBySlug.get(norm);
      if (bySlug) return bySlug.id;

      return null;
    }

    let created = 0;
    let updated = 0;
    let withoutCategory = 0;

    for (const row of rows) {
      const sku = String(row['sku'] || row['sku,brand,category,model name,size,color,weight (kg),lenght (cm),width (cm),height (cm),retail price,ean,meta title,meta description,description,stock,images'] || '').trim();
      const nameRaw = String(row['model name'] || row['name'] || sku).trim();
      const brand = String(row['brand'] || '').trim();
      const categoryText = row['category'];
      const size = String(row['size'] || '').trim();
      const color = String(row['color'] || '').trim();
      const priceRaw = String(row['retail price'] || '').trim();
      const stockRaw = String(row['stock'] || '').trim();
      const imageUrlRaw = String(row['images'] || '').trim();
      const metaTitle = String(row['meta title'] || '').trim();
      const descriptionRaw = String(row['description'] || '').trim();

      if (!sku && !nameRaw) {
        continue;
      }

      const slugBase = nameRaw || sku;
      const slug = slugify(slugBase).slice(0, 120) || slugify(sku).slice(0, 120);

      // Price: strip non-numeric (keep digits and dot)
      let unitAmount = 0;
      if (priceRaw) {
        const numeric = priceRaw.replace(/[^0-9.]/g, '');
        const asNumber = parseFloat(numeric || '0');
        if (!Number.isNaN(asNumber) && asNumber >= 0) {
          unitAmount = Math.round(asNumber * 100);
        }
      }

      const currency = 'gbp';

      // Stock and inStock flag
      const stockNum = parseInt(stockRaw || '0', 10);
      const inStock = stockNum > 0;

      // Category mapping -> single categoryId for now
      const catId = resolveCategoryId(categoryText);
      const categoryIds = catId ? [catId] : [];
      if (!catId) withoutCategory++;

      // Images
      let images = [];
      if (imageUrlRaw) {
        try {
          const safeUrl = assertUrl(imageUrlRaw, { field: 'image url', max: 1000 });
          images.push({ url: safeUrl, alt: metaTitle || nameRaw || sku });
        } catch {
          // ignore invalid URL, keep product without image
        }
      }

      const colors = color ? [color] : [];
      const sizes = size ? [size] : [];

      const now = new Date();

      // Upsert by SKU if present, otherwise by slug
      let existingSnap = null;
      if (sku) {
        existingSnap = await adminDb.collection('products').where('sku', '==', sku).limit(1).get();
      }
      if (!existingSnap || existingSnap.empty) {
        existingSnap = await adminDb.collection('products').where('slug', '==', slug).limit(1).get();
      }

      const baseDoc = {
        name: nameRaw || sku,
        slug,
        sku: sku || null,
        categoryIds,
        pricing: {
          unitAmount,
          currency,
        },
        discountPercent: 0,
        images,
        description: descriptionRaw || '',
        inStock,
        colors,
        sizes,
        material: null,
        isBestSeller: false,
        active: true,
        sortOrder: 0,
        updatedAt: now,
      };

      if (!existingSnap.empty) {
        const docRef = existingSnap.docs[0].ref;
        await docRef.set(baseDoc, { merge: true });
        updated++;
      } else {
        await adminDb.collection('products').add({
          ...baseDoc,
          createdAt: now,
        });
        created++;
      }
    }

    return NextResponse.json({
      ok: true,
      totalRows: rows.length,
      created,
      updated,
      withoutCategory,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to import products from CSV' },
      { status: 500 }
    );
  }
}
