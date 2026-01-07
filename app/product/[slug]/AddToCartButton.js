'use client';

import { useMemo, useState } from 'react';

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

export default function AddToCartButton({ item, qty = 1, className = 'btn btn-dark', style, onAdded }) {
  const [added, setAdded] = useState(false);

  const disabled = useMemo(() => {
    if (!item) return true;
    if (!item.name) return true;
    if (!Number.isFinite(Number(item.unitAmount))) return true;
    const q = Number(qty);
    if (!Number.isFinite(q) || q <= 0) return true;
    return false;
  }, [item, qty]);

  function onAdd() {
    if (disabled) return;

    const cart = readCart();
    const productId = item.productId || null;
    const quantity = Number.isFinite(Number(qty)) && Number(qty) > 0 ? Number(qty) : 1;

    const idx = cart.findIndex((x) => {
      const sameProduct = productId ? x.productId === productId : false;
      const sameSku = item.sku ? x.sku === item.sku : false;
      const sameColor = 'color' in item ? x.color === item.color : true;
      const sameSize = 'size' in item ? x.size === item.size : true;
      return (sameProduct || sameSku) && sameColor && sameSize;
    });
    if (idx >= 0) {
      const next = cart.map((x, i) => (i === idx ? { ...x, qty: Number(x.qty || 0) + quantity } : x));
      writeCart(next);
    } else {
      const next = [
        ...cart,
        {
          productId: productId,
          sku: item.sku || null,
          name: item.name,
          qty: quantity,
          unitAmount: Number(item.unitAmount),
          imageUrl: item.imageUrl || null,
          color: item.color || null,
          size: item.size || null,
        },
      ];
      writeCart(next);
    }

    setAdded(true);
    if (typeof onAdded === 'function') {
      try {
        onAdded();
      } catch {
        // ignore callback errors
      }
    }
    window.setTimeout(() => setAdded(false), 1500);
  }

  return (
    <button className={className} type="button" onClick={onAdd} disabled={disabled} style={style}>
      {added ? 'Added' : 'Add to cart'}
    </button>
  );
}
