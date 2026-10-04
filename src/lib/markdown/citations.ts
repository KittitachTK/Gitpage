import type { Link, PhrasingContent, Root } from 'mdast';
import { citeLabel } from '../vault/bib';
import type { RenderContext } from './obsidian';
import { replaceInText, text } from './util';

/**
 * Pandoc-style citations against `references.bib`:
 *   `[@Dimock1982]`, `[@GlimmJaffe1987; @Dimock1982]` → (Dimock 1982; …)
 *   `@Dimock1982`                                     → Dimock 1982
 * Keys not present in the bibliography are left as plain text, so e-mail
 * addresses and handles are never touched.
 */
export function remarkCitations(ctx: RenderContext) {
  const cite = (key: string): PhrasingContent | undefined => {
    const entry = ctx.vault.bib.get(key);
    if (!entry) return undefined;
    ctx.citations.add(key);
    return {
      type: 'link',
      url: `#ref-${key}`,
      children: [text(citeLabel(entry))],
      data: { hProperties: { className: ['citation'], dataCite: key } },
    } as Link;
  };

  return (tree: Root) => {
    if (!ctx.vault.bib.size) return;
    replaceInText(tree, /\[(@[\w:.-]+(?:\s*;\s*@[\w:.-]+)*)\]/, (m) => {
      const keys = m[1].split(';').map((k) => k.trim().slice(1));
      const nodes = keys.map(cite);
      if (nodes.some((n) => !n)) return undefined;
      const out: PhrasingContent[] = [text('(')];
      nodes.forEach((n, i) => out.push(...(i ? [text('; ')] : []), n!));
      out.push(text(')'));
      return out;
    });
    replaceInText(tree, /(?<![\w@])@([A-Za-z][\w:.-]*[\w])/, (m) => cite(m[1]));
  };
}
