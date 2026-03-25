import { notFound } from 'next/navigation';
import { getAdminDb } from '../../../lib/firebase/admin';
import Navbar from '../../components/Navbar';
import StickyNavbar from '../../components/StickyNavbar';
import CategoryProductsClient from '../CategoryProductsClient';
import BoxingSubcategoriesClient from '../BoxingSubcategoriesClient';
import styles from '../page.module.css';

export const runtime = 'nodejs';

export default async function CategoryPage({ params }) {
  const slug = params?.slug;
  if (!slug) return notFound();

  const adminDb = getAdminDb();
  if (!adminDb) return notFound();

  const catSnap = await adminDb.collection('categories').where('slug', '==', slug).limit(1).get();
  if (catSnap.empty) return notFound();

  const catDoc = catSnap.docs[0];
  const category = { id: catDoc.id, ...catDoc.data() };

  // Build breadcrumb hierarchy from parentId chain (main -> sub -> page)
  const breadcrumbAncestors = [];
  let current = category;
  // Safety limit to avoid accidental infinite loops
  for (let i = 0; i < 6; i++) {
    const parentId = current && current.parentId;
    if (!parentId) break;
    const parentSnap = await adminDb.collection('categories').doc(parentId).get();
    if (!parentSnap.exists) break;
    const parentData = parentSnap.data() || {};
    const parent = { id: parentSnap.id, ...parentData };
    breadcrumbAncestors.unshift(parent);
    current = parent;
  }

  // Check if this is the boxing or MMA category; if so, show subcategories instead of products
  const isBoxingCategory = slug === 'boxing';
  const isMMACategory = slug === 'mma' || slug === 'mixed-martial-arts';
  const isSpecialCategory = isBoxingCategory || isMMACategory;

  let subcategories = [];
  let products = [];

  if (isSpecialCategory) {
    // Fetch subcategories of boxing
    const subcatSnap = await adminDb.collection('categories').where('parentId', '==', category.id).get();
    subcategories = subcatSnap.docs.map((d) => {
      const data = d.data() || {};
      return {
        id: d.id,
        name: typeof data.name === 'string' ? data.name : '',
        slug: typeof data.slug === 'string' ? data.slug : '',
        image: typeof data.image === 'string' ? data.image : '',
        description: typeof data.description === 'string' ? data.description : '',
        active: data.active !== false,
        sortOrder: Number(data.sortOrder || 0),
      };
    });

    // Fetch child category pages for each subcategory (limit 6 per subcategory)
    const pagesPromises = subcategories.map(async (subcat) => {
      const pagesSnap = await adminDb
        .collection('categories')
        .where('parentId', '==', subcat.id)
        .limit(6)
        .get();

      const pages = pagesSnap.docs
        .map((d) => {
          const data = d.data() || {};
          return {
            id: d.id,
            name: typeof data.name === 'string' ? data.name : '',
            slug: typeof data.slug === 'string' ? data.slug : '',
            image: typeof data.image === 'string' ? data.image : '',
            active: data.active !== false,
            sortOrder: Number(data.sortOrder || 0),
          };
        })
        .filter((c) => c.active !== false);

      return { subcategoryId: subcat.id, pages };
    });

    const subcategoryPages = await Promise.all(pagesPromises);
    subcategories = subcategories.map((subcat) => ({
      ...subcat,
      pages: subcategoryPages.find((sp) => sp.subcategoryId === subcat.id)?.pages || [],
    }));
  } else {
    // Fetch products for this category
    const prodSnap = await adminDb
      .collection('products')
      .where('categoryIds', 'array-contains', category.id)
      .get();

    products = prodSnap.docs
      .map((d) => {
        const data = d.data() || {};

        // Normalize primitives and arrays so we only pass JSON-safe values
        const colors = Array.isArray(data.colors)
          ? data.colors.map((c) => String(c || '').trim()).filter(Boolean)
          : [];
        const sizes = Array.isArray(data.sizes)
          ? data.sizes.map((s) => String(s || '').trim()).filter(Boolean)
          : [];
        const material = typeof data.material === 'string' ? data.material : '';

        const images = Array.isArray(data.images)
          ? data.images
              .filter((img) => img && typeof img.url === 'string' && img.url.trim())
              .map((img) => ({
                url: img.url.trim(),
                alt: img && typeof img.alt === 'string' ? img.alt : '',
                // Keep per-image color so quick view can match images to selected color
                color: typeof img.color === 'string' ? img.color : '',
              }))
          : [];

        const pricing = data.pricing && typeof data.pricing === 'object'
          ? {
              unitAmount: Number(data.pricing.unitAmount || 0),
              currency: typeof data.pricing.currency === 'string' ? data.pricing.currency : 'usd',
            }
          : null;

        const createdAtSeconds = data.createdAt
          ? (data.createdAt._seconds ?? data.createdAt.seconds ?? 0)
          : 0;

        return {
          id: d.id,
          name: typeof data.name === 'string' ? data.name : '',
          slug: typeof data.slug === 'string' ? data.slug : '',
          description: typeof data.description === 'string' ? data.description : '',
          active: data.active !== false,
          inStock: data.inStock !== false,
          isBestSeller: data.isBestSeller === true,
          colors,
          sizes,
          material,
          images,
          pricing,
          discountPercent: Number(data.discountPercent || 0),
          sortOrder: Number(data.sortOrder || 0),
          // Keep a simple plain-object timestamp shape for sorting in the client
          createdAt: { seconds: createdAtSeconds },
        };
      })
      .filter((p) => p.active !== false);
  }

  return (
    <main>
      <StickyNavbar>
        <Navbar />
      </StickyNavbar>

      {isSpecialCategory && category.image && (
        <section className={`${styles.heroBanner} ${styles.heroBannerFullWidth}`}>
          <div className={styles.heroOverlay}>
            <div className={styles.heroContainer}>
              <div className="row h-100 align-items-center">
                <div className="col-12 text-center text-md-start">
                  <div className={styles.heroContent}>
                    <p className={styles.heroTagline}>MOVE.IMPROVE.EVOLVE</p>
                    <h1 className={styles.heroTitle}>{isMMACategory ? 'MMA GEAR' : 'BOXING GEAR'}</h1>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <img 
            src={category.image} 
            alt={category.name} 
            className={styles.heroBgImage}
          />
        </section>
      )}

      <div className={`container-fluid ${isSpecialCategory ? 'px-0' : 'px-4'} py-4`}>
        <div className="row">
          <div className={`col-12 ${isSpecialCategory ? '' : 'ms-lg-3'}`}>
        <div className="small text-muted mb-1">
          <a href="/" className="text-decoration-none text-muted">
            Home
          </a>
          {breadcrumbAncestors.map((node) => (
            <span key={node.id}>
              <span className="mx-1">/</span>
              <a
                href={`/category/${node.slug}`}
                className="text-decoration-none text-muted text-uppercase"
              >
                {node.name}
              </a>
            </span>
          ))}
          <span className="mx-1">/</span>
          <span className="text-uppercase">{category.name}</span>
        </div>

        {!isSpecialCategory && (
          <h1 className="display-6 fw-bold text-uppercase mb-2">{category.name}</h1>
        )}

        {isSpecialCategory ? (
          subcategories.length ? (
            <BoxingSubcategoriesClient 
              subcategories={subcategories} 
              categoryName={category.name} 
              categoryImage={null}
              categoryType={isMMACategory ? 'mma' : 'boxing'}
            />
          ) : (
            <div className="text-muted">No subcategories in this category yet.</div>
          )
        ) : (
          products.length ? (
            <CategoryProductsClient initialProducts={products} categoryName={category.name} />
          ) : (
            <div className="text-muted">No products in this category yet.</div>
          )
        )}
          </div>
        </div>
      </div>
    </main>
  );
}
