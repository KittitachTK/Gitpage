import path from 'node:path';
import { RESERVED_PREFIXES, RESERVED_ROUTES, STATUSES } from '../config';
import { ATTACHMENT, headingKey, maskNonProse } from './parse';
import type { Note } from './types';
import type { Vault } from './vault';

export interface Issue {
  level: 'error' | 'warning';
  rule: string;
  file: string;
  line?: number;
  message: string;
  suggestions?: string[];
}

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

function suggest(target: string, candidates: string[], n = 3): string[] {
  const t = target.toLowerCase();
  return candidates
    .map((c) => ({ c, d: levenshtein(t, c.toLowerCase()) }))
    .filter(({ d }) => d <= Math.max(2, Math.floor(t.length / 3)))
    .sort((a, b) => a.d - b.d)
    .slice(0, n)
    .map(({ c }) => c);
}


/** Every check from the plan's "Automatic Validation" section. */
export function validateVault(vault: Vault): Issue[] {
  const issues: Issue[] = [];
  const rel = (n: Note) => path.relative(vault.root, n.file).split(path.sep).join('/');
  const noteNames = [...new Set(vault.notes.flatMap((n) => [n.name, ...n.aliases]))];
  const assetNames = vault.assets.map((a) => a.name);

  // Duplicate note names: `[[Name]]` becomes ambiguous.
  const byName = new Map<string, Note[]>();
  for (const n of vault.notes) byName.set(n.name.toLowerCase(), [...(byName.get(n.name.toLowerCase()) ?? []), n]);
  for (const [, ns] of byName) {
    if (ns.length > 1) {
      issues.push({
        level: 'warning', rule: 'duplicate-name', file: rel(ns[0]),
        message: `Note name "${ns[0].name}" is used by ${ns.length} files: ${ns.map(rel).join(', ')}. Bare [[${ns[0].name}]] links resolve to the closest one.`,
      });
    }
  }

  // Slug collisions (two files mapping to the same URL) and reserved routes.
  const bySlug = new Map<string, Note>();
  for (const n of vault.notes) {
    const other = bySlug.get(n.slug);
    if (other) issues.push({ level: 'error', rule: 'slug-collision', file: rel(n), message: `URL /${n.slug} is also produced by ${rel(other)}.` });
    bySlug.set(n.slug, n);
    const top = n.slug.split('/')[0];
    if (RESERVED_ROUTES.includes(n.slug) || (n.slug.includes('/') && RESERVED_PREFIXES.includes(top))) {
      issues.push({ level: 'error', rule: 'reserved-route', file: rel(n), message: `URL /${n.slug} is reserved by the site — rename or move the note.` });
    }
  }

  for (const n of vault.notes) {
    // Wikilinks and embeds.
    for (const l of n.links) {
      const isFile = ATTACHMENT.test(l.target);
      if (isFile) {
        if (!vault.resolveAsset(l.target, n)) {
          issues.push({
            level: 'error', rule: 'missing-asset', file: rel(n), line: l.line,
            message: `Attachment not found: ${l.raw}`, suggestions: suggest(path.posix.basename(l.target), assetNames),
          });
        }
        continue;
      }
      const target = vault.resolveNote(l.target, n);
      if (!target) {
        issues.push({
          level: 'error', rule: 'broken-wikilink', file: rel(n), line: l.line,
          message: `Broken wikilink ${l.raw}`,
          // Linking by title instead of file name is the most common mistake.
          suggestions: [
            ...vault.notes.filter((t) => t.title.toLowerCase() === l.target.toLowerCase()).map((t) => t.name),
            ...suggest(l.target, noteNames),
          ].map((s) => `[[${s}]]`),
        });
      } else if (l.heading && !target.headings.some((h) => headingKey(h.text) === headingKey(l.heading!))) {
        issues.push({
          level: 'warning', rule: 'missing-heading', file: rel(n), line: l.line,
          message: `Heading "${l.heading}" not found in ${rel(target)}`,
          suggestions: suggest(l.heading, target.headings.map((h) => h.text)).map((s) => `[[${target.name}#${s}]]`),
        });
      }
    }

    // Standard markdown images `![alt](path)`.
    const masked = maskNonProse(n.body);
    masked.split('\n').forEach((line, i) => {
      for (const m of line.matchAll(/!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
        const url = m[1];
        if (/^([a-z]+:|\/\/|\/)/i.test(url)) continue;
        if (!vault.resolveAsset(url, n)) {
          issues.push({ level: 'error', rule: 'missing-asset', file: rel(n), line: i + 1 + n.bodyLineOffset, message: `Image not found: ${url}` });
        }
      }
      for (const m of line.matchAll(/\[(@[\w:.-]+(?:\s*;\s*@[\w:.-]+)*)\]/g)) {
        for (const key of m[1].split(';').map((k) => k.trim().slice(1))) {
          if (!vault.bib.has(key)) {
            issues.push({
              level: 'warning', rule: 'unknown-citation', file: rel(n), line: i + 1 + n.bodyLineOffset,
              message: `Citation key @${key} is not in references.bib`, suggestions: suggest(key, [...vault.bib.keys()]),
            });
          }
        }
      }
    });

    // Metadata.
    const fm = n.frontmatter;
    if (n.status && !STATUSES.includes(n.status)) {
      issues.push({ level: 'warning', rule: 'metadata', file: rel(n), message: `Unknown status "${n.status}" (expected one of: ${STATUSES.join(', ')})` });
    }
    for (const key of ['created', 'updated']) {
      if (fm[key] !== undefined && isNaN(+new Date(fm[key] as string))) {
        issues.push({ level: 'error', rule: 'metadata', file: rel(n), message: `"${key}" is not a valid date: ${String(fm[key])}` });
      }
    }
    if (fm.tags !== undefined && !Array.isArray(fm.tags) && typeof fm.tags !== 'string') {
      issues.push({ level: 'error', rule: 'metadata', file: rel(n), message: '"tags" must be a list or a string' });
    }

    // Unbalanced mermaid / math fences are a common cause of garbled pages.
    if ((n.body.match(/^```/gm)?.length ?? 0) % 2) {
      issues.push({ level: 'error', rule: 'unclosed-fence', file: rel(n), message: 'Unclosed ``` code fence' });
    }
    const mermaidBlocks = [...n.body.matchAll(/^```mermaid\n([\s\S]*?)^```/gm)];
    for (const b of mermaidBlocks) {
      if (!/^\s*(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram(-v2)?|erDiagram|gantt|pie|mindmap|timeline|journey|gitGraph|quadrantChart|sankey-beta|xychart-beta|block-beta|requirementDiagram|C4\w+|%%)/.test(b[1])) {
        issues.push({ level: 'warning', rule: 'mermaid', file: rel(n), message: 'Mermaid block does not start with a known diagram type' });
      }
    }
  }

  return issues;
}
