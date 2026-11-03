import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { useSavedWordCount } from '../db/useSavedWordCount';
import styles from './Layout.module.css';

// Shared frame: top bar + bottom tab bar + the area where the current screen appears.
export default function Layout() {
  const { pathname } = useLocation();
  // A token shared between the tab bar (needs the count) and the rest of the app (triggers re-reads).
  // When a word is saved or removed anywhere, that component calls window.dispatchEvent with a
  // custom event, and Layout picks it up here.
  const [countToken, setCountToken] = useState(0);
  const wordCount = useSavedWordCount(countToken);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  useEffect(() => {
    function handleWordChange() {
      setCountToken(Date.now());
    }
    window.addEventListener('dailyinglish:wordchange', handleWordChange);
    return () => window.removeEventListener('dailyinglish:wordchange', handleWordChange);
  }, []);

  const onReader = pathname.startsWith('/story/');

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.brand}>
            Daily<span className={styles.brandAccent}>Inglish</span>
          </Link>
        </div>
      </header>
      <main className={`${styles.main} ${onReader ? styles.mainReader : ''}`}>
        <Outlet />
      </main>
      <nav className={styles.tabbar} aria-label="Navegação principal">
        <Link
          to="/"
          className={`${styles.tab} ${pathname === '/' ? styles.tabActive : ''}`}
          aria-current={pathname === '/' ? 'page' : undefined}
        >
          <span className={styles.tabIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22Z" />
              <path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5A2.5 2.5 0 0 1 20 22Z" />
            </svg>
          </span>
          <span className={styles.tabLabel}>Histórias</span>
        </Link>
        <Link
          to="/words"
          className={`${styles.tab} ${pathname === '/words' ? styles.tabActive : ''}`}
          aria-current={pathname === '/words' ? 'page' : undefined}
        >
          <span className={styles.tabIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3Z" />
              <path d="M8 4v16M11 9h4M11 13h3" />
            </svg>
            {wordCount > 0 && <span className={styles.badge}>{wordCount > 99 ? '99+' : wordCount}</span>}
          </span>
          <span className={styles.tabLabel}>Palavras</span>
        </Link>
      </nav>
    </div>
  );
}