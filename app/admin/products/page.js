'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { auth } from '../../../lib/firebase/client';
import { authedJson } from '../../../lib/admin/client';
import 'react-quill/dist/quill.snow.css';

// Dynamic import to avoid SSR issues with Quill
const ReactQuill = dynamic(() => import('react-quill'), { ssr: false });

export default function AdminProductsPage() {
  const [user, setUser] = useState(null);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [csvFile, setCsvFile] = useState(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvResult, setCsvResult] = useState(null);

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);

  const [form, setForm] = useState({
    id: null,
    name: '',
    slug: '',
    sku: '',
    unitAmount: 0,
    currency: 'usd',
    discountPercent: 0,
    sortOrder: 0,
    active: true,
    categoryIds: [],
    inStock: true,
    colorsText: '',
    sizesText: '',
    material: '',
    isBestSeller: false,
    images: [],
    description: '',
  });

  const isEditing = Boolean(form.id);

  const categoriesById = useMemo(() => {
    const m = new Map();
    for (const c of categories) m.set(c.id, c);
    return m;
  }, [categories]);

  const byParent = useMemo(() => {
    const m = new Map();
    for (const c of categories) {
      const key = c.parentId || null;
      const arr = m.get(key) || [];
      arr.push(c);
      m.set(key, arr);
    }

    for (const [key, arr] of m.entries()) {
      arr.sort((a, b) => {
        const sa = Number(a.sortOrder || 0);
        const sb = Number(b.sortOrder || 0);
        if (sa !== sb) return sa - sb;
        return String(a.name || '').localeCompare(String(b.name || ''));
      });
    }

    return m;
  }, [categories]);

  const [formExpandedCategoryIds, setFormExpandedCategoryIds] = useState(() => new Set());
  const [browserExpandedCategoryIds, setBrowserExpandedCategoryIds] = useState(() => new Set());
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  function toggleFormCategoryExpanded(id) {
    setFormExpandedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleBrowserCategoryExpanded(id) {
    setBrowserExpandedCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const categoryDescendants = useMemo(() => {
    const cache = new Map();

    function getWithDescendants(id) {
      if (cache.has(id)) return cache.get(id);
      const set = new Set([id]);
      const children = byParent.get(id) || [];
      for (const c of children) {
        const childSet = getWithDescendants(c.id);
        for (const d of childSet) set.add(d);
      }
      cache.set(id, set);
      return set;
    }

    const result = new Map();
    for (const c of categories) {
      result.set(c.id, getWithDescendants(c.id));
    }
    return result;
  }, [categories, byParent]);

  const categoryProductCounts = useMemo(() => {
    const counts = new Map();
    for (const c of categories) counts.set(c.id, 0);

    // Build reverse index: childId -> [categoryIds that include it in their descendant set]
    const containing = new Map();
    for (const [catId, descSet] of categoryDescendants.entries()) {
      for (const childId of descSet) {
        const arr = containing.get(childId) || [];
        arr.push(catId);
        containing.set(childId, arr);
      }
    }

    for (const p of products) {
      const ids = Array.isArray(p.categoryIds) ? p.categoryIds : [];
      for (const id of ids) {
        const parents = containing.get(id);
        if (!parents) continue;
        for (const catId of parents) {
          counts.set(catId, (counts.get(catId) || 0) + 1);
        }
      }
    }

    return counts;
  }, [categories, products, categoryDescendants]);

  const productsForSelectedCategory = useMemo(() => {
    if (!selectedCategoryId) return products;
    const allowed = categoryDescendants.get(selectedCategoryId);
    if (!allowed) return products;
    return products.filter((p) => {
      const ids = Array.isArray(p.categoryIds) ? p.categoryIds : [];
      return ids.some((id) => allowed.has(id));
    });
  }, [products, selectedCategoryId, categoryDescendants]);

  async function loadAll(u) {
    setError(null);
    setLoading(true);
    try {
      const token = await u.getIdToken();
      const res = await fetch('/api/admin/me', { headers: { authorization: `Bearer ${token}` } });
      const meData = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(meData?.error || `Request failed (${res.status})`);
      setMe(meData);

      if (!meData?.isAdmin) {
        setCategories([]);
        setProducts([]);
        return;
      }

      const cats = await authedJson('/api/admin/categories');
      setCategories(Array.isArray(cats.items) ? cats.items : []);

      const prods = await authedJson('/api/admin/products');
      setProducts(Array.isArray(prods.items) ? prods.items : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u);
      if (!u) {
        setMe(null);
        setCategories([]);
        setProducts([]);
        setLoading(false);
        return;
      }
      loadAll(u);
    });
    return () => unsub();
  }, []);

  function resetForm() {
    setForm({
      id: null,
      name: '',
      slug: '',
      sku: '',
      unitAmount: 0,
      currency: 'usd',
      discountPercent: 0,
      sortOrder: 0,
      active: true,
      categoryIds: [],
      inStock: true,
      colorsText: '',
      sizesText: '',
      material: '',
      isBestSeller: false,
      images: [],
      description: '',
    });
    setUploadFile(null);
    setCsvFile(null);
    setCsvImporting(false);
    setCsvResult(null);
  }

  async function onImportCsv() {
    if (!csvFile) {
      setError('Please choose a CSV file first.');
      return;
    }

    setError(null);
    setCsvResult(null);
    setCsvImporting(true);
    try {
      const userNow = auth.currentUser;
      if (!userNow) throw new Error('Not signed in');
      const token = await userNow.getIdToken();

      const formData = new FormData();
      formData.append('file', csvFile);

      const res = await fetch('/api/admin/products/import', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || `Import failed (${res.status})`);
      }

      setCsvResult({
        totalRows: data.totalRows || 0,
        created: data.created || 0,
        updated: data.updated || 0,
        withoutCategory: data.withoutCategory || 0,
      });

      if (user) await loadAll(user);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setCsvImporting(false);
    }
  }

  async function uploadToCloudinary() {
    if (!uploadFile) {
      setError('Please choose an image file first.');
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const sign = await authedJson('/api/admin/cloudinary/sign', { method: 'POST' });

      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('api_key', sign.apiKey);
      formData.append('timestamp', String(sign.timestamp));
      formData.append('signature', sign.signature);
      if (sign.folder) formData.append('folder', sign.folder);

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      const uploadJson = await uploadRes.json().catch(() => ({}));
      if (!uploadRes.ok) {
        throw new Error(uploadJson?.error?.message || 'Cloudinary upload failed');
      }

      const url = uploadJson.secure_url || uploadJson.url;
      if (!url) throw new Error('Cloudinary did not return a URL');

      setForm((p) => {
        const nextImages = Array.isArray(p.images) ? [...p.images] : [];
        if (nextImages.length >= 6) return p;
        nextImages.push({ url, alt: '', color: '' });
        return { ...p, images: nextImages };
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  function startEdit(p) {
    const img0 = Array.isArray(p.images) && p.images.length ? p.images[0] : null;
    setForm({
      id: p.id,
      name: p.name || '',
      slug: p.slug || '',
      sku: p.sku || '',
      unitAmount: Number(p?.pricing?.unitAmount || 0),
      currency: String(p?.pricing?.currency || 'usd'),
      discountPercent: Number(p?.discountPercent || 0),
      sortOrder: Number(p.sortOrder || 0),
      active: p.active !== false,
      categoryIds: Array.isArray(p.categoryIds) ? p.categoryIds : [],
      inStock: p.inStock === false ? false : true,
      colorsText: Array.isArray(p.colors) ? p.colors.join(', ') : '',
      sizesText: Array.isArray(p.sizes) ? p.sizes.join(', ') : '',
      material: typeof p.material === 'string' ? p.material : '',
      isBestSeller: p.isBestSeller === true,
      images: Array.isArray(p.images) ? p.images : img0 ? [img0] : [],
      description: typeof p.description === 'string' ? p.description : '',
    });
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);

    const colors = typeof form.colorsText === 'string'
      ? form.colorsText
          .split(',')
          .map((v) => v.trim())
          .filter((v) => v.length)
      : [];

    const sizes = typeof form.sizesText === 'string'
      ? form.sizesText
          .split(',')
          .map((v) => v.trim())
          .filter((v) => v.length)
      : [];

    const images = Array.isArray(form.images)
      ? form.images
          .filter((it) => it && typeof it === 'object' && typeof it.url === 'string' && it.url.trim())
          .map((it) => ({ 
            url: it.url.trim(), 
            alt: (it.alt || '').trim() || null,
            color: (it.color || '').trim() || null
          }))
          .slice(0, 20)
      : [];

    const payload = {
      name: form.name,
      slug: form.slug,
      sku: form.sku || null,
      unitAmount: Number(form.unitAmount || 0),
      currency: form.currency,
      discountPercent: Number(form.discountPercent || 0),
      sortOrder: Number(form.sortOrder || 0),
      active: !!form.active,
      inStock: form.inStock !== false,
      colors,
      sizes,
      material: form.material && form.material.trim() ? form.material.trim() : null,
      isBestSeller: form.isBestSeller === true,
      categoryIds: Array.isArray(form.categoryIds) ? form.categoryIds : [],
      images,
      description: typeof form.description === 'string' ? form.description : '',
    };

    try {
      if (isEditing) {
        await authedJson(`/api/admin/products/${form.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await authedJson('/api/admin/products', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (user) await loadAll(user);
      resetForm();
    } catch (e2) {
      setError(e2 instanceof Error ? e2.message : 'Failed');
    }
  }

  async function onDelete(id) {
    if (!window.confirm('Delete this product?')) return;
    setError(null);
    try {
      await authedJson(`/api/admin/products/${id}`, { method: 'DELETE' });
      if (user) await loadAll(user);
      if (form.id === id) resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  }

  function toggleCategory(id) {
    setForm((p) => {
      const set = new Set(p.categoryIds || []);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...p, categoryIds: Array.from(set) };
    });
  }

  function getLevelLabel(depth) {
    if (depth === 0) return 'Main category';
    if (depth === 1) return 'Subcategory';
    return 'Page';
  }

  function renderCategoryTree(parentId = null, depth = 0) {
    const children = byParent.get(parentId || null) || [];
    if (!children.length) return null;

    return children.map((c) => {
      const childList = byParent.get(c.id) || [];
      const hasChildren = childList.length > 0;
      const isExpanded = formExpandedCategoryIds.has(c.id);
      const paddingLeft = 4 + depth * 18;
      const levelLabel = getLevelLabel(depth);

      return (
        <div key={c.id} className="mb-1">
          <div className="d-flex align-items-center">
            {hasChildren ? (
              <button
                type="button"
                className="me-2"
                aria-label={isExpanded ? 'Collapse children' : 'Expand children'}
                onClick={() => toggleFormCategoryExpanded(c.id)}
                style={{
                  width: 24,
                  height: 24,
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 4,
                  border: '1px solid #6c757d',
                  background: 'transparent',
                  lineHeight: 1,
                  fontSize: 16,
                  cursor: 'pointer',
                }}
              >
                {isExpanded ? '−' : '+'}
              </button>
            ) : (
              <span style={{ width: 26, display: 'inline-block' }} />
            )}

            <div className="d-flex align-items-center flex-wrap" style={{ paddingLeft }}>
              <div className="form-check me-2 mb-0">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id={`prod-cat-${c.id}`}
                  checked={form.categoryIds.includes(c.id)}
                  onChange={() => toggleCategory(c.id)}
                />
                <label className="form-check-label" htmlFor={`prod-cat-${c.id}`}>
                  {c.name}
                </label>
              </div>

              <span style={{ fontSize: 11 }}>
                <span className={`badge ${depth === 0 ? 'bg-primary' : depth === 1 ? 'bg-info text-dark' : 'bg-secondary'}`}>
                  {levelLabel}
                </span>
              </span>
            </div>
          </div>

          {hasChildren && isExpanded ? (
            <div style={{ marginLeft: 34 }}>{renderCategoryTree(c.id, depth + 1)}</div>
          ) : null}
        </div>
      );
    });
  }

  function renderCategoryBrowser(parentId = null, depth = 0) {
    const children = byParent.get(parentId || null) || [];
    if (!children.length) return null;

    return children.map((c) => {
      const childList = byParent.get(c.id) || [];
      const hasChildren = childList.length > 0;
      const isExpanded = browserExpandedCategoryIds.has(c.id);
      const paddingLeft = 4 + depth * 18;
      const levelLabel = getLevelLabel(depth);
      const count = categoryProductCounts.get(c.id) || 0;
      const isSelected = selectedCategoryId === c.id;

      return (
        <div key={`browser-${c.id}`} className="mb-1">
          <div className="d-flex align-items-center">
            {hasChildren ? (
              <button
                type="button"
                className="me-2"
                aria-label={isExpanded ? 'Collapse children' : 'Expand children'}
                onClick={() => toggleBrowserCategoryExpanded(c.id)}
                style={{
                  width: 24,
                  height: 24,
                  padding: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 4,
                  border: '1px solid #6c757d',
                  background: 'transparent',
                  lineHeight: 1,
                  fontSize: 16,
                  cursor: 'pointer',
                }}
              >
                {isExpanded ? '−' : '+'}
              </button>
            ) : (
              <span style={{ width: 26, display: 'inline-block' }} />
            )}

            <button
              type="button"
              onClick={() => setSelectedCategoryId(c.id)}
              style={{
                border: 'none',
                background: 'transparent',
                padding: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                textAlign: 'left',
                cursor: 'pointer',
                paddingLeft,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: isSelected ? 700 : 500 }}>
                {c.name}
                <span style={{ marginLeft: 6, fontSize: 11 }}>
                  <span className={`badge ${depth === 0 ? 'bg-primary' : depth === 1 ? 'bg-info text-dark' : 'bg-secondary'}`}>
                    {levelLabel}
                  </span>
                </span>
              </span>

              <span
                style={{
                  fontSize: 11,
                  padding: '1px 6px',
                  borderRadius: 10,
                  backgroundColor: '#f1f3f5',
                  color: '#212529',
                  marginLeft: 8,
                  whiteSpace: 'nowrap',
                }}
              >
                {count} product{count === 1 ? '' : 's'}
              </span>
            </button>
          </div>

          {hasChildren && isExpanded ? (
            <div style={{ marginLeft: 34 }}>{renderCategoryBrowser(c.id, depth + 1)}</div>
          ) : null}
        </div>
      );
    });
  }

  if (!user) {
    return (
      <div className="text-center" style={{ padding: '40px 0' }}>
        <h1 style={{ fontSize: 24, fontWeight: 900 }}>Products</h1>
        <div style={{ color: '#6c757d', marginTop: 8 }}>Please sign in.</div>
        <div style={{ marginTop: 16 }}>
          <Link className="btn btn-primary" href="/admin/login">
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  if (loading) return <div>Loading…</div>;

  if (me && !me.isAdmin) {
    return (
      <div className="alert alert-warning">
        <div style={{ fontWeight: 900, marginBottom: 6 }}>Admin access required</div>
        <div style={{ fontSize: 14 }}>You are signed in, but your account is not an admin.</div>
        <div style={{ fontSize: 14, marginTop: 10 }}>
          Go back to <Link href="/admin">Admin Dashboard</Link>.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        className="d-flex align-items-start justify-content-between gap-3 flex-wrap"
        style={{ marginTop: 6 }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 6 }}>Products</h1>
          <div style={{ color: '#6c757d', fontSize: 13 }}>Create products (Cloudinary upload comes next).</div>
        </div>
        <Link className="btn btn-outline-secondary admin-outline-btn" href="/admin">
          Back
        </Link>
      </div>

      {error ? <div className="alert alert-danger mt-3">{error}</div> : null}

      <div className="card mt-3">
        <div className="card-body">
          <div style={{ fontWeight: 900, marginBottom: 8 }}>Bulk import from CSV</div>
          <div style={{ fontSize: 13, color: '#6c757d', marginBottom: 10 }}>
            Upload your full product CSV. Existing products with the same SKU (or slug) will be updated; new ones will be created.
          </div>
          <div className="d-flex flex-column flex-md-row align-items-start gap-2">
            <input
              className="form-control"
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => {
                const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
                setCsvFile(file);
                setCsvResult(null);
              }}
              style={{ maxWidth: 320 }}
            />
            <button
              className="btn btn-primary"
              type="button"
              onClick={onImportCsv}
              disabled={csvImporting}
            >
              {csvImporting ? 'Importing…' : 'Import CSV'}
            </button>
          </div>
          {csvResult ? (
            <div className="mt-2" style={{ fontSize: 13 }}>
              <div>
                Imported rows: <strong>{csvResult.totalRows}</strong>
              </div>
              <div>
                Created: <strong>{csvResult.created}</strong>, Updated: <strong>{csvResult.updated}</strong>
              </div>
              <div>
                Rows without matched category: <strong>{csvResult.withoutCategory}</strong>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <div className="card mt-3">
        <div className="card-body">
          <div style={{ fontWeight: 900, marginBottom: 10 }}>{isEditing ? 'Edit product' : 'Add product'}</div>

          <form className="row g-3" onSubmit={onSubmit}>
            <div className="col-12 col-md-4">
              <label className="form-label">Name</label>
              <input className="form-control" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
            </div>

            <div className="col-12 col-md-4">
              <label className="form-label">Slug (optional)</label>
              <input className="form-control" value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} placeholder="auto-generated" />
            </div>

            <div className="col-12 col-md-4">
              <label className="form-label">SKU (optional)</label>
              <input className="form-control" value={form.sku} onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))} />
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label">Price (in cents)</label>
              <input
                className="form-control"
                type="number"
                value={form.unitAmount}
                onChange={(e) => setForm((p) => ({ ...p, unitAmount: e.target.value }))}
              />
              <div style={{ marginTop: 6, fontSize: 12, color: '#6c757d' }}>Example: 1500 = $15.00</div>
            </div>

            <div className="col-12 col-md-2">
              <label className="form-label">Currency</label>
              <input className="form-control" value={form.currency} onChange={(e) => setForm((p) => ({ ...p, currency: e.target.value }))} />
            </div>

            <div className="col-12 col-md-2">
              <label className="form-label">Discount %</label>
              <input
                className="form-control"
                type="number"
                min={0}
                max={95}
                value={form.discountPercent}
                onChange={(e) => setForm((p) => ({ ...p, discountPercent: e.target.value }))}
              />
              <div style={{ marginTop: 6, fontSize: 12, color: '#6c757d' }}>0 to 95</div>
            </div>

            <div className="col-12 col-md-2">
              <label className="form-label">Sort</label>
              <input
                className="form-control"
                type="number"
                value={form.sortOrder}
                onChange={(e) => setForm((p) => ({ ...p, sortOrder: e.target.value }))}
              />
            </div>

            <div className="col-12 col-md-2">
              <label className="form-label">Active</label>
              <select className="form-select" value={form.active ? 'yes' : 'no'} onChange={(e) => setForm((p) => ({ ...p, active: e.target.value === 'yes' }))}>
                <option value="yes">Yes</option>
                <option value="no">No</option>
              </select>
            </div>

            <div className="col-12 col-md-2">
              <label className="form-label">Availability</label>
              <select
                className="form-select"
                value={form.inStock ? 'in' : 'out'}
                onChange={(e) => setForm((p) => ({ ...p, inStock: e.target.value === 'in' }))}
              >
                <option value="in">In stock</option>
                <option value="out">Out of stock</option>
              </select>
            </div>

            <div className="col-12 col-md-5">
              <label className="form-label">Colors (comma-separated)</label>
              <input
                className="form-control"
                value={form.colorsText}
                onChange={(e) => setForm((p) => ({ ...p, colorsText: e.target.value }))}
                placeholder="e.g. Black, Red, Gold"
              />
            </div>

            <div className="col-12 col-md-5">
              <label className="form-label">Sizes (comma-separated)</label>
              <input
                className="form-control"
                value={form.sizesText}
                onChange={(e) => setForm((p) => ({ ...p, sizesText: e.target.value }))}
                placeholder="e.g. 10oz, 12oz, 14oz"
              />
            </div>

            <div className="col-12">
              <label className="form-label">Product description (optional)</label>
              <div style={{ minHeight: 200 }}>
                <ReactQuill
                  theme="snow"
                  value={form.description}
                  onChange={(value) => setForm((p) => ({ ...p, description: value }))}
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      [{ 'indent': '-1'}, { 'indent': '+1' }],
                      ['link'],
                      [{ 'align': [] }],
                      ['clean']
                    ]
                  }}
                  formats={[
                    'header',
                    'bold', 'italic', 'underline', 'strike',
                    'list', 'bullet', 'indent',
                    'link', 'align'
                  ]}
                  placeholder="Enter product description with formatting (bullets, numbering, bold, etc.)"
                  style={{ backgroundColor: '#fff' }}
                />
              </div>
              <div style={{ marginTop: 6, fontSize: 12, color: '#6c757d' }}>
                This will appear on the product page under “Product Description”. You can paste plain text or HTML.
              </div>
            </div>

            <div className="col-12 col-md-4">
              <label className="form-label">Material (optional)</label>
              <input
                className="form-control"
                value={form.material}
                onChange={(e) => setForm((p) => ({ ...p, material: e.target.value }))}
                placeholder="e.g. Leather, PU Leather"
              />
            </div>

            <div className="col-12 col-md-2">
              <label className="form-label">Best seller</label>
              <select
                className="form-select"
                value={form.isBestSeller ? 'yes' : 'no'}
                onChange={(e) => setForm((p) => ({ ...p, isBestSeller: e.target.value === 'yes' }))}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
            </div>

            <div className="col-12 col-md-6">
              <label className="form-label">Images</label>
              <div className="mb-2">
                <input
                  className="form-control"
                  type="file"
                  accept="image/*"
                  onChange={(e) => setUploadFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                />
                <button className="btn btn-outline-primary btn-sm mt-2" type="button" onClick={uploadToCloudinary} disabled={uploading}>
                  {uploading ? 'Uploading…' : 'Upload'}
                </button>
              </div>
              {Array.isArray(form.images) && form.images.length ? (
                <div className="d-flex flex-column gap-2">
                  {form.images.map((img, idx) => (
                    <div key={idx} className="d-flex align-items-center gap-2 flex-wrap">
                      <div style={{ width: 60, height: 60, overflow: 'hidden', borderRadius: 4, border: '1px solid #dee2e6' }}>
                        {img.url ? (
                          <img
                            src={img.url}
                            alt={img.alt || ''}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          />
                        ) : null}
                      </div>
                      <div className="flex-grow-1 d-flex flex-column flex-md-row gap-2">
                        <input
                          className="form-control form-control-sm"
                          placeholder="Alt text"
                          value={img.alt || ''}
                          onChange={(e) =>
                            setForm((p) => {
                              const next = Array.isArray(p.images) ? [...p.images] : [];
                              if (!next[idx]) return p;
                              next[idx] = { ...next[idx], alt: e.target.value };
                              return { ...p, images: next };
                            })
                          }
                        />
                        <input
                          className="form-control form-control-sm"
                          placeholder="Color tag (optional, e.g. Black/Gold)"
                          value={img.color || ''}
                          onChange={(e) =>
                            setForm((p) => {
                              const next = Array.isArray(p.images) ? [...p.images] : [];
                              if (!next[idx]) return p;
                              next[idx] = { ...next[idx], color: e.target.value };
                              return { ...p, images: next };
                            })
                          }
                        />
                      </div>
                      <button
                        type="button"
                        className="btn btn-outline-danger btn-sm"
                        onClick={() =>
                          setForm((p) => {
                            const next = Array.isArray(p.images) ? [...p.images] : [];
                            next.splice(idx, 1);
                            return { ...p, images: next };
                          })
                        }
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: '#6c757d' }}>No images yet. Upload up to 6 images.</div>
              )}
            </div>

            <div className="col-12">
              <label className="form-label">Categories</label>
              {categories.length === 0 ? (
                <div style={{ color: '#6c757d', fontSize: 13 }}>Create categories first.</div>
              ) : (
                <div className="border rounded p-2" style={{ maxHeight: 320, overflow: 'auto' }}>
                  {renderCategoryTree(null, 0)}
                </div>
              )}
            </div>

            <div className="col-12 d-flex gap-2">
              <button className="btn btn-primary" type="submit">
                {isEditing ? 'Save' : 'Create'}
              </button>
              {isEditing ? (
                <button className="btn btn-outline-secondary" type="button" onClick={resetForm}>
                  Cancel
                </button>
              ) : null}
              <button className="btn btn-outline-secondary ms-auto" type="button" onClick={() => user && loadAll(user)}>
                Refresh
              </button>
            </div>
          </form>
        </div>
      </div>

      <div className="card mt-3">
        <div className="card-body">
          <div style={{ fontWeight: 900, marginBottom: 10 }}>All products</div>

          {products.length === 0 ? <div style={{ color: '#6c757d' }}>No products yet.</div> : null}

          {products.length ? (
            <>
              <div className="border rounded p-2 mb-3" style={{ maxHeight: 360, overflow: 'auto' }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Browse by category</div>
                <div style={{ fontSize: 12, color: '#6c757d', marginBottom: 6 }}>
                  Click a category or page to see its products. Counts include all products in that branch.
                </div>
                {byParent.get(null)?.length ? (
                  renderCategoryBrowser(null, 0)
                ) : (
                  <div style={{ fontSize: 13, color: '#6c757d' }}>No categories.</div>
                )}
              </div>

              <div className="d-flex align-items-center justify-content-between mb-2" style={{ fontSize: 13 }}>
                <div>
                  Showing products for:{' '}
                  {selectedCategoryId ? (
                    <strong>{categoriesById.get(selectedCategoryId)?.name || 'Unknown category'}</strong>
                  ) : (
                    <strong>All categories</strong>
                  )}
                </div>
                {selectedCategoryId ? (
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-secondary"
                    onClick={() => setSelectedCategoryId(null)}
                  >
                    Clear selection
                  </button>
                ) : null}
              </div>

              {productsForSelectedCategory.length === 0 ? (
                <div style={{ color: '#6c757d' }}>No products in this category yet.</div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-sm align-middle">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Slug</th>
                        <th>Categories</th>
                        <th>Price</th>
                        <th>Active</th>
                        <th style={{ width: 180 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {productsForSelectedCategory.map((p) => (
                        <tr key={p.id}>
                          <td style={{ fontWeight: 700 }}>{p.name}</td>
                          <td style={{ fontSize: 13, color: '#6c757d' }}>{p.slug}</td>
                          <td style={{ fontSize: 13, color: '#6c757d' }}>
                            {(Array.isArray(p.categoryIds) ? p.categoryIds : [])
                              .map((id) => categoriesById.get(id)?.name)
                              .filter(Boolean)
                              .join(', ') || '—'}
                          </td>
                          <td style={{ fontSize: 13 }}>
                            {Number(p?.pricing?.unitAmount || 0)} {String(p?.pricing?.currency || 'usd').toUpperCase()}
                          </td>
                          <td style={{ fontSize: 13 }}>{p.active === false ? 'No' : 'Yes'}</td>
                          <td className="text-end">
                            <button className="btn btn-outline-primary btn-sm me-2" onClick={() => startEdit(p)}>
                              Edit
                            </button>
                            <button className="btn btn-outline-danger btn-sm" onClick={() => onDelete(p.id)}>
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
