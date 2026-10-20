/**
 * The painted world behind every page (components/EdenWorld.astro).
 *
 * Each page is a place in one landscape — Thomas Cole's *The Garden of Eden*
 * (1828) — and declares where the "camera" stands. Moving between pages
 * glides from the previous pose to the new one, so the site reads as a single
 * walk: down from the sky of the Creation fresco, into the garden, along the
 * shelves, to the tree of knowledge.
 */

import { SPOTS } from './garden';

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

const GARDEN = pose(0.5, 0.66, 1.08, 0.06);
const atSpot = (name: string): Pose => {
  const s = SPOTS.find((x) => x.name === name);
  return s ? pose(s.x, s.y, s.z, 0.08) : GARDEN;
};

/**
 * Scene key → pose. Subjects stand at garden spots (lib/garden.ts), so pages pass
 * the spot, not the subject: `shelf:<spot>` (its shelves) and `note:<spot>` (reading).
 */
export function scenePose(scene: string): Pose {
  const [kind, spot = ''] = scene.split(':');
  switch (kind) {
    case 'home': return pose(0.5, 0.02, 1.6, 0.86);
    case 'garden': return GARDEN;
    case 'shelf': return atSpot(spot);
    case 'note': { const p = atSpot(spot); return { ...p, z: p.z + 0.15, veil: 0.9 }; }
    case 'tree': return pose(0.9, 0.24, 1.35, 0.05, 0.62);
    case 'research': return { ...atSpot('spring'), veil: 0.78 };
    case 'ideas': return { ...atSpot('meadow'), veil: 0.78 };
    case 'exile': return pose(0.03, 0.96, 1.25, 0.12, 0.45);
    default: return { ...GARDEN, veil: 0.8 };
  }
}

/**
 * The 3D world (scripts/world.ts) shows the home page on the Creation fresco and every
 * other page in the garden; the 2D backdrop uses `scenePose` for all of them.
 */
export function worldScene(scene: string): { name: 'creation' | 'garden'; pose: Pose } {
  if (scene.split(':')[0] === 'home') return { name: 'creation', pose: pose(0.44, 0.46, 1) };
  return { name: 'garden', pose: scenePose(scene) };
}

export const parsePose = (attr: string): Pose => {
  const [x, y, z, veil, night, light] = attr.split(',').map(Number);
  return { x, y, z, veil, night, light };
};

export const poseAttr = (p: Pose) => [p.x, p.y, p.z, p.veil, p.night, p.light].join(',');
export const HEAVEN_ATTR = poseAttr(HEAVEN);
