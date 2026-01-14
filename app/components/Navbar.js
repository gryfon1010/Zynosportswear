'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

import styles from './Navbar.module.css';
import { auth } from '../../lib/firebase/client';
import { signOut } from 'firebase/auth';

const APPAREL_PROMO_1_IMAGE_URL = process.env.NEXT_PUBLIC_APPAREL_PROMO_1_IMAGE_URL || '/images/apparel%20promo%201.png';
const APPAREL_PROMO_2_IMAGE_URL = process.env.NEXT_PUBLIC_APPAREL_PROMO_2_IMAGE_URL || '/images/apparel%20promo%202.png';
const APPAREL_PROMO_1_HREF = process.env.NEXT_PUBLIC_APPAREL_PROMO_1_HREF || '#';
const APPAREL_PROMO_2_HREF = process.env.NEXT_PUBLIC_APPAREL_PROMO_2_HREF || '#';

const CATS_CACHE_KEY = 'zyno_nav_categories_v4';
const CATS_CACHE_MAX_AGE_MS = 10 * 60 * 1000;

function readCachedCategories() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CATS_CACHE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return [];
    const ts = Number(parsed.ts);
    const items = parsed.items;
    if (!Array.isArray(items)) return [];
    if (!Number.isFinite(ts)) return items;
    if (Date.now() - ts > CATS_CACHE_MAX_AGE_MS) return items;
    return items;
  } catch {
    return [];
  }
}

function writeCachedCategories(items) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CATS_CACHE_KEY, JSON.stringify({ ts: Date.now(), items }));
  } catch {
    // ignore
  }
}

function isNonEmptyString(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

function getBoxingMegaGroups(boxingCategory, { allowEmptyGroups = false } = {}) {
  const children = Array.isArray(boxingCategory?.children) ? boxingCategory.children : [];
  return children
    .map((group) => {
      const items = Array.isArray(group?.children) ? group.children : [];
      return {
        id: group.id,
        name: group.name,
        slug: group.slug,
        items: items.filter((it) => isNonEmptyString(it?.name) && isNonEmptyString(it?.slug)),
      };
    })
    .filter((g) => isNonEmptyString(g?.name) && isNonEmptyString(g?.slug) && (allowEmptyGroups ? true : g.items.length));
}

function isMegaMenuCategorySlug(slug) {
  return (
    slug === 'boxing' ||
    slug === 'mma' ||
    slug === 'fitness' ||
    slug === 'yoga' ||
    slug === 'apparel' ||
    slug === 'collections' ||
    slug === 'kids'
  );
}

function isApparelMegaMenu(slug) {
  return slug === 'apparel';
}

export default function Navbar({ showBlackBar = true } = {}) {
  const [cats, setCats] = useState([]);
  const [user, setUser] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isAccountOpen, setIsAccountOpen] = useState(false);
  const [openMobileCategoryIds, setOpenMobileCategoryIds] = useState(() => new Set());
  const [openMobileGroupIds, setOpenMobileGroupIds] = useState(() => new Set());

  const [imageTilesByMainSlug, setImageTilesByMainSlug] = useState(() => new Map());

  const headerRef = useRef(null);
  const accountRef = useRef(null);

  const [dropdownTop, setDropdownTop] = useState(null);
  const [openDropdownId, setOpenDropdownId] = useState(null);
  const closeTimerRef = useRef(null);

  const pathname = usePathname();

  const categorySlugFromPath = pathname && pathname.startsWith('/category/')
    ? pathname.split('/')[2] || null
    : null;

  function mainCategoryContainsSlug(mainCategory, slug) {
    if (!slug) return false;
    const all = new Set();

    function walk(node) {
      if (!node) return;
      const s = String(node.slug || '').trim();
      if (s) all.add(s);
      const children = Array.isArray(node.children) ? node.children : [];
      for (const ch of children) walk(ch);
    }

    walk(mainCategory);
    return all.has(slug);
  }

  const isHomeActive = pathname === '/' || pathname === '/landingpage';

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const cached = readCachedCategories();
        if (!cancelled && Array.isArray(cached) && cached.length) {
          setCats(cached);
        }

        const res = await fetch('/api/storefront/categories-tree');
        const data = await res.json().catch(() => ({}));
        if (!res.ok) return;
        if (cancelled) return;
        const next = Array.isArray(data.items) ? data.items : [];

        setCats(next);
        writeCachedCategories(next);
      } catch {
        // ignore
      }
    }

    load();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadImageTiles() {
      try {
        const res = await fetch('/api/storefront/navbar-image-categories', { cache: 'no-store' });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || cancelled) return;

        const items = Array.isArray(data.items) ? data.items : [];
        const bySlug = new Map();
        for (const it of items) {
          const main = String(it.mainSlug || '').toLowerCase().trim();
          if (!main) continue;
          if (!bySlug.has(main)) bySlug.set(main, []);
          bySlug.get(main).push(it);
        }

        setImageTilesByMainSlug(bySlug);
      } catch {
        // ignore
      }
    }

    loadImageTiles();
    return () => {
      cancelled = true;
    };
  }, []);

  // Track viewport size so we can disable hover mega menus on mobile
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mql = window.matchMedia('(max-width: 991.98px)');

    function handleChange(event) {
      setIsMobile(event.matches);
    }

    // Initialize and subscribe
    handleChange(mql);
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', handleChange);
      return () => mql.removeEventListener('change', handleChange);
    }
    // Fallback for older browsers
    mql.addListener(handleChange);
    return () => mql.removeListener(handleChange);
  }, []);

  // Listen for Firebase auth changes so navbar knows if a customer is logged in
  useEffect(() => {
    const unsub = auth.onAuthStateChanged((u) => {
      setUser(u);
      // Close account dropdown when auth state changes
      setIsAccountOpen(false);
    });
    return () => unsub();
  }, []);

  // Close account dropdown when clicking outside of it
  useEffect(() => {
    if (!isAccountOpen) return;
    function handleClick(event) {
      if (!accountRef.current) return;
      if (!accountRef.current.contains(event.target)) {
        setIsAccountOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('touchstart', handleClick);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('touchstart', handleClick);
    };
  }, [isAccountOpen]);

  function clearCloseTimer() {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }

  function scheduleClose() {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => {
      setOpenDropdownId(null);
    }, 120);
  }

  function toggleMobileCategory(id) {
    setOpenMobileCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleMobileGroup(id) {
    setOpenMobileGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onLogout(e) {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    signOut(auth)
      .then(() => {
        // Simple client-side redirect after logout
        if (typeof window !== 'undefined') {
          window.location.href = '/landingpage';
        }
      })
      .catch(() => {
        // ignore logout errors in navbar
      });
  }

  return (
    <header
      ref={headerRef}
      className={styles.header}
      style={dropdownTop !== null ? { '--navDropdownTop': `${dropdownTop}px` } : undefined}
    >
      <div className="container-fluid px-4">
        <div className={styles.row}>
          <a href="/landingpage" className={styles.brand} aria-label="Zyno Sportswear">
            <img
              src="/images/zyno-1.png"
              alt="Zyno Sportswear"
              className={styles.brandLogo}
            />
          </a>

          <nav className={`navbar navbar-expand-lg p-0 ${styles.navWrap}`}>
            <button
              className="navbar-toggler"
              type="button"
              data-bs-toggle="collapse"
              data-bs-target="#mainNavbar"
              aria-controls="mainNavbar"
              aria-expanded="false"
              aria-label="Toggle navigation"
            >
              <span className="navbar-toggler-icon"></span>
            </button>

            <div className="collapse navbar-collapse position-relative" id="mainNavbar">
              {isMobile ? (
                <button
                  type="button"
                  className={styles.mobileCloseButton}
                  data-bs-toggle="collapse"
                  data-bs-target="#mainNavbar"
                  aria-label="Close navigation"
                >
                  &times;
                </button>
              ) : null}
              <ul className={`navbar-nav mx-auto ${styles.navList}`}>
                <li className="nav-item">
                  <a className={`${styles.navLink} ${isHomeActive ? styles.active : ''}`} href="/landingpage">
                    HOME
                  </a>
                </li>

                {cats.map((c) => {
                  // Keep Sale category available in admin, but avoid showing it here as a dropdown item.
                  if (String(c?.slug || '') === 'sale') return null;

                  const children = Array.isArray(c?.children) ? c.children : [];
                  const slug = String(c?.slug || '');
                  const isMega = isMegaMenuCategorySlug(slug);
                  const megaGroups = isMega
                    ? getBoxingMegaGroups(c, { allowEmptyGroups: isApparelMegaMenu(slug) })
                    : [];
                  const imageTiles = isMega ? imageTilesByMainSlug.get(slug.toLowerCase()) || [] : [];

                  const hasDropdown = isMega ? megaGroups.length > 0 : children.length > 0;
                  const isActiveMain = mainCategoryContainsSlug(c, categorySlugFromPath);

                  // Mobile: expandable row with nested items
                  if (isMobile && hasDropdown) {
                    const isOpen = openMobileCategoryIds.has(c.id);
                    return (
                      <li
                        className={`nav-item w-100 ${styles.mobileNavItem}`}
                        key={c.id}
                      >
                        <button
                          type="button"
                          className={`${styles.navLink} w-100 d-flex align-items-center ${styles.mobileNavButton}`}
                          style={{
                            border: 'none',
                            paddingLeft: 0,
                            paddingRight: 0,
                            justifyContent: 'flex-start',
                            gap: 4,
                          }}
                          onClick={() => toggleMobileCategory(c.id)}
                        >
                          <span>{String(c?.name || '').toUpperCase()}</span>
                          <span style={{ fontSize: 12, marginLeft: 4 }}>{isOpen ? '▾' : '▸'}</span>

                        </button>

                        {isOpen ? (
                          <div className="ps-3 pb-2">
                            {isMega ? (
                              megaGroups.map((g) => {
                                const groupOpen = openMobileGroupIds.has(g.id);
                                return (
                                  <div key={g.id} className="mb-1">
                                    <button
                                      type="button"
                                      className="btn btn-link p-0 d-flex align-items-center text-start"
                                      style={{
                                        fontSize: 14,
                                        textDecoration: 'none',
                                        color: '#212529',
                                        justifyContent: 'flex-start',
                                        gap: 6,
                                      }}
                                      onClick={() => toggleMobileGroup(g.id)}
                                    >
                                      <span>{g.name}</span>
                                      <span style={{ fontSize: 12 }}>{groupOpen ? '▾' : '▸'}</span>
                                    </button>

                                    {groupOpen && g.items && g.items.length ? (
                                      <ul className="list-unstyled ms-3 mb-1 small">
                                        {g.items.map((it) => (
                                          <li key={it.id}>
                                            <a
                                              className={styles.dropdownLink}
                                              href={`/category/${it.slug}`}
                                            >
                                              {it.name}
                                            </a>
                                          </li>
                                        ))}
                                      </ul>
                                    ) : null}
                                  </div>
                                );
                              })
                            ) : (
                              children.map((sc) => (
                                <div key={sc.id} className="mb-1">
                                  <a
                                    className={styles.dropdownLink}
                                    href={`/category/${sc.slug}`}
                                  >
                                    {sc.name}
                                  </a>
                                </div>
                              ))
                            )}
                            <div className="mt-1 small">
                              <a className={styles.dropdownLink} href={`/category/${c.slug}`}>
                                View all
                              </a>
                            </div>
                          </div>
                        ) : null}
                      </li>
                    );
                  }

                  // Desktop (or non-dropdown categories on mobile)
                  return (
                    <li
                      className={`nav-item ${styles.navItem} ${
                        openDropdownId === c.id ? styles.navItemOpen : ''
                      }`}
                      key={c.id}
                      onMouseEnter={() => {
                        if (isMobile || !hasDropdown) return;
                        clearCloseTimer();
                        setOpenDropdownId(c.id);
                      }}
                      onMouseLeave={() => {
                        if (isMobile || !hasDropdown) return;
                        scheduleClose();
                      }}
                    >
                      <a
                        className={`${styles.navLink} ${styles.navLinkWithCaret} ${
                          isActiveMain ? styles.active : ''
                        }`}
                        href={`/category/${c.slug}`}
                      >
                        <span>{String(c?.name || '').toUpperCase()}</span>
                        <span className={styles.caret} aria-hidden="true">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="10"
                            height="10"
                            viewBox="0 0 16 16"
                            fill="currentColor"
                          >
                            <path d="M3.204 5.204a.75.75 0 0 1 1.06 0L8 8.94l3.736-3.736a.75.75 0 1 1 1.06 1.06l-4.266 4.266a.75.75 0 0 1-1.06 0L3.204 6.264a.75.75 0 0 1 0-1.06z" />
                          </svg>
                        </span>
                      </a>

                      {hasDropdown && !isMobile ? (
                        <div
                          className={styles.dropdown}
                          onMouseEnter={() => {
                            clearCloseTimer();
                            setOpenDropdownId(c.id);
                          }}
                          onMouseLeave={() => {
                            scheduleClose();
                          }}
                        >
                          {isMega ? (
                            imageTiles && imageTiles.length ? (
                              <div className={styles.apparelMenu}>
                                <div
                                  className={styles.apparelLeft}
                                  style={{
                                    gridTemplateColumns: `repeat(${Math.min(
                                      Math.max(megaGroups.length, 1),
                                      8,
                                    )}, minmax(0, 1fr))`,
                                  }}
                                >
                                  {megaGroups.map((g) => (
                                    <div className={styles.megaCol} key={g.id}>
                                      <a className={styles.megaHeading} href={`/category/${g.slug}`}>
                                        {String(g.name || '').toUpperCase()}
                                      </a>
                                      <div className={styles.megaLinks}>
                                        {g.items.map((it) => (
                                          <a
                                            key={it.id}
                                            className={styles.megaLink}
                                            href={`/category/${it.slug}`}
                                          >
                                            {it.name}
                                          </a>
                                        ))}
                                        <a className={styles.megaViewAll} href={`/category/${g.slug}`}>
                                          View All
                                        </a>
                                      </div>
                                    </div>
                                  ))}
                                </div>

                                <div className={styles.apparelPromos}>
                                  {imageTiles.slice(0, 2).map((tile) => (
                                    <a
                                      key={tile.id}
                                      className={styles.promoCard}
                                      href={tile.href || '#'}
                                    >
                                      <img
                                        className={styles.promoImg}
                                        src={tile.imageUrl}
                                        alt={tile.name || 'Category'}
                                        loading="lazy"
                                      />
                                      <div className={styles.promoCta}>Shop</div>
                                    </a>
                                  ))}
                                </div>
                              </div>
                            ) : (
                              <div
                                className={styles.megaMenu}
                                style={{
                                  gridTemplateColumns: `repeat(${Math.min(
                                    Math.max(megaGroups.length, 1),
                                    12,
                                  )}, minmax(0, 1fr))`,
                                }}
                              >
                                {megaGroups.map((g) => (
                                  <div className={styles.megaCol} key={g.id}>
                                    <a className={styles.megaHeading} href={`/category/${g.slug}`}>
                                      {String(g.name || '').toUpperCase()}
                                    </a>

                                    <div className={styles.megaLinks}>
                                      {g.items.map((it) => (
                                        <a
                                          key={it.id}
                                          className={styles.megaLink}
                                          href={`/category/${it.slug}`}
                                        >
                                          {it.name}
                                        </a>
                                      ))}
                                      <a className={styles.megaViewAll} href={`/category/${g.slug}`}>
                                        View All
                                      </a>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )
                          ) : (
                            <div className={styles.dropdownInner}>
                              {children.map((sc) => (
                                <a
                                  key={sc.id}
                                  className={styles.dropdownLink}
                                  href={`/category/${sc.slug}`}
                                >
                                  {sc.name}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : null}
                    </li>
                  );
                })}

                <li className="nav-item">
                  <a className={`${styles.navLink} ${styles.saleLink}`} href="/sale">
                    SALE
                  </a>
                </li>
                <li className="nav-item">
                  <a className={styles.navLink} href="/wishlist">
                    WISHLIST
                  </a>
                </li>
              </ul>

              <div className="d-flex align-items-center gap-3 ms-auto">
                <a className={styles.navLink} href="/cart">
                  CART
                </a>

                <form className={styles.search} role="search">
                  <div className="input-group">
                    <input
                      className={`form-control ${styles.searchInput}`}
                      type="search"
                      placeholder="Search for products..."
                      aria-label="Search for products"
                    />
                    <button className={`btn ${styles.searchBtn}`} type="button" aria-label="Search">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="16"
                        height="16"
                        fill="currentColor"
                        viewBox="0 0 16 16"
                      >
                        <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85zm-5.242 1.156a5 5 0 1 1 0-10 5 5 0 0 1 0 10z" />
                      </svg>
                    </button>
                  </div>
                </form>

                {user ? (
                  <div className="position-relative" ref={accountRef}>
                    <button
                      type="button"
                      className={styles.navLink}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 6, border: '1px solid #dee2e6', borderRadius: 20, padding: '4px 10px', backgroundColor: '#ffffff' }}
                      onClick={() => setIsAccountOpen((prev) => !prev)}
                    >
                      <span
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          backgroundColor: '#212529',
                          color: '#ffffff',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 11,
                          textTransform: 'uppercase',
                        }}
                      >
                        {(user.email || 'U').slice(0, 1)}
                      </span>
                    </button>
                    {isAccountOpen ? (
                      <div
                        style={{
                          position: 'absolute',
                          right: 0,
                          top: '100%',
                          marginTop: 4,
                          minWidth: 200,
                          backgroundColor: '#ffffff',
                          border: '1px solid #dee2e6',
                          borderRadius: 4,
                          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                          zIndex: 5000,
                        }}
                      >
                        <div style={{ padding: '8px 12px', borderBottom: '1px solid #f1f3f5', fontSize: 12 }}>
                          Signed in as
                          <div style={{ fontWeight: 600, wordBreak: 'break-all' }}>{user.email}</div>
                        </div>
                        <a
                          href="/account"
                          style={{ display: 'block', padding: '8px 12px', fontSize: 13, textDecoration: 'none', color: '#212529' }}
                        >
                          My Account
                        </a>
                        <button
                          type="button"
                          onClick={onLogout}
                          style={{
                            display: 'block',
                            width: '100%',
                            padding: '8px 12px',
                            border: 'none',
                            backgroundColor: 'transparent',
                            textAlign: 'left',
                            fontSize: 13,
                          }}
                        >
                          Log out
                        </button>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <>
                    <a className={styles.navLink} href="/login">
                      LOGIN
                    </a>
                    <a className={styles.navLink} href="/signup">
                      SIGN UP
                    </a>
                  </>
                )}
              </div>
            </div>
          </nav>
        </div>
      </div>

    </header>
  );
}