import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeSlug from 'rehype-slug';
import rehypeMathjax from 'rehype-mathjax';
import rehypeShiki from '@shikijs/rehype';
import rehypeStringify from 'rehype-stringify';
import type { Root } from 'mdast';
import type { InlineMath } from 'mdast-util-math';
import { visit } from 'unist-util-visit';
import type { Note } from '../vault/types';
import { getVault, type Vault } from '../vault/vault';
import { remarkCallouts } from './callouts';
import { remarkCitations } from './citations';
import { remarkMermaid, remarkObsidian, type RenderContext } from './obsidian';
import { rehypeCollectTex, rehypeMathjaxSvg, rehypeTaskLabels } from './mathjax-svg';
import { stripComments } from './util';

export interface RenderedNote {
  html: string;
  /** Bibliography keys cited in this note, in order of first use. */
  citations: string[];
  hasMermaid: boolean;
}

/** Markdown → mdast with every Obsidian transform applied (used for embeds too). */
function parseNote(note: Note, ctx: RenderContext): Root {
  const source = splitMathFences(stripComments(note.body));
  const processor = unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkMath)
    .use(remarkDisplayMathInline, source)
    .use(remarkCallouts)
    .use(remarkObsidian, ctx)
    .use(remarkCitations, ctx)
    .use(remarkMermaid, ctx);
  const tree = processor.parse(source);
  return processor.runSync(tree) as Root;
}

/**
 * Obsidian accepts multi-line display math with TeX on the fence lines
 * (`$$\begin{aligned}` … `\end{aligned}$$`). remark-math reads the opening
 * line like a code fence — the TeX becomes ignored "meta" — and never finds the
 * close, so the block swallows the rest of the note. Move that TeX onto its own
 * lines, keeping any callout `>` prefix. Code fences are left alone.
 */
function splitMathFences(source: string): string {
  const out: string[] = [];
  let code: string | null = null; // open code fence marker
  let inMath = false;
  for (const line of source.split('\n')) {
    const [, prefix, rest] = /^([ \t]*(?:>[ \t]?)*)(.*)$/s.exec(line)!;
    const fence = /^(`{3,}|~{3,})/.exec(rest.trimStart());
    if (code) {
      if (fence && fence[1][0] === code[0] && fence[1].length >= code.length) code = null;
      out.push(line);
      continue;
    }
    if (fence && !inMath) {
      code = fence[1];
      out.push(line);
      continue;
    }
    if (!inMath) {
      const open = /^([ \t]*)\$\$(?!\$)(.*)$/s.exec(rest);
      if (open && !open[2].includes('$$')) {
        inMath = true;
        if (open[2].trim()) out.push(`${prefix}${open[1]}$$`, `${prefix}${open[2]}`);
        else out.push(line);
        continue;
      }
      out.push(line);
      continue;
    }
    const close = /^(.*?)\$\$\s*$/s.exec(rest);
    if (close) {
      inMath = false;
      if (close[1].trim()) out.push(`${prefix}${close[1]}`, `${prefix}$$`);
      else out.push(line);
      continue;
    }
    out.push(line);
  }
  return out.join('\n');
}

/**
 * Obsidian renders `$$…$$` as display math even mid-paragraph (e.g. inside
 * a callout line); remark-math treats it as inline. Re-tag those nodes.
 */
function remarkDisplayMathInline(source: string) {
  return (tree: Root) => {
    visit(tree, 'inlineMath', (node: InlineMath) => {
      const start = node.position?.start.offset;
      if (start !== undefined && source.startsWith('$$', start)) {
        node.data = { ...node.data, hProperties: { className: ['language-math', 'math-display'] } };
      }
    });
  };
}

const toHtml = unified()
  .use(remarkRehype, { allowDangerousHtml: true, footnoteLabel: 'Footnotes' })
  .use(rehypeRaw)
  .use(rehypeSlug)
  .use(rehypeCollectTex)
  .use(rehypeMathjax, { tex: { tags: 'ams' } })
  .use(rehypeMathjaxSvg)
  .use(rehypeTaskLabels)
  .use(rehypeShiki, {
    // Dark colours are inlined; the light theme's ride along as --shiki-light vars.
    themes: { dark: 'github-dark-dimmed', light: 'github-light' },
    defaultColor: 'dark',
    lazy: true,
    fallbackLanguage: 'text',
    addLanguageClass: true,
  })
  .use(rehypeStringify);

const cache = new Map<string, Promise<RenderedNote>>();
let cacheVersion = '';

export function renderNote(note: Note, vault: Vault = getVault()): Promise<RenderedNote> {
  if (cacheVersion !== vault.version) {
    cache.clear();
    cacheVersion = vault.version;
  }
  let hit = cache.get(note.id);
  if (!hit) {
    hit = (async () => {
      const ctx: RenderContext = {
        vault,
        note,
        depth: 0,
        stack: new Set([note.id]),
        parseEmbed: parseNote,
        citations: new Set(),
        flags: { mermaid: false },
      };
      const mdast = parseNote(note, ctx);
      const hast = await toHtml.run(mdast as any);
      const html = String(toHtml.stringify(hast as any));
      return { html, citations: [...ctx.citations], hasMermaid: ctx.flags.mermaid };
    })();
    cache.set(note.id, hit);
  }
  return hit;
}
