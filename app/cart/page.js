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
      <h1 style={{ fontSize: 22, fontWeight: 800 }}>Cart</h1>

      {items.length === 0 ? (
        <div style={{ marginTop: 16 }}>
          <div>Your cart is empty.</div>
          <Link href="/landingpage" className="btn btn-primary mt-3">Continue shopping</Link>
        </div>
      ) : (
        <>
          <div className="table-responsive" style={{ marginTop: 16 }}>
            <table className="table align-middle">
              <thead>
                <tr>
                  <th>Item</th>
                  <th style={{ width: 120 }}>Price</th>
                  <th style={{ width: 120 }}>Qty</th>
                  <th style={{ width: 120 }}>Total</th>
                  <th style={{ width: 80 }}></th>
                </tr>
              </thead>
              <tbody>
                {items.map((it, idx) => (
                  <tr key={`${it.productId || it.sku || it.name}-${idx}`}>
                    <td>
                      <div style={{ fontWeight: 700 }}>{it.name}</div>
                      {it.sku ? <div style={{ fontSize: 12, color: '#6c757d' }}>{it.sku}</div> : null}
                    </td>
                    <td>${(Number(it.unitAmount || 0) / 100).toFixed(2)}</td>
                    <td>
                      <input
                        type="number"
                        min={1}
                        value={it.qty}
                        onChange={(e) => updateQty(idx, Number(e.target.value))}
                        className="form-control"
                      />
                    </td>
                    <td>${((Number(it.unitAmount || 0) * Number(it.qty || 0)) / 100).toFixed(2)}</td>
                    <td>
                      <button className="btn btn-outline-danger btn-sm" onClick={() => remove(idx)}>
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="d-flex justify-content-end" style={{ marginTop: 12 }}>
            <div style={{ minWidth: 260 }}>
              <div className="d-flex justify-content-between">
                <div style={{ fontWeight: 700 }}>Subtotal</div>
                <div style={{ fontWeight: 700 }}>${(totals.subtotal / 100).toFixed(2)}</div>
              </div>
              <Link href="/checkout" className="btn btn-primary w-100 mt-3">
                Checkout
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
