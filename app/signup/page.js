'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase/client';
import Navbar from '../components/Navbar';
import StickyNavbar from '../components/StickyNavbar';
import styles from '../auth/auth.module.css';

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams?.get('next') || '/landingpage';

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
      await createUserWithEmailAndPassword(auth, email.trim(), password);
      router.replace(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <StickyNavbar>
        <Navbar showBlackBar={false} />
      </StickyNavbar>

      <section className={styles.hero}>
        <div className={`container ${styles.formContainer}`}>
          <div className={styles.title}>
            <h1>CREATE ACCOUNT</h1>
            <div className={styles.titleLine} />
          </div>

          {error ? <div className="alert alert-danger">{error}</div> : null}

          <div className={`card ${styles.card}`}>
            <div className={`card-body ${styles.cardBody}`}>
              <div className={styles.small} style={{ marginBottom: 14 }}>
                Create an account to track your orders.
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
                    autoComplete="new-password"
                    required
                  />
                  <div className={styles.small} style={{ marginTop: 6 }}>
                    Use at least 6 characters.
                  </div>
                </div>

                <button className={`btn btn-primary w-100 ${styles.primaryBtn}`} type="submit" disabled={loading}>
                  {loading ? 'Creating…' : 'Create account'}
                </button>
              </form>

              <div className="text-center" style={{ marginTop: 14, fontSize: 13 }}>
                Already have an account?{' '}
                <Link className={styles.link} href={`/login?next=${encodeURIComponent(next)}`}>
                  Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
