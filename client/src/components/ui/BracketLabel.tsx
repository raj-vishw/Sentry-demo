import type { ReactNode } from 'react';

/**
 * Wraps text in literal `[ ... ]` brackets for the public shell's
 * terminal-style buttons/links, with the brackets themselves hidden from
 * the accessible name (aria-hidden) so a screen reader hears "Login", not
 * "[ Login ]".
 */
export function BracketLabel({ children }: { children: ReactNode }) {
  return (
    <>
      <span aria-hidden="true">[ </span>
      {children}
      <span aria-hidden="true"> ]</span>
    </>
  );
}
