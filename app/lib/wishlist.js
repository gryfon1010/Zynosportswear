export const WISHLIST_KEY = 'zyno_wishlist_v1';

export function readWishlist() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(WISHLIST_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeWishlist(items) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(items || []));
  } catch {
    // ignore quota errors
  }
}
