import { useNavigate } from 'react-router-dom';
import { Check, LogOut, Moon, Sun } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { authService } from '@/services/authService';
import { usePrefersReducedMotion } from '@/hooks/useMediaQuery';
import { useSettingsStore, ACCENT_VALUES, type AccentId, type ThemeMode, type WallpaperId } from '../state/settingsStore';
import { cn } from '@/lib/utils';

const THEMES: { id: ThemeMode; label: string; icon: typeof Sun }[] = [
  { id: 'dark', label: 'Dark', icon: Moon },
  { id: 'light', label: 'Light', icon: Sun },
];

const WALLPAPERS: { id: WallpaperId; label: string }[] = [
  { id: 'observatory', label: 'Observatory' },
  { id: 'aurora', label: 'Aurora' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'matrix', label: 'Matrix' },
  { id: 'terminal', label: 'Terminal' },
  { id: 'nebula', label: 'Nebula' },
  { id: 'void', label: 'Void' },
];

const ACCENTS: { id: AccentId; label: string }[] = [
  { id: 'signal', label: 'Signal' },
  { id: 'discovery', label: 'Discovery' },
  { id: 'amber', label: 'Amber' },
];

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-text-muted)]">{title}</h3>
      {children}
    </section>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--color-glass-border)] bg-[var(--color-surface)]/40 px-3.5 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-[var(--color-text-primary)]">{label}</p>
        {description && <p className="text-xs text-[var(--color-text-muted)]">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative h-6 w-11 shrink-0 rounded-full transition-colors',
          checked ? 'bg-[var(--color-accent)]' : 'bg-[var(--color-surface-elevated)]',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 size-5 rounded-full bg-white transition-transform',
            checked ? 'translate-x-5' : 'translate-x-0',
          )}
        />
      </button>
    </div>
  );
}

export function SettingsApp() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const clearSession = useAuthStore((s) => s.clearSession);
  const pushToast = useUiStore((s) => s.pushToast);
  const systemReducedMotion = usePrefersReducedMotion();

  const theme = useSettingsStore((s) => s.theme);
  const wallpaper = useSettingsStore((s) => s.wallpaper);
  const accent = useSettingsStore((s) => s.accent);
  const density = useSettingsStore((s) => s.density);
  const reduceMotion = useSettingsStore((s) => s.reduceMotion);
  const clockFormat = useSettingsStore((s) => s.clockFormat);
  const dockAutohide = useSettingsStore((s) => s.dockAutohide);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const setWallpaper = useSettingsStore((s) => s.setWallpaper);
  const setAccent = useSettingsStore((s) => s.setAccent);
  const setDensity = useSettingsStore((s) => s.setDensity);
  const setReduceMotion = useSettingsStore((s) => s.setReduceMotion);
  const setClockFormat = useSettingsStore((s) => s.setClockFormat);
  const setDockAutohide = useSettingsStore((s) => s.setDockAutohide);

  async function handleLogout() {
    await authService.logout().catch(() => {});
    clearSession();
    pushToast({ title: 'Session terminated', variant: 'info' });
    navigate('/', { replace: true });
  }

  return (
    <div className="flex flex-col gap-8 overflow-y-auto p-5 sm:p-6">
      <SettingsSection title="Appearance">
        <div className="flex flex-col gap-2">
          <p className="text-xs text-[var(--color-text-secondary)]">Theme</p>
          <div className="flex gap-2">
            {THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTheme(t.id)}
                className={cn(
                  'flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs transition-colors',
                  theme === t.id
                    ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                    : 'border-[var(--color-glass-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
                )}
              >
                <t.icon className="size-3.5" />
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs text-[var(--color-text-secondary)]">Wallpaper</p>
          <div className="flex flex-wrap gap-2">
            {WALLPAPERS.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => setWallpaper(w.id)}
                className={cn(
                  'rounded-full border px-3.5 py-1.5 text-xs transition-colors',
                  wallpaper === w.id
                    ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                    : 'border-[var(--color-glass-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
                )}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs text-[var(--color-text-secondary)]">Accent color</p>
          <div className="flex gap-2">
            {ACCENTS.map((a) => (
              <button
                key={a.id}
                type="button"
                aria-label={a.label}
                onClick={() => setAccent(a.id)}
                className="flex size-9 items-center justify-center rounded-full border border-[var(--color-glass-border)]"
                style={{ backgroundColor: ACCENT_VALUES[a.id] }}
              >
                {accent === a.id && <Check className="size-4 text-[#0a0c11]" />}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs text-[var(--color-text-secondary)]">Interface density</p>
          <div className="flex gap-2">
            {(['comfortable', 'compact'] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDensity(d)}
                className={cn(
                  'rounded-full border px-3.5 py-1.5 text-xs capitalize transition-colors',
                  density === d
                    ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                    : 'border-[var(--color-glass-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
                )}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Motion & accessibility">
        <ToggleRow
          label="Reduce motion"
          description={
            reduceMotion === null
              ? `Following system setting (currently ${systemReducedMotion ? 'reduced' : 'full'})`
              : reduceMotion
                ? 'Animations minimized'
                : 'Full animation'
          }
          checked={reduceMotion ?? systemReducedMotion}
          onChange={(v) => setReduceMotion(v)}
        />
        {reduceMotion !== null && (
          <button
            type="button"
            onClick={() => setReduceMotion(null)}
            className="self-start text-xs text-[var(--color-accent)] hover:underline"
          >
            Reset to system setting
          </button>
        )}
      </SettingsSection>

      <SettingsSection title="Workspace">
        <ToggleRow label="Auto-hide dock" checked={dockAutohide} onChange={setDockAutohide} />
        <div className="flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--color-glass-border)] bg-[var(--color-surface)]/40 px-3.5 py-3">
          <p className="text-sm text-[var(--color-text-primary)]">Clock format</p>
          <div className="flex gap-2">
            {(['24h', '12h'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setClockFormat(f)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs transition-colors',
                  clockFormat === f
                    ? 'border-[var(--color-accent)] text-[var(--color-accent)]'
                    : 'border-[var(--color-glass-border)] text-[var(--color-text-secondary)]',
                )}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </SettingsSection>

      <SettingsSection title="Account">
        <div className="flex items-center justify-between rounded-[var(--radius-md)] border border-[var(--color-glass-border)] bg-[var(--color-surface)]/40 px-3.5 py-3">
          <div>
            <p className="text-sm text-[var(--color-text-primary)]">{user?.username}</p>
            <p className="text-xs text-[var(--color-text-muted)]">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-glass-border)] px-3.5 py-1.5 text-xs text-[var(--color-error)] hover:border-[var(--color-error)]/40"
          >
            <LogOut className="size-3.5" /> Log out
          </button>
        </div>
      </SettingsSection>
    </div>
  );
}
