"use client";

import { useEffect, useMemo, useState } from "react";
import AddToCartButton from "./AddToCartButton";

export default function ProductDetailClient({ product }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [qty, setQty] = useState(1);

  const images = Array.isArray(product?.images) ? product.images.slice(0, 5) : [];

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
    if (Array.isArray(product?.sizes) && product.sizes.length && !selectedSize) {
      const first = String(product.sizes[0] || "").trim();
      if (first) setSelectedSize(first);
    }
    if (Array.isArray(product?.colors) && product.colors.length && !selectedColor) {
      const first = String(product.colors[0] || "").trim();
      if (first) setSelectedColor(first);
    }
  }, [product, selectedSize, selectedColor]);

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

  const handleMainMouseMove = (e) => {
    if (isMobileViewport || !images.length) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = rect.width > 0 ? x / rect.width : 0;

    let idx = 0;
    const count = Math.min(images.length, 3);
    if (count >= 3) {
      if (ratio < 1 / 3) idx = 0;
      else if (ratio < 2 / 3) idx = 1;
      else idx = 2;
    } else if (count === 2) {
      idx = ratio < 0.5 ? 0 : 1;
    }

    setActiveIdx(idx);
  };

  const handleMainClick = () => {
    if (!isMobileViewport || !images.length) return;
    const count = Math.min(images.length, 3);
    if (!count) return;
    setActiveIdx((prev) => ((prev + 1) % count));
  };

  const decrementQty = () => {
    setQty((prev) => (prev > 1 ? prev - 1 : 1));
  };

  const incrementQty = () => {
    setQty((prev) => (prev < 999 ? prev + 1 : 999));
  };

  const image = images[activeIdx] || images[0] || null;

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
          <div className="border rounded bg-light d-flex align-items-center justify-content-center" style={{ minHeight: 420, position: "relative", overflow: "hidden" }}>
            {image ? (
              <div
                style={{ position: "relative", width: "100%", height: 420, maxWidth: "100%" }}
                onMouseMove={handleMainMouseMove}
                onClick={handleMainClick}
              >
                {images.slice(0, 3).map((img, idx) => (
                  <img
                    key={idx}
                    src={img.url}
                    alt={img.alt || product.name}
                    style={{
                      objectFit: "contain",
                      width: "100%",
                      height: "100%",
                      position: "absolute",
                      top: 0,
                      left: 0,
                      transition: "opacity 0.2s ease",
                      opacity: activeIdx === idx ? 1 : 0,
                    }}
                  />
                ))}
              </div>
            ) : (
              <div className="text-muted">No image</div>
            )}

            {images.length > 1 ? (
              <div className="d-flex justify-content-center" style={{ position: "absolute", bottom: 12, left: 0, right: 0, gap: 6 }}>
                {images.slice(0, 3).map((img, idx) => {
                  const active = activeIdx === idx;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveIdx(idx)}
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        border: "1px solid #ffffff",
                        backgroundColor: active ? "#d10024" : "rgba(0,0,0,0.4)",
                        padding: 0,
                      }}
                    />
                  );
                })}
              </div>
            ) : null}
          </div>
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
    </div>
  );
}
