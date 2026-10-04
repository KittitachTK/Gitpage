/**
 * Client-side full-text search over /search-index.json (built from the vault).
 * Fields: title, aliases, tags, headings, path, text.
 */
import MiniSearch from 'minisearch';

export interface SearchDoc {
  id: string;
  title: string;
  slug: string;
  path: string;
  section: string;
  aliases: string;
  tags: string;
  headings: string;
  text: string;
  excerpt: string;
}

let engine: Promise<MiniSearch<SearchDoc>> | undefined;

/** Split on whitespace/punctuation; Thai has no spaces, so also index character bigrams. */
function tokenize(s: string): string[] {
  const words = s.toLowerCase().split(/[\s\p{P}\p{S}]+/u).filter(Boolean);
  const out: string[] = [];
  for (const w of words) {
    if (/[฀-๿]/.test(w) && w.length > 2) {
      for (let i = 0; i < w.length - 1; i++) out.push(w.slice(i, i + 2));
    } else out.push(w);
  }
  return out;
}

export function loadSearch(base: string) {
  engine ??= fetch(`${base}search-index.json`)
    .then((r) => r.json() as Promise<SearchDoc[]>)
    .then((docs) => {
      const ms = new MiniSearch<SearchDoc>({
        fields: ['title', 'aliases', 'tags', 'headings', 'path', 'text'],
        storeFields: ['title', 'slug', 'path', 'section', 'excerpt', 'text'],
        tokenize,
        searchOptions: {
          boost: { title: 4, aliases: 3, tags: 2, headings: 2, path: 1 },
          prefix: true,
          fuzzy: 0.15,
          combineWith: 'AND',
        },
      });
      ms.addAll(docs);
      return ms;
    });
  return engine;
}

export function snippet(text: string, query: string, len = 180): string {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  const lower = text.toLowerCase();
  const at = terms.map((t) => lower.indexOf(t)).filter((i) => i >= 0).sort((a, b) => a - b)[0] ?? 0;
  const start = Math.max(0, at - 50);
  return (start ? '…' : '') + text.slice(start, start + len).replace(/\s+/g, ' ') + (start + len < text.length ? '…' : '');
}

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

export function highlight(s: string, query: string) {
  let html = escapeHtml(s);
  for (const t of query.toLowerCase().split(/\s+/).filter((t) => t.length > 1)) {
    html = html.replace(new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'), '<mark>$1</mark>');
  }
  return html;
}
