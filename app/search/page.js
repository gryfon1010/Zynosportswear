import { notFound } from 'next/navigation';
import Navbar from '../components/Navbar';
import StickyNavbar from '../components/StickyNavbar';
import SearchResultsClient from './SearchResultsClient';

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

  // Fetch products from API with search query
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const apiUrl = `${baseUrl}/api/storefront/products?q=${encodeURIComponent(query.trim())}&active=true&limit=100`;
  
  let products = [];
  let error = null;

  try {
    const res = await fetch(apiUrl, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      products = Array.isArray(data.items) ? data.items : [];
    } else {
      error = `Failed to fetch products (${res.status})`;
    }
  } catch (e) {
    error = e instanceof Error ? e.message : 'Failed to fetch products';
    console.error('[SearchPage] Error fetching products:', error);
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
