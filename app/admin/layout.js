"use client";

import { useEffect, useState } from 'react';
import Navbar from '../components/Navbar';
import StickyNavbar from '../components/StickyNavbar';
import { auth } from '../../lib/firebase/client';
import { signOut } from 'firebase/auth';

export default function AdminLayout({ children }) {
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [pendingHref, setPendingHref] = useState(null);

  // Guard browser Back/Forward while on any /admin page.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Push a dummy state so the first Back stays on an /admin URL and
    // triggers our handler instead of navigating away immediately.
    try {
      window.history.pushState({ __adminGuard: true }, '');
    } catch {
      // ignore
    }

    const handlePopState = () => {
      if (typeof window === 'undefined') return;
      if (!window.location.pathname.startsWith('/admin')) return;

      try {
        window.history.pushState({ __adminGuard: true }, '');
      } catch {
        // ignore
      }

      setPendingHref((prev) => prev || '/');
      setShowLeaveModal(true);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  // Intercept clicks on links that would leave the admin section (e.g. Home,
  // category pages, cart, etc.) and show the same confirmation modal.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleClick = (event) => {
      const target = event.target;
      if (!target || typeof target.closest !== 'function') return;
      const anchor = target.closest('a');
      if (!anchor || !anchor.href) return;

      try {
        const url = new URL(anchor.href, window.location.href);
        if (url.origin !== window.location.origin) return; // external link

        // Only guard when we are currently in admin and the destination is
        // leaving admin.
        if (!window.location.pathname.startsWith('/admin')) return;
        if (url.pathname.startsWith('/admin')) return; // internal admin nav

        event.preventDefault();
        setPendingHref(url.pathname + url.search + url.hash);
        setShowLeaveModal(true);
      } catch {
        // ignore
      }
    };

    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, []);

  async function handleConfirmLeave() {
    const target = pendingHref || '/admin/login';
    setShowLeaveModal(false);
    setPendingHref(null);
    try {
      await signOut(auth);
    } catch {
      // ignore signOut errors; still navigate away
    }
    if (typeof window !== 'undefined') {
      window.location.href = target;
    }
  }

  return (
    <div>
      <StickyNavbar>
        <Navbar showBlackBar={true} />
      </StickyNavbar>

      {showLeaveModal ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 1050,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div className="card" style={{ maxWidth: 420, width: '90%' }}>
            <div className="card-body">
              <h5 className="card-title" style={{ fontWeight: 700 }}>
                Leave admin dashboard?
              </h5>
              <p className="card-text" style={{ fontSize: 14 }}>
                You are about to leave the admin area. Do you want to log out and
                continue?
              </p>
              <div className="d-flex justify-content-end gap-2 mt-3">
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => setShowLeaveModal(false)}
                >
                  No, stay here
                </button>
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={handleConfirmLeave}
                >
                  Yes, log out
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <div className="container py-4" style={{ maxWidth: 1100 }}>
        {children}
      </div>
    </div>
  );
}
