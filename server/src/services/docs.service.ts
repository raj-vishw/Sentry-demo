import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { AppError } from '../utils/errors.js';
import { env } from '../config/env.js';

// Where the repo's docs/ folder lives — see env.ts's DOCS_DIR comment for
// why bare-metal dev and Docker need different defaults.
const DOCS_DIR = env.DOCS_DIR || path.resolve(process.cwd(), '../docs');

export interface DocNavItem {
  slug: string;
  title: string;
}

export interface DocNavGroup {
  label: string;
  items: DocNavItem[];
}

interface DocEntry {
  title: string;
  file: string;
}

// The one and only mapping from a public slug to a real file — a client
// never supplies a file path, only a slug looked up here, so there is no
// path-traversal surface at all, by construction (not by sanitization).
//
// sentry-demo ships exactly one doc (docs/about-this-demo.md) rather than
// the main Sentry repo's full docs/ tree — this is a standalone public
// demo, not a self-hosting reference, so the deployment/architecture/
// contributing docs would just be confusing dead links here.
const DOC_GROUPS: { label: string; entries: Record<string, DocEntry> }[] = [
  {
    label: 'About',
    entries: {
      'about-this-demo': { title: 'About This Demo', file: 'about-this-demo.md' },
    },
  },
];

const SLUG_INDEX = new Map<string, DocEntry>();
// Reverse of SLUG_INDEX, keyed by file path — lets rewriteLinks() turn a
// markdown link written for GitHub browsing (e.g. `../getting-started.md`,
// resolved relative to the linking file) back into the slug it points at.
const FILE_TO_SLUG = new Map<string, string>();
for (const group of DOC_GROUPS) {
  for (const [slug, entry] of Object.entries(group.entries)) {
    SLUG_INDEX.set(slug, entry);
    FILE_TO_SLUG.set(entry.file, slug);
  }
}

// Every doc's markdown file opens with its own `# Title` (so it reads
// correctly as a standalone file on GitHub) — but the docs browser also
// renders `title` as the page's own heading, so left untouched that H1
// renders a second time right below it. Dropping it here (API response
// only, never the file on disk) is the single place that fixes every doc
// at once rather than hand-editing 19 files.
function stripLeadingHeading(content: string): string {
  return content.replace(/^﻿?\s*#[^\n]*\n+/, '');
}

const MD_LINK_RE = /\[([^\]]*)\]\((?!https?:\/\/|mailto:|#)([^)#\s]+\.md)(#[^)\s]*)?\)/g;

// Docs are written as plain files meant to also render correctly on
// GitHub, so their links are relative file paths (`../getting-started.md`,
// `challenge-types.md`) rather than app routes. Rewritten here, once, into
// `/docs/:slug` links the in-app browser can actually navigate — anything
// that resolves outside the allowlist (e.g. the root `SECURITY.md`, which
// isn't served by this endpoint) is de-linked to plain text instead of
// shipping a link the app can't open.
function rewriteLinks(content: string, fromFile: string): string {
  const fromDir = path.posix.dirname(fromFile);
  return content.replace(MD_LINK_RE, (_match, text: string, linkPath: string, anchor: string | undefined) => {
    const resolved = path.posix.normalize(path.posix.join(fromDir, linkPath));
    const slug = FILE_TO_SLUG.get(resolved);
    if (!slug) return text;
    return `[${text}](/docs/${slug}${anchor ?? ''})`;
  });
}

export function listDocs(): DocNavGroup[] {
  return DOC_GROUPS.map((group) => ({
    label: group.label,
    items: Object.entries(group.entries).map(([slug, entry]) => ({ slug, title: entry.title })),
  }));
}

export interface DocContent {
  slug: string;
  title: string;
  content: string;
}

export async function getDoc(slug: string): Promise<DocContent> {
  const entry = SLUG_INDEX.get(slug);
  if (!entry) throw AppError.notFound('Documentation page not found.');

  let content: string;
  try {
    content = await readFile(path.join(DOCS_DIR, entry.file), 'utf8');
  } catch {
    // The markdown file is missing on disk even though it's a known slug —
    // a deployment/packaging problem (e.g. the Docker build-context fix
    // wasn't applied), not something to leak a raw ENOENT for.
    throw AppError.notFound('Documentation page not found.');
  }

  content = rewriteLinks(stripLeadingHeading(content), entry.file);

  return { slug, title: entry.title, content };
}
