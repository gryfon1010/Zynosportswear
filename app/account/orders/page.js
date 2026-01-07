'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { auth } from '../../../lib/firebase/client';
import { userAuthedJson } from '../../../lib/user/client';

export default function AccountOrdersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [items, setItems] = useState([]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setError(null);
      if (!u) {
        router.replace('/login?next=/account/orders');
        return;
      }

      setLoading(true);
      try {
        const data = await userAuthedJson('/api/account/orders');
        setItems(Array.isArray(data.items) ? data.items : []);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed');
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [router]);

  if (loading) return <div className="container py-5">Loading…</div>;

  return (
    <div className="container py-5" style={{ maxWidth: 900 }}>
      <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 6 }}>My Orders</h1>
          <div style={{ color: '#6c757d' }}>Your latest orders.</div>
        </div>
        <Link className="btn btn-outline-secondary" href="/account">
          Back
        </Link>
      </div>

      {error ? <div className="alert alert-danger mt-3">{error}</div> : null}

      <div className="card mt-3">
        <div className="card-body">
          {items.length === 0 ? (
            <div style={{ color: '#6c757d' }}>No orders found.</div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm align-middle mb-0">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Status</th>
                    <th>Amount</th>
                    <th>Created</th>
                    <th></th>
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
                        <td>
                          <code>{o.id}</code>
                        </td>
                        <td style={{ textTransform: 'capitalize' }}>{status}</td>
                        <td>{amount && currency ? `${currency} ${amount}` : '-'}</td>
                        <td>{created ? created.toLocaleString() : '-'}</td>
                        <td>
                          <Link href={`/account/orders/${o.id}`}>View</Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
