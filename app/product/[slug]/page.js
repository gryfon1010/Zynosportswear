import { notFound } from 'next/navigation';
import Navbar from '../../components/Navbar';
import StickyNavbar from '../../components/StickyNavbar';
import { getAdminDb } from '../../../lib/firebase/admin';
import AddToCartButton from './AddToCartButton';

export const runtime = 'nodejs';

export default async function ProductPage({ params }) {
  const slug = params?.slug;
  if (!slug) return notFound();

  const adminDb = getAdminDb();
  if (!adminDb) return notFound();

  const snap = await adminDb.collection('products').where('slug', '==', slug).limit(1).get();
  if (snap.empty) return notFound();

  const doc = snap.docs[0];
  const product = { id: doc.id, ...doc.data() };

  const img = Array.isArray(product?.images) && product.images.length ? product.images[0]?.url : null;
  const price = product?.pricing?.unitAmount ? (Number(product.pricing.unitAmount) / 100).toFixed(2) : null;

  return (
    <main>
      <StickyNavbar>
        <Navbar />
      </StickyNavbar>

      <div className="container py-4">
        <div className="row g-4">
          <div className="col-12 col-lg-6">
            <div className="border rounded bg-light d-flex align-items-center justify-content-center" style={{ minHeight: 420 }}>
              {img ? (
                <img src={img} alt={product.name} style={{ maxWidth: '100%', maxHeight: 420, objectFit: 'contain' }} />
              ) : (
                <div className="text-muted">No image</div>
              )}
            </div>
          </div>

          <div className="col-12 col-lg-6">
            <h1 className="h3 mb-2">{product.name}</h1>
            {price ? <div className="h5 text-muted mb-3">{String(product?.pricing?.currency || 'usd').toUpperCase()} {price}</div> : null}

            {product?.sku ? <div className="small text-muted mb-3">SKU: {product.sku}</div> : null}

            <div className="d-grid gap-2">
              <AddToCartButton
                item={{
                  productId: product.id,
                  sku: product?.sku || null,
                  name: product?.name || 'Item',
                  unitAmount: Number(product?.pricing?.unitAmount || 0),
                  imageUrl: img,
                }}
                className="btn btn-dark"
              />
              <a className="btn btn-outline-secondary" href="/cart">
                Go to cart
              </a>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
