/** Shared Recharts tooltip styling, reading the same CSS tokens every chart
 * in the app already uses, so a chart's tooltip always matches the current
 * theme instead of each page redefining this object inline. */
export const chartTooltipStyle = {
  background: 'var(--color-surface-elevated)',
  border: '1px solid var(--color-border)',
  borderRadius: 8,
  fontSize: 12,
  color: 'var(--color-text-primary)',
};

export const CHART_PALETTE = [
  'var(--color-accent)',
  'var(--color-secondary)',
  '#34d399',
  '#fbbf24',
  '#fb923c',
  '#f87171',
  '#60a5fa',
  '#c084fc',
];
