import { useEffect, useState } from 'react';
import { TriangleAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingSpinner } from '@/components/feedback/LoadingSpinner';
import { ErrorState } from '@/components/feedback/ErrorState';
import { useUiStore } from '@/stores/uiStore';
import { useAdminSettings, useUpdateSettings } from './hooks/useAdmin';
import { cn } from '@/lib/utils';

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-[var(--radius-md)] border border-[var(--color-glass-border)] bg-[var(--color-surface)]/40 px-3.5 py-3">
      <div className="min-w-0 flex-1">
        <p className="text-sm text-[var(--color-text-primary)]">{label}</p>
        <p className="text-xs text-[var(--color-text-muted)]">{description}</p>
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

export function AdminSettingsPage() {
  const { data: config, isLoading, isError, refetch } = useAdminSettings();
  const updateSettings = useUpdateSettings();
  const pushToast = useUiStore((s) => s.pushToast);

  const [platformName, setPlatformName] = useState('');
  const [platformDescription, setPlatformDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [accentColor, setAccentColor] = useState('');
  const [bootMessage, setBootMessage] = useState('');
  const [confirmingMaintenance, setConfirmingMaintenance] = useState(false);

  useEffect(() => {
    if (config) {
      setPlatformName(config.platformName);
      setPlatformDescription(config.platformDescription);
      setLogoUrl(config.logoUrl ?? '');
      setFaviconUrl(config.faviconUrl ?? '');
      setAccentColor(config.accentColor ?? '');
      setBootMessage(config.bootMessage ?? '');
    }
  }, [config]);

  function save(input: Parameters<typeof updateSettings.mutate>[0], successMessage: string) {
    updateSettings.mutate(input, {
      onSuccess: () => pushToast({ title: successMessage, variant: 'success' }),
      onError: () => pushToast({ title: 'Could not save settings', variant: 'error' }),
    });
  }

  if (isLoading) return <LoadingSpinner label="Loading settings..." />;
  if (isError || !config) return <ErrorState onRetry={() => refetch()} />;

  const brandingDirty =
    platformName !== config.platformName ||
    platformDescription !== config.platformDescription ||
    logoUrl !== (config.logoUrl ?? '') ||
    faviconUrl !== (config.faviconUrl ?? '') ||
    accentColor !== (config.accentColor ?? '') ||
    bootMessage !== (config.bootMessage ?? '');

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-[var(--color-text-primary)] sm:text-3xl">
          Platform Settings
        </h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          Configuration that applies to this entire deployment — no code or environment changes required.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Branding</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Input
            label="Platform name"
            value={platformName}
            onChange={(e) => setPlatformName(e.target.value)}
            maxLength={60}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-secondary)]">
              Description
            </label>
            <textarea
              value={platformDescription}
              onChange={(e) => setPlatformDescription(e.target.value)}
              maxLength={280}
              rows={3}
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border-strong)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)] focus:border-[var(--color-accent)] focus-visible:outline-none"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Logo URL (optional)"
              placeholder="https://..."
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
            />
            <Input
              label="Favicon URL (optional)"
              placeholder="https://..."
              value={faviconUrl}
              onChange={(e) => setFaviconUrl(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Accent color (optional, hex)"
              placeholder="#00e5ff"
              value={accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
            />
            <Input
              label="Boot message (optional)"
              placeholder="Shown on the boot screen"
              maxLength={120}
              value={bootMessage}
              onChange={(e) => setBootMessage(e.target.value)}
            />
          </div>
          <Button
            className="self-start"
            disabled={!brandingDirty}
            isLoading={updateSettings.isPending}
            onClick={() =>
              save(
                {
                  platformName,
                  platformDescription,
                  logoUrl: logoUrl || null,
                  faviconUrl: faviconUrl || null,
                  accentColor: accentColor || null,
                  bootMessage: bootMessage || null,
                },
                'Branding updated',
              )
            }
          >
            Save branding
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Access</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <ToggleRow
            label="Registration enabled"
            description="When off, new players cannot create accounts. Existing accounts can still log in."
            checked={config.registrationEnabled}
            onChange={(v) =>
              save({ registrationEnabled: v }, v ? 'Registration enabled' : 'Registration disabled')
            }
          />
          <ToggleRow
            label="Require approval for new registrations"
            description="New accounts stay pending until an admin approves them from Users — useful for invite-only or vetted CTFs."
            checked={config.registrationRequiresApproval}
            onChange={(v) =>
              save(
                { registrationRequiresApproval: v },
                v ? 'New registrations now require approval' : 'New registrations no longer require approval',
              )
            }
          />
          <ToggleRow
            label="Maintenance mode"
            description="When on, every non-admin request is blocked platform-wide. Admins are never affected."
            checked={config.maintenanceMode}
            onChange={(v) => {
              if (v) {
                setConfirmingMaintenance(true);
              } else {
                save({ maintenanceMode: false }, 'Maintenance mode disabled');
              }
            }}
          />
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmingMaintenance}
        onClose={() => setConfirmingMaintenance(false)}
        onConfirm={() => {
          save({ maintenanceMode: true }, 'Maintenance mode enabled');
          setConfirmingMaintenance(false);
        }}
        title="Enable maintenance mode?"
        description="Every logged-out visitor and non-admin account will immediately be blocked from the platform until you turn this back off. Admin accounts are unaffected."
        confirmLabel="Enable maintenance mode"
        variant="danger"
        isLoading={updateSettings.isPending}
      >
        <div className="mt-2 flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--color-warning)]/30 bg-[var(--color-warning)]/10 px-3.5 py-3 text-sm text-[var(--color-warning)]">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>Make sure you can reach the admin login again before enabling this.</span>
        </div>
      </ConfirmDialog>
    </div>
  );
}
