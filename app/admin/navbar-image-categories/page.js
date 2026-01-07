'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { auth } from '../../../lib/firebase/client';
import { authedJson } from '../../../lib/admin/client';

const MAIN_NAV_CATEGORIES = [
  { slug: 'boxing', label: 'Boxing' },
  { slug: 'mma', label: 'MMA' },
  { slug: 'fitness', label: 'Fitness' },
  { slug: 'yoga', label: 'Yoga' },
  { slug: 'apparel', label: 'Apparel' },
  { slug: 'collections', label: 'Collections' },
  { slug: 'kids', label: 'Kids' },
  { slug: 'sale', label: 'Sale' },
];

async function uploadImageToCloudinary(file, { folder }) {
  const sign = await authedJson('/api/admin/cloudinary/sign', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ folder }),
  });

  const formData = new FormData();
  formData.append('file', file);
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
  return url;
}

export default function AdminNavbarImageCategoriesPage() {
  const [user, setUser] = useState(null);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);

  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);

  const [form, setForm] = useState({ id: null, mainSlug: 'collections', name: '', href: '', imageUrl: '', sortOrder: 0 });
  const isEditing = Boolean(form.id);

  const itemsById = useMemo(() => {
    const m = new Map();
    for (const it of items) m.set(it.id, it);
    return m;
  }, [items]);

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

      const data = await authedJson('/api/admin/navbar-image-categories');
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u || null);
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
    setForm({ id: null, mainSlug: 'collections', name: '', href: '', imageUrl: '', sortOrder: 0 });
    setUploadFile(null);
  }

  async function onUpload() {
    if (!uploadFile) {
      setError('Please choose an image file first.');
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const url = await uploadImageToCloudinary(uploadFile, { folder: 'zynosportswear/navbar-categories' });
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
      mainSlug: form.mainSlug,
      name: form.name,
      href: form.href || null,
      imageUrl: form.imageUrl,
      sortOrder: Number(form.sortOrder || 0),
    };

    try {
      if (isEditing) {
        await authedJson(`/api/admin/navbar-image-categories/${form.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        await authedJson('/api/admin/navbar-image-categories', {
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
    if (!window.confirm('Delete this image tile?')) return;
    setError(null);
    try {
      await authedJson(`/api/admin/navbar-image-categories/${id}`, { method: 'DELETE' });
      if (user) await loadAll(user);
      if (form.id === id) resetForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
  }

  function startEdit(item) {
    setForm({
      id: item.id,
      mainSlug: item.mainSlug || 'collections',
      name: item.name || '',
      href: item.href || '',
      imageUrl: item.imageUrl || '',
      sortOrder: Number(item.sortOrder || 0),
    });
  }

  if (!user) {
    return (
      <div className="text-center" style={{ padding: '40px 0' }}>
        <h1 style={{ fontSize: 24, fontWeight: 900 }}>Navbar Image Categories</h1>
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
          <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 6 }}>Navbar Image Categories</h1>
          <div style={{ color: '#6c757d', fontSize: 13 }}>
            Configure right-side image tiles for main navbar categories.
          </div>
        </div>
        <Link className="btn btn-outline-secondary" href="/admin">
          Back
        </Link>
      </div>

      {error ? <div className="alert alert-danger mt-3">{error}</div> : null}

      <div className="card mt-3">
        <div className="card-body">
          <div style={{ fontWeight: 900, marginBottom: 10 }}>{isEditing ? 'Edit image tile' : 'Add image tile'}</div>

          <form className="row g-3" onSubmit={onSubmit}>
            <div className="col-12 col-md-3">
              <label className="form-label">Main navbar category</label>
              <select
                className="form-select"
                value={form.mainSlug}
                onChange={(e) => setForm((p) => ({ ...p, mainSlug: e.target.value }))}
              >
                {MAIN_NAV_CATEGORIES.map((c) => (
                  <option key={c.slug} value={c.slug}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-12 col-md-3">
              <label className="form-label">Name</label>
              <input
                className="form-control"
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                required
              />
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

            <div className="col-12 col-md-4">
              <label className="form-label">Link (optional)</label>
              <input
                className="form-control"
                value={form.href}
                onChange={(e) => setForm((p) => ({ ...p, href: e.target.value }))}
                placeholder="/category/mark-series or https://..."
              />
            </div>

            <div className="col-12 col-md-4">
              <label className="form-label">Image upload (Cloudinary)</label>
              <input
                className="form-control"
                type="file"
                accept="image/*"
                onChange={(e) => setUploadFile(e.target.files && e.target.files[0] ? e.target.files[0] : null)}
              />
              <button className="btn btn-outline-primary btn-sm mt-2" type="button" onClick={onUpload} disabled={uploading}>
                {uploading ? 'Uploading…' : 'Upload'}
              </button>
            </div>

            <div className="col-12 col-md-4">
              <label className="form-label">Image URL</label>
              <input
                className="form-control"
                value={form.imageUrl}
                onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))}
                placeholder="https://res.cloudinary.com/..."
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
          <div style={{ fontWeight: 900, marginBottom: 10 }}>All image tiles</div>

          {items.length === 0 ? <div style={{ color: '#6c757d' }}>No image tiles yet.</div> : null}

          {items.length ? (
            <div className="table-responsive">
              <table className="table table-sm align-middle">
                <thead>
                  <tr>
                    <th>Main category</th>
                    <th>Name</th>
                    <th>Link</th>
                    <th style={{ width: 90 }}>Sort</th>
                    <th style={{ width: 120 }}>Image</th>
                    <th style={{ width: 160 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => (
                    <tr key={it.id}>
                      <td style={{ fontSize: 13, color: '#6c757d' }}>{it.mainSlug}</td>
                      <td style={{ fontWeight: 700 }}>{it.name}</td>
                      <td style={{ fontSize: 13, color: '#6c757d' }}>{it.href || '—'}</td>
                      <td>{Number(it.sortOrder || 0)}</td>
                      <td style={{ fontSize: 13, color: '#6c757d' }}>
                        {it.imageUrl ? (
                          <a href={it.imageUrl} target="_blank" rel="noreferrer">
                            View
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="text-end">
                        <button className="btn btn-outline-primary btn-sm me-2" onClick={() => startEdit(it)}>
                          Edit
                        </button>
                        <button className="btn btn-outline-danger btn-sm" onClick={() => onDelete(it.id)}>
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
