/**
 * Where each subject lives in the garden, and what colour it wears.
 *
 * Subjects (sections) are not hand-listed: every top-level folder of the vault
 * that holds notes is one. A folder may describe itself with a section note —
 * a note of the same name inside it (`Chemistry/Chemistry.md`, like Obsidian's
 * folder notes) with frontmatter:
 *
 *   type: section
 *   label: Chemistry                  # display name (default: the folder name)
 *   blurb: Matter and its changes.    # one line under the name
 *   pigment: verdigris                # one of PIGMENTS, or `color: '#7fb5a8'`
 *   spot: lake                        # one of SPOTS: where its shelves stand in the garden
 *   order: 4                          # position among subjects (default: after the known ones, A→Z)
 *
 * Everything is optional. Without it a subject gets a free pigment and a free
 * spot automatically, so adding or removing subjects never needs a code change.
 * Removing a folder simply removes the subject; its spot and pigment become free.
 */

/** Fresco pigments: [dusk theme, fresco (light) theme]. */
export const PIGMENTS: Record<string, [string, string]> = {
  lapis: ['#86a5c8', '#3f6690'],
  leaf: ['#93b67e', '#47703a'],
  iris: ['#aa9bcc', '#66579a'],
  ochre: ['#d5a660', '#8f6424'],
  pomegranate: ['#d27f72', '#a1473e'],
  verdigris: ['#7fb5a8', '#2f6f69'],
  sienna: ['#d08a5c', '#9a5428'],
  azurite: ['#8d9be0', '#3c4f96'],
  saffron: ['#e0bf5e', '#80650f'],
  olive: ['#aab36c', '#5e6a23'],
  mauve: ['#c493b8', '#86457a'],
  slate: ['#9aa3ad', '#5a636e'],
};

/**
 * Places in Thomas Cole's *Garden of Eden* where a subject's shelves can stand.
 * x, y: point of the painting (0–1) at the centre of attention; z: zoom.
 * The 3D world derives its camera stations from the same points.
 */
export interface Spot { name: string; x: number; y: number; z: number; title: string }
export const SPOTS: Spot[] = [
  { name: 'grove', x: 0.16, y: 0.5, z: 1.45, title: 'the palm grove' },
  { name: 'tree', x: 0.86, y: 0.5, z: 1.45, title: 'the great tree' },
  { name: 'falls', x: 0.55, y: 0.42, z: 1.7, title: 'the mountain falls' },
  { name: 'spring', x: 0.3, y: 0.86, z: 1.6, title: 'the spring among the rocks' },
  { name: 'meadow', x: 0.66, y: 0.82, z: 1.6, title: 'the flowering meadow' },
  { name: 'lake', x: 0.52, y: 0.62, z: 1.9, title: 'the lake shore' },
  { name: 'cliffs', x: 0.8, y: 0.32, z: 1.6, title: 'the far cliffs' },
  { name: 'canopy', x: 0.5, y: 0.12, z: 1.5, title: 'under the canopy' },
  { name: 'ferns', x: 0.08, y: 0.8, z: 1.5, title: 'the fern bank' },
  { name: 'vines', x: 0.93, y: 0.15, z: 1.6, title: 'the hanging vines' },
];

/** Defaults for subjects the archive already knows; any of them may be absent from the vault. */
export const KNOWN: Record<string, { label: string; blurb: string; pigment: string; spot: string }> = {
  Mathematics: { label: 'Mathematics', blurb: 'Structures, proofs and abstractions.', pigment: 'lapis', spot: 'grove' },
  'Computer Science': { label: 'Computer Science', blurb: 'Computation, algorithms and systems.', pigment: 'leaf', spot: 'tree' },
  Physics: { label: 'Theoretical Physics', blurb: 'Fields, symmetries and the laws of nature.', pigment: 'iris', spot: 'falls' },
  Research: { label: 'Research', blurb: 'Active projects, logs and open questions.', pigment: 'ochre', spot: 'spring' },
  Ideas: { label: 'Ideas', blurb: 'Conjectures, sketches and half-formed thoughts.', pigment: 'pomegranate', spot: 'meadow' },
};

export interface SectionStyle {
  folder: string;
  label: string;
  blurb: string;
  order: number;
  /** [dusk, fresco] colours. */
  colors: [string, string];
  spot: Spot;
}

const hash = (s: string) => [...s].reduce((h, c) => (Math.imul(h, 31) + c.codePointAt(0)!) | 0, 7) >>> 0;
const isColor = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-f]{3,8}$/i.test(v.trim());

/**
 * Give every subject a label, order, colour and spot. Explicit frontmatter wins,
 * then the known defaults; the rest take free pigments/spots, chosen from a hash
 * of the folder name so a subject keeps its look when others come and go.
 */
export function styleSections(folders: { folder: string; meta: Record<string, unknown> }[]): SectionStyle[] {
  const knownOrder = Object.keys(KNOWN);
  const sorted = [...folders].sort((a, b) => {
    const oa = Number(a.meta.order ?? (knownOrder.includes(a.folder) ? knownOrder.indexOf(a.folder) : 1000));
    const ob = Number(b.meta.order ?? (knownOrder.includes(b.folder) ? knownOrder.indexOf(b.folder) : 1000));
    return oa - ob || a.folder.localeCompare(b.folder);
  });
  const pigmentNames = Object.keys(PIGMENTS);
  const usedPigments = new Set<string>();
  const usedSpots = new Set<string>();
  const wanted = (f: (typeof folders)[number]) => {
    const k = KNOWN[f.folder];
    const pigment = typeof f.meta.pigment === 'string' && PIGMENTS[f.meta.pigment] ? f.meta.pigment : k?.pigment;
    const spot = typeof f.meta.spot === 'string' && SPOTS.some((s) => s.name === f.meta.spot) ? f.meta.spot : k?.spot;
    return { pigment, spot };
  };
  // Reserve explicit and known choices first, so automatic ones never take them.
  for (const f of sorted) {
    const w = wanted(f);
    if (w.pigment) usedPigments.add(w.pigment);
    if (w.spot) usedSpots.add(w.spot);
  }
  const pick = <T,>(list: T[], key: (t: T) => string, used: Set<string>, seed: number) => {
    for (let i = 0; i < list.length; i++) {
      const t = list[(seed + i) % list.length];
      if (!used.has(key(t))) { used.add(key(t)); return t; }
    }
    return list[seed % list.length]; // more subjects than choices: share
  };
  return sorted.map((f, i) => {
    const w = wanted(f);
    const k = KNOWN[f.folder];
    const h = hash(f.folder);
    const colors: [string, string] = isColor(f.meta.color)
      ? [f.meta.color.trim(), f.meta.color.trim()]
      : PIGMENTS[w.pigment ?? pick(pigmentNames, (p) => p, usedPigments, h)];
    const spot = SPOTS.find((s) => s.name === w.spot) ?? pick(SPOTS, (s) => s.name, usedSpots, h);
    return {
      folder: f.folder,
      label: typeof f.meta.label === 'string' ? f.meta.label : k?.label ?? f.folder,
      blurb: typeof f.meta.blurb === 'string' ? f.meta.blurb : typeof f.meta.description === 'string' ? f.meta.description : k?.blurb ?? '',
      order: i,
      colors,
      spot,
    };
  });
}

/** CSS custom property for a section's colour, e.g. `--sec-computer-science`. */
export const sectionVar = (slug: string) => `--sec-${slug}`;
