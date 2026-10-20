/**
 * The painted world behind every page (components/EdenWorld.astro).
 *
 * Each page is a place in one landscape — Thomas Cole's *The Garden of Eden*
 * (1828) — and declares where the "camera" stands. Moving between pages
 * glides from the previous pose to the new one, so the site reads as a single
 * walk: down from the sky of the Creation fresco, into the garden, along the
 * shelves, to the tree of knowledge.
 */

export interface Pose {
  /** Point of the painting at the centre of attention, 0–1 (object-position). */
  x: number;
  y: number;
  /** Zoom around that point (≥ 1). */
  z: number;
  /** Wash of the page background over the painting, 0–1 (reading pages are heavily washed). */
  veil: number;
  /** Nightfall, 0–1. */
  night: number;
  /** Heavenly light (the flash from the Creation), 0–1. */
  light: number;
}

const pose = (x: number, y: number, z: number, veil = 0, night = 0, light = 0): Pose => ({ x, y, z, veil, night, light });

/** Sky above the garden: where the descent from the home fresco begins. */
export const HEAVEN = pose(0.5, 0, 1.7, 0, 0, 1);

/** Section shelves stand in different parts of the garden. */
const SHELVES: Record<string, Pose> = {
  mathematics: pose(0.16, 0.5, 1.45, 0.08),          // the palm grove, left
  physics: pose(0.55, 0.42, 1.7, 0.1),               // mountain and waterfall
  'computer-science': pose(0.86, 0.5, 1.45, 0.08),   // the great tree, right
  research: pose(0.3, 0.86, 1.6, 0.08),              // the spring among the rocks
  ideas: pose(0.66, 0.82, 1.6, 0.08),                // the flowering meadow
};
const GARDEN = pose(0.5, 0.66, 1.08, 0.06);

/** Scene key → pose. `shelf:<slug>` and `note:<slug>` follow the section. */
export function scenePose(scene: string): Pose {
  const [kind, slug = ''] = scene.split(':');
  const shelf = SHELVES[slug] ?? GARDEN;
  switch (kind) {
    case 'home': return pose(0.5, 0.02, 1.6, 0.86);
    case 'garden': return GARDEN;
    case 'shelf': return shelf;
    case 'note': return { ...shelf, z: shelf.z + 0.15, veil: 0.9 };
    case 'tree': return pose(0.9, 0.24, 1.35, 0.05, 0.62);
    case 'research': return { ...SHELVES.research, veil: 0.78 };
    case 'ideas': return { ...SHELVES.ideas, veil: 0.78 };
    case 'exile': return pose(0.03, 0.96, 1.25, 0.12, 0.45);
    default: return { ...GARDEN, veil: 0.8 };
  }
}

export const poseAttr = (p: Pose) => [p.x, p.y, p.z, p.veil, p.night, p.light].join(',');
export const HEAVEN_ATTR = poseAttr(HEAVEN);
