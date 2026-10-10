import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';

export function StatCard({
  icon: Icon,
  label,
  value,
  accent = 'accent',
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accent?: 'accent' | 'secondary';
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className="flex size-11 items-center justify-center rounded-[var(--radius-md)]"
          style={{
            backgroundColor: accent === 'accent' ? 'var(--color-accent-soft)' : 'var(--color-secondary-soft)',
            color: accent === 'accent' ? 'var(--color-accent)' : 'var(--color-secondary-hover)',
          }}
        >
          <Icon className="size-5" aria-hidden="true" />
        </div>
        <div>
          <p className="font-display text-2xl font-bold text-[var(--color-text-primary)]">{value}</p>
          <p className="text-xs uppercase tracking-wide text-[var(--color-text-muted)]">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}
