"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AddToCartButton from "./AddToCartButton";
import { readWishlist, writeWishlist } from "../../lib/wishlist";

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
    // ignore storage errors
  }
}

export default function ProductDetailClient({ product }) {
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [qty, setQty] = useState(1);
  const [inWishlist, setInWishlist] = useState(false);
  const [showDescription, setShowDescription] = useState(true);
  const [zoomImageIndex, setZoomImageIndex] = useState(null);
  const allImages = Array.isArray(product?.images) ? product.images : [];
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const sliderRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const mql = window.matchMedia("(max-width: 991.98px)");

    function handleViewportChange(e) {
      setIsMobileViewport(e.matches);
    }

    handleViewportChange(mql);
    if (typeof mql.addEventListener === "function") {
      mql.addEventListener("change", handleViewportChange);
      return () => mql.removeEventListener("change", handleViewportChange);
    }

    mql.addListener(handleViewportChange);
    return () => mql.removeListener(handleViewportChange);
  }, []);

  useEffect(() => {
    const items = readWishlist();
    setInWishlist(items.some((it) => it.productId === product.id));
  }, [product.id]);

  useEffect(() => {
    if (Array.isArray(product?.sizes) && product.sizes.length && !selectedSize) {
      const first = String(product.sizes[0] || "").trim();
      if (first) setSelectedSize(first);
    }
    if (Array.isArray(product?.colors) && product.colors.length && !selectedColor) {
      const first = String(product.colors[0] || "").trim();
      if (first) setSelectedColor(first);
    }
  }, [product, selectedSize, selectedColor]);

  // Normalize color strings for matching
  function normalizeColor(value) {
    return String(value || '').trim().toLowerCase();
  }

  // Pick images that match the selected color (if any), otherwise fall back to all images.
  const images = useMemo(() => {
    if (!allImages.length) return [];
    if (selectedColor) {
      const norm = normalizeColor(selectedColor);
      const byColor = allImages.filter((img) => normalizeColor(img.color) === norm);
      if (byColor.length) return byColor.slice(0, 5);
    }
    return allImages.slice(0, 5);
  }, [allImages, selectedColor]);

  // Keep current index in range when images change
  useEffect(() => {
    if (!images.length) {
      setCurrentImageIndex(0);
      setZoomImageIndex(null);
      return;
    }
    setCurrentImageIndex((prev) => {
      if (prev < 0) return 0;
      if (prev >= images.length) return images.length - 1;
      return prev;
    });
  }, [images.length]);

  // Scroll the mobile slider to the active image when index or viewport changes
  useEffect(() => {
    if (!isMobileViewport) return;
    const container = sliderRef.current;
    if (!container || !container.children || !container.children.length) return;
    const child = container.children[currentImageIndex];
    if (!child || typeof child.scrollIntoView !== 'function') return;
    try {
      child.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    } catch {
      // ignore scroll errors
    }
  }, [currentImageIndex, isMobileViewport]);

  // Close zoomed image on Escape key (both mobile and desktop)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    function handleKeyDown(e) {
      if (e.key === 'Escape' || e.key === 'Esc') {
        setZoomImageIndex(null);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const priceInfo = useMemo(() => {
    const unitAmount = Number(product?.pricing?.unitAmount || 0);
    const currency = String(product?.pricing?.currency || "usd").toUpperCase();
    const discountPercent = Number(product?.discountPercent || 0);
    if (!unitAmount) return null;

    const base = (unitAmount / 100).toFixed(2);
    if (!discountPercent) {
      return { currency, price: base, originalPrice: null, discountPercent: 0 };
    }

    const original = (unitAmount / (1 - discountPercent / 100) / 100).toFixed(2);
    return {
      currency,
      price: base,
      originalPrice: original,
      discountPercent,
    };
  }, [product]);

  const decrementQty = () => {
    setQty((prev) => (prev > 1 ? prev - 1 : 1));
  };

  const incrementQty = () => {
    setQty((prev) => (prev < 999 ? prev + 1 : 999));
  };

  const image = images[0] || null;

  const toggleWishlist = () => {
    const current = readWishlist();
    const exists = current.some((it) => it.productId === product.id);
    let next;
    if (exists) {
      next = current.filter((it) => it.productId !== product.id);
      setInWishlist(false);
    } else {
      const unitAmount = Number(product?.pricing?.unitAmount || 0);
      const currency = String(product?.pricing?.currency || "usd");
      const imageUrl = image ? image.url : null;
      next = [
        ...current,
        {
          productId: product.id,
          slug: product.slug,
          name: product.name,
          unitAmount,
          currency,
          imageUrl,
        },
      ];
      setInWishlist(true);
    }
    writeWishlist(next);
  };

  const handleBuyNow = () => {
    const unitAmount = Number(product?.pricing?.unitAmount || 0);
    if (!Number.isFinite(unitAmount) || unitAmount <= 0) {
      // If price is not valid, still go to checkout but it will show $0
      window.location.href = '/checkout';
      return;
    }

    const currentCart = readCartSafe();
    const quantity = Number.isFinite(Number(qty)) && Number(qty) > 0 ? Number(qty) : 1;
    const imageUrl = image ? image.url : null;

    const baseName =
      (product?.name || 'Item') +
      (selectedColor ? ` - ${selectedColor}` : '') +
      (selectedSize ? ` / ${selectedSize}` : '');

    const newItem = {
      productId: product.id,
      sku: product?.sku || null,
      name: baseName,
      qty: quantity,
      unitAmount,
      imageUrl,
      color: selectedColor || null,
      size: selectedSize || null,
    };

    const nextCart = [...currentCart, newItem];
    writeCartSafe(nextCart);

    window.location.href = '/checkout';
  };

  return (
    <div className="container py-4">
      <div className="mb-3 small">
        <a href="/" className="text-decoration-none" style={{ color: "#6c757d" }}>
          Home
        </a>
        <span className="mx-1">/</span>
        <span style={{ color: "#6c757d" }}>{product?.name}</span>
      </div>

      <div className="row g-4">
        <div className="col-12 col-lg-6">
          {image ? (
            isMobileViewport ? (
              // Mobile: horizontal swipeable slider (one image per view)
              <div>
                <div
                  ref={sliderRef}
                  style={{
                    display: 'flex',
                    overflowX: 'auto',
                    scrollSnapType: 'x mandatory',
                    WebkitOverflowScrolling: 'touch',
                    gap: 8,
                    paddingBottom: 6,
                  }}
                >
                  {images.map((img, idx) => (
                    <div
                      key={idx}
                      className="border rounded bg-light position-relative"
                      style={{
                        flex: '0 0 100%',
                        scrollSnapAlign: 'center',
                        minHeight: 320,
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setZoomImageIndex(idx)}
                        style={{
                          border: 'none',
                          padding: 0,
                          margin: 0,
                          backgroundColor: 'transparent',
                          width: '100%',
                          height: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <img
                          src={img.url}
                          alt={img.alt || product.name}
                          style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={() => setZoomImageIndex(idx)}
                        style={{
                          position: 'absolute',
                          right: 8,
                          top: 8,
                          width: 32,
                          height: 32,
                          borderRadius: '50%',
                          border: 'none',
                          backgroundColor: 'rgba(255,255,255,0.95)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                          cursor: 'pointer',
                        }}
                        aria-label="View image fullscreen"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#000"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <polyline points="15 3 21 3 21 9" />
                          <line x1="21" y1="3" x2="14" y2="10" />
                          <polyline points="9 21 3 21 3 15" />
                          <line x1="3" y1="21" x2="10" y2="14" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>

                {images.length > 1 ? (
                  <div
                    style={{
                      marginTop: 8,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : prev))}
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        border: 'none',
                        backgroundColor: 'rgba(0,0,0,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: currentImageIndex === 0 ? 0.4 : 1,
                        pointerEvents: currentImageIndex === 0 ? 'none' : 'auto',
                      }}
                      aria-label="Previous image"
                    >
                      <span style={{ fontSize: 18, lineHeight: 1 }}>‹</span>
                    </button>

                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '4px 10px',
                        borderRadius: 999,
                        backgroundColor: 'rgba(0,0,0,0.06)',
                      }}
                    >
                      {currentImageIndex + 1} / {images.length}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setCurrentImageIndex((prev) => (prev < images.length - 1 ? prev + 1 : prev))
                      }
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        border: 'none',
                        backgroundColor: 'rgba(0,0,0,0.06)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        opacity: currentImageIndex === images.length - 1 ? 0.4 : 1,
                        pointerEvents: currentImageIndex === images.length - 1 ? 'none' : 'auto',
                      }}
                      aria-label="Next image"
                    >
                      <span style={{ fontSize: 18, lineHeight: 1 }}>›</span>
                    </button>
                  </div>
                ) : null}
              </div>
            ) : (
              // Desktop / large view: existing 2x2 grid
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
                  gridAutoRows: 'minmax(0, 1fr)',
                  gap: 12,
                }}
              >
                {images.slice(0, 4).map((img, idx) => (
                  <div
                    key={idx}
                    className="border rounded bg-light position-relative"
                    style={{
                      minHeight: 180,
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setZoomImageIndex(idx)}
                      style={{
                        border: 'none',
                        padding: 0,
                        margin: 0,
                        backgroundColor: 'transparent',
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <img
                        src={img.url}
                        alt={img.alt || product.name}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </button>

                    {/* Individual zoom icon per image */}
                    <button
                      type="button"
                      onClick={() => setZoomImageIndex(idx)}
                      style={{
                        position: 'absolute',
                        right: 8,
                        top: 8,
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        border: 'none',
                        backgroundColor: 'rgba(255,255,255,0.95)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                        cursor: 'pointer',
                      }}
                      aria-label="View image fullscreen"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#000"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="15 3 21 3 21 9" />
                        <line x1="21" y1="3" x2="14" y2="10" />
                        <polyline points="9 21 3 21 3 15" />
                        <line x1="3" y1="21" x2="10" y2="14" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="border rounded bg-light d-flex align-items-center justify-content-center" style={{ minHeight: 420 }}>
              <div className="text-muted">No image</div>
            </div>
          )}
        </div>

        <div className="col-12 col-lg-6">
          <h1 className="h4 mb-2">{product?.name}</h1>

          {priceInfo ? (
            <div className="mb-2 d-flex align-items-baseline" style={{ gap: 8 }}>
              <div className="h5 mb-0">
                {priceInfo.currency} {priceInfo.price}
              </div>
              {priceInfo.originalPrice ? (
                <>
                  <div className="text-muted text-decoration-line-through small">
                    {priceInfo.currency} {priceInfo.originalPrice}
                  </div>
                  <span className="badge bg-danger small">{priceInfo.discountPercent}% OFF</span>
                </>
              ) : null}
            </div>
          ) : null}

          {product?.sku ? (
            <div className="small text-muted mb-2">SKU: {product.sku}</div>
          ) : null}

          {Array.isArray(product?.colors) && product.colors.length ? (
            <div className="mb-3">
              <div className="small text-uppercase fw-semibold mb-1">Color</div>
              <div className="d-flex flex-wrap" style={{ gap: 8 }}>
                {product.colors.map((c) => {
                  const key = String(c || "").trim();
                  if (!key) return null;
                  const active = selectedColor === key;

                  const lower = key.toLowerCase();
                  const parts = lower.split('/').map((p) => p.trim()).filter(Boolean);
                  const first = parts[0] || lower;
                  const second = parts[1] || null;

                  function resolveNamedColor(fragment) {
                    const v = String(fragment || '').trim().toLowerCase();
                    if (!v) return '#f8f9fa';
                    if (v.includes('white')) return '#ffffff';
                    if (v.includes('grey') || v.includes('gray')) return '#868e96';

                    // Rich reds
                    if (v.includes('maroon') || v.includes('burgundy')) return '#800000';
                    if (v.includes('red')) return '#e03131';

                    // Blues
                    if (v.includes('navy')) return '#001f3f';
                    if (v.includes('sky') || v.includes('light blue')) return '#4dabf7';
                    if (v.includes('blue')) return '#1971c2';

                    // Greens
                    if (v.includes('olive')) return '#556b2f';
                    if (v.includes('green')) return '#2f9e44';

                    // Warm colors
                    if (v.includes('yellow') || v.includes('gold') || v.includes('golden')) return '#f08c00';
                    if (v.includes('orange')) return '#f76707';

                    // Pinks / purples
                    if (v.includes('pink') || v.includes('fuchsia') || v.includes('magenta')) return '#e64980';
                    if (v.includes('purple')) return '#7048e8';

                    if (v.includes('black')) return '#000000';
                    return '#f8f9fa';
                  }

                  const c1 = resolveNamedColor(first);
                  const c2 = second ? resolveNamedColor(second) : null;

                  const hasWhite = c1 === '#ffffff' || c2 === '#ffffff';
                  const border = hasWhite ? '1px solid #adb5bd' : '1px solid #dee2e6';

                  const style = {
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    border,
                    outline: active ? '2px solid #212529' : 'none',
                    padding: 0,
                  };

                  if (c2) {
                    style.backgroundImage = `linear-gradient(to right, ${c1} 0%, ${c1} 50%, ${c2} 50%, ${c2} 100%)`;
                  } else {
                    style.backgroundColor = c1;
                  }

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedColor(key)}
                      title={key}
                      style={style}
                    />
                  );
                })}
              </div>
            </div>
          ) : null}

          {Array.isArray(product?.sizes) && product.sizes.length ? (
            <div className="mb-3">
              <div className="small text-uppercase fw-semibold mb-1">Sizes</div>
              <div className="d-flex flex-wrap" style={{ gap: 8 }}>
                {product.sizes.map((s) => {
                  const key = String(s || "").trim();
                  if (!key) return null;
                  const active = selectedSize === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      className={`btn btn-sm ${active ? 'btn-dark' : 'btn-outline-secondary'}`}
                      onClick={() => setSelectedSize(key)}
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
                onClick={decrementQty}
              >
                −
              </button>
              <input
                type="number"
                min="1"
                value={qty}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!Number.isFinite(v) || v <= 0) return;
                  setQty(v);
                }}
                className="form-control form-control-sm text-center border-0"
                style={{ width: 56 }}
              />
              <button
                type="button"
                className="btn btn-sm btn-light border-0"
                onClick={incrementQty}
              >
                +
              </button>
            </div>
          </div>

          <div className="d-grid gap-2">
            <AddToCartButton
              item={{
                productId: product.id,
                sku: product?.sku || null,
                name: product?.name || "Item",
                unitAmount: Number(product?.pricing?.unitAmount || 0),
                imageUrl: image ? image.url : null,
              }}
              qty={qty}
              className="btn w-100 text-uppercase fw-semibold"
              style={{ backgroundColor: '#d10024', borderColor: '#d10024', color: '#ffffff' }}
            />
            <button
              type="button"
              className="btn btn-outline-secondary w-100 text-uppercase fw-semibold"
              onClick={toggleWishlist}
            >
              {inWishlist ? '♥ In wishlist' : '♡ Add to wishlist'}
            </button>
            <a
              className="btn btn-outline-secondary w-100 text-uppercase fw-semibold"
              href="/cart"
            >
              Go to cart
            </a>
            <button
              type="button"
              className="btn btn-outline-dark w-100 text-uppercase fw-semibold"
              onClick={handleBuyNow}
            >
              Buy now
            </button>
          </div>
        </div>
      </div>

      {product?.description ? (
        <div className="mt-4 pt-3 border-top">
          <button
            type="button"
            className="w-100 d-flex align-items-center justify-content-between border-0 bg-transparent px-0 py-2"
            onClick={() => setShowDescription((prev) => !prev)}
            style={{ fontSize: 14 }}
          >
            <span style={{ fontWeight: 600 }}>Product Description</span>
            <span style={{ fontSize: 20, lineHeight: 1 }}>{showDescription ? '−' : '+'}</span>
          </button>
          <hr className="mt-0" />
          {showDescription ? (
            <div
              className="mt-2"
              style={{ fontSize: 14, lineHeight: 1.6 }}
              dangerouslySetInnerHTML={{ __html: product.description }}
            />
          ) : null}
        </div>
      ) : null}
      {zoomImageIndex !== null && images[zoomImageIndex] ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.9)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setZoomImageIndex(null)}
        >
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: 900,
              height: '100%',
              maxHeight: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Counter top-left */}
            <div
              style={{
                position: 'absolute',
                top: 20,
                left: 20,
                padding: '4px 12px',
                borderRadius: 999,
                backgroundColor: 'rgba(255,255,255,0.9)',
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {zoomImageIndex + 1} / {images.length}
            </div>

            {/* Close button top-right (larger so it is easy to tap) */}
            <button
              type="button"
              onClick={() => setZoomImageIndex(null)}
              style={{
                position: 'absolute',
                top: 16,
                right: 18,
                width: 40,
                height: 40,
                borderRadius: '50%',
                border: 'none',
                backgroundColor: 'rgba(255,255,255,0.95)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
              }}
              aria-label="Close image"
            >
              <span style={{ fontSize: 20, lineHeight: 1 }}>×</span>
            </button>

            {/* Prev / Next arrows - always visible, fade when disabled */}
            {images.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setZoomImageIndex((prev) => (prev > 0 ? prev - 1 : prev))
                  }
                  style={{
                    position: 'absolute',
                    left: 24,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: zoomImageIndex === 0 ? 'default' : 'pointer',
                    opacity: zoomImageIndex === 0 ? 0.4 : 1,
                  }}
                  aria-label="Previous image"
                >
                  <span style={{ fontSize: 22, lineHeight: 1 }}>‹</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setZoomImageIndex((prev) =>
                      prev < images.length - 1 ? prev + 1 : prev
                    )
                  }
                  style={{
                    position: 'absolute',
                    right: 24,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: 'rgba(255,255,255,0.95)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor:
                      zoomImageIndex === images.length - 1 ? 'default' : 'pointer',
                    opacity: zoomImageIndex === images.length - 1 ? 0.4 : 1,
                  }}
                  aria-label="Next image"
                >
                  <span style={{ fontSize: 22, lineHeight: 1 }}>›</span>
                </button>
              </>
            ) : null}

            <img
              src={images[zoomImageIndex].url}
              alt={images[zoomImageIndex].alt || product.name}
              style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
