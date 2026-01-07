'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { auth } from '../../../lib/firebase/client';
import { authedJson } from '../../../lib/admin/client';

export default function AdminCategoriesPage() {
  const [user, setUser] = useState(null);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [items, setItems] = useState([]);

  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);

  const [form, setForm] = useState({ id: null, name: '', slug: '', parentId: '', sortOrder: 0, imageUrl: '' });
  const isEditing = Boolean(form.id);

  const categoriesById = useMemo(() => {
    const m = new Map();
    for (const c of items) m.set(c.id, c);
    return m;
  }, [items]);

  const byParent = useMemo(() => {
    const m = new Map();
    for (const c of items) {
      const key = c.parentId || null;
      const arr = m.get(key) || [];
      arr.push(c);
      m.set(key, arr);
    }

    // Sort children by sortOrder then name for stable display
    for (const [key, arr] of m.entries()) {
      arr.sort((a, b) => {
        const sa = Number(a.sortOrder || 0);
        const sb = Number(b.sortOrder || 0);
        if (sa !== sb) return sa - sb;
        return String(a.name || '').localeCompare(String(b.name || ''));
      });
    }

    return m;
  }, [items]);

  const [expandedIds, setExpandedIds] = useState(() => new Set());

  function toggleExpanded(id) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function getLevelLabel(depth) {
    if (depth === 0) return 'Main category';
    if (depth === 1) return 'Subcategory';
    return 'Page';
  }

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
        setItems([]);
        return;
      }

      const data = await authedJson('/api/admin/categories');
      setItems(Array.isArray(data.items) ? data.items : []);
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
        setItems([]);
        setLoading(false);
        return;
      }
      loadAll(u);
    });
    return () => unsub();
  }, []);

  function resetForm() {
    setForm({ id: null, name: '', slug: '', parentId: '', sortOrder: 0, imageUrl: '' });
    setUploadFile(null);
  }

  async function uploadToCloudinary() {
    if (!uploadFile) {
      setError('Please choose an image file first.');
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const sign = await authedJson('/api/admin/cloudinary/sign', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ folder: 'zynosportswear/categories' }),
      });

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

      setForm((p) => ({ ...p, imageUrl: url }));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);

    const payload = {
      name: form.name,
      slug: form.slug,
      parentId: form.parentId ? form.parentId : null,
      sortOrder: Number(form.sortOrder || 0),
      imageUrl: form.imageUrl ? form.imageUrl.trim() : null,
    };

    try {
      if (isEditing) {
        await authedJson(`/api/admin/categories/${form.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await authedJson('/api/admin/categories', {
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
    if (!window.confirm('Delete this category?')) return;
    setError(null);
    try {
      await authedJson(`/api/admin/categories/${id}`, { method: 'DELETE' });
      if (user) await loadAll(user);
      if (form.id === id) resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  }

  function startEdit(cat) {
    setForm({
      id: cat.id,
      name: cat.name || '',
      slug: cat.slug || '',
      parentId: cat.parentId || '',
      sortOrder: Number(cat.sortOrder || 0),
      imageUrl: cat.imageUrl || '',
    });
  }

  function renderRows(parentId = null, depth = 0) {
    const children = byParent.get(parentId || null) || [];
    if (!children.length) return null;

    const rows = [];
    for (const c of children) {
      const childList = byParent.get(c.id) || [];
      const hasChildren = childList.length > 0;
      const isExpanded = expandedIds.has(c.id);

      const paddingLeft = 4 + depth * 20;
      const fontWeight = depth === 0 ? 800 : depth === 1 ? 600 : 400;
      const fontSize = depth === 0 ? 14 : 13;
      const levelLabel = getLevelLabel(depth);

      rows.push(
        <tr key={c.id}>
          <td style={{ fontWeight, fontSize }}>
            <div className="d-flex align-items-center">
              {hasChildren ? (
                <button
                  type="button"
                  className="me-2"
                  aria-label={isExpanded ? 'Collapse children' : 'Expand children'}
                  onClick={() => toggleExpanded(c.id)}
                  style={{
                    width: 28,
                    height: 28,
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 6,
                    border: '1px solid #6c757d',
                    background: 'transparent',
                    lineHeight: 1,
                    fontSize: 18,
                    fontWeight: 400,
                    cursor: 'pointer',
                  }}
                >
                  {isExpanded ? '−' : '+'}
                </button>
              ) : (
                <span style={{ width: 30, display: 'inline-block' }} />
              )}
              <span style={{ paddingLeft }}>{c.name}</span>
            </div>
          </td>
          <td style={{ fontSize: 12 }}>
            <span className={`badge ${depth === 0 ? 'bg-primary' : depth === 1 ? 'bg-info text-dark' : 'bg-secondary'}`}>
              {levelLabel}
            </span>
          </td>
          <td style={{ fontSize: 13, color: '#6c757d' }}>{c.slug}</td>
          <td style={{ fontSize: 13, color: '#6c757d' }}>{c.parentId ? categoriesById.get(c.parentId)?.name || '—' : '—'}</td>
          <td>{Number(c.sortOrder || 0)}</td>
          <td style={{ fontSize: 13, color: '#6c757d' }}>
            {c.imageUrl ? (
              <a href={c.imageUrl} target="_blank" rel="noreferrer">
                View
              </a>
            ) : (
              '—'
            )}
          </td>
          <td className="text-end">
            <button className="btn btn-outline-primary btn-sm me-2" onClick={() => startEdit(c)}>
              Edit
            </button>
            <button className="btn btn-outline-danger btn-sm" onClick={() => onDelete(c.id)}>
              Delete
            </button>
          </td>
        </tr>
      );

      if (hasChildren && isExpanded) {
        const childRows = renderRows(c.id, depth + 1);
        if (childRows) rows.push(...childRows);
      }
    }

    return rows;
  }

  if (!user) {
    return (
      <div className="text-center" style={{ padding: '40px 0' }}>
        <h1 style={{ fontSize: 24, fontWeight: 900 }}>Categories</h1>
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
      <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 6 }}>Categories</h1>
          <div style={{ color: '#6c757d', fontSize: 13 }}>Create and organize product categories.</div>
        </div>
        <Link className="btn btn-outline-secondary" href="/admin">
          Back
        </Link>
      </div>

      {error ? <div className="alert alert-danger mt-3">{error}</div> : null}

      <div className="card mt-3">
        <div className="card-body">
          <div style={{ fontWeight: 900, marginBottom: 10 }}>{isEditing ? 'Edit category' : 'Add category'}</div>

          <form className="row g-3" onSubmit={onSubmit}>
            <div className="col-12 col-md-4">
              <label className="form-label">Name</label>
              <input className="form-control" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
            </div>
            <div className="col-12 col-md-4">
              <label className="form-label">Slug (optional)</label>
              <input className="form-control" value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} placeholder="auto-generated" />
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
              <label className="form-label">Parent</label>
              <select className="form-select" value={form.parentId} onChange={(e) => setForm((p) => ({ ...p, parentId: e.target.value }))}>
                <option value="">—</option>
                {items
                  .filter((c) => c.id !== form.id)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="col-12 col-md-4">
              <label className="form-label">Image upload (Cloudinary, optional)</label>
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

            <div className="col-12 col-md-4">
              <label className="form-label">Image URL (optional)</label>
              <input
                className="form-control"
                value={form.imageUrl}
                onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))}
              />
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
          <div style={{ fontWeight: 900, marginBottom: 10 }}>All categories</div>

          {items.length === 0 ? <div style={{ color: '#6c757d' }}>No categories yet.</div> : null}

          {items.length ? (
            <div className="table-responsive">
              <table className="table table-sm align-middle">
                <thead>
                  <tr>
                    <th>Category</th>
                    <th style={{ width: 120 }}>Level</th>
                    <th>Slug</th>
                    <th>Parent</th>
                    <th style={{ width: 90 }}>Sort</th>
                    <th style={{ width: 120 }}>Image</th>
                    <th style={{ width: 180 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {renderRows(null, 0)}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
