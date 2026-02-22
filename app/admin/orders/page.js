'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { auth } from '../../../lib/firebase/client';
import { authedJson } from '../../../lib/admin/client';

export default function AdminOrdersPage() {
  const [user, setUser] = useState(null);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setUser(u || null);
      setError(null);
      setLoading(true);

      if (!u) {
        setMe(null);
        setItems([]);
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
          setItems([]);
          setLoading(false);
          return;
        }

        const data = await authedJson('/api/admin/orders');
        setItems(Array.isArray(data.items) ? data.items : []);
        setLoading(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed');
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  if (loading) return <div>Loading…</div>;

  if (!user) {
    return (
      <div className="text-center" style={{ padding: '40px 0' }}>
        <h1 style={{ fontSize: 24, fontWeight: 900 }}>Orders</h1>
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

  return (
    <div>
      <div
        className="d-flex align-items-start justify-content-between gap-3 flex-wrap"
        style={{ marginTop: 6 }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 6 }}>Orders</h1>
          <div style={{ color: '#6c757d' }}>Latest orders (Stripe checkout sessions).</div>
        </div>
        <Link className="btn btn-outline-secondary admin-outline-btn" href="/admin">
          Back
        </Link>
      </div>

      {error ? <div className="alert alert-danger mt-3">{error}</div> : null}

      <div className="card mt-3">
        <div className="card-body">
          <div className="table-responsive">
            <table className="table table-sm align-middle">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Email</th>
                  <th>Status</th>
                  <th>Amount</th>
                  <th>Created</th>
                  <th>Link</th>
                </tr>
              </thead>
              <tbody>
                {items.map((o) => {
                  const created = typeof o?.createdAt === 'string' ? new Date(o.createdAt) : null;
                  const amountMinor = o?.totals?.total;
                  const currency = o?.totals?.currency ? String(o.totals.currency).toUpperCase() : null;
                  const amount = Number.isFinite(Number(amountMinor)) ? (Number(amountMinor) / 100).toFixed(2) : null;
                  const status = o?.payment?.status || o?.fulfillment?.status || '-';

                  return (
                    <tr key={o.id}>
                      <td><code>{o.id}</code></td>
                      <td>{o?.customer?.email || o?.email || '-'}</td>
                      <td style={{ textTransform: 'capitalize' }}>{status}</td>
                      <td>{amount && currency ? `${currency} ${amount}` : '-'}</td>
                      <td>{created ? created.toLocaleString() : '-'}</td>
                      <td>
                        <Link href={`/admin/orders/${o.id}`}>View</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
