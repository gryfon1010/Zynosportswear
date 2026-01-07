'use client';

import { useEffect, useMemo, useState } from 'react';

export default function FloatingActions() {
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 300);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const waLink = useMemo(() => {
    const phone = '923051982599';
    const text = encodeURIComponent('Hi, I want to know more about Zyno Sportswear products.');
    return `https://wa.me/${phone}?text=${text}`;
  }, []);

  return (
    <>
      <a
        href={waLink}
        target="_blank"
        rel="noreferrer"
        aria-label="WhatsApp"
        className="text-decoration-none"
        style={{ position: 'fixed', left: 16, bottom: 18, zIndex: 1050 }}
      >
        <span
          style={{
            width: 46,
            height: 46,
            borderRadius: '50%',
            background: '#25d366',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 10px 20px rgba(0,0,0,0.25)',
            fontWeight: 900,
            fontSize: 16,
          }}
        >
          WA
        </span>
      </a>

      {showTop ? (
        <button
          type="button"
          aria-label="Scroll to top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          style={{
            position: 'fixed',
            right: 16,
            bottom: 18,
            width: 42,
            height: 42,
            borderRadius: '50%',
            background: '#fff',
            color: '#0b2a56',
            border: '1px solid rgba(0,0,0,0.08)',
            zIndex: 1050,
            boxShadow: '0 10px 20px rgba(0,0,0,0.25)',
            fontWeight: 900,
          }}
        >
          ↑
        </button>
      ) : null}
    </>
  );
}
