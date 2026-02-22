'use client';

import { usePathname } from 'next/navigation';
import Footer from './components/Footer';

export default function AppShell({ children }) {
  const pathname = usePathname() || '';

  const isAdminRoot = pathname === '/admin';
  const isAdminSection = pathname.startsWith('/admin');
  const isDrawerPage = pathname.startsWith('/drawer');

  const showFooter = (!isAdminSection || isAdminRoot) && !isDrawerPage;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>{children}</div>
      {showFooter ? <Footer /> : null}
    </div>
  );
}
