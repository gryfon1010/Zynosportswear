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

export default function CategoryProductsClient({ initialProducts, categoryName }) {
  const [filters, setFilters] = useState({
    inStockOnly: false,
    colors: new Set(),
    sizes: new Set(),
    materials: new Set(),
    bestSeller: false,
  });
  const [sortKey, setSortKey] = useState('featured');
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [quickViewColor, setQuickViewColor] = useState(null);
  const [quickViewSize, setQuickViewSize] = useState(null);
  const [quickViewQty, setQuickViewQty] = useState(1);
  const [quickViewImageIndex, setQuickViewImageIndex] = useState(0);
  const [quickViewCheckoutEmail, setQuickViewCheckoutEmail] = useState('');
  const [quickViewCheckoutLoading, setQuickViewCheckoutLoading] = useState(false);
  const [quickViewCheckoutError, setQuickViewCheckoutError] = useState(null);
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [hoverImageIndex, setHoverImageIndex] = useState({});
  const [hoveredProductId, setHoveredProductId] = useState(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [wishlist, setWishlist] = useState([]);
  const [openSections, setOpenSections] = useState({
    availability: true,
    category: true,
    color: true,
    size: true,
    material: true,
    bestSeller: true,
  });

  const facets = useMemo(() => {
    const colors = new Map();
    const sizes = new Map();
    const materials = new Map();

    for (const p of initialProducts) {
      if (Array.isArray(p.colors)) {
        for (const c of p.colors) {
          const key = String(c || '').trim();
          if (!key) continue;
          colors.set(key, (colors.get(key) || 0) + 1);
        }
      }
      if (Array.isArray(p.sizes)) {
        for (const s of p.sizes) {
          const key = String(s || '').trim();
          if (!key) continue;
          sizes.set(key, (sizes.get(key) || 0) + 1);
        }
      }
      if (typeof p.material === 'string' && p.material.trim()) {
        const key = p.material.trim();
        materials.set(key, (materials.get(key) || 0) + 1);
      }
    }

    const toSortedArray = (m) => Array.from(m.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    return {
      colors: toSortedArray(colors),
      sizes: toSortedArray(sizes),
      materials: toSortedArray(materials),
    };
  }, [initialProducts]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.initialCategoryProducts = initialProducts;
    }
  }, [initialProducts]);

  const filteredAndSorted = useMemo(() => {
    let list = initialProducts.slice();

    if (filters.inStockOnly) {
      list = list.filter((p) => p.inStock !== false);
    }
    if (filters.bestSeller) {
      list = list.filter((p) => p.isBestSeller === true);
    }
    if (filters.colors.size) {
      list = list.filter((p) => {
        const cols = Array.isArray(p.colors) ? p.colors.map((c) => String(c || '').trim()) : [];
        return cols.some((c) => filters.colors.has(c));
      });
    }
    if (filters.sizes.size) {
      list = list.filter((p) => {
        const sz = Array.isArray(p.sizes) ? p.sizes.map((s) => String(s || '').trim()) : [];
        return sz.some((s) => filters.sizes.has(s));
      });
    }
    if (filters.materials.size) {
      list = list.filter((p) => {
        const m = typeof p.material === 'string' ? p.material.trim() : '';
        return m && filters.materials.has(m);
      });
    }

    const sorters = {
      featured: (a, b) => {
        const ba = a.isBestSeller === true ? 1 : 0;
        const bb = b.isBestSeller === true ? 1 : 0;
        if (ba !== bb) return bb - ba;
        const sa = Number(a.sortOrder || 0);
        const sb = Number(b.sortOrder || 0);
        if (sa !== sb) return sa - sb;
        return String(a.name || '').localeCompare(String(b.name || ''));
      },
      alpha_asc: (a, b) => String(a.name || '').localeCompare(String(b.name || '')),
      alpha_desc: (a, b) => String(b.name || '').localeCompare(String(a.name || '')),
      price_asc: (a, b) => Number(a?.pricing?.unitAmount || 0) - Number(b?.pricing?.unitAmount || 0),
      price_desc: (a, b) => Number(b?.pricing?.unitAmount || 0) - Number(a?.pricing?.unitAmount || 0),
      newest: (a, b) => {
        const da = a.createdAt?._seconds || a.createdAt?.seconds || 0;
        const db = b.createdAt?._seconds || b.createdAt?.seconds || 0;
        return db - da;
      },
      oldest: (a, b) => {
        const da = a.createdAt?._seconds || a.createdAt?.seconds || 0;
        const db = b.createdAt?._seconds || b.createdAt?.seconds || 0;
        return da - db;
      },
    };

    const sorter = sorters[sortKey] || sorters.featured;
    return list.sort(sorter);
  }, [initialProducts, filters, sortKey]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Detect touch / coarse pointer devices
    const hasTouch =
      'ontouchstart' in window ||
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    setIsTouchDevice(hasTouch);

    // Detect mobile viewport by width so Quick View is always visible on small screens
    const mql = window.matchMedia('(max-width: 991.98px)');

    function handleViewportChange(e) {
      setIsMobileViewport(e.matches);
    }

    handleViewportChange(mql);
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handleViewportChange);
      return () => mql.removeEventListener('change', handleViewportChange);
    }

    // Fallback for older browsers
    mql.addListener(handleViewportChange);
    return () => mql.removeListener(handleViewportChange);
  }, []);

  useEffect(() => {
    // Load wishlist from localStorage on mount
    setWishlist(readWishlist());
  }, []);

  function toggleFilter(kind, value) {
    setFilters((prev) => {
      if (kind === 'inStockOnly') return { ...prev, inStockOnly: !prev.inStockOnly };
      if (kind === 'bestSeller') return { ...prev, bestSeller: !prev.bestSeller };
      const key = String(value || '').trim();
      if (!key) return prev;
      const next = new Set(prev[kind]);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return { ...prev, [kind]: next };
    });
  }

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

  function toggleSection(name) {
    setOpenSections((prev) => ({ ...prev, [name]: !prev[name] }));
  }

  function renderColorDot(name) {
    const key = String(name || '').trim().toLowerCase();
    let color = '#868e96';
    if (key === 'black') color = '#000000';
    else if (key === 'white') color = '#ffffff';
    else if (key === 'red') color = '#e03131';
    else if (key === 'blue') color = '#1971c2';
    else if (key === 'green') color = '#2f9e44';
    else if (key === 'yellow' || key === 'gold' || key === 'golden') color = '#f08c00';
    else if (key === 'orange') color = '#f76707';
    else if (key === 'purple') color = '#7048e8';

    const border = key === 'white' ? '1px solid #adb5bd' : 'none';

    return (
      <span
        key={name}
        title={name}
        style={{
          display: 'inline-block',
          width: 14,
          height: 14,
          borderRadius: '50%',
          backgroundColor: color,
          border,
          marginRight: 4,
        }}
      />
    );
  }

  function openQuickView(p) {
    setQuickViewProduct(p);
    const firstColor = Array.isArray(p.colors) && p.colors.length ? String(p.colors[0]) : null;
    const firstSize = Array.isArray(p.sizes) && p.sizes.length ? String(p.sizes[0]) : null;
    setQuickViewColor(firstColor);
    setQuickViewSize(firstSize);
    setQuickViewQty(1);
    setQuickViewImageIndex(0);
    setQuickViewCheckoutEmail('');
    setQuickViewCheckoutError(null);
  }

  function closeQuickView() {
    setQuickViewProduct(null);
    setQuickViewColor(null);
    setQuickViewSize(null);
    setQuickViewQty(1);
    setQuickViewCheckoutEmail('');
    setQuickViewCheckoutError(null);
  }

  async function startQuickViewCheckout() {
    if (!quickViewProduct) return;

    const unitAmount = Number(quickViewProduct?.pricing?.unitAmount || 0);
    const currency = typeof quickViewProduct?.pricing?.currency === 'string'
      ? quickViewProduct.pricing.currency
      : 'usd';

    if (!Number.isFinite(unitAmount) || unitAmount <= 0) {
      setQuickViewCheckoutError('This product does not have a valid price yet.');
      return;
    }

    setQuickViewCheckoutLoading(true);
    setQuickViewCheckoutError(null);

    try {
      const baseName =
        quickViewProduct.name +
        (quickViewColor ? ` - ${quickViewColor}` : '') +
        (quickViewSize ? ` / ${quickViewSize}` : '');

      const nextCart = [
        {
          productId: quickViewProduct.id,
          sku: quickViewProduct.sku || null,
          name: baseName,
          qty: quickViewQty,
          unitAmount,
          imageUrl:
            Array.isArray(quickViewProduct.images) && quickViewProduct.images.length
              ? quickViewProduct.images[0].url
              : null,
          currency,
        },
      ];

      writeCartSafe(nextCart);
      window.location.href = '/checkout';
    } catch (err) {
      setQuickViewCheckoutError(err instanceof Error ? err.message : 'Checkout failed.');
      setQuickViewCheckoutLoading(false);
    }
  }

  function openCartDrawerWithLatestCart() {
    const items = readCartSafe();
    setCartItems(items);
    setCartDrawerOpen(true);
  }

  function closeCartDrawer() {
    setCartDrawerOpen(false);
  }

  function handleQuickViewAdded() {
    // Close the quick view first so its overlay does not sit above the cart drawer
    closeQuickView();
    // After state has updated and the overlay is gone, open the cart drawer
    setTimeout(() => {
      openCartDrawerWithLatestCart();
    }, 250);
  }

  function updateCartItemQty(index, delta) {
    setCartItems((prev) => {
      const cur = Array.isArray(prev) ? [...prev] : [];
      if (index < 0 || index >= cur.length) return cur;
      const item = cur[index];
      const nextQty = Number(item.qty || 0) + delta;
      if (nextQty <= 0) {
        const filtered = cur.filter((_, i) => i !== index);
        writeCartSafe(filtered);
        return filtered;
      }
      const updated = cur.map((it, i) => (i === index ? { ...it, qty: nextQty } : it));
      writeCartSafe(updated);
      return updated;
    });
  }

  return (
    <div className="row gx-2 gx-lg-4">
      <div className="col-12 col-lg-2 mb-3 mb-lg-0 ps-lg-0 ms-lg-3">
        <div className="border rounded p-3">
          <div className="fw-semibold mb-2">Filters</div>

          <div className="mb-3 pb-2" style={{ borderBottom: '1px solid #e9ecef' }}>
            <button
              type="button"
              className="btn btn-link p-0 w-100 d-flex justify-content-between align-items-center text-decoration-none text-dark"
              onClick={() => toggleSection('availability')}
            >
              <span className="small fw-semibold text-uppercase">Availability</span>
              <span className="small">{openSections.availability ? '−' : '+'}</span>
            </button>
            {openSections.availability ? (
              <div className="mt-1">
                <div className="form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="filter-instock"
                    checked={filters.inStockOnly}
                    onChange={() => toggleFilter('inStockOnly')}
                  />
                  <label className="form-check-label small" htmlFor="filter-instock">
                    In stock
                  </label>
                </div>
              </div>
            ) : null}
          </div>

          <div className="mb-3 pb-2" style={{ borderBottom: '1px solid #e9ecef' }}>
            <button
              type="button"
              className="btn btn-link p-0 w-100 d-flex justify-content-between align-items-center text-decoration-none text-dark"
              onClick={() => toggleSection('category')}
            >
              <span className="small fw-semibold text-uppercase">Category</span>
              <span className="small">{openSections.category ? '−' : '+'}</span>
            </button>
            {openSections.category ? (
              <div className="small mt-1">
                {categoryName}{' '}
                <span className="text-dark fw-bold">({filteredAndSorted.length})</span>
              </div>
            ) : null}
          </div>

          {facets.colors.length ? (
            <div className="mb-3 pb-2" style={{ borderBottom: '1px solid #e9ecef' }}>
              <button
                type="button"
                className="btn btn-link p-0 w-100 d-flex justify-content-between align-items-center text-decoration-none text-dark"
                onClick={() => toggleSection('color')}
              >
                <span className="small fw-semibold text-uppercase">Color</span>
                <span className="small">{openSections.color ? '−' : '+'}</span>
              </button>
              {openSections.color ? (
                <div className="d-flex flex-wrap mt-1" style={{ gap: 6 }}>
                  {facets.colors.map(([name]) => {
                    const key = String(name || '').trim();
                    const active = filters.colors.has(key);
                    const lower = key.toLowerCase();
                    let bg = '#f1f3f5';
                    if (lower === 'black') bg = '#000000';
                    else if (lower === 'white') bg = '#ffffff';
                    else if (lower === 'red') bg = '#e03131';
                    else if (lower === 'blue') bg = '#1971c2';
                    else if (lower === 'green') bg = '#2f9e44';
                    else if (lower === 'yellow' || lower === 'gold' || lower === 'golden') bg = '#f08c00';
                    else if (lower === 'orange') bg = '#f76707';
                    else if (lower === 'purple') bg = '#7048e8';

                    const border = lower === 'white' ? '1px solid #adb5bd' : '1px solid #dee2e6';

                    return (
                      <button
                        key={key}
                        type="button"
                        title={key}
                        onClick={() => toggleFilter('colors', key)}
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: 2,
                          padding: 0,
                          backgroundColor: bg,
                          border,
                          outline: active ? '2px solid #212529' : 'none',
                        }}
                      />
                    );
                  })}
                </div>
              ) : null}
            </div>
          ) : null}

          {facets.sizes.length ? (
            <div className="mb-3 pb-2" style={{ borderBottom: '1px solid #e9ecef' }}>
              <button
                type="button"
                className="btn btn-link p-0 w-100 d-flex justify-content-between align-items-center text-decoration-none text-dark"
                onClick={() => toggleSection('size')}
              >
                <span className="small fw-semibold text-uppercase">Size</span>
                <span className="small">{openSections.size ? '−' : '+'}</span>
              </button>
              {openSections.size ? (
                <div className="d-flex flex-column gap-1 small mt-1">
                  {facets.sizes.map(([name, count]) => (
                    <label key={name} className="d-flex align-items-center justify-content-between">
                      <span>
                        <input
                          type="checkbox"
                          className="form-check-input me-2"
                          checked={filters.sizes.has(name)}
                          onChange={() => toggleFilter('sizes', name)}
                        />
                        {name}
                      </span>
                      <span className="text-muted">({count})</span>
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          {facets.materials.length ? (
            <div className="mb-3 pb-2" style={{ borderBottom: '1px solid #e9ecef' }}>
              <button
                type="button"
                className="btn btn-link p-0 w-100 d-flex justify-content-between align-items-center text-decoration-none text-dark"
                onClick={() => toggleSection('material')}
              >
                <span className="small fw-semibold text-uppercase">Material</span>
                <span className="small">{openSections.material ? '−' : '+'}</span>
              </button>
              {openSections.material ? (
                <div className="d-flex flex-wrap gap-1 mt-1">
                  {facets.materials.map(([name]) => (
                    <button
                      key={name}
                      type="button"
                      className={`btn btn-sm ${filters.materials.has(name) ? 'btn-dark' : 'btn-outline-secondary'}`}
                      onClick={() => toggleFilter('materials', name)}
                    >
                      <span className="small">{name}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mb-2">
            <button
              type="button"
              className="btn btn-link p-0 w-100 d-flex justify-content-between align-items-center text-decoration-none text-dark"
              onClick={() => toggleSection('bestSeller')}
            >
              <span className="small fw-semibold text-uppercase mb-1">Best seller</span>
              <span className="small">{openSections.bestSeller ? '−' : '+'}</span>
            </button>
            {openSections.bestSeller ? (
              <div className="form-check mt-1">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="filter-best"
                  checked={filters.bestSeller}
                  onChange={() => toggleFilter('bestSeller')}
                />
                <label className="form-check-label small" htmlFor="filter-best">
                  Yes
                </label>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="col-12 col-lg-9 ms-lg-3">
        <div className="d-flex align-items-center justify-content-end mb-3 small">
          <div className="d-flex align-items-center gap-3">
            <select
              className="form-select form-select-sm"
              style={{ minWidth: 180 }}
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value)}
            >
              <option value="featured">Featured</option>
              <option value="alpha_asc">Alphabetically, A–Z</option>
              <option value="alpha_desc">Alphabetically, Z–A</option>
              <option value="price_asc">Price, low to high</option>
              <option value="price_desc">Price, high to low</option>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
            <div className="text-uppercase" style={{ color: '#343a40', whiteSpace: 'nowrap' }}>
              {filteredAndSorted.length} product{filteredAndSorted.length === 1 ? '' : 's'}
            </div>
          </div>
        </div>

        {filteredAndSorted.length === 0 ? (
          <div className="text-muted small">No products match these filters.</div>
        ) : (
          <div className="row g-3" style={{ marginTop: 8 }}>
            {filteredAndSorted.map((p, productIndex) => {
              const key = productIndex;
              const imgs = Array.isArray(p.images) ? p.images : [];
              const activeIdx = hoverImageIndex[key] ?? 0;
              const activeImg = imgs[activeIdx] || imgs[0] || null;
              const price = p?.pricing?.unitAmount
                ? (Number(p.pricing.unitAmount) / 100).toFixed(2)
                : null;
              const hasDiscount = Number(p.discountPercent || 0) > 0;
              const isHovered = hoveredProductId === p.id;
              // On mobile viewport, always show Quick View; on desktop, only on hover.
              const showHoverUi = isMobileViewport ? true : isHovered;
              const inWishlist = wishlist.some((it) => it.productId === p.id);

              return (
                <div className="col-12 col-sm-6 col-lg-4" key={p.id}>
                  <div
                    className="card h-100 border-0 shadow-sm position-relative"
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
                            style={{ position: 'relative', height: 220, overflow: 'hidden' }}
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
                                  objectFit: 'cover',
                                  height: 220,
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
                                  backgroundColor:
                                    activeIdx === idx ? '#212529' : 'rgba(255,255,255,0.7)',
                                  border: '1px solid #212529',
                                }}
                              />
                            ))}
                          </div>
                        ) : null}

                        {showHoverUi ? (
                          <button
                            type="button"
                            className="btn btn-dark btn-sm position-absolute w-100"
                            style={{ bottom: 0, left: 0, borderRadius: 0, opacity: 0.9 }}
                            onClick={() => openQuickView(p)}
                          >
                            QUICK VIEW
                          </button>
                        ) : null}
                      </div>
                    ) : null}

                    <div className="card-body">
                      <a
                        href={`/product/${p.slug}`}
                        className="text-decoration-none text-dark"
                      >
                        <div className="fw-semibold small mb-1">{p.name}</div>
                      </a>

                      {price ? (
                        <div className="mb-1 small">
                          {hasDiscount ? (
                            <>
                              <span className="text-muted text-decoration-line-through me-1">
                                {String(p?.pricing?.currency || 'usd').toUpperCase()} {price}
                              </span>
                              <span className="fw-semibold">
                                {String(p?.pricing?.currency || 'usd').toUpperCase()}{' '}
                                {(Number(p.pricing.unitAmount) * (100 - Number(p.discountPercent || 0)) / 10000).toFixed(2)}
                              </span>
                            </>
                          ) : (
                            <span className="fw-semibold">
                              {String(p?.pricing?.currency || 'usd').toUpperCase()} {price}
                            </span>
                          )}
                        </div>
                      ) : null}

                      {isHovered && Array.isArray(p.colors) && p.colors.length ? (
                        <div className="mb-1">
                          {p.colors.slice(0, 6).map((c) => renderColorDot(c))}
                        </div>
                      ) : null}

                      <div className="d-flex justify-content-end mt-2">
                        <button
                          type="button"
                          className="btn btn-sm btn-outline-secondary"
                          onClick={() => toggleWishlistForProduct(p)}
                        >
                          {inWishlist ? '♥ In wishlist' : '♡ Add to wishlist'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {quickViewProduct ? (
          <div
            className="position-fixed top-0 start-0 w-100 h-100"
            style={{ backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 4000 }}
            onClick={closeQuickView}
          >
            <div
              className="ms-auto bg-white shadow d-flex flex-column"
              style={{ maxWidth: 520, height: '100vh' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="d-flex align-items-center justify-content-between border-bottom px-3 py-2 flex-shrink-0">
                <div className="fw-semibold small text-uppercase text-muted">Select options</div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={closeQuickView}
                >
                  ✕
                </button>
              </div>
              <div className="px-3 py-3 flex-grow-1" style={{ overflowY: 'auto', minHeight: 0 }}>
                <div className="mb-2 small text-uppercase text-muted">{categoryName}</div>
                <h2 className="h6 fw-bold mb-2" style={{ lineHeight: 1.4 }}>
                  {quickViewProduct.name}
                </h2>

                <div
                  className="mb-3"
                  onMouseMove={(e) => {
                    if (!Array.isArray(quickViewProduct.images) || !quickViewProduct.images.length) return;
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const ratio = rect.width > 0 ? x / rect.width : 0;
                    const imgs = quickViewProduct.images.slice(0, 3);
                    let idx = 0;
                    if (imgs.length >= 3) {
                      if (ratio < 1 / 3) idx = 0;
                      else if (ratio < 2 / 3) idx = 1;
                      else idx = 2;
                    } else if (imgs.length === 2) {
                      idx = ratio < 0.5 ? 0 : 1;
                    }
                    setQuickViewImageIndex(idx);
                  }}
                >
                  {Array.isArray(quickViewProduct.images) && quickViewProduct.images.length ? (
                    <>
                      <div
                        className="border rounded bg-light position-relative"
                        style={{ height: 260, overflow: 'hidden' }}
                      >
                        {quickViewProduct.images.slice(0, 3).map((img, idx) => (
                          <img
                            key={idx}
                            src={img.url}
                            alt={img.alt || quickViewProduct.name}
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain',
                              transition: 'opacity 0.2s ease',
                              opacity: quickViewImageIndex === idx ? 1 : 0,
                            }}
                          />
                        ))}
                      </div>
                      {quickViewProduct.images.length > 1 ? (
                        <div className="d-flex justify-content-center gap-1 mt-2">
                          {quickViewProduct.images.slice(0, 3).map((img, idx) => (
                            <button
                              key={idx}
                              type="button"
                              className="btn btn-sm p-0"
                              onClick={() => setQuickViewImageIndex(idx)}
                            >
                              <span
                                style={{
                                  display: 'inline-block',
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  backgroundColor:
                                    quickViewImageIndex === idx ? '#212529' : 'rgba(0,0,0,0.15)',
                                  border: '1px solid #212529',
                                }}
                              />
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </>
                  ) : null}
                </div>

                <div className="mb-3 fw-semibold">
                  {String(quickViewProduct?.pricing?.currency || 'usd').toUpperCase()}{' '}
                  {quickViewProduct?.pricing?.unitAmount
                    ? (Number(quickViewProduct.pricing.unitAmount) / 100).toFixed(2)
                    : null}
                </div>

                {Array.isArray(quickViewProduct.colors) && quickViewProduct.colors.length ? (
                  <div className="mb-3">
                    <div className="small text-uppercase fw-semibold mb-1">Color</div>
                    <div className="d-flex flex-wrap" style={{ gap: 8 }}>
                      {quickViewProduct.colors.map((c) => {
                        const key = String(c || '').trim();
                        const active = quickViewColor === key;
                        const lower = key.toLowerCase();
                        let bg = '#f1f3f5';
                        if (lower === 'black') bg = '#000000';
                        else if (lower === 'white') bg = '#ffffff';
                        else if (lower === 'red') bg = '#e03131';
                        else if (lower === 'blue') bg = '#1971c2';
                        else if (lower === 'green') bg = '#2f9e44';
                        else if (lower === 'yellow' || lower === 'gold' || lower === 'golden') bg = '#f08c00';
                        else if (lower === 'orange') bg = '#f76707';
                        else if (lower === 'purple') bg = '#7048e8';

                        const border = lower === 'white' ? '1px solid #adb5bd' : '1px solid #dee2e6';

                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => setQuickViewColor(key)}
                            title={key}
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: '50%',
                              backgroundColor: bg,
                              border,
                              outline: active ? '2px solid #212529' : 'none',
                              padding: 0,
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {Array.isArray(quickViewProduct.sizes) && quickViewProduct.sizes.length ? (
                  <div className="mb-3">
                    <div className="small text-uppercase fw-semibold mb-1">Sizes</div>
                    <div className="d-flex flex-wrap" style={{ gap: 8 }}>
                      {quickViewProduct.sizes.map((s) => {
                        const key = String(s || '').trim();
                        const active = quickViewSize === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            className={`btn btn-sm ${active ? 'btn-dark' : 'btn-outline-secondary'}`}
                            onClick={() => setQuickViewSize(key)}
                          >
                            {key}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                <div className="mb-3">
                  <div className="small text-uppercase fw-semibold mb-1">Quantity</div>
                  <div className="d-inline-flex align-items-center border rounded">
                    <button
                      type="button"
                      className="btn btn-sm btn-light border-0"
                      onClick={() => setQuickViewQty((q) => Math.max(1, Number(q) - 1))}
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={quickViewQty}
                      onChange={(e) => {
                        const v = Number(e.target.value);
                        if (!Number.isFinite(v) || v <= 0) return;
                        setQuickViewQty(v);
                      }}
                      className="form-control form-control-sm text-center border-0"
                      style={{ width: 56 }}
                    />
                    <button
                      type="button"
                      className="btn btn-sm btn-light border-0"
                      onClick={() => setQuickViewQty((q) => Number(q) + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>

                {quickViewProduct.inStock === false ? (
                  <div className="text-danger fw-semibold mt-2">Sold out</div>
                ) : (
                  <div className="d-grid gap-2">
                    <AddToCartButton
                      item={{
                        productId: quickViewProduct.id,
                        sku: quickViewProduct.sku || null,
                        // Keep the base name here; show color/size separately in the cart drawer
                        name: quickViewProduct.name,
                        color: quickViewColor || null,
                        size: quickViewSize || null,
                        unitAmount: Number(quickViewProduct?.pricing?.unitAmount || 0),
                        imageUrl:
                          Array.isArray(quickViewProduct.images) && quickViewProduct.images.length
                            ? quickViewProduct.images[0].url
                            : null,
                      }}
                      qty={quickViewQty}
                      className="btn btn-sm w-100 text-uppercase fw-semibold"
                      style={{ backgroundColor: '#d10024', borderColor: '#d10024', color: '#ffffff' }}
                      onAdded={handleQuickViewAdded}
                    />
                    <a
                      href={`/product/${quickViewProduct.slug}`}
                      className="btn btn-outline-secondary btn-sm w-100 text-uppercase fw-semibold"
                    >
                      View full details
                    </a>
                    <div className="mt-2 p-2 border rounded bg-light">
                      <div className="small fw-semibold mb-1 text-uppercase">Buy now</div>
                      <div className="mb-2 small text-muted">
                        Enter your email to pay securely with Stripe for this item only.
                      </div>
                      <div className="mb-2">
                        <input
                          type="email"
                          className="form-control form-control-sm"
                          placeholder="Email for receipt"
                          value={quickViewCheckoutEmail}
                          onChange={(e) => setQuickViewCheckoutEmail(e.target.value)}
                        />
                      </div>
                      {quickViewCheckoutError ? (
                        <div className="text-danger small mb-2">{quickViewCheckoutError}</div>
                      ) : null}
                      <button
                        type="button"
                        className="btn btn-sm w-100 text-uppercase fw-semibold"
                        style={{ backgroundColor: '#28a745', borderColor: '#28a745', color: '#ffffff' }}
                        onClick={startQuickViewCheckout}
                        disabled={quickViewCheckoutLoading}
                      >
                        {quickViewCheckoutLoading ? 'Redirecting…' : 'Buy now'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : null}

        {cartDrawerOpen ? (
          <div
            className="position-fixed top-0 start-0 w-100 h-100 d-flex justify-content-end"
            style={{ backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 3500 }}
            onClick={closeCartDrawer}
          >
            <div
              className="bg-white shadow d-flex flex-column"
              style={{
                width: '100%',
                maxWidth: 520,
                height: '100vh',
                transform: 'translateX(0)',
                transition: 'transform 0.25s ease-out',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="d-flex align-items-center justify-content-between border-bottom px-3 py-2 flex-shrink-0">
                <div className="fw-semibold small text-uppercase">Cart</div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={closeCartDrawer}
                >
                  ✕
                </button>
              </div>

              <div className="px-3 py-3 flex-grow-1" style={{ overflowY: 'auto', minHeight: 0 }}>
                {(!cartItems || cartItems.length === 0) ? (
                  <div className="text-muted small">Your cart is empty.</div>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {cartItems.map((it, idx) => (
                      <div key={idx} className="d-flex gap-2 align-items-start">
                        {it.imageUrl ? (
                          <img
                            src={it.imageUrl}
                            alt={it.name}
                            style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 4 }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 56,
                              height: 56,
                              borderRadius: 4,
                              backgroundColor: '#f1f3f5',
                            }}
                          />
                        )}
                        <div className="flex-grow-1">
                          <div className="small fw-semibold mb-1">{it.name}</div>
                          {(it.color || it.size) ? (
                            <div className="small text-muted mb-1">
                              {it.color ? <>Color: {it.color}</> : null}
                              {it.color && it.size ? ', ' : null}
                              {it.size ? <>Size: {it.size}</> : null}
                            </div>
                          ) : null}
                          <div className="d-flex align-items-center justify-content-between small">
                            <div className="d-inline-flex align-items-center border rounded">
                              <button
                                type="button"
                                className="btn btn-sm btn-light border-0"
                                onClick={() => updateCartItemQty(idx, -1)}
                              >
                                −
                              </button>
                              <span className="px-2">{it.qty}</span>
                              <button
                                type="button"
                                className="btn btn-sm btn-light border-0"
                                onClick={() => updateCartItemQty(idx, 1)}
                              >
                                +
                              </button>
                            </div>
                            <div className="fw-semibold">
                              {String(it.currency || 'usd').toUpperCase()}{' '}
                              {((Number(it.unitAmount || 0) * Number(it.qty || 0)) / 100).toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-top px-3 py-3 flex-shrink-0">
                <button
                  type="button"
                  className="btn btn-sm w-100 text-uppercase fw-semibold mb-2"
                  style={{ backgroundColor: '#d10024', borderColor: '#d10024', color: '#ffffff' }}
                  onClick={() => {
                    window.location.href = '/checkout';
                  }}
                  disabled={!cartItems || cartItems.length === 0}
                >
                  Checkout
                </button>
                <a
                  href="/cart"
                  className="btn btn-outline-secondary btn-sm w-100 text-uppercase fw-semibold"
                >
                  View cart
                </a>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
