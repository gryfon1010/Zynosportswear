import { notFound } from 'next/navigation';
import Navbar from '../components/Navbar';
import StickyNavbar from '../components/StickyNavbar';
import SearchResultsClient from './SearchResultsClient';
import { getAdminDb } from '../../lib/firebase/admin';

export const runtime = 'nodejs';

export async function generateMetadata({ searchParams }) {
  const query = searchParams?.q || '';
  return {
    title: query ? `Search Results for "${query}" - CGR Sports` : 'Search Products - CGR Sports',
    description: query ? `Find products matching "${query}" at CGR Sports` : 'Search for sports equipment and apparel at CGR Sports',
  };
}

export default async function SearchPage({ searchParams }) {
  const query = searchParams?.q || '';
  
  if (!query || !query.trim()) {
    return (
      <main>
        <StickyNavbar>
          <Navbar />
        </StickyNavbar>
        
        <div className="container py-5">
          <div className="text-center">
            <h1 className="display-6 fw-bold mb-3">Search Products</h1>
            <p className="text-muted">Please enter a search term to find products.</p>
            <a href="/" className="btn btn-primary mt-3">Go to Home</a>
          </div>
        </div>
      </main>
    );
  }

  const adminDb = getAdminDb();
  let products = [];
  let error = null;

  if (!adminDb) {
    error = 'Database not available';
  } else {
    try {
      // Fetch all active products and filter in memory (basic search)
      const searchTerm = query.trim().toLowerCase();
      const snap = await adminDb.collection('products').get();

      products = snap.docs
        .map((d) => {
          const data = d.data() || {};

          // Normalize primitives and arrays
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
                  color: typeof img.color === 'string' ? img.color : '',
                }))
            : [];

          const pricing = data.pricing && typeof data.pricing === 'object'
            ? {
                unitAmount: Number(data.pricing.unitAmount || 0),
                currency: typeof data.pricing.currency === 'string' ? data.pricing.currency : 'usd',
              }
            : null;

          return {
            id: d.id,
            name: typeof data.name === 'string' ? data.name : '',
            slug: typeof data.slug === 'string' ? data.slug : '',
            sku: typeof data.sku === 'string' ? data.sku : '',
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
          };
        })
        .filter((p) => {
          // Filter: active products only
          if (p.active === false) return false;
          
          // Search in name and SKU
          const name = p.name.toLowerCase();
          const sku = p.sku.toLowerCase();
          return name.includes(searchTerm) || sku.includes(searchTerm);
        })
        .sort((a, b) => {
          // Sort by sortOrder, then name
          const sa = Number(a.sortOrder || 0);
          const sb = Number(b.sortOrder || 0);
          if (sa !== sb) return sa - sb;
          return a.name.localeCompare(b.name);
        })
        .slice(0, 100); // Limit to 100 results

    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to fetch products';
      console.error('[SearchPage] Error fetching products:', error);
    }
  }

  return (
    <main>
      <StickyNavbar>
        <Navbar />
      </StickyNavbar>

      <div className="container py-4">
        <div className="mb-3">
          <div className="small text-muted mb-1">
            <a href="/" className="text-decoration-none text-muted">
              Home
            </a>
            <span className="mx-1">/</span>
            <span>Search Results</span>
          </div>

          <h1 className="display-6 fw-bold text-uppercase mb-2">
            Search Results
          </h1>
          <p className="text-muted mb-0">
            Showing results for: <strong>"{query}"</strong>
          </p>
        </div>

        {error ? (
          <div className="alert alert-danger">{error}</div>
        ) : products.length === 0 ? (
          <div className="text-center py-5">
            <h3 className="mb-3">No products found</h3>
            <p className="text-muted mb-4">
              We couldn't find any products matching "{query}". Please try a different search term.
            </p>
            <a href="/" className="btn btn-primary">Continue Shopping</a>
          </div>
        ) : (
          <SearchResultsClient initialProducts={products} searchQuery={query} />
        )}
      </div>
    </main>
  );
}
