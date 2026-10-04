/**
 * Post-processing for MathJax SVG output.
 *
 * 1. Shared glyphs. MathJax's "local" font cache repeats every glyph's path data
 *    inside every equation: a long note had 18k copies of 222 glyphs (7 MB).
 *    We hoist each glyph once into a hidden <svg> at the top of the note and
 *    point every <use> at it — what MathJax's "global" cache does in a browser.
 *
 * 2. Accessible names. Each equation SVG has role="img"; give it its TeX source
 *    as aria-label so screen readers announce something meaningful.
 */
import type { Element, ElementContent, Root } from 'hast';
import { toText } from 'hast-util-to-text';
import { SKIP, visit } from 'unist-util-visit';
import type { VFile } from 'vfile';

const MATH_CLASSES = ['language-math', 'math-inline', 'math-display'];
const isMath = (el: Element) => {
  const cls = el.properties.className;
  return Array.isArray(cls) && cls.some((c) => MATH_CLASSES.includes(String(c)));
};

/** Before MathJax: remember the TeX of every math element, in document order. */
export function rehypeCollectTex() {
  return (tree: Root, file: VFile) => {
    const tex: string[] = [];
    visit(tree, 'element', (el) => {
      if (!isMath(el)) return;
      tex.push(toText(el, { whitespace: 'pre' }).trim());
      return SKIP;
    });
    file.data.tex = tex;
  };
}

const GLYPH_ID = /^MJX-\d+-/;
const shared = (id: string) => id.replace(GLYPH_ID, 'mjxg-');

/** After MathJax: label equations and hoist glyph definitions. */
export function rehypeMathjaxSvg() {
  return (tree: Root, file: VFile) => {
    const tex = (file.data.tex as string[] | undefined) ?? [];
    let i = 0;
    const glyphs = new Map<string, Element>();

    visit(tree, 'element', (el, index, parent) => {
      if (el.tagName === 'mjx-container') {
        const svg = el.children.find((c): c is Element => c.type === 'element' && c.tagName === 'svg');
        const label = tex[i++];
        if (svg && label) svg.properties.ariaLabel = label;
        return;
      }
      if (el.tagName === 'defs' && parent && index !== undefined) {
        const paths = el.children.filter((c): c is Element => c.type === 'element' && c.tagName === 'path' && GLYPH_ID.test(String(c.properties.id ?? '')));
        if (paths.length !== el.children.filter((c) => c.type === 'element').length) return; // not a pure glyph cache
        for (const p of paths) {
          const id = shared(String(p.properties.id));
          if (!glyphs.has(id)) glyphs.set(id, { ...p, properties: { ...p.properties, id } });
        }
        parent.children.splice(index, 1);
        return [SKIP, index];
      }
      if (el.tagName === 'use') {
        for (const key of ['xLinkHref', 'href'] as const) {
          const v = el.properties[key];
          if (typeof v === 'string' && v.startsWith('#') && GLYPH_ID.test(v.slice(1))) el.properties[key] = '#' + shared(v.slice(1));
        }
      }
    });

    if (!glyphs.size) return;
    const store: Element = {
      type: 'element',
      tagName: 'svg',
      properties: { className: ['mjx-glyphs'], ariaHidden: 'true', focusable: 'false', style: 'position:absolute;width:0;height:0;overflow:hidden' },
      children: [{ type: 'element', tagName: 'defs', properties: {}, children: [...glyphs.values()] as ElementContent[] }],
    };
    tree.children.unshift(store);
  };
}

/** GFM task-list checkboxes are read-only; give them a name screen readers can use. */
export function rehypeTaskLabels() {
  return (tree: Root) => {
    visit(tree, 'element', (el) => {
      if (el.tagName !== 'input' || el.properties.type !== 'checkbox') return;
      el.properties.ariaLabel = el.properties.checked ? 'Completed' : 'Not completed';
    });
  };
}
