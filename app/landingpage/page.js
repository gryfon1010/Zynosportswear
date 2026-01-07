'use client';

import { useEffect, useState } from 'react';
import Script from 'next/script';
import Navbar from '../components/Navbar';
import StickyNavbar from '../components/StickyNavbar';
import styles from './page.module.css';
import FloatingActions from '../FloatingActions';

export default function LandingPage() {
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch('/api/storefront/featured');
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;
        if (cancelled) return;
        setFeatured(Array.isArray(data.items) ? data.items : []);
      } catch {
        // ignore
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className={styles.page}>
      <StickyNavbar>
        <Navbar showBlackBar={false} />
      </StickyNavbar>

      <section className={`container-fluid px-0 ${styles.heroGrid}`}>
        <div className="row g-0">
          <div className="col-12 col-md-3">
            <a href="/category/sports-wear" className="text-decoration-none">
              <div className={styles.heroTile}>
                <img
                  src="https://zynosportswear.com/wp-content/uploads/2024/06/btn1-1.jpg"
                  alt="Team Wear"
                  className={styles.heroImg}
                />
              </div>
            </a>
          </div>
          <div className="col-12 col-md-3">
            <a href="/category/outer-wear" className="text-decoration-none">
              <div className={styles.heroTile}>
                <img
                  src="https://zynosportswear.com/wp-content/uploads/2024/06/btn2.jpg"
                  alt="Outer Wear"
                  className={styles.heroImg}
                />
              </div>
            </a>
          </div>
          <div className="col-12 col-md-3">
            <a href="/category/fitness-wear" className="text-decoration-none">
              <div className={styles.heroTile}>
                <img
                  src="https://zynosportswear.com/wp-content/uploads/2024/06/btn4.jpg"
                  alt="Fitness Wear"
                  className={styles.heroImg}
                />
              </div>
            </a>
          </div>
          <div className="col-12 col-md-3">
            <a href="/category/sublimated-garments" className="text-decoration-none">
              <div className={styles.heroTile}>
                <img
                  src="https://zynosportswear.com/wp-content/uploads/2024/06/btn3.jpg"
                  alt="Sublimated"
                  className={styles.heroImg}
                />
              </div>
            </a>
          </div>
        </div>
      </section>

      <section className="container py-4">
        <div className={styles.sectionTitle}>
          <h2>FEATURED PRODUCTS</h2>
          <div className={styles.sectionTitleLine} />
        </div>

        <div className="row g-4 justify-content-center">
          {featured.map((p) => {
            const img = Array.isArray(p?.images) && p.images.length ? p.images[0]?.url : null;
            return (
              <div className="col-6 col-lg-3" key={p.id}>
                <a href={`/product/${p.slug}`} className="text-decoration-none">
                  <div className={styles.featuredCard}>
                    {img ? <img className={styles.featuredImg} src={img} alt={p.name} /> : null}
                    <div className={styles.featuredName}>{p.name}</div>
                    <div className={styles.featuredCode}>{p.sku || ''}</div>
                  </div>
                </a>
              </div>
            );
          })}
        </div>
      </section>

      <section
        className={styles.aboutSection}
        style={{
          backgroundImage:
            'url(https://zynosportswear.com/wp-content/uploads/2024/05/mid-ban.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="container">
          <div className={`row align-items-stretch ${styles.aboutInner}`}>
            <div
              className="col-12 col-lg-6 d-flex align-items-center justify-content-center"
              style={{ borderRight: '2px solid #fff' }}
            >
              <img
                src="https://zynosportswear.com/wp-content/uploads/2024/08/vecteezy_basketball-player-dribbling-ball-in-green-uniform-on_46572102-768x960.png"
                alt="Basketball player"
                className={styles.aboutImg}
              />
            </div>
            <div className="col-12 col-lg-6 py-4 py-lg-0 d-flex align-items-center">
              <div className="px-lg-3">
                <div className={styles.aboutHeading}>Welcome to Zyno Sportswear</div>
                <p className={styles.aboutCopy}>
                  At Zyno Sportswear, we are passionate about crafting high-quality, custom teamwear and sportswear that not only meets but exceeds the expectations of athletes and teams worldwide. With a commitment to excellence and innovation, we provide a comprehensive range of products designed to enhance performance, comfort, and style.
                </p>
                <div className={styles.aboutHeading}>What We Offer</div>
                <p className={styles.aboutCopy}>
                  <strong style={{ color: '#1bb8aa' }}>Custom Teamwear:</strong> Like Baseball, Basketball, Football, Soccer, Hockey, Volleyball uniform and Sublimated Garments, we offer fully customizable team uniforms that reflect your team’s identity.
                </p>
                <p className={styles.aboutCopy}>
                  <strong style={{ color: '#1bb8aa' }}>Customization:</strong> Our state-of-the-art customization options allow you to create apparel that truly represents your team.
                </p>
                <p className={styles.aboutCopy}>
                  <strong style={{ color: '#1bb8aa' }}>Innovation:</strong> We stay ahead of the curve by incorporating the latest technology and design trends into our products.
                </p>
                <p className={styles.aboutCopy}>
                  <strong style={{ color: '#1bb8aa' }}>Customer Service:</strong> Our dedicated team is here to support you every step of the way, from design to delivery.
                </p>
                <div className={styles.aboutHeading}>Join us</div>
                <p className={styles.aboutCopy}>
                  Whether you’re a professional team, a school, or a local club, zyno sportswear is your trusted partner for all your teamwear and sportswear needs. Let’s work together to create apparel that inspires and performs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.brandBanner}>
        <div className="container">
          <h2 className={styles.brandBannerTitle}>ZYNO SPORTSWEAR</h2>
          <div className={styles.brandBannerSub}>WORKING WITH INTERNATIONAL BRANDS</div>
        </div>
      </section>

      <section className={styles.followSection}>
        <div className="container">
          <div className={styles.sectionTitle}>
            <h2>FOLLOW US</h2>
            <div className={styles.sectionTitleLine} />
          </div>
        </div>

        <div className="container-fluid px-4">
          <div id="followCarousel" className="carousel slide" data-bs-ride="carousel">
            <div className="carousel-inner">
              <div className={`carousel-item active ${styles.carouselItemWrap}`}>
                <div className="row g-3">
                  <div className="col-6 col-md">
                    <img className={styles.carouselImg} src="https://zynosportswear.com/wp-content/uploads/2025/01/H-110-330x402.jpg" alt="Follow 1" />
                  </div>
                  <div className="col-6 col-md">
                    <img className={styles.carouselImg} src="https://zynosportswear.com/wp-content/uploads/2025/01/DJJ-661-330x402.jpg" alt="Follow 2" />
                  </div>
                  <div className="col-6 col-md">
                    <img className={styles.carouselImg} src="https://zynosportswear.com/wp-content/uploads/2025/01/DJJ-662-330x402.jpg" alt="Follow 3" />
                  </div>
                  <div className="col-6 col-md">
                    <img className={styles.carouselImg} src="https://zynosportswear.com/wp-content/uploads/2025/01/CJT-658-330x402.jpg" alt="Follow 4" />
                  </div>
                  <div className="col-6 col-md d-none d-md-block">
                    <img className={styles.carouselImg} src="https://zynosportswear.com/wp-content/uploads/2024/06/TS-5573-330x402.jpg" alt="Follow 5" />
                  </div>
                </div>
              </div>

              <div className={`carousel-item ${styles.carouselItemWrap}`}>
                <div className="row g-3">
                  <div className="col-6 col-md">
                    <img className={styles.carouselImg} src="https://zynosportswear.com/wp-content/uploads/2024/06/TS-5572-330x402.jpg" alt="Follow 6" />
                  </div>
                  <div className="col-6 col-md">
                    <img className={styles.carouselImg} src="https://zynosportswear.com/wp-content/uploads/2024/06/TS-5571-330x402.jpg" alt="Follow 7" />
                  </div>
                  <div className="col-6 col-md">
                    <img className={styles.carouselImg} src="https://zynosportswear.com/wp-content/uploads/2024/06/TS-5570-330x402.jpg" alt="Follow 8" />
                  </div>
                  <div className="col-6 col-md">
                    <img className={styles.carouselImg} src="https://zynosportswear.com/wp-content/uploads/2024/06/TS-5567-330x402.jpg" alt="Follow 9" />
                  </div>
                  <div className="col-6 col-md d-none d-md-block">
                    <img className={styles.carouselImg} src="https://zynosportswear.com/wp-content/uploads/2024/06/TS-5566-330x402.jpg" alt="Follow 10" />
                  </div>
                </div>
              </div>
            </div>

            <button
              className="carousel-control-prev"
              type="button"
              data-bs-target="#followCarousel"
              data-bs-slide="prev"
            >
              <span className="carousel-control-prev-icon" aria-hidden="true"></span>
              <span className="visually-hidden">Previous</span>
            </button>
            <button
              className="carousel-control-next"
              type="button"
              data-bs-target="#followCarousel"
              data-bs-slide="next"
            >
              <span className="carousel-control-next-icon" aria-hidden="true"></span>
              <span className="visually-hidden">Next</span>
            </button>
          </div>
        </div>

        <div className="container d-none">
          <div className="tagembed-widget" style={{ width: '100%', height: '100%' }} data-widget-id="158159" />
          <Script src="//widget.tagembed.com/embed.min.js" strategy="afterInteractive" />
        </div>
      </section>

      <footer className={styles.footer}>
        <div className="container">
          <div className="row gy-4">
            <div className="col-12 col-md-3">
              <div className={styles.footerTitle}>INFORMATION</div>
              <a className={styles.footerLink} href="/landingpage">Home</a>
              <a className={styles.footerLink} href="/about-us/">About us</a>
              <a className={styles.footerLink} href="/contact-us/">Contact us</a>
            </div>
            <div className="col-12 col-md-3">
              <div className={styles.footerTitle}>PRODUCTS</div>
              <a className={styles.footerLink} href="/category/sports-wear">SPORTS WEAR</a>
              <a className={styles.footerLink} href="/category/outer-wear">OUTER WEAR</a>
              <a className={styles.footerLink} href="/category/sublimated-garments">SUBLIMATED GARMENTS</a>
              <a className={styles.footerLink} href="/category/fitness-wear">FITNESS WEAR</a>
              <a className={styles.footerLink} href="/category/accessories">ACCESSORIES</a>
            </div>
            <div className="col-12 col-md-3">
              <div className={styles.footerTitle}>FOLLOW US</div>
              <a className={styles.footerLink} href="#">Facebook</a>
              <a className={styles.footerLink} href="#">Twitter</a>
              <a className={styles.footerLink} href="#">Instagram</a>
            </div>
            <div className="col-12 col-md-3">
              <div className={styles.footerTitle}>CONTACT US</div>
              <div className={styles.footerSmall}>
                H261, Phase2, Model Town, Pasrur Road,<br />
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

          <hr style={{ borderColor: 'rgba(255,255,255,0.15)', margin: '20px 0' }} />
          <div className="d-flex flex-column flex-md-row align-items-center justify-content-between gap-2">
            <div className={styles.footerSmall}>© 2024 - 25 ZYNO SPORTSWEAR | All Rights Reserved</div>
            <img
              src="/images/Navbar%20logo.png"
              alt="Zyno Sportswear"
              style={{ width: 90, height: 'auto', opacity: 0.9 }}
            />
          </div>
        </div>
      </footer>

      <FloatingActions />
    </main>
  );
}
