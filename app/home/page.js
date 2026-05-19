import LandingPage from '../landingpage/page';

export const metadata = {
  title: 'Home',
  description: 'Cougar Sports - Premium combat sports gear and apparel for boxing, MMA, fitness, and more. Shop high-quality equipment and custom sportswear.',
  openGraph: {
    title: 'Cougar Sports - Premium Combat Sports Gear & Apparel',
    description: 'Shop premium combat sports gear and apparel for boxing, MMA, fitness, and more.',
  },
};

export default function HomeRoute() {
  return <LandingPage />;
}
