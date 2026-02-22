'use client';

import styles from '../landingpage/page.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className="container">
        <div className="row gy-4">
          <div className="col-12 col-md-3">
            <div className={styles.footerTitle}>INFORMATION</div>
            <a className={styles.footerLink} href="/landingpage">
              Home
            </a>
            <a className={styles.footerLink} href="/about-us/">
              About us
            </a>
            <a className={styles.footerLink} href="/contact-us/">
              Contact us
            </a>
            <a className={styles.footerLink} href="/certificates">
              Authorizations &amp; Certificates
            </a>
          </div>
          <div className="col-12 col-md-3">
            <div className={styles.footerTitle}>PRODUCTS</div>
            <a className={styles.footerLink} href="/category/boxing">
              BOXING
            </a>
            <a className={styles.footerLink} href="/category/mma">
              MMA
            </a>
            <a className={styles.footerLink} href="/category/fitness">
              FITNESS
            </a>
            <a className={styles.footerLink} href="/category/yoga">
              YOGA
            </a>
            <a className={styles.footerLink} href="/category/apparel">
              APPAREL
            </a>
          </div>
          <div className="col-12 col-md-3">
            <div className={styles.footerTitle}>FOLLOW US</div>
            <a className={styles.footerLink} href="#">
              Facebook
            </a>
            <a className={styles.footerLink} href="#">
              Twitter
            </a>
            <a className={styles.footerLink} href="#">
              Instagram
            </a>
          </div>
          <div className="col-12 col-md-3">
            <div className={styles.footerTitle}>CONTACT US</div>
            <div className={styles.footerSmall}>
              H261, Phase2, Model Town, Pasrur Road,
              <br />
              Sialkot 51310 PAKISTAN
            </div>
            <div className={styles.footerSmall} style={{ marginTop: 10 }}>
              Phone: +92 331 4083626
              <br />
              Phone: +92 305 1982599
              <br />
              Email: info@zynosportswear.com
              <br />
              Web: www.zynosportswear.com
            </div>
          </div>
        </div>

        <hr
          style={{
            borderColor: 'rgba(255,255,255,0.15)',
            margin: '20px 0',
          }}
        />
        <div className="d-flex flex-column flex-md-row align-items-center justify-content-between gap-2">
          <div className={styles.footerSmall}>
            © 2024 - 25 COUGAR SPORTS | All Rights Reserved
          </div>
          <img
            src="/images/CGR logo.png"
            alt="CGR Sports"
            style={{ width: 140, height: 'auto', opacity: 0.9 }}
          />
        </div>
      </div>
    </footer>
  );
}
