'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { readWishlist, writeWishlist } from '../lib/wishlist';
import AddToCartButton from '../product/[slug]/AddToCartButton';
import Navbar from '../components/Navbar';
import StickyNavbar from '../components/StickyNavbar';

export default function WishlistPage() {
  const [items, setItems] = useState([]);

  useEffect(() => {
    setItems(readWishlist());
  }, []);

  function removeFromWishlist(productId) {
    const next = items.filter((it) => it.productId !== productId);
    setItems(next);
    writeWishlist(next);
  }

  return (
    <main>
      <StickyNavbar>
        <Navbar />
      </StickyNavbar>

      <div className="container py-4">
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 16 }}>Wishlist</h1>

        {!items.length ? (
          <>
            <div className="text-muted mb-3">Your wishlist is empty.</div>
            <Link href="/landingpage" className="btn btn-primary">
              Continue shopping
            </Link>
          </>
        ) : (
          <div style={{ marginTop: 16 }}>
            {items.map((it) => {
          const unitPrice = Number(it.unitAmount || 0) / 100;
          return (
            <div key={it.productId} className="py-3 border-bottom">
              <div className="d-flex align-items-center gap-3 flex-wrap justify-content-between">
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
                    <div className="small text-muted mt-1">${unitPrice.toFixed(2)}</div>
                  </div>
                </div>

                <div style={{ minWidth: 80, textAlign: 'right', fontWeight: 700 }}>
                  ${unitPrice.toFixed(2)}
                </div>
              </div>

              <div className="d-flex justify-content-between align-items-center mt-2 flex-wrap" style={{ gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-link p-0 small text-danger"
                  onClick={() => removeFromWishlist(it.productId)}
                >
                  Remove
                </button>
                <div className="d-flex gap-2">
                  <a className="btn btn-outline-secondary btn-sm" href={`/product/${it.slug}`}>
                    View product
                  </a>
                  <AddToCartButton
                    item={{
                      productId: it.productId,
                      sku: null,
                      name: it.name,
                      unitAmount: Number(it.unitAmount || 0),
                      imageUrl: it.imageUrl || null,
                    }}
                    qty={1}
                    className="btn btn-sm btn-dark"
                  />
                </div>
              </div>
            </div>
          );
        })}
          </div>
        )}
      </div>
    </main>
  );
}
