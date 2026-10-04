import GithubSlugger from 'github-slugger';
import type { Heading, WikiLink } from './types';

/** URL-safe slug that keeps non-Latin scripts (Thai, Greek, …) intact. */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

export function tagSlug(tag: string): string {
  return tag.split('/').map(slugify).join('/');
}

const WIKILINK = /(!?)\[\[([^[\]\n]+?)\]\]/g;

/** Split the inside of `[[…]]` into target / heading / block / alias. */
export function parseWikiInner(inner: string): Omit<WikiLink, 'raw' | 'embed' | 'line'> {
  // `\|` is how Obsidian escapes the alias pipe inside tables.
  const pipe = inner.search(/\\?\|/);
  let ref = inner;
  let alias: string | undefined;
  if (pipe >= 0) {
    ref = inner.slice(0, pipe);
    alias = inner.slice(pipe).replace(/^\\?\|/, '').trim() || undefined;
  }
  let target = ref;
  let heading: string | undefined;
  let block: string | undefined;
  const hash = ref.indexOf('#');
  if (hash >= 0) {
    target = ref.slice(0, hash);
    const frag = ref.slice(hash + 1).trim();
    if (frag.startsWith('^')) block = frag.slice(1);
    else if (frag) heading = frag.split('#').pop();
  }
  return { target: target.trim(), heading, block, alias };
}

/**
 * Blank out regions where Obsidian syntax is not interpreted (code, math,
 * HTML comments, `%% comments %%`) while preserving line numbers.
 */
export function maskNonProse(md: string): string {
  const blank = (m: string) => m.replace(/[^\n]/g, ' ');
  return md
    .replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, blank)
    .replace(/\$\$[\s\S]*?\$\$/g, blank)
    .replace(/%%[\s\S]*?%%/g, blank)
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/`[^`\n]+`/g, blank)
    .replace(/(?<![\\$])\$(?!\s)[^$\n]+?(?<!\s)\$/g, blank);
}

export function extractWikiLinks(masked: string, lineOffset = 0): WikiLink[] {
  const links: WikiLink[] = [];
  const lines = masked.split('\n');
  lines.forEach((line, i) => {
    for (const m of line.matchAll(WIKILINK)) {
      links.push({
        raw: m[0],
        embed: m[1] === '!',
        line: i + 1 + lineOffset,
        ...parseWikiInner(m[2]),
      });
    }
  });
  return links;
}

/** Inline `#tags`: must start after whitespace/line start and contain a non-digit. */
export const INLINE_TAG = /(^|[\s(])#([\p{L}\p{M}\p{N}_\-/]*[\p{L}\p{M}_\-/][\p{L}\p{M}\p{N}_\-/]*)/gu;

export function extractInlineTags(masked: string): string[] {
  // Headings (`# Title`) never match: the regex requires a non-space after `#`.
  return [...masked.matchAll(INLINE_TAG)].map((m) => m[2]);
}

export function extractHeadings(masked: string, original: string): Heading[] {
  const slugger = new GithubSlugger();
  const origLines = original.split('\n');
  const headings: Heading[] = [];
  masked.split('\n').forEach((line, i) => {
    const m = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!m) return;
    const text = stripInline(origLines[i].replace(/^#{1,6}\s+/, '').replace(/\s*#*\s*$/, ''));
    headings.push({ depth: m[1].length, text, id: slugger.slug(text) });
  });
  return headings;
}

/** Rough markdown → plain text, for excerpts, search and heading ids. */
export function stripInline(md: string): string {
  // Leave `$math$` untouched: `_` and `=` inside TeX are not emphasis.
  return md
    .split(/(\$[^$\n]+\$)/)
    .map((part, i) => (i % 2 ? part : stripInlineProse(part)))
    .join('')
    .trim();
}

function stripInlineProse(md: string): string {
  return md
    .replace(/!?\[\[([^[\]|]+?)(?:\|([^[\]]+?))?\]\]/g, (_, t: string, a?: string) => a ?? t.split('#')[0])
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_~=`]{1,3}([^*_~=`]+)[*_~=`]{1,3}/g, '$1')
    .replace(/<[^>]+>/g, '');
}

export function toPlainText(body: string): string {
  return body
    .replace(/^(```|~~~)[^\n]*\n([\s\S]*?)^\1[^\n]*$/gm, '$2')
    .replace(/%%[\s\S]*?%%/g, '')
    .replace(/^>\s*\[![^\]]+\][+-]?\s*/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*+]\s+(\[.\]\s+)?/gm, '')
    .replace(/^\s*\|?[-:| ]+\|?\s*$/gm, '')
    .split('\n')
    .map(stripInline)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function makeExcerpt(body: string, max = 220): string {
  // Prefer the first real paragraph: skip headings, callout headers, math, code.
  const paragraphs = body
    .replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, '')
    .replace(/\$\$[\s\S]*?\$\$/g, '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p && !/^(#|>|\||!\[|---|- |\* |\d+\. )/.test(p));
  const text = stripInline((paragraphs[0] ?? '').replace(/\n/g, ' '));
  return text.length > max ? text.slice(0, max).replace(/\s+\S*$/, '') + '…' : text;
}
