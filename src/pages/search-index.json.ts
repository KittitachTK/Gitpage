import type { APIRoute } from 'astro';
import { crumbs } from '../lib/site';
import { getVault } from '../lib/vault/vault';

/** Documents for client-side search (see src/scripts/search.ts). */
export const GET: APIRoute = () => {
  const docs = getVault().notes.map((n) => ({
    id: n.id,
    title: n.title,
    slug: n.slug,
    path: crumbs(n).map((c) => c.label).join(' / '),
    section: n.section,
    aliases: n.aliases.join(' '),
    tags: n.tags.join(' '),
    headings: n.headings.map((h) => h.text).join(' '),
    // Plain text keeps the TeX source, so equations are searchable as text.
    text: n.text.slice(0, 20000),
    excerpt: n.excerpt,
  }));
  return new Response(JSON.stringify(docs), { headers: { 'Content-Type': 'application/json' } });
};
