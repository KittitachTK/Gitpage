import type { BibEntry } from './types';

/**
 * Minimal BibTeX reader: handles `@type{key, field = {…} | "…" | number}` with
 * nested braces. Enough for a personal reference list; swap for citation-js if
 * full CSL formatting is ever needed.
 */
export function parseBibtex(src: string): Map<string, BibEntry> {
  const entries = new Map<string, BibEntry>();
  let i = 0;
  while ((i = src.indexOf('@', i)) !== -1) {
    const head = /^@(\w+)\s*\{\s*([^,\s]+)\s*,/.exec(src.slice(i));
    if (!head) { i++; continue; }
    const type = head[1].toLowerCase();
    if (type === 'comment' || type === 'preamble' || type === 'string') { i++; continue; }
    let j = i + head[0].length;
    const fields: Record<string, string> = {};
    while (j < src.length) {
      const fm = /^\s*(\w[\w-]*)\s*=\s*/.exec(src.slice(j));
      if (!fm) break;
      j += fm[0].length;
      let value = '';
      if (src[j] === '{') {
        let depth = 0;
        const start = j;
        for (; j < src.length; j++) {
          if (src[j] === '{') depth++;
          else if (src[j] === '}' && --depth === 0) break;
        }
        value = src.slice(start + 1, j);
        j++;
      } else if (src[j] === '"') {
        const end = src.indexOf('"', j + 1);
        value = src.slice(j + 1, end);
        j = end + 1;
      } else {
        const m = /^[^,}\s]+/.exec(src.slice(j));
        value = m?.[0] ?? '';
        j += value.length;
      }
      fields[fm[1].toLowerCase()] = value.replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
      const sep = /^\s*,?/.exec(src.slice(j));
      j += sep?.[0].length ?? 0;
      if (src[j] === '}') break;
    }
    entries.set(head[2], { key: head[2], type, fields });
    i = j;
  }
  return entries;
}

function surnames(authors = ''): string[] {
  return authors
    .split(/\s+and\s+/)
    .map((a) => (a.includes(',') ? a.split(',')[0] : a.trim().split(/\s+/).pop() ?? '').trim())
    .filter(Boolean);
}

/** Short in-text label, e.g. "Dimock 1982" or "Glimm & Jaffe 1987". */
export function citeLabel(e: BibEntry): string {
  const s = surnames(e.fields.author ?? e.fields.editor);
  const who = s.length === 0 ? e.key : s.length === 1 ? s[0] : s.length === 2 ? `${s[0]} & ${s[1]}` : `${s[0]} et al.`;
  return e.fields.year ? `${who} ${e.fields.year}` : who;
}

/** Plain-text bibliography line (rendered as HTML by the caller, so escape there). */
export function formatReference(e: BibEntry): { authors: string; year?: string; title?: string; venue?: string; url?: string } {
  const f = e.fields;
  return {
    authors: (f.author ?? f.editor ?? '').split(/\s+and\s+/).join(', '),
    year: f.year,
    title: f.title,
    venue: [f.journal ?? f.booktitle ?? f.publisher, f.volume, f.pages].filter(Boolean).join(', ') || undefined,
    url: f.doi ? `https://doi.org/${f.doi}` : f.url,
  };
}
