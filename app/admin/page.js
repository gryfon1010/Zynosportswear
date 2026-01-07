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
    return <div className="py-5 text-center">Loading…</div>;
  }

  if (!state.user) {
    return (
      <div className="text-center" style={{ padding: '40px 0' }}>
        <h1 style={{ fontSize: 24, fontWeight: 900 }}>Admin</h1>
        <div style={{ color: '#6c757d', marginTop: 8 }}>You are not signed in.</div>
        <div style={{ marginTop: 16 }}>
          <Link className="btn btn-primary" href="/admin/login">
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  const isAdmin = Boolean(state.me?.isAdmin);

  return (
    <div>
      <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
            Admin Dashboard
          </h1>
          <div style={{ color: '#6c757d', fontSize: 13 }}>{state.user.email}</div>
        </div>
        <button className="btn btn-outline-secondary btn-sm" onClick={onLogout}>
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
        <div className="mt-4">
          <div className="row g-3">
            <div className="col-12 col-md-6 col-lg-4">
              <div className="card h-100 shadow-sm border-0">
                <div className="card-body">
                  <div style={{ fontWeight: 900 }}>Categories</div>
                  <div style={{ color: '#6c757d', fontSize: 13, marginTop: 4 }}>Create & organize product categories.</div>
                  <Link className="btn btn-primary btn-sm mt-3" href="/admin/categories">
                    Manage categories
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6 col-lg-4">
              <div className="card h-100 shadow-sm border-0">
                <div className="card-body">
                  <div style={{ fontWeight: 900 }}>Products</div>
                  <div style={{ color: '#6c757d', fontSize: 13, marginTop: 4 }}>Create products and upload images.</div>
                  <Link className="btn btn-primary btn-sm mt-3" href="/admin/products">
                    Manage products
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6 col-lg-4">
              <div className="card h-100 shadow-sm border-0">
                <div className="card-body">
                  <div style={{ fontWeight: 900 }}>Featured</div>
                  <div style={{ color: '#6c757d', fontSize: 13, marginTop: 4 }}>Pick featured products for the landing page.</div>
                  <Link className="btn btn-primary btn-sm mt-3" href="/admin/featured">
                    Manage featured
                  </Link>
                </div>
              </div>
            </div>
            <div className="col-12 col-md-6 col-lg-4">
              <div className="card h-100 shadow-sm border-0">
                <div className="card-body">
                  <div style={{ fontWeight: 900 }}>Orders</div>
                  <div style={{ color: '#6c757d', fontSize: 13, marginTop: 4 }}>View and manage customer orders.</div>
                  <Link className="btn btn-primary btn-sm mt-3" href="/admin/orders">
                    View orders
                  </Link>
                </div>
              </div>
            </div>

            <div className="col-12 col-md-6 col-lg-4">
              <div className="card h-100 shadow-sm border-0">
                <div className="card-body">
                  <div style={{ fontWeight: 900 }}>Navbar Image Categories</div>
                  <div style={{ color: '#6c757d', fontSize: 13, marginTop: 4 }}>
                    Configure right-side image tiles for main navbar categories.
                  </div>
                  <Link className="btn btn-primary btn-sm mt-3" href="/admin/navbar-image-categories">
                    Manage image tiles
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
