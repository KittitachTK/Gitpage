import type { Heading as MdHeading, Image, Link, Paragraph, PhrasingContent, Root, RootContent } from 'mdast';
import { toString } from 'mdast-util-to-string';
import GithubSlugger from 'github-slugger';
import { visit } from 'unist-util-visit';
import { href } from '../config';
import { INLINE_TAG, parseWikiInner, tagSlug } from '../vault/parse';
import type { Asset, Note } from '../vault/types';
import type { Vault } from '../vault/vault';
import { hNode, mergeText, replaceInText, text } from './util';

export interface RenderContext {
  vault: Vault;
  note: Note;
  /** Embed nesting depth (guards against `![[A]]` ↔ `![[B]]` cycles). */
  depth: number;
  /** Chain of notes currently being embedded. */
  stack: Set<string>;
  /** Parses another note to mdast with the same Obsidian transforms applied. */
  parseEmbed(note: Note, ctx: RenderContext): Root;
  citations: Set<string>;
  flags: { mermaid: boolean };
}

const MAX_EMBED_DEPTH = 4;
const IMAGE = /\.(png|jpe?g|gif|webp|svg|avif|bmp)$/i;
const VIDEO = /\.(mp4|webm|mov|ogv)$/i;
const AUDIO = /\.(mp3|wav|ogg|m4a|flac)$/i;
const PDF = /\.pdf$/i;
const HAS_EXT = /\.[a-z0-9]{2,5}$/i;
const EXTERNAL = /^([a-z][a-z0-9+.-]*:|\/\/|#)/i;

export function headingAnchor(target: Note, heading: string): string {
  const want = heading.trim().toLowerCase();
  const hit = target.headings.find((h) => h.text.toLowerCase() === want || h.id === want);
  return hit?.id ?? new GithubSlugger().slug(heading);
}

export function noteHref(target: Note, heading?: string): string {
  return href(target.slug) + (heading ? `#${headingAnchor(target, heading)}` : '');
}

/** `![[file|300]]`, `![[file|300x200]]` or `![[file|caption]]`. */
function sizeHint(alias?: string) {
  const m = alias && /^(\d+)(?:x(\d+))?$/.exec(alias.trim());
  return m ? { width: m[1], height: m[2] } : undefined;
}

function assetNode(asset: Asset, alias?: string): PhrasingContent {
  const size = sizeHint(alias);
  const label = size ? asset.name : alias ?? asset.name;
  if (IMAGE.test(asset.name)) {
    const img: Image = { type: 'image', url: asset.url, alt: label };
    img.data = { hProperties: { ...(size ?? {}), loading: 'lazy', decoding: 'async' } };
    return img;
  }
  if (VIDEO.test(asset.name)) return hNode('media', 'video', { src: asset.url, controls: true, preload: 'metadata', ...(size ?? {}) });
  if (AUDIO.test(asset.name)) return hNode('media', 'audio', { src: asset.url, controls: true, preload: 'metadata' });
  if (PDF.test(asset.name)) {
    return hNode('media', 'iframe', { src: asset.url, className: ['pdf-embed'], title: label, loading: 'lazy', ...(size ?? {}) });
  }
  return { type: 'link', url: asset.url, children: [text(label)], data: { hProperties: { className: ['file-link'] } } };
}

const broken = (label: string, title: string): PhrasingContent =>
  hNode('brokenLink', 'span', { className: ['broken-link'], title }, [text(label)]);

/** Slice a note's mdast down to one heading section or one `^block`. */
function sectionOf(root: Root, target: Note, heading?: string, block?: string): RootContent[] {
  if (block) {
    let found: RootContent | undefined;
    visit(root, (n) => {
      if (!found && (n as any).data?.hProperties?.id === `^${block}`) found = n as RootContent;
    });
    return found ? [found] : [];
  }
  if (!heading) return root.children;
  const id = headingAnchor(target, heading);
  const slugger = new GithubSlugger();
  const kids = root.children;
  const start = kids.findIndex((n) => n.type === 'heading' && slugger.slug(toString(n)) === id);
  if (start < 0) return [];
  const depth = (kids[start] as MdHeading).depth;
  let end = start + 1;
  while (end < kids.length && !(kids[end].type === 'heading' && (kids[end] as MdHeading).depth <= depth)) end++;
  return kids.slice(start, end);
}

function noteEmbed(ctx: RenderContext, target: Note, heading?: string, block?: string, alias?: string): RootContent {
  const titleText = alias ?? (heading ? `${target.title} › ${heading}` : target.title);
  const header = hNode('embedTitle', 'div', { className: ['embed-title'] }, [
    { type: 'link', url: noteHref(target, heading), children: [text(titleText)] } as Link,
  ]);
  if (ctx.depth >= MAX_EMBED_DEPTH || ctx.stack.has(target.id)) {
    return hNode('embed', 'div', { className: ['embed', 'embed-cycle'] }, [header]);
  }
  const sub: RenderContext = { ...ctx, note: target, depth: ctx.depth + 1, stack: new Set([...ctx.stack, target.id]) };
  const tree = ctx.parseEmbed(target, sub);
  const nodes = sectionOf(tree, target, heading, block);
  const body = nodes.length
    ? nodes
    : [{ type: 'paragraph', children: [broken(`Section not found: ${heading ?? '^' + block}`, target.id)] } as Paragraph];
  return hNode('embed', 'div', { className: ['embed'], dataNote: target.slug }, [
    header,
    hNode('embedBody', 'div', { className: ['embed-body'] }, body as any),
  ]);
}

/**
 * Wikilinks, embeds, attachments, tags, `==highlights==` and `^block-ids`.
 */
export function remarkObsidian(ctx: RenderContext) {
  return (tree: Root) => {
    mergeText(tree);
    const { vault, note } = ctx;

    // `^block-id` at the end of a paragraph → id on the paragraph.
    visit(tree, 'paragraph', (p: Paragraph) => {
      const last = p.children[p.children.length - 1];
      if (last?.type !== 'text') return;
      const m = /\s\^([\w-]+)\s*$/.exec(last.value);
      if (!m) return;
      last.value = last.value.slice(0, m.index);
      p.data = { ...p.data, hProperties: { ...(p.data?.hProperties ?? {}), id: `^${m[1]}` } };
    });

    // A paragraph that is nothing but `![[Note]]` becomes a block-level embed.
    visit(tree, 'paragraph', (p: Paragraph, index, parent) => {
      if (!parent || index === undefined || p.children.length !== 1 || p.children[0].type !== 'text') return;
      const m = /^\s*!\[\[([^[\]\n]+?)\]\]\s*$/.exec(p.children[0].value);
      if (!m) return;
      const link = parseWikiInner(m[1]);
      if (HAS_EXT.test(link.target) && !/\.md$/i.test(link.target)) return; // attachment: handled inline
      const target = vault.resolveNote(link.target, note);
      if (!target) return;
      parent.children[index] = noteEmbed(ctx, target, link.heading, link.block, link.alias) as any;
    });

    // Inline wikilinks and embeds.
    replaceInText(tree, /(!?)\[\[([^[\]\n]+?)\]\]/, (m) => {
      const embed = m[1] === '!';
      const link = parseWikiInner(m[2]);
      if (embed || (HAS_EXT.test(link.target) && !/\.md$/i.test(link.target))) {
        const asset = vault.resolveAsset(link.target, note);
        if (asset) return embed ? assetNode(asset, link.alias) : { type: 'link', url: asset.url, children: [text(link.alias ?? asset.name)] };
      }
      const target = vault.resolveNote(link.target, note);
      const label = link.alias ?? (link.heading && !link.target ? link.heading : link.heading ? `${link.target} › ${link.heading}` : link.target);
      if (!target) return broken(label, `Missing note: ${link.target}`);
      return {
        type: 'link',
        url: noteHref(target, link.heading),
        children: [text(label)],
        data: { hProperties: { className: ['wikilink'], dataNote: target.slug } },
      } as Link;
    });

    // Inline #tags.
    replaceInText(tree, INLINE_TAG, (m) => {
      const slug = tagSlug(m[2]);
      return [
        text(m[1]),
        { type: 'link', url: href(`tags/${slug}`), children: [text('#' + m[2])], data: { hProperties: { className: ['tag'] } } } as Link,
      ];
    });

    // ==highlight==
    replaceInText(tree, /==(?=\S)([^=\n]+?)==/, (m) => hNode('highlight', 'mark', {}, [text(m[1])]));

    // Standard markdown links/images pointing into the vault.
    visit(tree, (n) => {
      if (n.type === 'image') {
        const img = n as Image;
        if (EXTERNAL.test(img.url) || img.url.startsWith('/')) return;
        const asset = vault.resolveAsset(img.url, note);
        if (asset) img.url = asset.url;
        img.data = { ...img.data, hProperties: { loading: 'lazy', decoding: 'async', ...(img.data?.hProperties ?? {}) } };
      } else if (n.type === 'link') {
        const l = n as Link;
        if (EXTERNAL.test(l.url) || l.url.startsWith('/')) return;
        const [path, frag] = decodeURI(l.url).split('#');
        const target = !HAS_EXT.test(path) || /\.md$/i.test(path) ? vault.resolveNote(path, note) : undefined;
        if (target) l.url = noteHref(target, frag);
        else {
          const asset = vault.resolveAsset(path, note);
          if (asset) l.url = asset.url;
        }
      }
    });
  };
}

/** ```mermaid blocks → `<pre class="mermaid">` rendered client-side. */
export function remarkMermaid(ctx: RenderContext) {
  return (tree: Root) => {
    visit(tree, 'code', (node, index, parent) => {
      if (node.lang !== 'mermaid' || !parent || index === undefined) return;
      ctx.flags.mermaid = true;
      parent.children[index] = hNode('mermaid', 'pre', { className: ['mermaid'] }, [text(node.value)]);
    });
  };
}
