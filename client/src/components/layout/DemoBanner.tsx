/**
 * Always rendered, unconditionally — unlike the main Sentry repo's
 * (deleted) demo-mode banner, which only showed up when a deployment-wide
 * flag was on, this whole application permanently IS the public demo, so
 * there's no flag to gate it on. Fixed at the true viewport top, above
 * everything (z-[1200] — higher than OSShell's BootScreen at z-[999]), at
 * a fixed height that `--demo-banner-height` (globals.css) and the
 * OSShell/TopBar/Desktop/Window top-offset constants all agree on — see
 * the comment in globals.css for the full list of places that height is
 * baked into.
 */
export function DemoBanner() {
  return (
    <div
      className="fixed inset-x-0 top-0 z-[1200] flex h-8 items-center justify-center gap-2 border-b border-[var(--color-warning)]/40 bg-[var(--color-warning)]/15 px-3 font-mono text-[11px] uppercase tracking-wide text-[var(--color-warning)]"
      role="status"
    >
      <span className="truncate">
        PUBLIC DEMO — data may be reset. Do not use real credentials or sensitive information.
      </span>
      <a
        href="https://github.com/raj-vishw/Sentry"
        target="_blank"
        rel="noreferrer noopener"
        className="hidden shrink-0 underline decoration-dotted underline-offset-2 hover:text-[var(--color-text-primary)] sm:inline"
      >
        Get the real Sentry
      </a>
    </div>
  );
}
