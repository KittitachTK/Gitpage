/** Set up by components/World.astro: the painted world behind every page. */
interface PlanktosWorld {
  /** '3d' when the WebGL world is showing, '2d' for the CSS painting. */
  readonly mode: '2d' | '3d';
  /** The 3D world while it is showing (scripts/world.ts). */
  readonly world: import('./scripts/world').World | null;
  /** Pose the 2D painting (lib/world.ts). */
  set2d(pose: import('./lib/world').Pose, instant?: boolean): void;
}

interface Window {
  planktosWorld?: PlanktosWorld;
}
