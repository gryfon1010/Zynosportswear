'use client';

import { useEffect, useRef, useState } from 'react';
import Script from 'next/script';
import Navbar from '../components/Navbar';
import StickyNavbar from '../components/StickyNavbar';
import styles from './page.module.css';
import FloatingActions from '../FloatingActions';

export default function LandingPage() {
  const [featured, setFeatured] = useState([]);
  const featuredScrollerRef = useRef(null);

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
            <a href="/category/boxing" className="text-decoration-none">
              <div className={styles.heroTile}>
                <div className={styles.heroTag}>BOXING</div>
                <img
                  src="/images/boxing landing page image.jpeg"
                  alt="Boxing"
                  className={styles.heroImg}
                />
              </div>
            </a>
          </div>
          <div className="col-12 col-md-3">
            <a href="/category/mma" className="text-decoration-none">
              <div className={styles.heroTile}>
                <div className={styles.heroTag}>MMA</div>
                <img
                  src="/images/MMA landing page image.jpeg"
                  alt="MMA"
                  className={styles.heroImg}
                />
              </div>
            </a>
          </div>
          <div className="col-12 col-md-3">
            <a href="/category/fitness" className="text-decoration-none">
              <div className={styles.heroTile}>
                <div className={styles.heroTag}>FITNESS</div>
                <img
                  src="/images/Fitness landingpage image.jpeg"
                  alt="Fitness"
                  className={styles.heroImg}
                />
              </div>
            </a>
          </div>
          <div className="col-12 col-md-3">
            <a href="/category/apparel" className="text-decoration-none">
              <div className={styles.heroTile}>
                <div className={styles.heroTag}>APPAREL</div>
                <img
                  src="/images/Apparel landing page image.jpeg"
                  alt="Apparel"
                  className={styles.heroImg}
                />
              </div>
            </a>
          </div>
        </div>
      </section>

      <section className="container-fluid px-0 py-4">
        <div className={styles.sectionTitle}>
          <h2>FEATURED PRODUCTS</h2>
          <div className={styles.sectionTitleLine} />
        </div>

        {featured.length ? (
          <div className={styles.featuredScroller} ref={featuredScrollerRef}>
            <button
              type="button"
              className={styles.featuredArrowLeft}
              onClick={() => {
                if (!featuredScrollerRef.current) return;
                featuredScrollerRef.current.scrollBy({ left: -260, behavior: 'smooth' });
              }}
              aria-label="Previous featured product"
            >
              ‹
            </button>

            <div className={styles.featuredTrack}>
              {[...featured, ...featured].map((p, idx) => {
                const img = Array.isArray(p?.images) && p.images.length ? p.images[0]?.url : null;
                return (
                  <div className={styles.featuredSlide} key={`${p.id}-${idx}`}>
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

            <button
              type="button"
              className={styles.featuredArrowRight}
              onClick={() => {
                if (!featuredScrollerRef.current) return;
                featuredScrollerRef.current.scrollBy({ left: 260, behavior: 'smooth' });
              }}
              aria-label="Next featured product"
            >
              ›
            </button>
          </div>
        ) : null}
      </section>

      <section className={styles.aboutSection}>
        <div className="container">
          <div className={`row align-items-stretch ${styles.aboutInner}`}>
            <div className="col-12 col-lg-6 d-flex align-items-center justify-content-center">
              <img
                src="/images/Welcome Landing page image .jpeg"
                alt="Welcome to Zyno Sportswear"
                className={styles.aboutImg}
              />
            </div>
            <div className="col-12 col-lg-6 py-4 py-lg-0 d-flex align-items-center">
              <div className="px-lg-3">
                <div className={styles.aboutHeading}>About CGR Sports</div>
                <p className={styles.aboutCopy}>
                  CGR Sports is a performance-driven combat sports brand that specializes in premium-quality, fully
                  customized combat sports gear. We serve businesses, academies, gyms, teams, and individual athletes
                  across boxing, martial arts, karate, jiu-jitsu, and related disciplines.
                </p>

                <div className={styles.aboutHeading}>Our Mission</div>
                <ul className={styles.aboutCopy}>
                  <li>To provide gear that reflects each client&apos;s identity, standards, and performance needs.</li>
                  <li>To focus on precision craftsmanship from concept to final product.</li>
                  <li>To use durable materials and tailored designs for long-lasting performance.</li>
                </ul>

                <div className={styles.aboutHeading}>What We Offer</div>
                <ul className={styles.aboutCopy}>
                  <li>Fully customized combat sports equipment and apparel.</li>
                  <li>Design solutions aligned with each customer&apos;s vision and brand requirements.</li>
                  <li>Scalable production for growing gyms, established brands, and large organizations.</li>
                  <li>Consistent quality without compromise.</li>
                </ul>

                <div className={styles.aboutHeading}>What Sets CGR Sports Apart</div>
                <ul className={styles.aboutCopy}>
                  <li>Strong commitment to customization.</li>
                  <li>High standards of reliability and consistency.</li>
                  <li>Focus on long-term partnerships with clients.</li>
                  <li>Deep understanding of the real demands of combat sports.</li>
                </ul>

                <div className={styles.aboutHeading}>Our Approach</div>
                <ul className={styles.aboutCopy}>
                  <li>Close collaboration with clients at every stage.</li>
                  <li>Products that combine functionality, comfort, and style.</li>
                  <li>More than manufacturing — we help build brands and elevate performance.</li>
                </ul>

                <div className={styles.aboutHeading}>Our Vision</div>
                <p className={styles.aboutCopy}>
                  To support fighters and organizations shaping the future of combat sports.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.brandBanner}>
        <div className="container">
          <h2 className={styles.brandBannerTitle}>COUGAR SPORTS</h2>
          <div className={styles.brandBannerSub}>WORKING WITH INTERNATIONAL BRANDS</div>
        </div>
      </section>

      {/*
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
      */}

      <FloatingActions />
    </main>
  );
}
