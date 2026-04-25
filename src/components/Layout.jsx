import { Outlet } from 'react-router-dom';
import Topbar from './Topbar.jsx';
import Ticker from './Ticker.jsx';
import Footer from './Footer.jsx';

export default function Layout() {
  return (
    <div className="app-frame">
      <Topbar />
      <Ticker />
      <main>
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
