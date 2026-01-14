"use client";

import { useEffect, useMemo, useState } from "react";
import AddToCartButton from "./AddToCartButton";
import { readWishlist, writeWishlist } from "../../lib/wishlist";

export default function ProductDetailClient({ product }) {
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [qty, setQty] = useState(1);
  const [inWishlist, setInWishlist] = useState(false);
  const [showDescription, setShowDescription] = useState(true);
  const [zoomImage, setZoomImage] = useState(null);
  const allImages = Array.isArray(product?.images) ? product.images : [];

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
                    onClick={() => setZoomImage(img)}
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
                    onClick={() => setZoomImage(img)}
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
                  let bg = '#f8f9fa';
                  if (lower === 'white') bg = '#ffffff';
                  else if (lower === 'black') bg = '#000000';
                  else if (lower === 'grey' || lower === 'gray') bg = '#868e96';
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
                      onClick={() => setSelectedColor(key)}
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
            <a
              className="btn btn-outline-dark w-100 text-uppercase fw-semibold"
              href="/checkout"
            >
              Buy now
            </a>
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
      {zoomImage ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.8)',
            zIndex: 1050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setZoomImage(null)}
        >
          <img
            src={zoomImage.url}
            alt={zoomImage.alt || product.name}
            style={{ maxWidth: '90%', maxHeight: '90%', objectFit: 'contain' }}
          />
        </div>
      ) : null}
    </div>
  );
}
