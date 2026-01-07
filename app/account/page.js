'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '../../lib/firebase/client';
import { userAuthedJson } from '../../lib/user/client';

export default function AccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [me, setMe] = useState(null);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (u) => {
      setError(null);
      if (!u) {
        router.replace('/login?next=/account');
        return;
      }

      setLoading(true);
      try {
        const data = await userAuthedJson('/api/account/me');
        setMe(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed');
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [router]);

  async function onLogout() {
    await signOut(auth);
    router.replace('/landingpage');
  }

  if (loading) return <div className="container py-5">Loading…</div>;

  return (
    <div className="container py-5" style={{ maxWidth: 760 }}>
      <div className="d-flex align-items-start justify-content-between gap-3 flex-wrap">
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, marginBottom: 6 }}>My account</h1>
          <div style={{ color: '#6c757d' }}>{me?.email || auth.currentUser?.email || '—'}</div>
        </div>
        <button className="btn btn-outline-secondary" onClick={onLogout}>
          Logout
        </button>
      </div>

      {error ? <div className="alert alert-danger mt-3">{error}</div> : null}

      <div className="card mt-3">
        <div className="card-body">
          <div style={{ fontWeight: 800, marginBottom: 8 }}>Orders</div>
          <div style={{ color: '#6c757d', fontSize: 14, marginBottom: 12 }}>
            View your previous orders.
          </div>
          <Link className="btn btn-primary" href="/account/orders">
            My Orders
          </Link>
        </div>
      </div>
    </div>
  );
}
