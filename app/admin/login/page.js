'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserSessionPersistence,
  sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from '../../../lib/firebase/client';
import styles from '../../auth/auth.module.css';

export default function AdminLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = useMemo(() => searchParams?.get('next') || '/admin', [searchParams]);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [resetMessage, setResetMessage] = useState('');

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (u) router.replace(next);
    });
    return () => unsub();
  }, [router, next]);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setResetMessage('');
    setLoading(true);
    try {
      // Use session persistence so the admin must log in again when the
      // browser/tab is closed, but can navigate within the admin area
      // without re-authenticating.
      await setPersistence(auth, browserSessionPersistence);
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  async function onForgotPassword(e) {
    e.preventDefault();
    setError(null);
    setResetMessage('');
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Please enter your admin email first, then click "Forgot password?"');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, trimmed);
      setResetMessage('Password reset email sent. Please check your inbox.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send password reset email');
    }
  }

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={`container ${styles.formContainer}`}>
          <div className={styles.title}>
            <h1>ADMIN LOGIN</h1>
            <div className={styles.titleLine} />
          </div>

          {error ? <div className="alert alert-danger">{error}</div> : null}
          {resetMessage ? <div className="alert alert-success">{resetMessage}</div> : null}

          <div className={`card ${styles.card}`}>
            <div className={`card-body ${styles.cardBody}`}>
              <div className={styles.small} style={{ marginBottom: 14 }}>
                Sign in to manage products, categories and orders.
              </div>

              <form onSubmit={onSubmit}>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    className="form-control"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Password</label>
                  <input
                    className="form-control"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                </div>

                <button
                  className={`btn btn-primary w-100 ${styles.primaryBtn}`}
                  type="submit"
                  disabled={loading}
                >
                  {loading ? 'Signing in…' : 'Login'}
                </button>
              </form>

              <div className="text-center" style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className="btn btn-link p-0"
                  style={{ fontSize: 12 }}
                  onClick={onForgotPassword}
                >
                  Forgot password?
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
