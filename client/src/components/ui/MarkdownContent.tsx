import { useState, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import type { Components } from 'react-markdown';
import { Check, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';

/** Recursively flattens a rendered React node tree back to plain text —
 * `pre`'s children are already-rendered elements (react-markdown's AST),
 * not a raw string, so this is what the copy button actually copies. */
function nodeToText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join('');
  if (typeof node === 'object' && 'props' in node) {
    return nodeToText((node as { props: { children?: ReactNode } }).props.children);
  }
  return '';
}

function CodeBlock({ children, ...props }: ComponentPropsWithoutRef<'pre'>) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(nodeToText(children));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard access can be denied (permissions, non-HTTPS context) —
      // no fallback needed, the code is still right there to select by hand.
    }
  }

  return (
    <div className="group relative">
      <pre
        className="mt-3 overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-4"
        {...props}
      >
        {children}
      </pre>
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? 'Copied' : 'Copy code'}
        className="absolute right-2 top-2 flex items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-glass-border)] bg-[var(--color-surface)]/80 px-2 py-1 text-[11px] text-[var(--color-text-muted)] opacity-0 transition-opacity group-hover:opacity-100 hover:text-[var(--color-text-primary)]"
      >
        {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

/**
 * No typography plugin is installed, so markdown elements are styled
 * directly here via `components` overrides — the design-token classes match
 * the rest of the app rather than a generic prose stylesheet.
 *
 * `remarkGfm` (below) is what makes tables, task-list checkboxes, and
 * strikethrough parse at all — plain `react-markdown` treats that syntax
 * as regular text, which is why docs with tables used to render as a wall
 * of literal `|` characters. `rehypeSlug` gives headings the GitHub-style
 * `id`s that `docs.service.ts`'s link rewriting and `#anchor` links in the
 * source markdown both assume exist.
 *
 * Security note: this intentionally never enables a raw-HTML plugin (e.g.
 * `rehype-raw`). react-markdown without one never interprets embedded
 * `<script>`/`<iframe>`/event-handler HTML as markup — it's rendered as
 * inert text — which is the actual XSS defense for user-submitted content
 * (writeups, challenge descriptions), not a sanitizer bolted on afterward.
 */
const MARKDOWN_COMPONENTS: Components = {
  h1: (props) => <h2 className="mt-8 max-w-prose scroll-mt-24 font-display text-xl font-bold text-[var(--color-text-primary)] first:mt-0" {...props} />,
  h2: (props) => <h3 className="mt-7 max-w-prose scroll-mt-24 font-display text-lg font-bold text-[var(--color-text-primary)] first:mt-0" {...props} />,
  h3: (props) => <h4 className="mt-6 max-w-prose scroll-mt-24 font-display text-base font-semibold text-[var(--color-text-primary)] first:mt-0" {...props} />,
  p: (props) => <p className="mt-4 max-w-prose text-sm leading-relaxed text-[var(--color-text-secondary)] first:mt-0" {...props} />,
  ul: (props) => <ul className="mt-4 max-w-prose list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-[var(--color-text-secondary)]" {...props} />,
  ol: (props) => <ol className="mt-4 max-w-prose list-decimal space-y-1.5 pl-5 text-sm leading-relaxed text-[var(--color-text-secondary)]" {...props} />,
  a: (props) => <a className="text-[var(--color-accent)] underline underline-offset-2 hover:text-[var(--color-accent-hover)]" target="_blank" rel="noreferrer noopener" {...props} />,
  blockquote: (props) => (
    <blockquote className="mt-4 max-w-prose border-l-2 border-[var(--color-accent)]/40 pl-4 text-sm italic text-[var(--color-text-muted)]" {...props} />
  ),
  // GFM task-list items (`- [ ] ...`) render as a `<li class="task-list-item">`
  // wrapping a checkbox `<input>` — the bullet marker is dropped only for
  // those items so the checkbox doesn't sit next to a redundant disc.
  li: ({ className, ...props }) => (
    <li className={cn(className?.includes('task-list-item') && 'list-none')} {...props} />
  ),
  input: (props) => <input className="mr-2 translate-y-0.5 accent-[var(--color-accent)]" {...props} />,
  table: (props) => (
    <div className="mt-4 overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border)]">
      <table className="w-full border-collapse text-sm" {...props} />
    </div>
  ),
  thead: (props) => (
    <thead
      className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)] text-left text-xs uppercase tracking-wide text-[var(--color-text-muted)]"
      {...props}
    />
  ),
  tr: (props) => <tr className="border-b border-[var(--color-border)] last:border-0" {...props} />,
  th: (props) => <th className="px-3 py-2 font-medium text-[var(--color-text-primary)]" {...props} />,
  td: (props) => <td className="px-3 py-2 align-top text-[var(--color-text-secondary)]" {...props} />,
  code: ({ className, children, ...props }) => {
    const isBlock = className?.includes('language-');
    if (isBlock) {
      return (
        <code className={cn('block overflow-x-auto font-mono text-xs text-[var(--color-text-primary)]', className)} {...props}>
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-[var(--color-surface-elevated)] px-1.5 py-0.5 font-mono text-[0.85em] text-[var(--color-accent)]" {...props}>
        {children}
      </code>
    );
  },
  pre: CodeBlock,
};

export function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSlug]} components={MARKDOWN_COMPONENTS}>
      {content}
    </ReactMarkdown>
  );
}
