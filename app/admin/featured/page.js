'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { auth } from '../../../lib/firebase/client';
import { authedJson } from '../../../lib/admin/client';

export default function AdminFeaturedPage() {
  const [user, setUser] = useState(null);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [products, setProducts] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);

  const productsById = useMemo(() => {
    const m = new Map();
    for (const p of products) m.set(p.id, p);
    return m;
  }, [products]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setUser(u || null);
      setError(null);
      setLoading(true);

      if (!u) {
        setMe(null);
        setProducts([]);
        setSelectedIds([]);
        setLoading(false);
        return;
      }

      try {
        const token = await u.getIdToken();
        const res = await fetch('/api/admin/me', { headers: { authorization: `Bearer ${token}` } });
        const meData = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(meData?.error || `Request failed (${res.status})`);
        setMe(meData);

        if (!meData?.isAdmin) {
          setProducts([]);
          setSelectedIds([]);
          setLoading(false);
          return;
        }

        const prods = await authedJson('/api/admin/products');
        setProducts(Array.isArray(prods.items) ? prods.items : []);

        const feat = await authedJson('/api/admin/featured');
        setSelectedIds(Array.isArray(feat.productIds) ? feat.productIds : []);

        setLoading(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed');
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  function toggle(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function onSave() {
    setSaving(true);
    setError(null);
    try {
      await authedJson('/api/admin/featured', {
        method: 'PUT',
        body: JSON.stringify({ productIds: selectedIds }),
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
        <h1 style={{ fontSize: 24, fontWeight: 900 }}>Featured</h1>
        <div style={{ color: '#6c757d', marginTop: 8 }}>You are not signed in.</div>
        <div style={{ marginTop: 16 }}>
          <Link className="btn btn-primary" href="/admin/login">
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  if (!me?.isAdmin) {
    return (
      <div className="alert alert-warning mt-3">
        <div style={{ fontWeight: 800, marginBottom: 6 }}>Access not granted yet</div>
        <div style={{ fontSize: 14 }}>
          Your UID is <code>{me?.uid || user.uid}</code>. Add this UID to Firestore collection <code>admins</code>.
        </div>
      </div>
    );
  }

  const selected = selectedIds
    .map((id) => productsById.get(id))
    .filter(Boolean);

  return (
    <div>
      <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 6 }}>Featured Products</h1>
          <div style={{ color: '#6c757d' }}>Choose which products appear on the landing page.</div>
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
        <div className="col-12 col-lg-7">
          <div className="card">
            <div className="card-body">
              <div style={{ fontWeight: 900, marginBottom: 10 }}>All products</div>
              <div className="table-responsive">
                <table className="table table-sm align-middle">
                  <thead>
                    <tr>
                      <th style={{ width: 60 }}>Pick</th>
                      <th>Name</th>
                      <th>Slug</th>
                      <th style={{ width: 90 }}>Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <input
                            type="checkbox"
                            className="form-check-input"
                            checked={selectedIds.includes(p.id)}
                            onChange={() => toggle(p.id)}
                          />
                        </td>
                        <td>{p.name}</td>
                        <td><code>{p.slug}</code></td>
                        <td>{p.active === false ? 'No' : 'Yes'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-5">
          <div className="card">
            <div className="card-body">
              <div style={{ fontWeight: 900, marginBottom: 10 }}>Selected ({selected.length})</div>
              {selected.length ? (
                <ol className="mb-0">
                  {selected.map((p) => (
                    <li key={p.id}>
                      <a href={`/product/${p.slug}`} target="_blank" rel="noreferrer" className="text-decoration-none">
                        {p.name}
                      </a>
                    </li>
                  ))}
                </ol>
              ) : (
                <div className="text-muted">No featured products selected yet.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
