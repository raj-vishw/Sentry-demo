import type { ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';
import { Button, type ButtonProps } from '@/components/ui/Button';

export function AuthButton(props: ButtonProps) {
  return <Button size="lg" className="w-full" {...props} />;
}

export function AuthError({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-2 rounded-[var(--radius-md)] border border-[var(--color-error)]/30 bg-[var(--color-error)]/10 px-3.5 py-3 text-sm text-[var(--color-error)]"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

export function AuthDivider({ label = 'OR' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-[var(--color-border)]" />
      <span className="font-mono text-xs text-[var(--color-text-muted)]">{label}</span>
      <span className="h-px flex-1 bg-[var(--color-border)]" />
    </div>
  );
}
