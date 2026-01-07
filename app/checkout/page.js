'use client';

import { useEffect, useMemo, useState } from 'react';

const CART_KEY = 'zyno_cart_v1';

function readCart() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function CheckoutPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [customer, setCustomer] = useState({
    email: '',
    phone: '',
    shippingAddress: {
      name: '',
      line1: '',
      line2: '',
      city: '',
      state: '',
      postalCode: '',
      country: 'US',
    },
  });

  useEffect(() => {
    setItems(readCart());
  }, []);

  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + Number(it.unitAmount || 0) * Number(it.qty || 0), 0),
    [items]
  );

  async function startCheckout() {
    setError(null);

    if (!customer.email) {
      setError('Email is required.');
      return;
    }
    if (items.length === 0) {
      setError('Cart is empty.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, customer }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to start checkout');

      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout failed');
      setLoading(false);
    }
  }

  return (
    <div className="container py-4" style={{ maxWidth: 860 }}>
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>Checkout</h1>

      <div className="row" style={{ marginTop: 16 }}>
        <div className="col-12 col-lg-7">
          <div className="card">
            <div className="card-body">
              <div style={{ fontWeight: 800, marginBottom: 10 }}>Contact</div>
              <div className="mb-3">
                <label className="form-label">Email</label>
                <input
                  className="form-control"
                  value={customer.email}
                  onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Phone (optional)</label>
                <input
                  className="form-control"
                  value={customer.phone}
                  onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                />
              </div>

              <div style={{ fontWeight: 800, margin: '14px 0 10px' }}>Shipping address</div>

              <div className="mb-3">
                <label className="form-label">Full name</label>
                <input
                  className="form-control"
                  value={customer.shippingAddress.name}
                  onChange={(e) =>
                    setCustomer({
                      ...customer,
                      shippingAddress: { ...customer.shippingAddress, name: e.target.value },
                    })
                  }
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Address line 1</label>
                <input
                  className="form-control"
                  value={customer.shippingAddress.line1}
                  onChange={(e) =>
                    setCustomer({
                      ...customer,
                      shippingAddress: { ...customer.shippingAddress, line1: e.target.value },
                    })
                  }
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Address line 2 (optional)</label>
                <input
                  className="form-control"
                  value={customer.shippingAddress.line2}
                  onChange={(e) =>
                    setCustomer({
                      ...customer,
                      shippingAddress: { ...customer.shippingAddress, line2: e.target.value },
                    })
                  }
                />
              </div>

              <div className="row">
                <div className="col-12 col-md-6 mb-3">
                  <label className="form-label">City</label>
                  <input
                    className="form-control"
                    value={customer.shippingAddress.city}
                    onChange={(e) =>
                      setCustomer({
                        ...customer,
                        shippingAddress: { ...customer.shippingAddress, city: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="col-12 col-md-6 mb-3">
                  <label className="form-label">State</label>
                  <input
                    className="form-control"
                    value={customer.shippingAddress.state}
                    onChange={(e) =>
                      setCustomer({
                        ...customer,
                        shippingAddress: { ...customer.shippingAddress, state: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="col-12 col-md-6 mb-3">
                  <label className="form-label">Postal code</label>
                  <input
                    className="form-control"
                    value={customer.shippingAddress.postalCode}
                    onChange={(e) =>
                      setCustomer({
                        ...customer,
                        shippingAddress: { ...customer.shippingAddress, postalCode: e.target.value },
                      })
                    }
                  />
                </div>
                <div className="col-12 col-md-6 mb-3">
                  <label className="form-label">Country</label>
                  <input
                    className="form-control"
                    value={customer.shippingAddress.country}
                    onChange={(e) =>
                      setCustomer({
                        ...customer,
                        shippingAddress: { ...customer.shippingAddress, country: e.target.value },
                      })
                    }
                  />
                </div>
              </div>

              {error ? <div className="alert alert-danger mb-0">{error}</div> : null}
            </div>
          </div>
        </div>

        <div className="col-12 col-lg-5" style={{ marginTop: 16, marginTop: 0 }}>
          <div className="card">
            <div className="card-body">
              <div style={{ fontWeight: 800, marginBottom: 10 }}>Order summary</div>
              {items.map((it, idx) => (
                <div
                  key={idx}
                  className="d-flex justify-content-between align-items-start"
                  style={{ marginBottom: 8 }}
                >
                  <div className="d-flex align-items-start gap-2">
                    {it.imageUrl ? (
                      <img
                        src={it.imageUrl}
                        alt={it.name}
                        style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4 }}
                      />
                    ) : null}
                    <div>
                      <div style={{ fontWeight: 700 }}>{it.name}</div>
                      <div style={{ fontSize: 12, color: '#6c757d' }}>Qty: {it.qty}</div>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700 }}>
                    ${((Number(it.unitAmount || 0) * Number(it.qty || 0)) / 100).toFixed(2)}
                  </div>
                </div>
              ))}

              <hr />

              <div className="d-flex justify-content-between">
                <div style={{ fontWeight: 800 }}>Subtotal</div>
                <div style={{ fontWeight: 800 }}>${(subtotal / 100).toFixed(2)}</div>
              </div>

              <button
                className="btn w-100 mt-3 text-uppercase fw-semibold"
                style={{ backgroundColor: '#d10024', borderColor: '#d10024', color: '#ffffff' }}
                onClick={startCheckout}
                disabled={loading}
              >
                {loading ? 'Redirecting…' : 'Checkout with Stripe'}
              </button>

              <div style={{ fontSize: 12, color: '#6c757d', marginTop: 10 }}>
                Stripe test mode enabled.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
