import { useState } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface TabItem {
  value: string;
  label: string;
}

export function Tabs({
  items,
  defaultValue,
  onChange,
  children,
}: {
  items: TabItem[];
  defaultValue?: string;
  onChange?: (value: string) => void;
  children: (active: string) => ReactNode;
}) {
  const [active, setActive] = useState(defaultValue ?? items[0]?.value);

  function select(value: string) {
    setActive(value);
    onChange?.(value);
  }

  return (
    <div>
      <div role="tablist" className="flex gap-1 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-1">
        {items.map((item) => (
          <button
            key={item.value}
            role="tab"
            aria-selected={active === item.value}
            onClick={() => select(item.value)}
            className={cn(
              'relative flex-1 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium transition-colors',
              active === item.value
                ? 'text-[var(--color-text-inverse)]'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]',
            )}
          >
            {active === item.value && (
              <motion.span
                layoutId="tab-active-bg"
                className="absolute inset-0 rounded-[var(--radius-sm)] bg-[var(--color-accent)]"
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              />
            )}
            <span className="relative z-10">{item.label}</span>
          </button>
        ))}
      </div>
      <div className="mt-4">{children(active)}</div>
    </div>
  );
}
