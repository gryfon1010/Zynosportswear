'use client';

import Navbar from '../components/Navbar';
import StickyNavbar from '../components/StickyNavbar';
import FloatingActions from '../FloatingActions';
import styles from './page.module.css';

export default function ContactUsPage() {
  return (
    <main className={styles.page}>
      <StickyNavbar>
        <Navbar showBlackBar={false} />
      </StickyNavbar>

      <section className={styles.heroBar}>
        <div className="container">
          <div className={styles.heroInner}>
            <h1 className={styles.heroTitle}>Contact us</h1>
            <nav className={styles.breadcrumb} aria-label="Breadcrumb">
              <a href="/landingpage">Home</a>
              <span className={styles.breadcrumbSep}>/</span>
              <span className={styles.breadcrumbCurrent}>Contact us</span>
            </nav>
          </div>
        </div>
      </section>

      <section className={styles.contentSection}>
        <div className="container">
          <div className="row">

            <div className="col-12 col-lg-6">
              <h2 className={styles.columnTitle}>Contact details</h2>
              <div className={styles.columnDivider} />

              <div className={styles.detailBlock}>
                <div className={styles.detailLabel}>OFFICE ADDRESS</div>
                <div className={styles.detailText}>
                  H261, Phase2, Model Town, Pasrur Road, Sialkot-51310 PAKISTAN
                </div>
              </div>

              <div className={styles.detailBlock}>
                <div className={styles.detailLabel}>EMAIL</div>
                <div className={styles.detailText}>
                  <a href="mailto:info@zynosportswear.com">info@zynosportswear.com</a>
                </div>
              </div>

              <div className={styles.detailBlock}>
                <div className={styles.detailLabel}>PHONE NUMBER</div>
                <div className={styles.detailText}>
                  Phone: +92 331 4083626
                  <br />
                  Phone: +92 305 1982599
                </div>
              </div>

              <div className={styles.detailBlock}>
                <div className={styles.detailLabel}>TIME HOURS</div>
                <div className={styles.detailText}>Monday to Saturday:</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FloatingActions />
    </main>
  );
}
