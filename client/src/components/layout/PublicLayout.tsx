import { useEffect, type ReactNode } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { PublicNavbar } from '@/components/navigation/PublicNavbar';
import { Footer } from './Footer';

/**
 * React Router's `<Link>` never does the browser's native hash-scroll —
 * it's a client-side transition, not a real page load — so a link like
 * `/#about` silently does nothing on its own. This re-implements that one
 * piece of native behavior for every public page that shares this layout.
 */
function useHashScroll() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) return;
    const id = hash.slice(1);
    let frame: number;
    let attempts = 0;
    // The target page is often still loading its lazy chunk at this point
    // (e.g. jumping to `/#about` from another route) — poll across a few
    // frames instead of giving up on the first miss.
    const tryScroll = () => {
      const target = document.getElementById(id);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      attempts += 1;
      if (attempts < 180) frame = requestAnimationFrame(tryScroll);
    };
    tryScroll();
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash]);
}

/**
 * Used both as a layout route (rendering the matched child via `<Outlet/>`)
 * and directly with explicit `children` — the latter lets a dual-purpose
 * route (e.g. `/challenges`, reachable both logged-out and logged-in) reuse
 * this chrome without needing a nested `<Route>` of its own.
 */
export function PublicLayout({ children }: { children?: ReactNode }) {
  useHashScroll();
  return (
    <div className="theme-public relative min-h-screen bg-[var(--color-bg)]">
      <div className="bg-grid-fine pointer-events-none fixed inset-0 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />

      <div className="relative flex min-h-screen flex-col">
        <PublicNavbar />
        <main className="flex-1">
          {children ?? <Outlet />}
        </main>
        <Footer />
      </div>
    </div>
  );
}
