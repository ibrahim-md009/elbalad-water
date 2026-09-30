import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { APP_NAME, APP_TAGLINE } from '../config/app';
import Logo from './Logo';
import ThemeToggle from './ThemeToggle';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function SiteLayout() {
  return (
    <div className="site">
      <ScrollToTop />
      <header className="site-header">
        <div className="site-container site-header-inner">
          <NavLink to="/" className="site-brand" aria-label={APP_NAME}>
            <Logo size={36} />
            <span>{APP_NAME}</span>
          </NavLink>
          <nav className="site-nav" aria-label="التنقل الرئيسي">
            <NavLink to="/" end>
              الحجوزات
            </NavLink>
            <NavLink to="/payment">طرق الدفع</NavLink>
          </nav>
          <ThemeToggle variant="icon" />
        </div>
      </header>

      <main className="site-main">
        <div className="site-container">
          <Outlet />
        </div>
      </main>

      <footer className="site-footer">
        <div className="site-container site-footer-inner">
          <span className="site-brand">
            <Logo size={28} />
            <span>{APP_NAME}</span>
          </span>
          <p>{APP_TAGLINE}</p>
          <small>© {new Date().getFullYear()} {APP_NAME}. جميع الحقوق محفوظة.</small>
        </div>
      </footer>
    </div>
  );
}
