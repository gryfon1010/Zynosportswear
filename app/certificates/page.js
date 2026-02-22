'use client';

import Image from 'next/image';
import StickyNavbar from '../components/StickyNavbar';
import Navbar from '../components/Navbar';
import styles from './page.module.css';

export default function CertificatesPage() {
  return (
    <main>
      <StickyNavbar>
        <Navbar />
      </StickyNavbar>

      <section className={styles.heroBar}>
        <div className="container">
          <div className={styles.heroInner}>
            <h1 className={styles.heroTitle}>Authorizations &amp; Certificates</h1>
            <nav className={styles.breadcrumb}>
              <a href="/">Home</a>
              <span className={styles.breadcrumbSep}>/</span>
              <span className={styles.breadcrumbCurrent}>Authorizations &amp; Certificates</span>
            </nav>
          </div>
        </div>
      </section>

      <div className="container py-5" style={{ maxWidth: 1200 }}>
        <div className="row g-4">
          <div className="col-12 col-lg-6">
            <div
              className="border rounded bg-light d-flex align-items-center justify-content-center"
              style={{ padding: 16, height: '100%' }}
            >
              {/* Use a regular img tag instead of next/image since other pages use plain img */}
              <img
                src="/images/EXCLUSIVE DISTRIBUTION AGREEMENT-1 (1)_page-0001.jpg.jpeg"
                alt="Exclusive Distribution Agreement between RDX and COUGAR Sports"
                style={{ width: '100%', height: 'auto', maxHeight: 900, objectFit: 'contain' }}
              />
            </div>
          </div>
          <div className="col-12 col-lg-6">
            <div style={{ color: '#4b5563', fontSize: 14, lineHeight: 1.6, fontWeight: 500 }}>
              <p>
                Cougar Sports is the official and authorized distributor of RDX Sports in our designated territory. We work exclusively with RDX, ensuring that all products supplied through us are 100% genuine, high-quality, and backed by the global standards of the RDX brand.
              </p>
              <p>
                As the sole distributor, Cougar Sports focuses on wholesale supply and customized sports equipment solutions. We provide a complete range of RDX combat sports and fitness equipment, including boxing gear, MMA equipment, training accessories, protective gear, and performance products.
              </p>
              <p>
                In addition to wholesale distribution, we specialize in customized equipment tailored for gyms, retailers, sports academies, clubs, corporate clients, and teams. Our goal is to deliver premium products, competitive pricing, reliable supply, and professional service.
              </p>
              <p>
                Through our exclusive partnership with RDX, Cougar Sports is committed to supporting the growth of combat sports and fitness by providing athletes and businesses with trusted, world-class equipment.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
