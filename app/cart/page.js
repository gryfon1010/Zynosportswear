'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

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

function writeCart(items) {
  window.localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export default function CartPage() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    setItems(readCart());
  }, []);

  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, it) => sum + Number(it.unitAmount || 0) * Number(it.qty || 0), 0);
    return { subtotal };
  }, [items]);

  function updateQty(index, qty) {
    const next = items.map((it, i) => (i === index ? { ...it, qty } : it)).filter((it) => it.qty > 0);
    setItems(next);
    writeCart(next);
  }

  function remove(index) {
    const next = items.filter((_, i) => i !== index);
    setItems(next);
    writeCart(next);
  }

  return (
    <div className="container py-4">
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16 }}>Your cart</h1>

      {items.length === 0 ? (
        <div style={{ marginTop: 16 }}>
          <div>Your cart is empty.</div>
          <Link href="/landingpage" className="btn btn-primary mt-3">Continue shopping</Link>
        </div>
      ) : (
        <>
          <div style={{ marginTop: 16 }}>
            {/* Header row for desktop */}
            <div className="d-none d-md-flex border-bottom pb-2 mb-2 small text-uppercase fw-semibold">
              <div style={{ flex: 1 }}>Product</div>
              <div style={{ width: 160, textAlign: 'center' }}>Quantity</div>
              <div style={{ width: 140, textAlign: 'right' }}>Total</div>
            </div>

            {items.map((it, idx) => {
              const unit = Number(it.unitAmount || 0);
              const qty = Number(it.qty || 0) || 1;
              const lineTotal = (unit * qty) / 100;
              const unitPrice = unit / 100;

              return (
                <div
                  key={`${it.productId || it.sku || it.name}-${idx}`}
                  className="d-flex align-items-center py-3 border-bottom gap-3 flex-wrap flex-md-nowrap"
                >
                  {/* Product column */}
                  <div className="d-flex align-items-center gap-3" style={{ flex: 1, minWidth: 0 }}>
                    {it.imageUrl ? (
                      <div
                        style={{
                          width: 80,
                          height: 80,
                          flex: '0 0 auto',
                          borderRadius: 4,
                          overflow: 'hidden',
                          backgroundColor: '#f8f9fa',
                        }}
                      >
                        <img
                          src={it.imageUrl}
                          alt={it.name}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    ) : null}

                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700 }}>{it.name}</div>
                      {it.color ? (
                        <div className="small text-muted">Color: {it.color}</div>
                      ) : null}
                      {it.size ? (
                        <div className="small text-muted">Size: {it.size}</div>
                      ) : null}
                      <div className="small text-muted mt-1">${unitPrice.toFixed(2)} each</div>
                    </div>
                  </div>

                  {/* Quantity column */}
                  <div
                    className="d-flex justify-content-center mt-2 mt-md-0"
                    style={{ width: 160 }}
                  >
                    <div className="d-inline-flex align-items-center border rounded">
                      <button
                        type="button"
                        className="btn btn-sm btn-light border-0"
                        onClick={() => updateQty(idx, Math.max(1, qty - 1))}
                      >
                        −
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={qty}
                        onChange={(e) => {
                          const v = Number(e.target.value);
                          if (!Number.isFinite(v) || v <= 0) return;
                          updateQty(idx, v);
                        }}
                        className="form-control form-control-sm text-center border-0"
                        style={{ width: 56 }}
                      />
                      <button
                        type="button"
                        className="btn btn-sm btn-light border-0"
                        onClick={() => updateQty(idx, qty + 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Total + remove */}
                  <div
                    className="d-flex flex-column align-items-end ms-auto mt-2 mt-md-0"
                    style={{ width: 140 }}
                  >
                    <div style={{ fontWeight: 700 }}>${lineTotal.toFixed(2)}</div>
                    <button
                      type="button"
                      className="btn btn-link p-0 small text-danger mt-1"
                      onClick={() => remove(idx)}
                    >
                      Remove
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="d-flex justify-content-end" style={{ marginTop: 16 }}>
            <div style={{ minWidth: 260 }}>
              <div className="d-flex justify-content-between mb-2">
                <div style={{ fontWeight: 700 }}>Subtotal</div>
                <div style={{ fontWeight: 700 }}>${(totals.subtotal / 100).toFixed(2)}</div>
              </div>
              <Link href="/checkout" className="btn btn-primary w-100 mt-2">
                Checkout
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
