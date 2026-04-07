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

// Fitness images - completely unique set for fitness category
const FITNESS_SUBCAT_IMAGES = [
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80',
  'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&q=80',
  'https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?w=800&q=80',
  'https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?w=800&q=80',
  'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&q=80',
  'https://images.unsplash.com/photo-1583473848882-f9a5bc7fd2ee?w=800&q=80',
];

const FITNESS_PAGE_IMAGES = [
  'https://images.unsplash.com/photo-1576678927484-cc907957088c?w=400&q=80',
  'https://images.unsplash.com/photo-1552072092-7f9b8d63efcb?w=400&q=80',
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80',
  'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&q=80',
  'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=400&q=80',
  'https://images.unsplash.com/photo-1598971639058-9f1c605667fd?w=400&q=80',
  'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=400&q=80',
  'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=400&q=80',
];

// Apparel images - completely unique set for apparel category
const APPAREL_SUBCAT_IMAGES = [
  'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800&q=80',
  'https://images.unsplash.com/photo-1518459031867-a89b944bffe4?w=800&q=80',
  'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=800&q=80',
  'https://images.unsplash.com/photo-1559582930-bb01987cf4dd?w=800&q=80',
  'https://images.unsplash.com/photo-1581655353564-df123a1eb820?w=800&q=80',
  'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=800&q=80',
  'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=800&q=80',
];

const APPAREL_PAGE_IMAGES = [
  'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400&q=80',
  'https://images.unsplash.com/photo-1559582930-bb01987cf4dd?w=400&q=80',
  'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=400&q=80',
  'https://images.unsplash.com/photo-1518459031867-a89b944bffe4?w=400&q=80',
  'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=400&q=80',
  'https://images.unsplash.com/photo-1581655353564-d851c5c3a990?w=400&q=80',
  'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=400&q=80',
  'https://images.unsplash.com/photo-1618354691373-d851c5c3a990?w=400&q=80',
];

// Kids images - completely unique set for kids category with highly relevant kids sports imagery
const KIDS_SUBCAT_IMAGES = [
  'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80', // kids boxing gloves
  'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=800&q=80', // kids martial arts
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80', // kids training
  'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=800&q=80', // kids sports
  'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=800&q=80', // kids fitness
  'https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=800&q=80', // kids activities
  'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=800&q=80', // youth sports
];

const KIDS_PAGE_IMAGES = [
  'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&q=80', // kids boxing gloves
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80', // kids punch bag
  'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=80', // kids training
  'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=400&q=80', // kids sports
  'https://images.unsplash.com/photo-1584464491033-06628f3a6b7b?w=400&q=80', // kids fitness
  'https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=400&q=80', // kids activities
  'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=400&q=80', // youth sports
  'https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=400&q=80', // kids martial arts
];

// Collections images - completely unique set for collections category
const COLLECTIONS_SUBCAT_IMAGES = [
  'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=800&q=80',
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80',
  'https://images.unsplash.com/photo-1552072092-7f9b8d63efcb?w=800&q=80',
  'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=800&q=80',
  'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=800&q=80',
  'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=800&q=80',
  'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80',
];

const COLLECTIONS_PAGE_IMAGES = [
  'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=400&q=80',
  'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80',
  'https://images.unsplash.com/photo-1552072092-7f9b8d63efcb?w=400&q=80',
  'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=400&q=80',
  'https://images.unsplash.com/photo-1555597673-b21d5c935865?w=400&q=80',
  'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=400&q=80',
  'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=400&q=80',
  'https://images.unsplash.com/photo-1583473848882-f9a5bc7fd2ee?w=400&q=80',
];

export default function BoxingSubcategoriesClient({ subcategories, categoryName, categoryImage, categoryType = 'boxing' }) {
  // Sort subcategories by sortOrder
  const sortedSubcats = [...subcategories].sort((a, b) => a.sortOrder - b.sortOrder);
  
  const isMMA = categoryType === 'mma';
  const isFitness = categoryType === 'fitness';
  const isApparel = categoryType === 'apparel';
  const isCollections = categoryType === 'collections';
  const isKids = categoryType === 'kids';
  const isBoxing = categoryType === 'boxing';
  
  let SUBCAT_IMAGES, PAGE_IMAGES, heroTitle, defaultHeroImage;
  
  if (isBoxing) {
    SUBCAT_IMAGES = BOXING_SUBCAT_IMAGES;
    PAGE_IMAGES = BOXING_PAGE_IMAGES;
    heroTitle = 'BOXING GEAR';
    defaultHeroImage = '/images/Boxing Main picture.jpg';
  } else if (isKids) {
    SUBCAT_IMAGES = KIDS_SUBCAT_IMAGES;
    PAGE_IMAGES = KIDS_PAGE_IMAGES;
    heroTitle = 'KIDS';
    defaultHeroImage = 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1920&q=80';
  } else if (isCollections) {
    SUBCAT_IMAGES = COLLECTIONS_SUBCAT_IMAGES;
    PAGE_IMAGES = COLLECTIONS_PAGE_IMAGES;
    heroTitle = 'COLLECTIONS';
    defaultHeroImage = 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=1920&q=80';
  } else if (isApparel) {
    SUBCAT_IMAGES = APPAREL_SUBCAT_IMAGES;
    PAGE_IMAGES = APPAREL_PAGE_IMAGES;
    heroTitle = 'APPAREL';
    defaultHeroImage = 'https://images.unsplash.com/photo-1556906781-9a412961c28c?w=1920&q=80';
  } else if (isFitness) {
    SUBCAT_IMAGES = FITNESS_SUBCAT_IMAGES;
    PAGE_IMAGES = FITNESS_PAGE_IMAGES;
    heroTitle = 'FITNESS GEAR';
    defaultHeroImage = 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1920&q=80';
  } else if (isMMA) {
    SUBCAT_IMAGES = MMA_SUBCAT_IMAGES;
    PAGE_IMAGES = MMA_PAGE_IMAGES;
    heroTitle = 'MMA GEAR';
    defaultHeroImage = 'https://images.unsplash.com/photo-1552072092-7f9b8d63efcb?w=1920&q=80';
  } else {
    SUBCAT_IMAGES = BOXING_SUBCAT_IMAGES;
    PAGE_IMAGES = BOXING_PAGE_IMAGES;
    heroTitle = 'BOXING GEAR';
    defaultHeroImage = 'https://images.unsplash.com/photo-1549719386-74dfcbf7dbed?w=1920&q=80';
  }

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
          // Use custom images for specific sections
          const isBoxingGlovesSection = subcat.name === 'Boxing Gloves';
          const isCoachingEquipmentSection = subcat.name === 'Coaching Equipment';
          const isPunchBagsSection = subcat.name === 'Punch Bags';
          const isProtectiveGearSection = subcat.name === 'Protective Gear';
          const isTrainingEquipmentSection = subcat.name === 'Training Equipment';
          const isApparelSection = subcat.name === 'Apparel';
          const customBoxingGloveImage = '/images/Boxing%20Glove.jpeg';
          const customCoachingEquipmentImage = '/images/Coaching%20Equipment.jpeg';
          const customPunchingBagImage = '/images/Punching%20Bag.jpg';
          const customProtectiveGearImage = '/images/protective%20gear.jpg';
          const customTrainingEquipmentImage = '/images/Training%20Equipment.jpg';
          const customApparelImage = '/images/apparel.jpg';
          const subcatImage = isBoxingGlovesSection 
            ? customBoxingGloveImage 
            : isCoachingEquipmentSection
            ? customCoachingEquipmentImage
            : isPunchBagsSection
            ? customPunchingBagImage
            : isProtectiveGearSection
            ? customProtectiveGearImage
            : isTrainingEquipmentSection
            ? customTrainingEquipmentImage
            : isApparelSection
            ? customApparelImage
            : (subcat.image || SUBCAT_IMAGES[index % SUBCAT_IMAGES.length]);
          
          return (
            <section key={subcat.id} className={`${styles.subcategorySection} mb-5 ${subcat.name === 'Approvals / Certifications' ? 'align-items-start' : ''}`}>
              <div className={`row g-4 ${subcat.name === 'Approvals / Certifications' ? 'align-items-start' : 'align-items-center'}`}>
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
