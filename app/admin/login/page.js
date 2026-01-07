'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signInWithEmailAndPassword } from 'firebase/auth';
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

  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      if (u) router.replace(next);
    });
    return () => unsub();
  }, [router, next]);

  async function onSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
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

              <div className="text-center" style={{ marginTop: 14, fontSize: 12 }}>
                After signing in, your user must be added to Firestore collection{' '}
                <code>admins</code> with role <code>"admin"</code> and <code>enabled: true</code>.
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
