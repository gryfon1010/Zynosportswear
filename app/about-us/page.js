'use client';

import Navbar from '../components/Navbar';
import StickyNavbar from '../components/StickyNavbar';
import FloatingActions from '../FloatingActions';
import styles from './page.module.css';

export default function AboutUsPage() {
  return (
    <main className={styles.page}>
      <StickyNavbar>
        <Navbar showBlackBar={false} />
      </StickyNavbar>

      <section className={styles.heroBar}>
        <div className="container">
          <div className={styles.heroInner}>
            <h1 className={styles.heroTitle}>About us</h1>
            <nav className={styles.breadcrumb} aria-label="Breadcrumb">
              <a href="/landingpage">Home</a>
              <span className={styles.breadcrumbSep}>/</span>
              <span className={styles.breadcrumbCurrent}>About us</span>
            </nav>
          </div>
        </div>
      </section>

      <section className={styles.contentSection}>
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-12 col-lg-10">
              <hr className={styles.divider} />
              <h2 className={styles.heading}>About COUGAR Sports</h2>

              <p className={styles.copy}>
                COUGAR Sports is a performance-driven sports brand dedicated to delivering premium-quality, fully
                customized combat sports gear. We specialize in serving businesses, academies, gyms, teams, and
                individual athletes across boxing, martial arts, karate, jiu-jitsu, and related disciplines.
              </p>

              <p className={styles.copy}>
                Our mission is simple: to empower our clients with gear that reflects their identity, standards,
                and performance needs. From concept to final product, we focus on precision craftsmanship, durable
                materials, and tailored designs that align with each customer&apos;s vision. Whether you are a growing
                gym, an established brand, or a large organization, COUGAR Sports provides scalable solutions without
                compromising on quality.
              </p>

              <p className={styles.copy}>
                What sets COUGAR Sports apart is our commitment to customization, reliability, and long-term
                partnerships. We understand the demands of combat sports and work closely with our clients to
                deliver products that combine functionality, comfort, and style.
              </p>

              <p className={styles.copy}>
                At COUGAR Sports, we don&apos;t just manufacture sports equipment — we help build brands, elevate
                performance, and support the fighters and businesses shaping the future of combat sports.
              </p>

              <div className={styles.logoWrap}>
                <img
                  src="/images/CGR logo.png"
                  alt="COUGAR Sports"
                  className={styles.logoImg}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <FloatingActions />
    </main>
  );
}
