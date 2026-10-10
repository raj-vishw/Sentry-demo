import { cn } from '@/lib/utils';

export interface PasswordStrengthResult {
  score: number; // 0-4
  label: string;
}

export function getPasswordStrength(password: string): PasswordStrengthResult {
  if (!password) return { score: 0, label: '' };

  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  const clamped = Math.min(score, 4);
  const labels = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong'];
  return { score: clamped, label: labels[clamped] };
}

const barColors = [
  'bg-[var(--color-error)]',
  'bg-[var(--color-error)]',
  'bg-[var(--color-warning)]',
  'bg-[var(--color-accent)]',
  'bg-[var(--color-success)]',
];

export function PasswordStrength({ password }: { password: string }) {
  const { score, label } = getPasswordStrength(password);
  if (!password) return null;

  return (
    <div className="flex flex-col gap-1.5" aria-live="polite">
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full bg-[var(--color-border)] transition-colors duration-[var(--duration-base)]',
              i < score && barColors[score],
            )}
          />
        ))}
      </div>
      <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
    </div>
  );
}
