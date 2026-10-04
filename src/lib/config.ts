import path from 'node:path';

/**
 * Site-wide configuration. Content lives in the vault; everything here is
 * presentation or pipeline policy, so the vault never has to change when the
 * design does.
 */
export const SITE = {
  name: 'PLANKTOS',
  subtitle: 'Knowledge Archive',
  tagline: 'Mathematics · Physics · Computation',
  description:
    'A personal archive devoted to mathematics, theoretical physics and fundamental questions.',
};

/** Root of the Obsidian vault. Override with VAULT_DIR to point at another vault. */
export const VAULT_DIR = path.resolve(process.env.VAULT_DIR ?? 'vault');

/** BibTeX file inside the vault used for `@citekey` references. */
export const BIB_FILE = 'references.bib';

/** URL prefix under which vault assets (images, PDFs, …) are served. */
export const ASSET_PREFIX = 'vault';

/** Base path the site is deployed under (mirrors `base` in astro.config.mjs). */
export const BASE = normaliseBase(process.env.BASE_PATH ?? '/');

/** Folders and files the scanner never publishes (notes with `publish: false` are skipped too). */
export const IGNORE = ['.obsidian', '.trash', '.git', 'node_modules', 'Templates', 'Private'];

/** Top-level sections, in display order. Unlisted top-level folders go under "Other". */
export const SECTIONS: { folder: string; label: string; blurb: string }[] = [
  { folder: 'Mathematics', label: 'Mathematics', blurb: 'Structures, proofs and abstractions.' },
  { folder: 'Physics', label: 'Theoretical Physics', blurb: 'Fields, symmetries and the laws of nature.' },
  { folder: 'Computer Science', label: 'Computer Science', blurb: 'Computation, algorithms and systems.' },
  { folder: 'Research', label: 'Research', blurb: 'Active projects, logs and open questions.' },
  { folder: 'Ideas', label: 'Ideas', blurb: 'Conjectures, sketches and half-formed thoughts.' },
];

/** Allowed values for the `status` frontmatter field (validated in CI). */
export const STATUSES = ['seed', 'studying', 'draft', 'active', 'paused', 'complete', 'archived'];

/**
 * Callout types. Obsidian's built-ins plus academic types. Each maps to a
 * visual family so the stylesheet stays small.
 */
export const CALLOUTS: Record<string, { label: string; family: string }> = {
  note: { label: 'Note', family: 'info' },
  info: { label: 'Info', family: 'info' },
  abstract: { label: 'Abstract', family: 'info' },
  summary: { label: 'Summary', family: 'info' },
  tip: { label: 'Tip', family: 'success' },
  success: { label: 'Success', family: 'success' },
  question: { label: 'Question', family: 'warning' },
  warning: { label: 'Warning', family: 'warning' },
  caution: { label: 'Caution', family: 'warning' },
  danger: { label: 'Danger', family: 'danger' },
  failure: { label: 'Failure', family: 'danger' },
  bug: { label: 'Bug', family: 'danger' },
  example: { label: 'Example', family: 'example' },
  quote: { label: 'Quote', family: 'quote' },
  definition: { label: 'Definition', family: 'definition' },
  theorem: { label: 'Theorem', family: 'theorem' },
  lemma: { label: 'Lemma', family: 'theorem' },
  proposition: { label: 'Proposition', family: 'theorem' },
  corollary: { label: 'Corollary', family: 'theorem' },
  proof: { label: 'Proof', family: 'proof' },
  conjecture: { label: 'Conjecture', family: 'conjecture' },
  remark: { label: 'Remark', family: 'quote' },
  exercise: { label: 'Exercise', family: 'example' },
  solution: { label: 'Solution', family: 'success' },
  answer: { label: 'Answer', family: 'success' },
};

/**
 * Routes owned by site pages. A note may not produce exactly one of these
 * slugs, nor any slug under a prefix that has dynamic child pages.
 * (Folders like Research/ and Ideas/ are fine: /research is the sector index,
 * /research/<project>/… are the notes.)
 */
export const RESERVED_ROUTES = ['library', 'tags', 'universe', 'research', 'ideas', 'search', 'graph.json', 'search-index.json', '404'];
export const RESERVED_PREFIXES = ['library', 'tags', ASSET_PREFIX];

function normaliseBase(b: string) {
  const trimmed = b.replace(/^\/+|\/+$/g, '');
  return trimmed ? `/${trimmed}/` : '/';
}

/** Prefix an absolute site path with the deployment base. */
export function href(p: string) {
  return BASE + p.replace(/^\/+/, '');
}
