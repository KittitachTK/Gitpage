/**
 * View-model helpers shared by pages: everything here is derived from the
 * vault (folders, links, frontmatter) — nothing is hand-maintained.
 */
import { SECTIONS, href } from './config';
import { slugify } from './vault/parse';
import type { Note } from './vault/types';
import type { Vault } from './vault/vault';

export interface SectionInfo {
  folder: string;
  label: string;
  blurb: string;
  slug: string;
  notes: Note[];
  /** CSS custom property holding the sector colour. */
  color: string;
}

export function sections(vault: Vault): SectionInfo[] {
  const known = SECTIONS.map((s) => s.folder);
  const list = SECTIONS.map((s) => ({ ...s, notes: vault.notes.filter((n) => n.section === s.folder) }));
  const other = vault.notes.filter((n) => !known.includes(n.section) && n.folders.length > 0);
  if (other.length) list.push({ folder: 'Other', label: 'Other', blurb: 'Everything else.', notes: other });
  return list.map((s) => ({ ...s, slug: slugify(s.folder), color: sectionColor(s.folder) }));
}

export function sectionColor(section: string) {
  const known = SECTIONS.some((s) => s.folder === section);
  return `var(--sec-${known ? slugify(section) : 'other'})`;
}

export function sectionLabel(section: string) {
  return SECTIONS.find((s) => s.folder === section)?.label ?? section;
}

export interface TreeNode {
  name: string;
  path: string;
  children: TreeNode[];
  notes: Note[];
  count: number;
}

/** Folder tree for a set of notes, starting below `depth` leading folders. */
export function buildTree(notes: Note[], depth = 1): TreeNode {
  const root: TreeNode = { name: '', path: '', children: [], notes: [], count: 0 };
  for (const n of notes) {
    let node = root;
    for (const f of n.folders.slice(depth)) {
      let child = node.children.find((c) => c.name === f);
      if (!child) {
        child = { name: f, path: node.path ? `${node.path}/${f}` : f, children: [], notes: [], count: 0 };
        node.children.push(child);
      }
      node = child;
    }
    node.notes.push(n);
  }
  const finish = (t: TreeNode): number => {
    t.children.sort((a, b) => a.name.localeCompare(b.name));
    t.notes.sort((a, b) => a.title.localeCompare(b.title));
    return (t.count = t.notes.length + t.children.reduce((s, c) => s + finish(c), 0));
  };
  finish(root);
  return root;
}

export function recent(vault: Vault, limit = 8, filter: (n: Note) => boolean = () => true): Note[] {
  return vault.notes
    .filter(filter)
    .filter((n) => n.slug !== 'about')
    .sort((a, b) => (b.updated?.getTime() ?? 0) - (a.updated?.getTime() ?? 0))
    .slice(0, limit);
}

export function noteUrl(n: Note) {
  return href(n.slug);
}

export function crumbs(n: Note): { label: string; url?: string }[] {
  const out: { label: string; url?: string }[] = [];
  if (n.folders[0]) out.push({ label: sectionLabel(n.folders[0]), url: href(`library/${slugify(n.folders[0])}`) });
  for (const f of n.folders.slice(1)) out.push({ label: f });
  return out;
}

export const fmtDate = (d?: Date) =>
  d ? d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }) : '';

export const isoDate = (d?: Date) => (d ? d.toISOString().slice(0, 10) : '');

// ---- research ------------------------------------------------------------------

export interface Project {
  note: Note;
  folder: string;
  question?: string;
  logs: Note[];
  questions: number;
  references: number;
  ideas: Note[];
  notes: Note[];
}

const inFolder = (n: Note, folder: string) => n.id.startsWith(folder + '/');

/** Projects are notes with `type: research-project`; their folder holds logs etc. */
export function projects(vault: Vault): Project[] {
  return vault.notes
    .filter((n) => n.type === 'research-project')
    .map((note) => {
      const folder = note.folders.join('/');
      const notes = vault.notes.filter((n) => n !== note && inFolder(n, folder));
      const all = [note, ...notes];
      const cited = new Set<string>();
      for (const n of all) {
        for (const m of n.body.matchAll(/@([A-Za-z][\w:.-]*[\w])/g)) if (vault.bib.has(m[1])) cited.add(m[1]);
      }
      const ideas = vault.notes.filter((n) => {
        if (n.type !== 'idea') return false;
        if (inFolder(n, folder)) return true;
        const p = String(n.frontmatter.project ?? '').replace(/^\[\[|\]\]$/g, '').split('|')[0];
        return !!p && vault.resolveNote(p, n) === note;
      });
      return {
        note,
        folder,
        question: note.frontmatter.question ? String(note.frontmatter.question) : undefined,
        logs: notes.filter((n) => n.type === 'log').sort((a, b) => (b.created?.getTime() ?? 0) - (a.created?.getTime() ?? 0)),
        questions: all.reduce((s, n) => s + (n.body.match(/^>\s*\[!question\]/gim)?.length ?? 0), 0),
        references: cited.size,
        ideas,
        notes,
      };
    })
    .sort((a, b) => Number(b.note.status === 'active') - Number(a.note.status === 'active') || a.note.title.localeCompare(b.note.title));
}

/**
 * Roadmap from `roadmap:` frontmatter ("A -> B" edges, wikilinks allowed) as a
 * Mermaid flowchart. Falls back to the links between the project's own notes.
 */
export function roadmapMermaid(vault: Vault, project: Project): string | undefined {
  const raw = project.note.frontmatter.roadmap;
  const edges: [string, string][] = [];
  if (Array.isArray(raw)) {
    for (const e of raw) {
      const [a, b] = String(e).split(/\s*-+>\s*/);
      if (a && b) edges.push([a.trim(), b.trim()]);
    }
  } else {
    for (const n of [project.note, ...project.notes]) {
      for (const t of vault.outgoing(n)) if (t === project.note || project.notes.includes(t)) edges.push([`[[${n.name}]]`, `[[${t.name}]]`]);
    }
  }
  if (!edges.length) return undefined;

  const ids = new Map<string, string>();
  const lines = ['flowchart TD'];
  const clicks: string[] = [];
  const node = (label: string) => {
    if (ids.has(label)) return ids.get(label)!;
    const id = `n${ids.size}`;
    ids.set(label, id);
    const wl = /^\[\[([^\]|#]+)(?:#[^\]|]*)?(?:\|([^\]]+))?\]\]$/.exec(label);
    const target = wl ? vault.resolveNote(wl[1], project.note) : undefined;
    const text = (wl ? wl[2] ?? target?.title ?? wl[1] : label).replace(/"/g, "'");
    lines.push(`  ${id}["${text}"]`);
    if (target) {
      clicks.push(`  click ${id} "${href(target.slug)}"`);
      lines.push(`  class ${id} linked`);
    }
    return id;
  };
  for (const [a, b] of edges) {
    const x = node(a), y = node(b);
    lines.push(`  ${x} --> ${y}`);
  }
  lines.push(...clicks, '  classDef linked stroke:#d6b98c,color:#e6e2d8');
  return lines.join('\n');
}
