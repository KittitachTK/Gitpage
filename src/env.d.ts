/** Set up by BaseLayout's head script (see lib/world.ts and components/EdenWorld.astro). */
interface PlanktosWorld {
  /** Glide the painted world to this page's pose. */
  go(): void;
  /** Remember the pose (a `poseAttr` string) the next page should start from. */
  leaveFrom(pose: string): void;
}

interface Window {
  planktosWorld?: PlanktosWorld;
}
