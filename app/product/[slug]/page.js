import { notFound } from 'next/navigation';
import Navbar from '../../components/Navbar';
import StickyNavbar from '../../components/StickyNavbar';
import { getAdminDb } from '../../../lib/firebase/admin';
import ProductDetailClient from './ProductDetailClient';

export const runtime = 'nodejs';

export default async function ProductPage({ params }) {
  const slug = params?.slug;
  if (!slug) return notFound();

  const adminDb = getAdminDb();
  if (!adminDb) return notFound();

  const snap = await adminDb.collection('products').where('slug', '==', slug).limit(1).get();
  if (snap.empty) return notFound();

  const doc = snap.docs[0];
  const data = doc.data() || {};

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

  const colors = Array.isArray(data.colors)
    ? data.colors.map((c) => String(c || '').trim()).filter(Boolean)
    : [];

  const sizes = Array.isArray(data.sizes)
    ? data.sizes.map((s) => String(s || '').trim()).filter(Boolean)
    : [];

  const product = {
    id: doc.id,
    name: typeof data.name === 'string' ? data.name : '',
    slug: typeof data.slug === 'string' ? data.slug : '',
    sku: typeof data.sku === 'string' ? data.sku : '',
    description: typeof data.description === 'string' ? data.description : '',
    pricing,
    discountPercent: Number(data.discountPercent || 0),
    images,
    colors,
    sizes,
  };

  return (
    <main>
      <StickyNavbar>
        <Navbar />
      </StickyNavbar>

      <ProductDetailClient product={product} />
    </main>
  );
}
