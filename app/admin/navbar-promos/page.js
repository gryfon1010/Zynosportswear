'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { auth } from '../../../lib/firebase/client';
import { authedJson } from '../../../lib/admin/client';

const DEFAULT_PROMOS = [
  { key: 'apparel-1', imageUrl: '', href: '' },
  { key: 'apparel-2', imageUrl: '', href: '' },
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

export default function AdminNavbarPromosPage() {
  const [user, setUser] = useState(null);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState(null);
  const [error, setError] = useState(null);
  const [promos, setPromos] = useState(DEFAULT_PROMOS);

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
        setPromos(DEFAULT_PROMOS);
        return;
      }

      const data = await authedJson('/api/admin/navbar-promos');
      const items = Array.isArray(data?.promos) ? data.promos : [];

      const next = DEFAULT_PROMOS.map((p) => {
        const found = items.find((x) => x && x.key === p.key);
        return {
          key: p.key,
          imageUrl: typeof found?.imageUrl === 'string' ? found.imageUrl : '',
          href: typeof found?.href === 'string' ? found.href : '',
        };
      });

      setPromos(next);
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
        setPromos(DEFAULT_PROMOS);
        setLoading(false);
        return;
      }
      loadAll(u);
    });
    return () => unsub();
  }, []);

  async function onUpload(key, file) {
    if (!file) return;
    setError(null);
    setUploadingKey(key);
    try {
      const url = await uploadImageToCloudinary(file, { folder: 'zynosportswear/navbar-promos' });
      setPromos((prev) => prev.map((p) => (p.key === key ? { ...p, imageUrl: url } : p)));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed');
    } finally {
      setUploadingKey(null);
    }
  }

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      await authedJson('/api/admin/navbar-promos', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ promos }),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div>Loading…</div>;

  if (!user) {
    return (
      <div className="text-center" style={{ padding: '40px 0' }}>
        <h1 style={{ fontSize: 24, fontWeight: 900 }}>Navbar Promos</h1>
        <div style={{ color: '#6c757d', marginTop: 8 }}>Please sign in.</div>
        <div style={{ marginTop: 16 }}>
          <Link className="btn btn-primary" href="/admin/login">
            Go to login
          </Link>
        </div>
      </div>
    );
  }

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
          <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 6 }}>Navbar Promos</h1>
          <div style={{ color: '#6c757d', fontSize: 13 }}>Upload Apparel mega-menu promo images (Cloudinary).</div>
        </div>
        <div className="d-flex gap-2">
          <Link className="btn btn-outline-secondary" href="/admin">
            Back
          </Link>
          <button className="btn btn-primary" onClick={onSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>

      {error ? <div className="alert alert-danger mt-3">{error}</div> : null}

      <div className="row g-3 mt-2">
        {promos.map((p) => (
          <div className="col-12 col-lg-6" key={p.key}>
            <div className="card h-100">
              <div className="card-body">
                <div style={{ fontWeight: 900, marginBottom: 10 }}>{p.key === 'apparel-1' ? 'Apparel Promo 1' : 'Apparel Promo 2'}</div>

                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label">Upload image</label>
                    <input
                      className="form-control"
                      type="file"
                      accept="image/*"
                      disabled={uploadingKey === p.key}
                      onChange={(e) => onUpload(p.key, e.target.files && e.target.files[0] ? e.target.files[0] : null)}
                    />
                    <div style={{ marginTop: 6, fontSize: 12, color: '#6c757d' }}>
                      {uploadingKey === p.key ? 'Uploading…' : 'Uploads to Cloudinary and fills Image URL.'}
                    </div>
                  </div>

                  <div className="col-12">
                    <label className="form-label">Image URL</label>
                    <input
                      className="form-control"
                      value={p.imageUrl}
                      onChange={(e) => setPromos((prev) => prev.map((x) => (x.key === p.key ? { ...x, imageUrl: e.target.value } : x)))}
                      placeholder="https://res.cloudinary.com/..."
                    />
                  </div>

                  <div className="col-12">
                    <label className="form-label">Link (optional)</label>
                    <input
                      className="form-control"
                      value={p.href}
                      onChange={(e) => setPromos((prev) => prev.map((x) => (x.key === p.key ? { ...x, href: e.target.value } : x)))}
                      placeholder="/category/apparel"
                    />
                    <div style={{ marginTop: 6, fontSize: 12, color: '#6c757d' }}>Use a relative path like /category/apparel or an https URL.</div>
                  </div>

                  <div className="col-12">
                    <div style={{ fontWeight: 800, marginBottom: 6 }}>Preview</div>
                    {p.imageUrl ? (
                      <img src={p.imageUrl} alt="Promo preview" style={{ width: '100%', height: 240, objectFit: 'cover', borderRadius: 4, background: '#f5f6f8' }} />
                    ) : (
                      <div style={{ height: 240, borderRadius: 4, background: '#f5f6f8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6c757d' }}>
                        No image yet
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
