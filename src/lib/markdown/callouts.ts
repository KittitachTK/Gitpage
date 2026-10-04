import type { Blockquote, Paragraph, PhrasingContent, Root, RootContent } from 'mdast';
import { visit } from 'unist-util-visit';
import { CALLOUTS } from '../config';
import { hNode, text } from './util';

const HEADER = /^\[!([\w-]+)\]([+-]?)[ \t]*/;

/**
 * Obsidian callouts:
 *
 *   > [!theorem]+ Spectral Gap
 *   > Suppose the Hamiltonian satisfies…
 *
 * become `<div class="callout">` (or `<details>` when foldable with +/-).
 */
export function remarkCallouts() {
  return (tree: Root) => {
    visit(tree, 'blockquote', (node: Blockquote, index, parent) => {
      const first = node.children[0];
      if (!parent || index === undefined || first?.type !== 'paragraph') return;
      const lead = first.children[0];
      if (lead?.type !== 'text') return;
      const m = HEADER.exec(lead.value);
      if (!m) return;

      const type = m[1].toLowerCase();
      const fold = m[2];
      const spec = CALLOUTS[type] ?? { label: type[0].toUpperCase() + type.slice(1), family: 'info' };
      lead.value = lead.value.slice(m[0].length);

      // The title is everything on the first line; the rest of the paragraph is body.
      const title: PhrasingContent[] = [];
      const rest: PhrasingContent[] = [];
      let inTitle = true;
      for (const child of first.children) {
        if (inTitle && child.type === 'text' && child.value.includes('\n')) {
          const nl = child.value.indexOf('\n');
          if (nl > 0) title.push(text(child.value.slice(0, nl)));
          const after = child.value.slice(nl + 1);
          if (after) rest.push(text(after));
          inTitle = false;
        } else if (inTitle && child.type === 'break') {
          inTitle = false;
        } else (inTitle ? title : rest).push(child);
      }
      const hasTitle = title.some((c) => c.type !== 'text' || c.value.trim());

      const body: RootContent[] = [];
      if (rest.length) body.push({ type: 'paragraph', children: rest } as Paragraph);
      body.push(...(node.children.slice(1) as RootContent[]));

      const titleNode = hNode('calloutTitle', fold ? 'summary' : 'div', { className: ['callout-title'] }, [
        hNode('calloutLabel', 'span', { className: ['callout-label'] }, [text(spec.label)]),
        ...(hasTitle ? [hNode('calloutName', 'span', { className: ['callout-name'] }, title)] : []),
      ]);
      const content = hNode('calloutContent', 'div', { className: ['callout-content'] }, body);
      const props: Record<string, unknown> = {
        className: ['callout'],
        dataCallout: type,
        dataFamily: spec.family,
      };
      if (fold === '+') props.open = true;
      parent.children[index] = hNode('callout', fold ? 'details' : 'div', props, body.length ? [titleNode, content] : [titleNode]);
    });
  };
}
