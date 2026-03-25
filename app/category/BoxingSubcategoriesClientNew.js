'use client';

import styles from './page.module.css';

export default function BoxingSubcategoriesClient({ subcategories, categoryName, categoryImage }) {
  // Sort subcategories by sortOrder
  const sortedSubcats = [...subcategories].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <>
      {/* Hero Banner Section */}
      <section className={styles.heroBanner}>
        <div className={styles.heroOverlay}>
          <div className="container h-100">
            <div className="row h-100 align-items-center">
              <div className="col-12 text-center text-md-start">
                <p className={styles.heroTagline}>MOVE.IMPROVE.EVOLVE</p>
                <h1 className={styles.heroTitle}>BOXING GEAR</h1>
              </div>
            </div>
          </div>
        </div>
        {categoryImage && (
          <img 
            src={categoryImage} 
            alt={categoryName} 
            className={styles.heroBgImage}
          />
        )}
      </section>

      {/* Subcategory Sections */}
      <div className="container-fluid px-4 py-5">
        {sortedSubcats.map((subcat, index) => {
          const isEven = index % 2 === 0;
          const hasProducts = subcat.products && subcat.products.length > 0;
          
          return (
            <section key={subcat.id} className={`${styles.subcategorySection} mb-5`}>
              <div className="row g-4 align-items-center">
                {/* Large Promotional Image - alternates left/right */}
                <div className={`col-12 col-lg-6 ${isEven ? 'order-1' : 'order-2'}`}>
                  <a href={`/category/${subcat.slug}`} className="text-decoration-none">
                    <div className={styles.promoCard}>
                      {subcat.image ? (
                        <img 
                          src={subcat.image} 
                          alt={subcat.name} 
                          className={styles.promoImage}
                        />
                      ) : (
                        <div className={styles.promoImagePlaceholder}>
                          <span>{subcat.name}</span>
                        </div>
                      )}
                      <div className={styles.promoOverlay}>
                        <span className={styles.viewAllBtn}>VIEW ALL</span>
                        <h3 className={styles.promoTitle}>{subcat.name}</h3>
                      </div>
                    </div>
                  </a>
                </div>

                {/* Products Grid - alternates right/left */}
                <div className={`col-12 col-lg-6 ${isEven ? 'order-2' : 'order-1'}`}>
                  {hasProducts ? (
                    <div className="row g-3">
                      {subcat.products.map((product) => {
                        const img = product.images && product.images.length > 0 
                          ? product.images[0].url 
                          : null;
                        return (
                          <div className="col-6 col-md-4" key={product.id}>
                            <a 
                              href={`/product/${product.slug}`} 
                              className="text-decoration-none"
                            >
                              <div className={styles.productCard}>
                                {img ? (
                                  <img 
                                    src={img} 
                                    alt={product.name}
                                    className={styles.productImg}
                                  />
                                ) : (
                                  <div className={styles.productImgPlaceholder}>
                                    <span>{product.name}</span>
                                  </div>
                                )}
                                <div className={styles.productName}>{product.name}</div>
                              </div>
                            </a>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center text-muted py-5">
                      No products available in this category yet.
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
