import type { Nodes, Parent, PhrasingContent, Root, Text } from 'mdast';
import { visit, SKIP } from 'unist-util-visit';

/** Node types whose text must never be rewritten. */
const OPAQUE = new Set(['code', 'inlineCode', 'math', 'inlineMath', 'html', 'link', 'linkReference', 'definition']);

/** Merge adjacent text siblings (unresolved `[refs]` can leave them split). */
export function mergeText(tree: Root) {
  visit(tree, (node) => {
    if (!('children' in node)) return;
    const kids = (node as Parent).children;
    for (let i = kids.length - 1; i > 0; i--) {
      const a = kids[i - 1], b = kids[i];
      if (a.type === 'text' && b.type === 'text') {
        a.value += b.value;
        if (a.position && b.position) a.position.end = b.position.end;
        kids.splice(i, 1);
      }
    }
  });
}

/**
 * Replace regex matches inside text nodes with arbitrary phrasing nodes.
 * `replace` may return `undefined` to leave a match untouched.
 */
export function replaceInText(
  tree: Root,
  pattern: RegExp,
  replace: (match: RegExpExecArray, parent: Parent) => PhrasingContent | PhrasingContent[] | undefined,
) {
  visit(tree, (node, index, parent) => {
    if (OPAQUE.has(node.type)) return SKIP;
    if (node.type !== 'text' || !parent || index === undefined) return;
    const value = (node as Text).value;
    const re = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
    const out: PhrasingContent[] = [];
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(value))) {
      const r = replace(m, parent);
      if (r === undefined) continue;
      if (m.index > last) out.push({ type: 'text', value: value.slice(last, m.index) });
      out.push(...(Array.isArray(r) ? r : [r]));
      last = m.index + m[0].length;
      if (m[0].length === 0) re.lastIndex++;
    }
    if (!out.length) return;
    if (last < value.length) out.push({ type: 'text', value: value.slice(last) });
    parent.children.splice(index, 1, ...(out as typeof parent.children));
    return [SKIP, index + out.length];
  });
}

/** Build an mdast node that renders as an arbitrary HTML element. */
export function hNode<T extends Nodes['type'] | string>(
  type: T,
  hName: string,
  hProperties: Record<string, unknown>,
  children: Nodes[] = [],
): any {
  return { type, data: { hName, hProperties }, children };
}

export const text = (value: string): Text => ({ type: 'text', value });

export function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

/** Remove `%% comments %%` everywhere except inside fenced code. */
export function stripComments(md: string) {
  return md
    .split(/(^(?:```|~~~)[^\n]*\n[\s\S]*?^(?:```|~~~)[^\n]*$)/m)
    .map((part, i) => (i % 2 ? part : part.replace(/%%[\s\S]*?%%/g, '')))
    .join('');
}
