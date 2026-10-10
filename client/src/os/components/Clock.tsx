import { useEffect, useState } from 'react';
import { useSettingsStore } from '../state/settingsStore';

export function Clock() {
  const format = useSettingsStore((s) => s.clockFormat);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000 * 15);
    return () => clearInterval(id);
  }, []);

  const time = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: format === '12h',
  });

  return <span className="font-mono text-xs tabular-nums text-[var(--color-text-secondary)]">{time}</span>;
}
