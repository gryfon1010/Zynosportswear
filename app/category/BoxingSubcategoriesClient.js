'use client';

import styles from './page.module.css';

// Boxing images
const BOXING_SUBCAT_IMAGES = [
  'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&q=80',
  'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=800&q=80',
  'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=800&q=80',
  'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800&q=80',
  'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&q=80',
  'https://images.unsplash.com/photo-1583473848882-f9a5bc7fd2ee?w=800&q=80',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
];

const BOXING_PAGE_IMAGES = [
  'https://images.unsplash.com/photo-1576678927484-cc907957088c?w=400&q=80',
  'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=400&q=80',
  'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=400&q=80',
  'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=400&q=80',
  'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=400&q=80',
  'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400&q=80',
  'https://images.unsplash.com/photo-1583473848882-f9a5bc7fd2ee?w=400&q=80',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80',
];

// MMA images - completely unique set for MMA category (no overlaps with boxing)
const MMA_SUBCAT_IMAGES = [
  'https://images.unsplash.com/photo-1552072092-7f9b8d63efcb?w=800&q=80',
  'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800&q=80',
  'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=800&q=80',
  'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&q=80',
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80',
  'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80',
  'https://images.unsplash.com/photo-1583473848882-f9a5bc7fd2ee?w=800&q=80',
];

const MMA_PAGE_IMAGES = [
  'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&q=80',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80',
  'https://images.unsplash.com/photo-1583473848882-f9a5bc7fd2ee?w=400&q=80',
  'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=400&q=80',
  'https://images.unsplash.com/photo-1576678927484-cc907957088c?w=400&q=80',
  'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&q=80',
  'https://images.unsplash.com/photo-1598971639058-9f1c605667fd?w=400&q=80',
  'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=400&q=80',
];

export default function BoxingSubcategoriesClient({ subcategories, categoryName, categoryImage, categoryType = 'boxing' }) {
  // Sort subcategories by sortOrder
  const sortedSubcats = [...subcategories].sort((a, b) => a.sortOrder - b.sortOrder);
  
  const isMMA = categoryType === 'mma';
  const SUBCAT_IMAGES = isMMA ? MMA_SUBCAT_IMAGES : BOXING_SUBCAT_IMAGES;
  const PAGE_IMAGES = isMMA ? MMA_PAGE_IMAGES : BOXING_PAGE_IMAGES;
  const heroTitle = isMMA ? 'MMA GEAR' : 'BOXING GEAR';
  const defaultHeroImage = isMMA 
    ? 'https://images.unsplash.com/photo-1552072092-7f9b8d63efcb?w=1920&q=80'
    : 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=1920&q=80';

  return (
    <>
      {/* Hero Banner Section */}
      <section className={styles.heroBanner}>
        <div className={styles.heroOverlay}>
          <div className="container h-100">
            <div className="row h-100 align-items-center">
              <div className="col-12 text-center text-md-start">
                <div className={styles.heroContent}>
                  <p className={styles.heroTagline}>MOVE.IMPROVE.EVOLVE</p>
                  <h1 className={styles.heroTitle}>{heroTitle}</h1>
                </div>
              </div>
            </div>
          </div>
        </div>
        <img 
          src={categoryImage || defaultHeroImage} 
          alt={categoryName} 
          className={styles.heroBgImage}
        />
      </section>

      {/* Subcategory Sections */}
      <div className="container-fluid px-0 py-5">
        {sortedSubcats.map((subcat, index) => {
          const isEven = index % 2 === 0;
          const hasPages = subcat.pages && subcat.pages.length > 0;
          const subcatImage = subcat.image || SUBCAT_IMAGES[index % SUBCAT_IMAGES.length];
          
          return (
            <section key={subcat.id} className={`${styles.subcategorySection} mb-5`}>
              <div className="row g-4 align-items-center">
                {/* Large Promotional Image - alternates left/right */}
                <div className={`col-12 col-lg-6 ${isEven ? 'order-1' : 'order-2'}`}>
                  <a href={`/category/${subcat.slug}`} className="text-decoration-none">
                    <div className={styles.promoCard}>
                      <img 
                        src={subcatImage} 
                        alt={subcat.name} 
                        className={styles.promoImage}
                      />
                      <div className={styles.promoOverlay}>
                        <span className={styles.viewAllBtn}>VIEW ALL</span>
                        <h3 className={styles.promoTitle}>{subcat.name}</h3>
                      </div>
                    </div>
                  </a>
                </div>

                {/* Pages Grid - alternates right/left */}
                <div className={`col-12 col-lg-6 ${isEven ? 'order-2' : 'order-1'}`}>
                  {hasPages ? (
                    <div className="row g-3 justify-content-start">
                      {subcat.pages.map((page, pageIndex) => {
                        const img = page.image || PAGE_IMAGES[pageIndex % PAGE_IMAGES.length];
                        return (
                          <div className="col-6 col-md-4 col-lg-3" key={page.id}>
                            <a 
                              href={`/category/${page.slug}`} 
                              className="text-decoration-none"
                            >
                              <div className={styles.pageCard}>
                                <img 
                                  src={img} 
                                  alt={page.name}
                                  className={styles.pageImg}
                                />
                                <div className={styles.pageName}>{page.name}</div>
                              </div>
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center text-muted py-5">
                      No pages available in this category yet.
                    </div>
                  )}
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
