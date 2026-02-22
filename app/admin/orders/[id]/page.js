'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { auth } from '../../../../lib/firebase/client';
import { authedJson } from '../../../../lib/admin/client';

export default function AdminOrderDetailPage({ params }) {
  const [user, setUser] = useState(null);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [order, setOrder] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const [paymentStatusDraft, setPaymentStatusDraft] = useState('');
  const [fulfillmentStatusDraft, setFulfillmentStatusDraft] = useState('');

  const id = params?.id;

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setUser(u || null);
      setError(null);
      setLoading(true);

      if (!u) {
        setMe(null);
        setOrder(null);
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
          setOrder(null);
          setLoading(false);
          return;
        }

        const data = await authedJson(`/api/admin/orders/${id}`);
        const nextOrder = data?.item || null;
        setOrder(nextOrder);
        if (nextOrder) {
          setPaymentStatusDraft(nextOrder?.payment?.status || 'pending');
          setFulfillmentStatusDraft(nextOrder?.fulfillment?.status || 'unfulfilled');
        }
        setLoading(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed');
        setLoading(false);
      }
    });

    return () => unsub();
  }, [id]);

  const created = order?.createdAt && typeof order.createdAt === 'string' ? new Date(order.createdAt) : null;

  async function onSaveStatus() {
    if (!order) return;
    setSaveError(null);
    setSaving(true);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Not signed in');
      const token = await user.getIdToken();

      const res = await fetch(`/api/admin/orders/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          paymentStatus: paymentStatusDraft,
          fulfillmentStatus: fulfillmentStatusDraft,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || `Failed (${res.status})`);

      const updated = data?.item || null;
      if (updated) {
        setOrder(updated);
        setPaymentStatusDraft(updated?.payment?.status || paymentStatusDraft);
        setFulfillmentStatusDraft(updated?.fulfillment?.status || fulfillmentStatusDraft);
      }
      setSaving(false);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to update order');
      setSaving(false);
    }
  }

  if (loading) return <div>Loading…</div>;

  if (!user) {
    return (
      <div className="text-center" style={{ padding: '40px 0' }}>
        <h1 style={{ fontSize: 24, fontWeight: 900 }}>Order</h1>
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
    <div className="container py-4" style={{ maxWidth: 980 }}>
      <div
        className="d-flex align-items-start justify-content-between gap-3 flex-wrap"
        style={{ marginTop: 6 }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 6 }}>Order #{id}</h1>
          <div style={{ color: '#6c757d' }}>{order?.email || '—'}</div>
          <div style={{ color: '#6c757d', fontSize: 13 }}>{created ? created.toLocaleString() : ''}</div>
        </div>
        <Link className="btn btn-outline-secondary admin-outline-btn" href="/admin/orders">
          Back
        </Link>
      </div>

      {error ? <div className="alert alert-danger mt-3">{error}</div> : null}
      {!order ? <div className="alert alert-warning mt-3">Order not found.</div> : null}

      {order ? (
        <div className="row g-3" style={{ marginTop: 10 }}>
          <div className="col-12 col-lg-7">
            <div className="card">
              <div className="card-body">
                <div style={{ fontWeight: 800, marginBottom: 10 }}>Items</div>
                {(order.items || []).length ? (
                  (order.items || []).map((it, idx) => (
                    <div key={idx} className="d-flex justify-content-between" style={{ marginBottom: 10 }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{it?.name || '—'}</div>
                        <div style={{ fontSize: 12, color: '#6c757d' }}>
                          {it?.sku ? `${it.sku} • ` : ''}Qty: {Number(it?.qty || 0)}
                        </div>
                      </div>
                      <div style={{ fontWeight: 800 }}>
                        {formatMoney(Number(it?.unitAmount || 0) * Number(it?.qty || 0), order?.totals?.currency)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-muted">No items</div>
                )}

                <hr />

                <div className="d-flex justify-content-between">
                  <div style={{ fontWeight: 800 }}>Total</div>
                  <div style={{ fontWeight: 900 }}>{formatMoney(Number(order?.totals?.total || 0), order?.totals?.currency)}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-12 col-lg-5">
            <div className="card">
              <div className="card-body">
                <div style={{ fontWeight: 800, marginBottom: 10 }}>Status</div>

                <div className="mb-2">
                  <div className="small text-muted mb-1">Payment status</div>
                  <select
                    className="form-select form-select-sm"
                    value={paymentStatusDraft}
                    onChange={(e) => setPaymentStatusDraft(e.target.value)}
                  >
                    <option value="pending">Pending</option>
                    <option value="paid">Paid</option>
                    <option value="failed">Failed</option>
                    <option value="refunded">Refunded</option>
                  </select>
                </div>

                <div className="mb-3">
                  <div className="small text-muted mb-1">Fulfillment status</div>
                  <select
                    className="form-select form-select-sm"
                    value={fulfillmentStatusDraft}
                    onChange={(e) => setFulfillmentStatusDraft(e.target.value)}
                  >
                    <option value="unfulfilled">Unfulfilled</option>
                    <option value="processing">Processing</option>
                    <option value="shipped">Shipped</option>
                    <option value="delivered">Delivered</option>
                    <option value="canceled">Canceled</option>
                  </select>
                </div>

                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={onSaveStatus}
                  disabled={saving}
                >
                  {saving ? 'Saving…' : 'Save status'}
                </button>

                {saveError ? (
                  <div className="alert alert-danger mt-2 mb-0" style={{ fontSize: 13 }}>
                    {saveError}
                  </div>
                ) : null}

                <div style={{ fontWeight: 800, margin: '16px 0 8px' }}>Contact</div>
                <div>{order?.email || '—'}</div>
                {order?.phone ? <div>{order.phone}</div> : null}

                <div style={{ fontWeight: 800, margin: '16px 0 8px' }}>Shipping address</div>
                <AddressBlock address={order.shippingAddress} />

                <div style={{ fontWeight: 800, margin: '16px 0 8px' }}>Billing address</div>
                <AddressBlock address={order.billingAddress} />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AddressBlock({ address }) {
  if (!address) return <div>—</div>;
  const lines = [
    address.name,
    address.line1,
    address.line2,
    [address.city, address.state, address.postalCode].filter(Boolean).join(', '),
    address.country,
  ].filter(Boolean);

  return (
    <div style={{ fontSize: 14, lineHeight: 1.5 }}>
      {lines.map((l, idx) => (
        <div key={idx}>{l}</div>
      ))}
    </div>
  );
}

function formatMoney(amountMinor, currency) {
  const c = (currency ? String(currency) : 'usd').toUpperCase();
  const val = (Number(amountMinor || 0) / 100).toFixed(2);
  return `${c} ${val}`;
}
