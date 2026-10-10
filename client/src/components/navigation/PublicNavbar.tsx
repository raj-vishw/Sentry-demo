import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X, Search } from 'lucide-react';
import { Logo } from './Logo';
import { Button } from '@/components/ui/Button';
import { PUBLIC_NAV_LINKS } from '@/app/config/site';
import { cn } from '@/lib/utils';
import { useCommandPalette } from '@/features/search/CommandPaletteProvider';
import { useAuthStore } from '@/stores/authStore';
import { useAppBasePath } from '@/lib/appPath';

export function PublicNavbar() {
  const [open, setOpen] = useState(false);
  const { open: openPalette } = useCommandPalette();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const appBasePath = useAppBasePath();

  return (
    <header className="sticky top-4 z-40 px-4 sm:px-6">
      <nav className="glass-panel mx-auto flex h-16 max-w-5xl items-center justify-between rounded-[var(--radius-2xl)] px-4 sm:px-6">
        <Logo />

        <div className="hidden items-center gap-1 md:flex">
          {PUBLIC_NAV_LINKS.map((link) => (
            <NavLink
              key={link.href}
              to={link.href}
              className={({ isActive }) =>
                cn(
                  'rounded-full px-4 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)]'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          <button
            onClick={openPalette}
            aria-label="Search (Ctrl+K)"
            className="flex items-center gap-2 rounded-full border border-[var(--color-glass-border)] px-3.5 py-2 text-xs text-[var(--color-text-muted)] transition-colors hover:border-[var(--color-accent)]/40 hover:text-[var(--color-text-secondary)]"
          >
            <Search className="size-3.5" />
            <span className="font-mono">⌘K</span>
          </button>
          {isAuthenticated ? (
            <Link to={`${appBasePath}/dashboard`}>
              <Button variant="primary" size="sm">
                Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">
                  Login
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm">
                  Join
                </Button>
              </Link>
            </>
          )}
        </div>

        <button
          className="text-[var(--color-text-primary)] md:hidden"
          onClick={() => setOpen((o) => !o)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <X className="size-6" /> : <Menu className="size-6" />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="glass-panel mx-auto mt-2 max-w-5xl overflow-hidden rounded-[var(--radius-xl)] md:hidden"
          >
            <div className="flex flex-col gap-1 px-4 py-4">
              {PUBLIC_NAV_LINKS.map((link) => (
                <NavLink
                  key={link.href}
                  to={link.href}
                  onClick={() => setOpen(false)}
                  className="rounded-[var(--radius-sm)] px-3 py-2.5 text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text-primary)]"
                >
                  {link.label}
                </NavLink>
              ))}
              {isAuthenticated ? (
                <Link to={`${appBasePath}/dashboard`} onClick={() => setOpen(false)} className="mt-2">
                  <Button variant="primary" className="w-full">
                    Dashboard
                  </Button>
                </Link>
              ) : (
                <div className="mt-2 flex flex-col gap-2">
                  <Link to="/login" onClick={() => setOpen(false)}>
                    <Button variant="outline" className="w-full">
                      Login
                    </Button>
                  </Link>
                  <Link to="/register" onClick={() => setOpen(false)}>
                    <Button variant="primary" className="w-full">
                      Join
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
