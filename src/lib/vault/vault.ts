import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import matter from 'gray-matter';
import { ASSET_PREFIX, BIB_FILE, IGNORE, SECTIONS, VAULT_DIR, href } from '../config';
import { parseBibtex } from './bib';
import {
  extractHeadings, extractInlineTags, extractWikiLinks, makeExcerpt, maskNonProse, slugify, tagSlug, toPlainText,
} from './parse';
import type { Asset, BibEntry, Graph, Note } from './types';

export interface Vault {
  root: string;
  notes: Note[];
  assets: Asset[];
  bib: Map<string, BibEntry>;
  /** Fingerprint of the files on disk; changes whenever the vault changes. */
  version: string;
  bySlug: Map<string, Note>;
  /** Resolve a wikilink target the way Obsidian does (name, path, or alias). */
  resolveNote(target: string, from?: Note): Note | undefined;
  /** Resolve an image/attachment by name or (vault- or note-relative) path. */
  resolveAsset(target: string, from?: Note): Asset | undefined;
  outgoing(note: Note): Note[];
  backlinks(note: Note): Note[];
  /** tag slug → { display name, notes } */
  tags: Map<string, { name: string; notes: Note[] }>;
  graph: Graph;
}

const toPosix = (p: string) => p.split(path.sep).join('/');
const stripExt = (p: string) => p.replace(/\.[^./]+$/, '');

function walk(dir: string, root: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || IGNORE.includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, root, out);
    else out.push(full);
  }
  return out;
}

function asDate(v: unknown): Date | undefined {
  if (v instanceof Date) return v;
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    return isNaN(+d) ? undefined : d;
  }
}

function asList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === 'string') return v.split(/[,\s]+/).filter(Boolean);
  return [];
}

/**
 * Last-commit dates for every file, from one `git log` call. Used when a note
 * has no `updated:` field — file mtimes are meaningless after a CI checkout.
 */
function gitDates(root: string): Map<string, Date> {
  const dates = new Map<string, Date>();
  try {
    const out = execFileSync('git', ['log', '--format=%x00%cI', '--name-only', '--', '.'], {
      cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'],
    });
    const top = execFileSync('git', ['rev-parse', '--show-toplevel'], { cwd: root, encoding: 'utf8' }).trim();
    for (const chunk of out.split('\0').slice(1)) {
      const [date, ...files] = chunk.trim().split('\n');
      for (const f of files) {
        const abs = path.resolve(top, f.trim());
        if (!dates.has(abs)) dates.set(abs, new Date(date));
      }
    }
  } catch {
    // Not a git repo (or git missing): fall back to mtimes.
  }
  return dates;
}

function readNote(file: string, root: string, dates: Map<string, Date>): Note | undefined {
  const raw = fs.readFileSync(file, 'utf8');
  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(raw);
  } catch (e) {
    throw new Error(`Invalid YAML frontmatter in ${path.relative(root, file)}: ${(e as Error).message}`);
  }
  const fm = (parsed.data ?? {}) as Record<string, unknown>;
  if (fm.publish === false || fm.draft === true) return undefined;

  const id = toPosix(stripExt(path.relative(root, file)));
  const parts = id.split('/');
  const name = parts.pop()!;
  const body = parsed.content;
  const bodyLineOffset = raw.slice(0, raw.length - body.length).split('\n').length - 1;
  const masked = maskNonProse(body);
  const headings = extractHeadings(masked, body);
  const h1 = headings.find((h) => h.depth === 1)?.text;
  const tags = [...new Set([...asList(fm.tags ?? fm.tag), ...extractInlineTags(masked)].map((t) => t.replace(/^#/, '')))];
  const text = toPlainText(body);
  const stat = fs.statSync(file);

  return {
    id,
    file,
    name,
    // "Folder notes" (Gauge Theory/Gauge Theory.md) take the folder's URL.
    slug: (parts.at(-1) === name ? parts : [...parts, name]).map(slugify).join('/'),
    folders: parts,
    section: parts[0] ?? 'Other',
    title: String(fm.title ?? h1 ?? name),
    aliases: asList(fm.aliases ?? fm.alias),
    tags,
    status: fm.status ? String(fm.status).toLowerCase() : undefined,
    type: fm.type ? String(fm.type).toLowerCase() : undefined,
    description: fm.description ? String(fm.description) : undefined,
    created: asDate(fm.created) ?? stat.birthtime,
    updated: asDate(fm.updated) ?? dates.get(file) ?? stat.mtime,
    frontmatter: fm,
    body,
    bodyLineOffset,
    headings,
    // Wikilinks in Properties (e.g. `project: "[[…]]"`, `roadmap:`) are real links, as in Obsidian.
    links: [
      ...extractWikiLinks(raw.slice(0, raw.length - body.length).replace(/^\s*#.*$/gm, '')),
      ...extractWikiLinks(masked, bodyLineOffset),
    ],
    text,
    excerpt: fm.description ? String(fm.description) : makeExcerpt(body),
  };
}

export function loadVault(root = VAULT_DIR): Vault {
  if (!fs.existsSync(root)) throw new Error(`Vault not found at ${root} (set VAULT_DIR)`);
  const files = walk(root, root);
  const dates = gitDates(root);
  const version = files.map((f) => `${f}:${fs.statSync(f).mtimeMs}`).join('|');

  const notes: Note[] = [];
  const assets: Asset[] = [];
  for (const file of files) {
    if (file.toLowerCase().endsWith('.md')) {
      const note = readNote(file, root, dates);
      if (note) notes.push(note);
    } else if (!file.endsWith('.bib')) {
      const id = toPosix(path.relative(root, file));
      assets.push({ id, name: path.basename(file), file, url: href(`${ASSET_PREFIX}/${id.split('/').map(encodeURIComponent).join('/')}`) });
    }
  }
  notes.sort((a, b) => a.id.localeCompare(b.id));

  const bibPath = path.join(root, BIB_FILE);
  const bib = fs.existsSync(bibPath) ? parseBibtex(fs.readFileSync(bibPath, 'utf8')) : new Map();

  // ---- indices --------------------------------------------------------------
  const byId = new Map(notes.map((n) => [n.id.toLowerCase(), n]));
  const byName = new Map<string, Note[]>();
  const add = (k: string, n: Note) => {
    const key = k.toLowerCase();
    byName.set(key, [...(byName.get(key) ?? []), n]);
  };
  for (const n of notes) {
    add(n.name, n);
    n.aliases.forEach((a) => add(a, n));
  }
  const assetsByName = new Map<string, Asset[]>();
  for (const a of assets) {
    const k = a.name.toLowerCase();
    assetsByName.set(k, [...(assetsByName.get(k) ?? []), a]);
  }

  /** Obsidian prefers the candidate nearest to the linking note, then the shortest path. */
  const closest = <T extends { id: string }>(cands: T[] | undefined, from?: Note): T | undefined => {
    if (!cands?.length) return undefined;
    if (cands.length === 1 || !from) return [...cands].sort((a, b) => a.id.length - b.id.length)[0];
    const dir = from.folders.join('/');
    const score = (c: T) => {
      const cdir = c.id.split('/').slice(0, -1).join('/');
      let common = 0;
      const a = dir.split('/'), b = cdir.split('/');
      while (common < a.length && common < b.length && a[common] === b[common]) common++;
      return -common * 1000 + c.id.length;
    };
    return [...cands].sort((a, b) => score(a) - score(b))[0];
  };

  const resolveNote = (target: string, from?: Note): Note | undefined => {
    if (!target) return from; // [[#Heading]] links to the current note
    // Only `.md` is an extension here: note names may contain dots ("บทที่ 6.2-8 …").
    const t = target.replace(/\\/g, '/').replace(/^\/+/, '').replace(/\.md$/i, '').toLowerCase();
    if (byId.has(t)) return byId.get(t);
    if (t.includes('/')) {
      if (from) {
        const rel = path.posix.normalize([...from.folders, t].join('/')).toLowerCase();
        if (byId.has(rel)) return byId.get(rel);
      }
      return closest(notes.filter((n) => n.id.toLowerCase().endsWith('/' + t)), from);
    }
    return closest(byName.get(t), from);
  };

  const resolveAsset = (target: string, from?: Note): Asset | undefined => {
    let t = target.replace(/\\/g, '/').replace(/^\.\//, '');
    try { t = decodeURIComponent(t); } catch { /* keep as written */ }
    const lower = t.toLowerCase();
    const exact = assets.find((a) => a.id.toLowerCase() === lower.replace(/^\/+/, ''));
    if (exact) return exact;
    if (from) {
      const rel = path.posix.normalize([...from.folders, t].join('/')).toLowerCase();
      const hit = assets.find((a) => a.id.toLowerCase() === rel);
      if (hit) return hit;
    }
    return closest(assetsByName.get(path.posix.basename(lower)), from);
  };

  // ---- link graph -----------------------------------------------------------
  const out = new Map<Note, Note[]>();
  const back = new Map<Note, Set<Note>>();
  for (const n of notes) {
    const targets = new Set<Note>();
    for (const l of n.links) {
      const t = resolveNote(l.target, n);
      if (t && t !== n) targets.add(t);
    }
    out.set(n, [...targets]);
    for (const t of targets) {
      if (!back.has(t)) back.set(t, new Set());
      back.get(t)!.add(n);
    }
  }

  const tags = new Map<string, { name: string; notes: Note[] }>();
  for (const n of notes) {
    for (const t of n.tags) {
      const key = tagSlug(t);
      if (!key) continue;
      const entry = tags.get(key) ?? { name: t, notes: [] };
      entry.notes.push(n);
      tags.set(key, entry);
    }
  }

  const sectionOrder = SECTIONS.map((s) => s.folder);
  const graph: Graph = {
    nodes: notes.map((n) => ({
      id: n.id,
      title: n.title,
      slug: n.slug,
      section: sectionOrder.includes(n.section) ? n.section : 'Other',
      group: n.folders.slice(0, 2).join('/') || n.section,
      degree: (out.get(n)?.length ?? 0) + (back.get(n)?.size ?? 0),
      tags: n.tags,
    })),
    links: notes.flatMap((n) => (out.get(n) ?? []).map((t) => ({ source: n.id, target: t.id }))),
  };

  return {
    root,
    notes,
    assets,
    bib,
    version,
    bySlug: new Map(notes.map((n) => [n.slug, n])),
    resolveNote,
    resolveAsset,
    outgoing: (n) => out.get(n) ?? [],
    backlinks: (n) => [...(back.get(n) ?? [])].sort((a, b) => a.title.localeCompare(b.title)),
    tags,
    graph,
  };
}

// ---- cached accessor ---------------------------------------------------------

let cached: Vault | undefined;
let checkedAt = 0;

/**
 * Shared vault instance for the build. In dev the cache is revalidated (cheap
 * stat walk) at most once a second so edits in Obsidian show up on reload.
 */
export function getVault(): Vault {
  const now = Date.now();
  if (cached && (process.env.NODE_ENV === 'production' || now - checkedAt < 1000)) return cached;
  checkedAt = now;
  if (cached) {
    const files = walk(cached.root, cached.root);
    const version = files.map((f) => `${f}:${fs.statSync(f).mtimeMs}`).join('|');
    if (version === cached.version) return cached;
  }
  cached = loadVault();
  return cached;
}
