import { notFound } from 'next/navigation';
import { getAdminDb } from '../../../lib/firebase/admin';
import { constantTimeEqualHex, sha256Hex } from '../../../lib/crypto';
import ClaimOrderButton from './ClaimOrderButton';

export default async function OrderPage({ params, searchParams }) {
  const orderId = params?.orderId;
  const token = typeof searchParams?.token === 'string' ? searchParams.token : null;

  if (!orderId || !token) notFound();

  const adminDb = getAdminDb();
  if (!adminDb) notFound();

  const ref = adminDb.collection('orders').doc(orderId);
  const snap = await ref.get();
  if (!snap.exists) notFound();

  const order = snap.data();
  if (!order?.accessTokenHash) notFound();

  const tokenHash = sha256Hex(token);
  const ok = constantTimeEqualHex(order.accessTokenHash, tokenHash);
  if (!ok) notFound();

  await ref.update({ accessTokenLastUsedAt: new Date(), updatedAt: new Date() });

  return (
    <div className="container py-4" style={{ maxWidth: 860 }}>
      <ClaimOrderButton orderId={orderId} token={token} />
      <h1 style={{ fontSize: 22, fontWeight: 900 }}>Order #{orderId}</h1>

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
                <div style={{ fontWeight: 900 }}>
                  ${((Number(order?.totals?.total || 0)) / 100).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-5" style={{ marginTop: 16, marginTop: 0 }}>
          <div className="card">
            <div className="card-body">
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Contact</div>
              <div>{order.email || '—'}</div>
              {order.phone ? <div>{order.phone}</div> : null}

              <div style={{ fontWeight: 800, margin: '14px 0 8px' }}>Status</div>
              <div style={{ textTransform: 'capitalize' }}>{order?.fulfillment?.status || 'unfulfilled'}</div>

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
