import StickyNavbar from '../components/StickyNavbar';
import Navbar from '../components/Navbar';

export default function SaleLayout({ children }) {
  return (
    <>
      <StickyNavbar>
        <Navbar showBlackBar={false} />
      </StickyNavbar>
      <div>{children}</div>
    </>
  );
}
