import StickyNavbar from '../components/StickyNavbar';
import Navbar from '../components/Navbar';

export default function AccountLayout({ children }) {
  return (
    <>
      <StickyNavbar>
        <Navbar showBlackBar={false} />
      </StickyNavbar>
      <div style={{ paddingTop: 24 }}>{children}</div>
    </>
  );
}
