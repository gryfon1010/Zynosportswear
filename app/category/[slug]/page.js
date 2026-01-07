import { notFound } from 'next/navigation';
import Navbar from '../../components/Navbar';
import StickyNavbar from '../../components/StickyNavbar';
import { getAdminDb } from '../../../lib/firebase/admin';
import CategoryProductsClient from '../CategoryProductsClient';

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

  const prodSnap = await adminDb
    .collection('products')
    .where('categoryIds', 'array-contains', category.id)
    .get();

  const products = prodSnap.docs
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

  return (
    <main>
      <StickyNavbar>
        <Navbar />
      </StickyNavbar>

      <div className="container-fluid px-4 py-4">
        <div className="row">
          <div className="col-12 ms-lg-3">
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

        <h1 className="display-6 fw-bold text-uppercase mb-2">{category.name}</h1>

        {products.length ? (
          <CategoryProductsClient initialProducts={products} categoryName={category.name} />
        ) : (
          <div className="text-muted">No products in this category yet.</div>
        )}
          </div>
        </div>
      </div>
    </main>
  );
}
