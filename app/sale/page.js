'use client';

import { useEffect, useState } from 'react';
import CategoryProductsClient from '../category/CategoryProductsClient';

export default function SalePage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setError(null);
      setLoading(true);
      try {
        const res = await fetch('/api/storefront/products?sale=true&limit=200');
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || 'Failed to load sale products');
        if (cancelled) return;
        setItems(Array.isArray(data.items) ? data.items : []);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main>
      <div className="container-fluid px-4 py-4">
        <div className="row">
          <div className="col-12 ms-lg-3">
            <div className="small text-muted mb-1">
              <a href="/" className="text-decoration-none text-muted">
                Home
              </a>
              <span className="mx-1">/</span>
              <span className="text-uppercase">Sale</span>
            </div>

            <h1 className="display-6 fw-bold text-uppercase mb-2">Sale</h1>

            {loading ? <div className="text-muted small mb-2">Loading sale products…</div> : null}
            {error ? <div className="alert alert-danger">{error}</div> : null}

            {!loading && !error && items.length > 0 ? (
              <CategoryProductsClient initialProducts={items} categoryName="Sale" />
            ) : null}

            {!loading && !error && items.length === 0 ? (
              <div className="text-muted">No sale products yet.</div>
            ) : null}
          </div>
        </div>
      </div>
    </main>
  );
}
