'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { auth } from '../../../../lib/firebase/client';
import { userAuthedJson } from '../../../../lib/user/client';

export default function AccountOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [order, setOrder] = useState(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setError(null);
      if (!u) {
        router.replace(`/login?next=${encodeURIComponent(`/account/orders/${id || ''}`)}`);
        return;
      }

      if (!id || typeof id !== 'string') {
        setError('Missing order id');
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const data = await userAuthedJson(`/api/account/orders/${id}`);
        setOrder(data?.order || null);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed');
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [router, id]);

  if (loading) return <div className="container py-5">Loading…</div>;

  if (!order) {
    return (
      <div className="container py-5" style={{ maxWidth: 860 }}>
        <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
          <h1 style={{ fontSize: 24, fontWeight: 900 }}>Order</h1>
          <Link className="btn btn-outline-secondary" href="/account/orders">
            Back
          </Link>
        </div>
        {error ? <div className="alert alert-danger mt-3">{error}</div> : null}
      </div>
    );
  }

  const created = typeof order?.createdAt === 'string' ? new Date(order.createdAt) : null;

  return (
    <div className="container py-4" style={{ maxWidth: 860 }}>
      <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 6 }}>Order #{order.id}</h1>
          <div style={{ color: '#6c757d', fontSize: 13 }}>{created ? created.toLocaleString() : ''}</div>
        </div>
        <Link className="btn btn-outline-secondary" href="/account/orders">
          Back
        </Link>
      </div>

      {error ? <div className="alert alert-danger mt-3">{error}</div> : null}

      <div className="row" style={{ marginTop: 16 }}>
        <div className="col-12 col-lg-7">
          <div className="card">
            <div className="card-body">
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Items</div>
              {(order.items || []).map((it, idx) => (
                <div key={idx} className="d-flex justify-content-between" style={{ marginBottom: 8 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{it.name}</div>
                    <div style={{ fontSize: 12, color: '#6c757d' }}>
                      {it.sku ? `${it.sku} • ` : ''}Qty: {it.qty}
                    </div>
                  </div>
                  <div style={{ fontWeight: 800 }}>
                    ${((Number(it.unitAmount || 0) * Number(it.qty || 0)) / 100).toFixed(2)}
                  </div>
                </div>
              ))}

              <hr />

              <div className="d-flex justify-content-between">
                <div style={{ fontWeight: 800 }}>Total</div>
                <div style={{ fontWeight: 900 }}>${(Number(order?.totals?.total || 0) / 100).toFixed(2)}</div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-5" style={{ marginTop: 16, marginTop: 0 }}>
          <div className="card">
            <div className="card-body">
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Status</div>
              <div style={{ textTransform: 'capitalize' }}>{order?.payment?.status || '-'}</div>

              <div style={{ fontWeight: 800, margin: '14px 0 8px' }}>Shipping address</div>
              <AddressBlock address={order.shippingAddress} />
            </div>
          </div>
        </div>
      </div>
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
