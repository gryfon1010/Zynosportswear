'use server';

import { NextResponse } from 'next/server';
import { requireAdmin, slugify } from '../../../../../lib/admin/auth';
import { checkRateLimit } from '../../../../../lib/security/rateLimit';
import { getAdminDb } from '../../../../../lib/firebase/admin';
import { assertUrl } from '../../../../../lib/security/validate';

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
    const categoriesById = new Map();

    for (const c of categories) {
      if (c.id) categoriesById.set(c.id, c);
      if (c.slug) categoriesBySlug.set(String(c.slug), c);
      if (c.name) categoriesByNameNorm.set(normalizeCategoryName(c.name), c);
    }

    function findCategoriesByNameOrSlug(value) {
      if (!value) return [];
      const norm = normalizeCategoryName(value);
      const matches = [];
      for (const c of categories) {
        const nameNorm = c.name ? normalizeCategoryName(c.name) : '';
        if (nameNorm === norm || String(c.slug || '') === norm) {
          matches.push(c);
        }
      }
      return matches;
    }

    // Resolve category with awareness of parent/sub/child hierarchy.
    // Prefer ChildPage under the matching Sub/Parent; fall back to Sub, then Parent.
    function resolveCategoryHierarchy(parentText, subText, childText) {
      const parentNorm = parentText ? normalizeCategoryName(parentText) : null;
      const subNorm = subText ? normalizeCategoryName(subText) : null;

      // 1) Try child page, using parent/sub hints to disambiguate.
      if (childText) {
        const childCandidates = findCategoriesByNameOrSlug(childText);
        if (childCandidates.length) {
          // Prefer a child whose direct parent matches the sub category.
          if (subNorm) {
            const bySub = childCandidates.filter((c) => {
              const parent = c.parentId ? categoriesById.get(c.parentId) : null;
              if (!parent) return false;
              const parentNameNorm = parent.name ? normalizeCategoryName(parent.name) : null;
              const parentSlugNorm = parent.slug ? normalizeCategoryName(parent.slug) : null;
              return parentNameNorm === subNorm || parentSlugNorm === subNorm;
            });
            if (bySub.length) return bySub[0].id;
          }

          // Next, prefer a child whose ancestor matches the parent category.
          if (parentNorm) {
            const byParent = childCandidates.filter((c) => {
              const parent = c.parentId ? categoriesById.get(c.parentId) : null;
              const grand = parent && parent.parentId ? categoriesById.get(parent.parentId) : null;
              const check = grand || parent;
              if (!check) return false;
              const checkNameNorm = check.name ? normalizeCategoryName(check.name) : null;
              const checkSlugNorm = check.slug ? normalizeCategoryName(check.slug) : null;
              return checkNameNorm === parentNorm || checkSlugNorm === parentNorm;
            });
            if (byParent.length) return byParent[0].id;
          }

          // If still ambiguous, just pick the first child candidate.
          return childCandidates[0].id;
        }
      }

      // 2) Try sub category (e.g. "BOXING G/Sparring Gloves").
      if (subText) {
        const subCandidates = findCategoriesByNameOrSlug(subText);
        if (subCandidates.length) {
          if (parentNorm) {
            const byParent = subCandidates.filter((c) => {
              const parent = c.parentId ? categoriesById.get(c.parentId) : null;
              if (!parent) return false;
              const parentNameNorm = parent.name ? normalizeCategoryName(parent.name) : null;
              const parentSlugNorm = parent.slug ? normalizeCategoryName(parent.slug) : null;
              return parentNameNorm === parentNorm || parentSlugNorm === parentNorm;
            });
            if (byParent.length) return byParent[0].id;
          }
          return subCandidates[0].id;
        }
      }

      // 3) Finally, fall back to parent category only.
      if (parentText) {
        const parentCandidates = findCategoriesByNameOrSlug(parentText);
        if (parentCandidates.length) return parentCandidates[0].id;
      }

      return null;
    }

    let created = 0;
    let updated = 0;
    let withoutCategory = 0;

    // Helper to collapse size/color-specific SKUs into a base SKU.
    // For patterns like BGR-F4R-10OZ, BGR-F4U-10OZ, etc. we want the
    // common base BGR-F4 so they become a single product with many
    // colors/sizes.
    function getBaseSku(rawSku) {
      const sku = String(rawSku || '').trim();
      if (!sku) return '';
      // If SKU looks like ABC-XYZ... use the first 6 chars as base,
      // e.g. BGR-F4R-10OZ -> BGR-F4, BGR-F7U-10OZ -> BGR-F7.
      if (sku.length >= 6 && sku[3] === '-' && /[A-Z0-9]/i.test(sku[4])) {
        return sku.slice(0, 6);
      }
      // Fallback: strip the final -segment (often size).
      const match = sku.match(/^(.+)-[^-]+$/);
      return match ? match[1] : sku;
    }

    // First pass: group CSV rows by base SKU so variants become one product.
    const grouped = new Map();

    for (const row of rows) {
      const rawSku = String(row['sku'] || row['sku,brand,category,model name,size,color,weight (kg),lenght (cm),width (cm),height (cm),retail price,ean,meta title,meta description,description,stock,images'] || '').trim();
      const baseSku = getBaseSku(rawSku);
      const nameRaw = String(row['model name'] || row['name'] || baseSku || rawSku).trim();
      const brand = String(row['brand'] || '').trim();

      if (!baseSku && !nameRaw) continue;

      // Category columns from CSV. Support multiple header spellings, e.g.
      // "Parent Catr", "Sub CATE", "CHILD Page".
      const parentCategoryText =
        row['parent category'] ||
        row['parent cat'] ||
        row['parent catr'] ||
        row['parentcat'] ||
        row['parent categ'] ||
        row['parent categ.'];

      const subCategoryText =
        row['subcategory'] ||
        row['sub category'] ||
        row['sub categ'] ||
        row['sub cate'] ||
        row['sub cate.'] ||
        row['sub categry'] ||
        row['sub cateogry'] ||
        row['sub cate gory'] ||
        row['sub cate '] ||
        row['sub cate'] ||
        row['sub cate.'] ||
        row['sub cate '] ||
        row['sub cate. '] ||
        row['sub categ.'] ||
        row['sub cate g'];

      const childPageText =
        row['childpage'] ||
        row['child page'] ||
        row['child_page'] ||
        row['child pg'] ||
        row['child pg.'] ||
        row['child pg '] ||
        row['child'] ||
        row['child pg name'] ||
        row['child page name'] ||
        row['child page.'];

      const size = String(row['size'] || '').trim();
      const color = String(row['color'] || '').trim();
      const priceRaw = String(row['retail price'] || '').trim();
      const imageUrlRaw = String(row['images'] || '').trim();
      const metaTitle = String(row['meta title'] || '').trim();
      const descriptionRaw = String(row['description'] || '').trim();

      let g = grouped.get(baseSku);
      if (!g) {
        g = {
          baseSku,
          primarySku: rawSku || null,
          nameRaw,
          brand,
          parentCategoryText,
          subCategoryText,
          childPageText,
          priceRaw,
          descriptionRaw,
          metaTitle,
          sizeSet: new Set(),
          colorSet: new Set(),
          images: [],
          imageUrlSet: new Set(),
        };
        grouped.set(baseSku, g);
      } else {
        // Prefer first non-empty fields for name/description/price/meta.
        if (!g.nameRaw && nameRaw) g.nameRaw = nameRaw;
        if (!g.priceRaw && priceRaw) g.priceRaw = priceRaw;
        if (!g.descriptionRaw && descriptionRaw) g.descriptionRaw = descriptionRaw;
        if (!g.metaTitle && metaTitle) g.metaTitle = metaTitle;
      }

      if (size) g.sizeSet.add(size);
      if (color) g.colorSet.add(color);

      if (imageUrlRaw && !g.imageUrlSet.has(imageUrlRaw)) {
        try {
          const safeUrl = assertUrl(imageUrlRaw, { field: 'image url', max: 1000 });
          g.images.push({
            url: safeUrl,
            alt: g.metaTitle || g.nameRaw || baseSku || rawSku,
            // Tag image with its color so storefront can filter by color.
            color: color || null,
          });
          g.imageUrlSet.add(imageUrlRaw);
        } catch {
          // Ignore invalid image URL
        }
      }
    }

    // Second pass: write one product per base SKU group.
    for (const g of grouped.values()) {
      const sku = g.baseSku || g.primarySku || '';
      const nameRaw = g.nameRaw || sku;

      const slugBase = nameRaw || sku;
      const slug = slugify(slugBase).slice(0, 120) || slugify(sku).slice(0, 120);

      // Price (in dollars): strip non-numeric (keep digits and dot) and store as cents.
      let unitAmount = 0;
      if (g.priceRaw) {
        const numeric = String(g.priceRaw).replace(/[^0-9.]/g, '');
        const asNumber = parseFloat(numeric || '0');
        if (!Number.isNaN(asNumber) && asNumber >= 0) {
          unitAmount = Math.round(asNumber * 100);
        }
      }

      const currency = 'usd';
      const inStock = true;

      // Category mapping: prefer ChildPage under the correct Sub/Parent branch.
      const catId = resolveCategoryHierarchy(g.parentCategoryText, g.subCategoryText, g.childPageText);
      const categoryIds = catId ? [catId] : [];
      if (!catId) withoutCategory++;

      const colors = Array.from(g.colorSet).filter(Boolean);
      const sizes = Array.from(g.sizeSet).filter(Boolean);
      const images = g.images.slice(0, 20);

      const now = new Date();

      // Upsert by base SKU if present, otherwise by slug.
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
        description: g.descriptionRaw || '',
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
