import 'bootstrap/dist/css/bootstrap.min.css';
import './globals.css';
import BootstrapClient from './BootstrapClient';
import AppShell from './AppShell';

export const metadata = {
  title: 'Zynosportswear',
  description: 'Next.js + Bootstrap starter',
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
