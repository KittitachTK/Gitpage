/**
 * Build-time view models for the Library bookshelf (ShelfStage.astro).
 */
import type { ShelfBook } from '../../scripts/shelf';
import { crumbs, fmtDate, noteUrl, readingMinutes } from '../../lib/site';
import type { Note } from '../../lib/vault/types';

export function shelfBook(n: Note): ShelfBook {
  const excerpt = n.excerpt ? (n.excerpt.length > 200 ? n.excerpt.slice(0, 199).trimEnd() + '…' : n.excerpt) : undefined;
  return {
    id: n.slug,
    url: noteUrl(n),
    title: n.title,
    path: crumbs(n).map((c) => c.label).join(' / '),
    type: n.type,
    date: n.updated ? fmtDate(n.updated) : undefined,
    minutes: readingMinutes(n),
    excerpt,
  };
}

/** `var(--sec-mathematics)` → `--sec-mathematics` */
export const colorVar = (cssVar: string) => /--[\w-]+/.exec(cssVar)?.[0] ?? '--sec-other';
