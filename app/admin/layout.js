import Navbar from '../components/Navbar';
import StickyNavbar from '../components/StickyNavbar';

export default function AdminLayout({ children }) {
  return (
    <div>
      <StickyNavbar>
        <Navbar showBlackBar={true} />
      </StickyNavbar>

      <div className="container py-4" style={{ maxWidth: 1100 }}>
        {children}
      </div>
    </div>
  );
}
