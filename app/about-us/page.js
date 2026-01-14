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
              <h2 className={styles.heading}>ZYNO SPORTSWEAR</h2>

              <p className={styles.copy}>
                Established in 2018, ZYNO SPORTSWEAR is a premier provider of sportswear, teamwear, outerwear,
                sublimated garments, and accessories. Our forte lies in crafting bespoke sports attire tailored
                precisely to your needs. Leveraging state-of-the-art printing techniques, we deliver sports
                apparel of exceptional quality, adorned with vivid and intricate prints that endure the test of
                time.
              </p>

              <p className={styles.copy}>
                At ZYNO SPORTSWEAR, our dedicated in-house design team consistently produces remarkable designs
                for individuals, teams, and clubs. For any design inquiries, feel free to contact us at{' '}
                <a
                  href="mailto:info@zynosportswear.com"
                  className={styles.emailLink}
                >
                  info@zynosportswear.com
                </a>
                . We assure you a response within 24 hours, along with a competitive price quote for a distinctive
                design your team will proudly sport.
              </p>

              <p className={styles.copy}>
                Our website serves as a platform showcasing the limitless creativity and skill of our designers.
                Our goal is to offer customers unique apparel options at competitive prices. Outfit your team with
                customized uniforms and accessories reflecting the latest trends. Our personalized jerseys ensure
                that players, coaches, and fans exude their best appearance at every game.
              </p>

              <p className={styles.copy}>
                To uphold superior quality and consistency, we procure premium performance fabrics from renowned
                textile mills. Each garment undergoes meticulous manufacturing under stringent quality control
                standards, ensuring unparalleled craftsmanship.
              </p>

              <p className={styles.copy}>
                For any assistance with your order, don&apos;t hesitate to reach out to us via email or through the
                Contact Page on our website. Our staff is dedicated to providing prompt and friendly support, solely
                focused on ensuring your complete satisfaction with every order.
              </p>

              <div className={styles.logoWrap}>
                <img
                  src="/images/zyno-1.png"
                  alt="Zyno Sportswear"
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
