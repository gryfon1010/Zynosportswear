'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase/client';

export default function AdminHomePage() {
  const [state, setState] = useState({ loading: true, user: null, me: null, error: null });

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      if (!u) {
        setState({ loading: false, user: null, me: null, error: null });
        return;
      }

      try {
        const token = await u.getIdToken();
        const res = await fetch('/api/admin/me', {
          headers: {
            authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);

        setState({ loading: false, user: u, me: data, error: null });
      } catch (e) {
        setState({ loading: false, user: u, me: null, error: e instanceof Error ? e.message : 'Failed' });
      }
    });

    return () => unsub();
  }, []);

  async function onLogout() {
    await signOut(auth);
    window.location.href = '/admin/login';
  }

  if (state.loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-start"
        style={{ minHeight: '60vh', paddingTop: '60px' }}
      >
        <div className="text-center" style={{ color: '#6c757d', fontSize: 14 }}>
          Loading admin dashboard…
        </div>
      </div>
    );
  }

  if (!state.user) {
    return (
      <div
        className="d-flex justify-content-center align-items-start"
        style={{ minHeight: '60vh', paddingTop: '60px' }}
      >
        <div
          className="card shadow-sm"
          style={{
            maxWidth: 480,
            width: '100%',
            borderRadius: 10,
            border: '1px solid rgba(11,42,86,0.08)',
          }}
        >
          <div className="card-body text-center py-4 px-4">
            <div
              className="badge text-uppercase mb-3"
              style={{
                backgroundColor: 'rgba(27,184,170,0.12)',
                color: '#0b2a56',
                fontWeight: 700,
                letterSpacing: 1,
                borderRadius: 999,
                padding: '6px 14px',
              }}
            >
              Admin access required
            </div>
            <h1 style={{ fontSize: 22, fontWeight: 900, marginBottom: 8 }}>You are not signed in</h1>
            <p style={{ fontSize: 14, color: '#6c757d', marginBottom: 20 }}>
              To manage products, categories and orders, please sign in with your admin account.
            </p>
            <div className="d-flex flex-column flex-sm-row justify-content-center gap-2">
              <Link
                className="btn btn-primary"
                href="/admin/login"
                style={{ backgroundColor: '#1bb8aa', borderColor: '#1bb8aa' }}
              >
                Go to admin login
              </Link>
              <Link className="btn btn-outline-secondary" href="/">
                Back to storefront
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = Boolean(state.me?.isAdmin);

  return (
    <div>
      <div
        className="d-flex align-items-start justify-content-between gap-3 flex-wrap"
        style={{ marginTop: 6, marginBottom: 16 }}
      >
        <div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 900,
              letterSpacing: 1,
              textTransform: 'uppercase',
              marginBottom: 4,
              color: '#0b2a56',
            }}
          >
            Admin Dashboard
          </h1>
          <div style={{ color: '#6c757d', fontSize: 13 }}>{state.user.email}</div>
        </div>
        <button
          className="btn btn-outline-secondary btn-sm admin-outline-btn admin-logout-btn"
          onClick={onLogout}
        >
          Logout
        </button>
      </div>

      {state.error ? <div className="alert alert-danger mt-3">{state.error}</div> : null}

      {!isAdmin ? (
        <div className="alert alert-warning mt-3">
          <div style={{ fontWeight: 800, marginBottom: 6 }}>Access not granted yet</div>
          <div style={{ fontSize: 14 }}>
            Your UID is <code>{state.me?.uid || state.user.uid}</code>. Add this UID to Firestore collection <code>admins</code>:
          </div>
          <div style={{ fontSize: 14, marginTop: 8 }}>
            <div>
              <strong>Collection:</strong> <code>admins</code>
            </div>
            <div>
              <strong>Document ID:</strong> <code>{state.me?.uid || state.user.uid}</code>
            </div>
            <div>
              <strong>Fields:</strong>
            </div>
            <div>
              <code>role</code>: <code>"admin"</code>
            </div>
            <div>
              <code>enabled</code>: <code>true</code>
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <div
            className="card border-0 shadow-sm"
            style={{ borderRadius: 10, backgroundColor: '#f8fafc' }}
          >
            <div className="card-body">
              <div className="row g-3">
                <div className="col-12 col-md-6 col-lg-4">
                  <div
                    className="card h-100 border-0 shadow-sm"
                    style={{
                      borderRadius: 10,
                      borderTop: '3px solid #1bb8aa',
                    }}
                  >
                    <div className="card-body">
                      <div style={{ fontWeight: 900, color: '#0b2a56' }}>Categories</div>
                      <div style={{ color: '#6c757d', fontSize: 13, marginTop: 4 }}>
                        Create & organize product categories.
                      </div>
                      <Link
                        className="btn btn-sm mt-3"
                        href="/admin/categories"
                        style={{ backgroundColor: '#1bb8aa', borderColor: '#1bb8aa', color: '#ffffff' }}
                      >
                        Manage categories
                      </Link>
                    </div>
                  </div>
                </div>
                <div className="col-12 col-md-6 col-lg-4">
                  <div
                    className="card h-100 border-0 shadow-sm"
                    style={{
                      borderRadius: 10,
                      borderTop: '3px solid #1bb8aa',
                    }}
                  >
                    <div className="card-body">
                      <div style={{ fontWeight: 900, color: '#0b2a56' }}>Products</div>
                      <div style={{ color: '#6c757d', fontSize: 13, marginTop: 4 }}>
                        Create products and upload images.
                      </div>
                      <Link
                        className="btn btn-sm mt-3"
                        href="/admin/products"
                        style={{ backgroundColor: '#1bb8aa', borderColor: '#1bb8aa', color: '#ffffff' }}
                      >
                        Manage products
                      </Link>
                    </div>
                  </div>
                </div>
                <div className="col-12 col-md-6 col-lg-4">
                  <div
                    className="card h-100 border-0 shadow-sm"
                    style={{
                      borderRadius: 10,
                      borderTop: '3px solid #1bb8aa',
                    }}
                  >
                    <div className="card-body">
                      <div style={{ fontWeight: 900, color: '#0b2a56' }}>Featured</div>
                      <div style={{ color: '#6c757d', fontSize: 13, marginTop: 4 }}>
                        Pick featured products for the landing page.
                      </div>
                      <Link
                        className="btn btn-sm mt-3"
                        href="/admin/featured"
                        style={{ backgroundColor: '#1bb8aa', borderColor: '#1bb8aa', color: '#ffffff' }}
                      >
                        Manage featured
                      </Link>
                    </div>
                  </div>
                </div>
                <div className="col-12 col-md-6 col-lg-4">
                  <div
                    className="card h-100 border-0 shadow-sm"
                    style={{
                      borderRadius: 10,
                      borderTop: '3px solid #1bb8aa',
                    }}
                  >
                    <div className="card-body">
                      <div style={{ fontWeight: 900, color: '#0b2a56' }}>Orders</div>
                      <div style={{ color: '#6c757d', fontSize: 13, marginTop: 4 }}>
                        View and manage customer orders.
                      </div>
                      <Link
                        className="btn btn-sm mt-3"
                        href="/admin/orders"
                        style={{ backgroundColor: '#1bb8aa', borderColor: '#1bb8aa', color: '#ffffff' }}
                      >
                        View orders
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="col-12 col-md-6 col-lg-4">
                  <div
                    className="card h-100 border-0 shadow-sm"
                    style={{
                      borderRadius: 10,
                      borderTop: '3px solid #1bb8aa',
                    }}
                  >
                    <div className="card-body">
                      <div style={{ fontWeight: 900, color: '#0b2a56' }}>Navbar Image Categories</div>
                      <div style={{ color: '#6c757d', fontSize: 13, marginTop: 4 }}>
                        Configure right-side image tiles for main navbar categories.
                      </div>
                      <Link
                        className="btn btn-sm mt-3"
                        href="/admin/navbar-image-categories"
                        style={{ backgroundColor: '#1bb8aa', borderColor: '#1bb8aa', color: '#ffffff' }}
                      >
                        Manage image tiles
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
