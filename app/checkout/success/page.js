'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { auth } from '../../../lib/firebase/client';

const CART_KEY = 'zyno_cart_v1';

export default function CheckoutSuccessPage({ searchParams }) {
  const sessionId = searchParams?.session_id;
  const [state, setState] = useState({ loading: true, error: null, orderLink: null });

  const safeSessionId = useMemo(() => (typeof sessionId === 'string' ? sessionId : null), [sessionId]);

  useEffect(() => {
    async function run() {
      if (!safeSessionId) {
        setState({ loading: false, error: 'Missing session_id', orderLink: null });
        return;
      }

      try {
        const controller = new AbortController();
        const timeoutId = window.setTimeout(() => controller.abort(), 20000);

        const headers = new Headers({ 'Content-Type': 'application/json' });
        try {
          const user = auth.currentUser;
          if (user) {
            const token = await user.getIdToken();
            headers.set('authorization', `Bearer ${token}`);
          }
        } catch {
          // ignore
        }

        const res = await fetch('/api/orders/create-from-checkout-session', {
          method: 'POST',
          headers,
          body: JSON.stringify({ sessionId: safeSessionId }),
          signal: controller.signal,
        });

        window.clearTimeout(timeoutId);

        const data = await safeReadJson(res);
        if (!res.ok) throw new Error(data?.error || `Request failed (${res.status})`);

        if (data?.orderLink) {
          try {
            window.localStorage.removeItem(CART_KEY);
          } catch {}
        }

        setState({ loading: false, error: null, orderLink: data.orderLink || null });
      } catch (e) {
        const msg =
          e && typeof e === 'object' && 'name' in e && e.name === 'AbortError'
            ? 'Request timed out. (Server not responding yet)'
            : e instanceof Error
              ? e.message
              : 'Failed';

        setState({ loading: false, error: msg, orderLink: null });
      }
    }

    run();
  }, [safeSessionId]);

  return (
    <div className="container py-5" style={{ maxWidth: 760 }}>
      <h1 style={{ fontSize: 24, fontWeight: 900 }}>Payment successful</h1>

      {state.loading ? <div style={{ marginTop: 12 }}>Creating your order…</div> : null}
      {state.error ? <div className="alert alert-danger mt-3">{state.error}</div> : null}

      {state.orderLink ? (
        <div className="mt-3">
          <div className="alert alert-success">
            <div style={{ fontWeight: 800, marginBottom: 6 }}>MVP: Your private order link</div>
            <div style={{ wordBreak: 'break-all' }}>{state.orderLink}</div>
          </div>

          <div className="d-flex gap-2">
            <a className="btn btn-primary" href={state.orderLink}>
              View order
            </a>
            <Link className="btn btn-outline-secondary" href="/landingpage">
              Continue shopping
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

async function safeReadJson(res) {
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }

  const text = await res.text();
  return { error: text?.slice(0, 300) || 'Non-JSON response' };
}
