'use client';

import { useEffect, useMemo, useState } from 'react';
import { readWishlist, writeWishlist } from '../lib/wishlist';
import AddToCartButton from '../product/[slug]/AddToCartButton';

const CART_KEY = 'zyno_cart_v1';

function readCartSafe() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeCartSafe(items) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export default function SearchResultsClient({ initialProducts, searchQuery }) {
  const [sortKey, setSortKey] = useState('relevance');
  const [wishlist, setWishlist] = useState([]);
  const [hoverImageIndex, setHoverImageIndex] = useState({});
  const [hoveredProductId, setHoveredProductId] = useState(null);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    setWishlist(readWishlist());
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(max-width: 991.98px)');

    function handleViewportChange(e) {
      setIsMobileViewport(e.matches);
    }

    handleViewportChange(mql);
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handleViewportChange);
      return () => mql.removeEventListener('change', handleViewportChange);
    }

    mql.addListener(handleViewportChange);
    return () => mql.removeListener(handleViewportChange);
  }, []);

  const sortedProducts = useMemo(() => {
    let list = initialProducts.slice();

    const sorters = {
      relevance: (a, b) => {
        // Sort by how well the name matches the search query
        const aName = String(a.name || '').toLowerCase();
        const bName = String(b.name || '').toLowerCase();
        const q = searchQuery.toLowerCase();
        const aStartsWith = aName.startsWith(q) ? 1 : 0;
        const bStartsWith = bName.startsWith(q) ? 1 : 0;
        if (aStartsWith !== bStartsWith) return bStartsWith - aStartsWith;
        return String(a.name || '').localeCompare(String(b.name || ''));
      },
      alpha_asc: (a, b) => String(a.name || '').localeCompare(String(b.name || '')),
      alpha_desc: (a, b) => String(b.name || '').localeCompare(String(a.name || '')),
      price_asc: (a, b) => Number(a?.pricing?.unitAmount || 0) - Number(b?.pricing?.unitAmount || 0),
      price_desc: (a, b) => Number(b?.pricing?.unitAmount || 0) - Number(a?.pricing?.unitAmount || 0),
    };

    const sorter = sorters[sortKey] || sorters.relevance;
    return list.sort(sorter);
  }, [initialProducts, sortKey, searchQuery]);

  function toggleWishlistForProduct(p) {
    setWishlist((prev) => {
      const exists = prev.some((it) => it.productId === p.id);
      let next;
      if (exists) {
        next = prev.filter((it) => it.productId !== p.id);
      } else {
        const unitAmount = Number(p?.pricing?.unitAmount || 0);
        const currency = String(p?.pricing?.currency || 'usd');
        const imageUrl = Array.isArray(p.images) && p.images.length ? p.images[0].url : null;
        next = [
          ...prev,
          {
            productId: p.id,
            slug: p.slug,
            name: p.name,
            unitAmount,
            currency,
            imageUrl,
          },
        ];
      }
      writeWishlist(next);
      return next;
    });
  }

  function setHoverIndex(key, idx) {
    setHoverImageIndex((prev) => ({ ...prev, [key]: idx }));
  }

  return (
    <div>
      <div className="d-flex align-items-center justify-content-between mb-3 small">
        <div className="text-uppercase" style={{ color: '#343a40' }}>
          {sortedProducts.length} product{sortedProducts.length === 1 ? '' : 's'} found
        </div>
        <select
          className="form-select form-select-sm"
          style={{ maxWidth: 200 }}
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value)}
        >
          <option value="relevance">Relevance</option>
          <option value="alpha_asc">A–Z</option>
          <option value="alpha_desc">Z–A</option>
          <option value="price_asc">Price: Low to High</option>
          <option value="price_desc">Price: High to Low</option>
        </select>
      </div>

      <div className="row g-3">
        {sortedProducts.map((p, productIndex) => {
          const key = productIndex;
          const imgs = Array.isArray(p.images) ? p.images : [];
          const activeIdx = hoverImageIndex[key] ?? 0;
          const activeImg = imgs[activeIdx] || imgs[0] || null;
          const price = p?.pricing?.unitAmount
            ? (Number(p.pricing.unitAmount) / 100).toFixed(2)
            : null;
          const currency = p?.pricing?.currency || 'USD';
          const hasDiscount = Number(p.discountPercent || 0) > 0;
          const isHovered = hoveredProductId === p.id;
          const showHoverUi = isMobileViewport ? true : isHovered;
          const inWishlist = wishlist.some((it) => it.productId === p.id);

          const originalPrice = hasDiscount && price
            ? (Number(price) / (1 - Number(p.discountPercent) / 100)).toFixed(2)
            : null;

          return (
            <div className="col-12 col-sm-6 col-lg-3" key={p.id}>
              <div
                className="card h-100 border position-relative"
                onMouseEnter={() => {
                  if (isMobileViewport) return;
                  setHoveredProductId(p.id);
                }}
                onMouseLeave={() => {
                  if (isMobileViewport) return;
                  setHoveredProductId((prev) => (prev === p.id ? null : prev));
                  setHoverIndex(key, 0);
                }}
              >
                {p.inStock === false ? (
                  <span
                    className="badge bg-secondary position-absolute"
                    style={{ top: 8, left: 8, zIndex: 2 }}
                  >
                    SOLD OUT
                  </span>
                ) : null}

                {hasDiscount ? (
                  <span
                    className="badge bg-danger position-absolute"
                    style={{ top: 8, right: 8, zIndex: 2 }}
                  >
                    {Number(p.discountPercent)}% OFF
                  </span>
                ) : null}

                {activeImg ? (
                  <div className="position-relative">
                    <a href={`/product/${p.slug}`}>
                      <div
                        style={{
                          position: 'relative',
                          height: 220,
                          overflow: 'hidden',
                          backgroundColor: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        onMouseMove={(e) => {
                          if (isMobileViewport || !imgs.length) return;
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = e.clientX - rect.left;
                          const ratio = rect.width > 0 ? x / rect.width : 0;
                          let idx = 0;
                          if (imgs.length >= 3) {
                            if (ratio < 1 / 3) idx = 0;
                            else if (ratio < 2 / 3) idx = 1;
                            else idx = 2;
                          } else if (imgs.length === 2) {
                            idx = ratio < 0.5 ? 0 : 1;
                          }
                          setHoverIndex(key, idx);
                        }}
                        onClick={() => {
                          if (!isMobileViewport || !imgs.length) return;
                          const nextIdx = imgs.length > 0 ? (activeIdx + 1) % Math.min(imgs.length, 3) : 0;
                          setHoverIndex(key, nextIdx);
                        }}
                      >
                        {imgs.slice(0, 3).map((img, idx) => (
                          <img
                            key={idx}
                            src={img.url}
                            alt={img.alt || p.name}
                            className="card-img-top"
                            style={{
                              objectFit: 'contain',
                              height: '100%',
                              width: '100%',
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              transition: 'opacity 0.2s ease',
                              opacity: activeIdx === idx ? 1 : 0,
                            }}
                          />
                        ))}
                      </div>
                    </a>

                    {showHoverUi && imgs.length > 1 ? (
                      <div
                        className="d-flex justify-content-center gap-1 position-absolute"
                        style={{ bottom: 36, left: 0, right: 0 }}
                      >
                        {imgs.slice(0, 3).map((img, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onMouseEnter={() => setHoverIndex(key, idx)}
                            onClick={() => setHoverIndex(key, idx)}
                            className="btn btn-sm p-0"
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              backgroundColor: activeIdx === idx ? '#212529' : 'rgba(255,255,255,0.7)',
                              border: '1px solid rgba(0,0,0,0.1)',
                            }}
                            aria-label={`View image ${idx + 1}`}
                          />
                        ))}
                      </div>
                    ) : null}

                    {showHoverUi ? (
                      <div
                        className="position-absolute d-flex gap-2"
                        style={{ bottom: 8, left: 0, right: 0, justifyContent: 'center' }}
                      >
                        <AddToCartButton
                          item={{
                            productId: p.id,
                            sku: p.sku || null,
                            name: p.name,
                            unitAmount: Number(p?.pricing?.unitAmount || 0),
                            imageUrl: activeImg ? activeImg.url : null,
                          }}
                          qty={1}
                          className="btn btn-sm btn-dark"
                          style={{ fontSize: 12, padding: '4px 12px' }}
                        />
                        <button
                          type="button"
                          className={`btn btn-sm ${inWishlist ? 'btn-danger' : 'btn-outline-secondary'}`}
                          style={{ fontSize: 12, padding: '4px 12px' }}
                          onClick={() => toggleWishlistForProduct(p)}
                        >
                          {inWishlist ? '♥' : '♡'}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div
                    className="bg-light d-flex align-items-center justify-content-center"
                    style={{ height: 220 }}
                  >
                    <div className="text-muted small">No image</div>
                  </div>
                )}

                <div className="card-body">
                  <a
                    href={`/product/${p.slug}`}
                    className="text-decoration-none text-dark"
                    style={{ display: 'block' }}
                  >
                    <h6 className="card-title mb-1 fw-normal" style={{ fontSize: 14 }}>
                      {p.name}
                    </h6>
                  </a>

                  {price ? (
                    <div className="d-flex align-items-center gap-2 flex-wrap">
                      <div className="fw-semibold" style={{ fontSize: 14 }}>
                        {currency.toUpperCase()} {price}
                      </div>
                      {originalPrice ? (
                        <div
                          className="text-muted text-decoration-line-through"
                          style={{ fontSize: 12 }}
                        >
                          {currency.toUpperCase()} {originalPrice}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <div className="text-muted small">Price not set</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
