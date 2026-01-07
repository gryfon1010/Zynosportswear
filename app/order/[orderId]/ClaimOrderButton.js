'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '../../../lib/firebase/client';
import { userAuthedJson } from '../../../lib/user/client';

export default function ClaimOrderButton({ orderId, token }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState(null);

  const nextUrl = useMemo(() => {
    const path = `/order/${encodeURIComponent(orderId)}?token=${encodeURIComponent(token)}`;
    return `/login?next=${encodeURIComponent(path)}`;
  }, [orderId, token]);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => setUser(u || null));
    return () => unsub();
  }, []);

  async function onClaim() {
    setError(null);
    setLoading(true);
    try {
      await userAuthedJson('/api/orders/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, token }),
      });
      setDone(true);
      router.push(`/account/orders/${orderId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  if (!orderId || !token) return null;

  return (
    <div className="card mb-3">
      <div className="card-body d-flex align-items-start justify-content-between gap-3 flex-wrap">
        <div>
          <div style={{ fontWeight: 800, marginBottom: 4 }}>Want this order in your account?</div>
          <div style={{ fontSize: 13, color: '#6c757d' }}>
            If you place orders as a guest, you can claim them after logging in.
          </div>
          {error ? <div className="alert alert-danger mt-2 mb-0">{error}</div> : null}
        </div>

        {user ? (
          <button className="btn btn-primary" onClick={onClaim} disabled={loading || done}>
            {done ? 'Claimed' : loading ? 'Claiming…' : 'Claim order'}
          </button>
        ) : (
          <a className="btn btn-outline-primary" href={nextUrl}>
            Login to claim
          </a>
        )}
      </div>
    </div>
  );
}
