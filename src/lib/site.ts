/**
 * View-model helpers shared by pages: everything here is derived from the
 * vault (folders, links, frontmatter) — nothing is hand-maintained.
 */
import { href } from './config';
import { sectionVar, styleSections, type Spot } from './garden';
import { slugify } from './vault/parse';
import type { Note } from './vault/types';
import { getVault, type Vault } from './vault/vault';

export interface SectionInfo {
  folder: string;
  label: string;
  blurb: string;
  slug: string;
  /** Notes on this subject's shelves (its folder note, if any, describes the subject and is left out). */
  notes: Note[];
  /** CSS colour of the subject, e.g. `var(--sec-mathematics)`. */
  color: string;
  /** [dusk, fresco] colours. */
  colors: [string, string];
  /** Where its shelves stand in the garden. */
  spot: Spot;
  /** The `type: section` folder note describing the subject, if there is one. */
  index?: Note;
}

/** "1 note", "2 notes". */
export const notesLabel = (n: number) => `${n} ${n === 1 ? 'note' : 'notes'}`;

/** A subject's own description: `Chemistry/Chemistry.md` with `type: section`. */
export const isSectionNote = (n: Note) => n.folders.length === 1 && n.name === n.section && n.type === 'section';

const cache = new WeakMap<Vault, SectionInfo[]>();

/** The vault's subjects: one per top-level folder that holds notes, in display order. */
export function sections(vault: Vault): SectionInfo[] {
  let list = cache.get(vault);
  if (list) return list;
  const folders = [...new Set(vault.notes.filter((n) => n.folders.length > 0).map((n) => n.section))];
  const index = new Map(vault.notes.filter(isSectionNote).map((n) => [n.section, n]));
  list = styleSections(folders.map((folder) => ({ folder, meta: index.get(folder)?.frontmatter ?? {} }))).map((st) => {
    const slug = slugify(st.folder);
    return {
      ...st,
      slug,
      color: `var(${sectionVar(slug)})`,
      notes: vault.notes.filter((n) => n.section === st.folder && n.folders.length > 0 && !isSectionNote(n)),
      index: index.get(st.folder),
    };
  });
  cache.set(vault, list);
  return list;
}

/** CSS colour for a subject folder; unknown folders fall back to the neutral pigment. */
export function sectionColor(section: string) {
  return `var(${sectionVar(slugify(section))}, var(--sec-other))`;
}

export function sectionLabel(section: string) {
  return sections(getVault()).find((s) => s.folder === section)?.label ?? section;
}

/** Per-subject colour variables for both themes, generated from the vault. */
export function sectionCss(vault: Vault) {
  const secs = sections(vault);
  const decl = (k: 0 | 1) => secs.map((s) => `${sectionVar(s.slug)}:${s.colors[k]};`).join('');
  return `:root,html[data-theme='light'] .space{${decl(0)}}html[data-theme='light']{${decl(1)}}`;
}

export interface TreeNode {
  name: string;
  path: string;
  children: TreeNode[];
  notes: Note[];
  count: number;
}

/** Title order used everywhere notes are listed: numbers sort naturally (Ch9 < Ch10). */
export const byTitle = (a: Note, b: Note) => a.title.localeCompare(b.title, undefined, { numeric: true });

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
    t.children.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    t.notes.sort(byTitle);
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

/** Previous / next note in the same folder, in the folder tree's order. */
export function siblings(vault: Vault, note: Note): { prev?: Note; next?: Note } {
  if (!note.folders.length) return {};
  const folder = note.folders.join('/');
  const list = vault.notes.filter((n) => n.folders.join('/') === folder).sort(byTitle);
  const i = list.indexOf(note);
  return { prev: list[i - 1], next: list[i + 1] };
}

/**
 * Estimated reading time in minutes. Thai is written without spaces between
 * words, so it is measured in characters (~900/min) and Latin text in words
 * (~220/min).
 */
export function readingMinutes(note: Note): number {
  const words = note.text.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g)?.length ?? 0;
  const thai = note.text.match(/\p{Script=Thai}/gu)?.length ?? 0;
  return Math.max(1, Math.round(words / 220 + thai / 900));
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
