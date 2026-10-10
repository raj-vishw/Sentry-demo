import { ServerCog } from 'lucide-react';

/**
 * Full-screen — rendered by AuthGate in place of the entire app (not inside
 * an OS window) once any API response comes back with the MAINTENANCE_MODE
 * error code. Admins never see this: the backend's maintenanceMode
 * middleware exempts authenticated ADMIN requests, so this is only ever a
 * client-side consequence of a request that was already blocked server-side.
 */
export function MaintenancePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-[var(--color-bg)] px-4 text-center">
      <ServerCog className="size-10 text-[var(--color-accent)]" aria-hidden="true" />
      <p className="font-mono text-sm uppercase tracking-widest text-[var(--color-text-muted)]">System maintenance</p>
      <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)]">
        This platform is temporarily unavailable
      </h1>
      <p className="max-w-sm text-sm text-[var(--color-text-secondary)]">
        An administrator is performing maintenance. Please check back shortly.
      </p>
    </div>
  );
}
