import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';
import BootstrapClient from './BootstrapClient';
import AppShell from './AppShell';

export const metadata = {
  metadataBase: new URL('https://www.cgrsports.com'),
  title: 'Cougar Sports',
  description: 'Cougar Sports – premium combat sports gear and apparel.',
  icons: {
    icon: '/images/CGR logo.png',
    shortcut: '/images/CGR logo.png',
    apple: '/images/CGR logo.png',
  },
  alternates: {
    canonical: 'https://www.cgrsports.com',
  },
  openGraph: {
    title: 'Cougar Sports',
    description: 'Cougar Sports – premium combat sports gear and apparel.',
    url: 'https://www.cgrsports.com',
    images: [
      {
        url: '/images/CGR logo.png',
        width: 513,
        height: 513,
        alt: 'Cougar Sports Logo',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cougar Sports',
    description: 'Cougar Sports – premium combat sports gear and apparel.',
    images: ['/images/CGR logo.png'],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <BootstrapClient />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
