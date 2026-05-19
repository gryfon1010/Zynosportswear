import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';
import BootstrapClient from './BootstrapClient';
import AppShell from './AppShell';

export const metadata = {
  metadataBase: new URL('https://www.cgrsports.com'),
  title: {
    default: 'Cougar Sports - Premium Combat Sports Gear & Apparel',
    template: '%s | Cougar Sports',
  },
  description: 'Cougar Sports – premium combat sports gear and apparel for boxing, MMA, fitness, and more.',
  keywords: ['combat sports', 'boxing gear', 'MMA equipment', 'sports apparel', 'Cougar Sports', 'CGR Sports'],
  authors: [{ name: 'Cougar Sports' }],
  icons: {
    icon: [
      { url: '/images/CGR%20logo.png', sizes: '513x513', type: 'image/png' },
    ],
    shortcut: '/images/CGR%20logo.png',
    apple: [
      { url: '/images/CGR%20logo.png', sizes: '513x513', type: 'image/png' },
    ],
  },
  alternates: {
    canonical: 'https://www.cgrsports.com',
  },
  openGraph: {
    title: 'Cougar Sports - Premium Combat Sports Gear & Apparel',
    description: 'Cougar Sports – premium combat sports gear and apparel for boxing, MMA, fitness, and more.',
    url: 'https://www.cgrsports.com',
    siteName: 'Cougar Sports',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: 'https://www.cgrsports.com/images/CGR%20logo.png',
        width: 513,
        height: 513,
        alt: 'Cougar Sports Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Cougar Sports - Premium Combat Sports Gear & Apparel',
    description: 'Cougar Sports – premium combat sports gear and apparel for boxing, MMA, fitness, and more.',
    images: ['https://www.cgrsports.com/images/CGR%20logo.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code', // Add your Google Search Console verification code here
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  const organizationSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Cougar Sports',
    alternateName: 'CGR Sports',
    url: 'https://www.cgrsports.com',
    logo: 'https://www.cgrsports.com/images/CGR%20logo.png',
    sameAs: [
      'https://www.facebook.com/CGRSportswear',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Service',
      url: 'https://www.cgrsports.com/contact-us',
    },
  };

  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </head>
      <body>
        <BootstrapClient />
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
