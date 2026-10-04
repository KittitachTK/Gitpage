/**
 * Knowledge graph renderer: d3-force layout drawn on a <canvas>.
 *
 *   note          = star          (size ∝ number of connections)
 *   course folder = star system   (labelled cluster)
 *   section       = galaxy        (weak pull towards a per-section anchor)
 *   link          = connection    (light travels along it)
 *
 * Used for the full Knowledge Universe and the per-note local graph.
 *
 * The layout is computed up front; what moves on screen is animation (entrance,
 * twinkle, pulses, camera, easing of highlights). That animation runs in one
 * requestAnimationFrame loop only while motion is enabled and the canvas is
 * visible (see motion.ts). With motion off every effect snaps to its end state
 * and the canvas is redrawn only when something changes.
 */
import {
  forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY,
  type Simulation, type SimulationLinkDatum, type SimulationNodeDatum,
} from 'd3-force';
import { animateWhileVisible, motionEnabled, onMotionChange } from './motion';

export interface GNode extends SimulationNodeDatum {
  id: string;
  title: string;
  slug: string;
  section: string;
  /** "Section/Course" folder — a star system. */
  group?: string;
  degree: number;
  tags: string[];
}
type GLink = SimulationLinkDatum<GNode> & { source: string | GNode; target: string | GNode };

export interface GraphData {
  nodes: Omit<GNode, keyof SimulationNodeDatum>[];
  links: { source: string; target: string }[];
}

export interface GraphOptions {
  base: string;
  /** Highlight this note and keep it centred (local graph). */
  focus?: string;
  /** Draw a parallax starfield behind the graph. */
  starfield?: boolean;
  /** Group sections into separate "galaxies". */
  galaxies?: boolean;
  /** Always show labels for nodes at least this important (degree). */
  labelDegree?: number;
  /** Entrance: stars burst from the centre ('bang') or fade in ('fade'). */
  intro?: 'bang' | 'fade';
  /** Twinkling stars and light travelling along links. */
  ambient?: boolean;
  /** Very slow rotation of the whole universe (true, or a speed in rad/s). */
  drift?: boolean | number;
  /** Decorative preview: no zoom/pan/drag (never captures page scroll); a click opens the Universe. */
  preview?: boolean;
  /** Name each star system (course folder). */
  systemLabels?: boolean;
  onHover?(node: GNode | null): void;
}

const SECTION_VARS: Record<string, string> = {
  Mathematics: '--sec-mathematics',
  Physics: '--sec-physics',
  'Computer Science': '--sec-computer-science',
  Research: '--sec-research',
  Ideas: '--sec-ideas',
};

interface Anim {
  /** Entrance progress 0→1. */
  vis: number;
  /** Highlight (not dimmed) 0→1, eased. */
  lit: number;
  /** Hovered 0→1, eased. */
  hov: number;
  /** Twinkle phase and speed. */
  tw: number;
  tws: number;
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const easeOutExpo = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
/** Exponential approach factor for frame-rate independent easing. */
const approach = (dt: number, ms: number) => 1 - Math.exp(-dt / ms);

export function mountGraph(canvas: HTMLCanvasElement, data: GraphData, opts: GraphOptions) {
  const ctx = canvas.getContext('2d')!;
  const css = getComputedStyle(document.documentElement);
  const colorCache = new Map<string, string>();
  const color = (section: string) => {
    if (!colorCache.has(section)) colorCache.set(section, css.getPropertyValue(SECTION_VARS[section] ?? '--sec-other').trim() || '#8e939c');
    return colorCache.get(section)!;
  };
  const textColor = css.getPropertyValue('--text').trim() || '#e6e2d8';
  const faint = css.getPropertyValue('--text-faint').trim() || '#858076';
  const linkColor = css.getPropertyValue('--border-strong').trim() || '#2d3543';

  const nodes: GNode[] = data.nodes.map((n) => ({ ...n }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const links: GLink[] = data.links.filter((l) => byId.has(l.source) && byId.has(l.target)).map((l) => ({ ...l }));
  const neighbours = new Map<string, Set<string>>();
  for (const l of data.links) {
    if (!byId.has(l.source) || !byId.has(l.target)) continue;
    (neighbours.get(l.source) ?? neighbours.set(l.source, new Set()).get(l.source)!).add(l.target);
    (neighbours.get(l.target) ?? neighbours.set(l.target, new Set()).get(l.target)!).add(l.source);
  }

  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const anim = new Map<GNode, Anim>(nodes.map((n) => [n, { vis: 1, lit: 1, hov: 0, tw: rand() * Math.PI * 2, tws: 0.6 + rand() * 1.4 }]));
  // Each link carries a pulse of light on its own slow schedule.
  const pulses = links.map(() => ({ period: 5 + rand() * 7, offset: rand() }));

  let width = 0, height = 0, dpr = 1;
  const view = { x: 0, y: 0, k: 1 };
  let rot = 0;           // drift rotation (radians)
  let rotSpeed = 0;      // eased towards the target speed
  let now = 0;           // ms, advanced by the animation loop
  let running = false;   // animation loop active
  let hover: GNode | null = null;
  let filter: Set<string> | null = null;
  let userMoved = false;
  let leaving = false;   // flying into a star before navigating
  const radius = (n: GNode) => 2.5 + Math.sqrt(n.degree) * 1.8 + (n.id === opts.focus ? 3 : 0);

  // ---- layout: galaxies on a ring, computed up front ------------------------
  const sectionsPresent = [...new Set(nodes.map((n) => n.section))];
  const anchors = new Map<string, { x: number; y: number }>();
  const ring = opts.galaxies && sectionsPresent.length > 1 ? 160 + nodes.length * 1.2 : 0;
  sectionsPresent.forEach((s, i) => {
    const a = (i / sectionsPresent.length) * Math.PI * 2 - Math.PI / 2;
    anchors.set(s, { x: Math.cos(a) * ring, y: Math.sin(a) * ring });
  });

  const sim: Simulation<GNode, GLink> = forceSimulation(nodes)
    .force('link', forceLink<GNode, GLink>(links).id((d) => d.id).distance(opts.focus ? 46 : 60).strength(0.5))
    .force('charge', forceManyBody().strength(opts.focus ? -160 : -110))
    .force('collide', forceCollide<GNode>().radius((d) => radius(d) + 4))
    .force('center', forceCenter(0, 0))
    .force('x', forceX<GNode>((d) => anchors.get(d.section)!.x).strength(ring ? 0.06 : 0.02))
    .force('y', forceY<GNode>((d) => anchors.get(d.section)!.y).strength(ring ? 0.06 : 0.02))
    .stop();
  if (opts.focus && byId.has(opts.focus)) {
    const f = byId.get(opts.focus)!;
    f.fx = 0; f.fy = 0;
  }
  sim.tick(300);
  const final = new Map(nodes.map((n) => [n, { x: n.x!, y: n.y! }]));

  // ---- starfield ------------------------------------------------------------
  const stars = opts.starfield
    ? Array.from({ length: 420 }, () => ({ x: rand(), y: rand(), r: rand() * 1.1 + 0.2, a: rand() * 0.6 + 0.15, z: rand() * 0.6 + 0.1, p: rand() * 6.28, s: 0.3 + rand() }))
    : [];

  // Soft halo sprites, one per colour (cheaper than a gradient per star per frame).
  const sprites = new Map<string, HTMLCanvasElement>();
  const halo = (c: string) => {
    let s = sprites.get(c);
    if (!s) {
      s = document.createElement('canvas');
      s.width = s.height = 64;
      const g = s.getContext('2d')!;
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, c);
      grad.addColorStop(1, 'transparent');
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
      sprites.set(c, s);
    }
    return s;
  };

  // ---- coordinates (world → rotated → screen) --------------------------------
  const rotated = (x: number, y: number) => {
    if (!rot) return { x, y };
    const c = Math.cos(rot), s = Math.sin(rot);
    return { x: x * c - y * s, y: x * s + y * c };
  };
  const toScreen = (n: GNode) => {
    const r = rotated(n.x!, n.y!);
    return { x: width / 2 + view.x + r.x * view.k, y: height / 2 + view.y + r.y * view.k };
  };
  const toWorld = (sx: number, sy: number) => {
    const x = (sx - width / 2 - view.x) / view.k, y = (sy - height / 2 - view.y) / view.k;
    if (!rot) return { x, y };
    const c = Math.cos(-rot), s = Math.sin(-rot);
    return { x: x * c - y * s, y: x * s + y * c };
  };

  /** View that frames `subset` (in final positions, current rotation). */
  function framing(subset: GNode[]) {
    const list = subset.length ? subset : nodes;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of list) {
      const f = final.get(n)!;
      const r = rotated(f.x, f.y);
      minX = Math.min(minX, r.x); maxX = Math.max(maxX, r.x);
      minY = Math.min(minY, r.y); maxY = Math.max(maxY, r.y);
    }
    // Room for star names below and system names above the outermost stars.
    const pad = list.length < nodes.length ? 160 : opts.systemLabels ? 140 : 60;
    let k = Math.min((width - pad) / Math.max(maxX - minX, 1), (height - pad) / Math.max(maxY - minY, 1), opts.focus ? 1.6 : 1.4);
    if (list.length === 1) k = Math.max(view.k, 1.6);
    k = Math.max(0.15, Math.min(k, 3));
    return { x: -((minX + maxX) / 2) * k, y: -((minY + maxY) / 2) * k, k };
  }
  function fit() {
    if (!width || !nodes.length) return;
    Object.assign(view, framing(nodes));
  }

  // ---- camera tween ------------------------------------------------------------
  let camera: { from: typeof view; to: typeof view; t0: number; dur: number; done?: () => void } | null = null;
  function moveCamera(to: typeof view, dur: number, done?: () => void) {
    if (!running) {
      Object.assign(view, to);
      invalidate();
      done?.();
      return;
    }
    camera = { from: { ...view }, to, t0: now, dur, done };
  }
  function stepCamera() {
    if (!camera) return;
    const t = clamp01((now - camera.t0) / camera.dur);
    const e = easeInOutCubic(t);
    const { from, to } = camera;
    // Zoom interpolates in log space so the motion feels uniform.
    view.k = Math.exp(Math.log(from.k) + (Math.log(to.k) - Math.log(from.k)) * e);
    view.x = from.x + (to.x - from.x) * e;
    view.y = from.y + (to.y - from.y) * e;
    if (t >= 1) {
      const done = camera.done;
      camera = null;
      done?.();
    }
  }

  // ---- entrance ----------------------------------------------------------------
  let intro: { t0: number; dur: number; delay: Map<GNode, number> } | null = null;
  function startIntro() {
    if (!opts.intro || !motionEnabled()) return;
    const dur = opts.intro === 'bang' ? 1900 : 700;
    const maxD = Math.max(1, ...nodes.map((n) => Math.hypot(final.get(n)!.x, final.get(n)!.y)));
    const delay = new Map(nodes.map((n) => {
      const f = final.get(n)!;
      return [n, opts.intro === 'bang' ? 0.12 * rand() : 0.35 * (Math.hypot(f.x, f.y) / maxD) + 0.1 * rand()];
    }));
    intro = { t0: -1, dur, delay };
    for (const n of nodes) {
      anim.get(n)!.vis = 0;
      if (opts.intro === 'bang') { n.x = (rand() - 0.5) * 4; n.y = (rand() - 0.5) * 4; }
    }
  }
  function stepIntro() {
    if (!intro) return;
    if (intro.t0 < 0) intro.t0 = now;
    const T = (now - intro.t0) / intro.dur;
    for (const n of nodes) {
      const d = intro.delay.get(n)!;
      const t = clamp01((T - d) / (1 - d));
      const a = anim.get(n)!;
      a.vis = clamp01(t * 2.2);
      if (opts.intro === 'bang') {
        const f = final.get(n)!;
        const e = easeOutExpo(t);
        n.x = f.x * e; n.y = f.y * e;
      }
    }
    if (T >= 1) finishIntro();
  }
  function finishIntro() {
    if (!intro) return;
    intro = null;
    for (const n of nodes) {
      const f = final.get(n)!;
      if (n.fx == null) { n.x = f.x; n.y = f.y; }
      anim.get(n)!.vis = 1;
    }
  }

  // ---- highlight state ----------------------------------------------------------
  function isLit(n: GNode) {
    if (filter) return filter.has(n.id);
    if (!hover) return true;
    return n === hover || !!neighbours.get(hover.id)?.has(n.id);
  }
  function stepHighlights(dt: number) {
    const kLit = approach(dt, 110), kHov = approach(dt, 90);
    for (const n of nodes) {
      const a = anim.get(n)!;
      a.lit += ((isLit(n) ? 1 : 0) - a.lit) * kLit;
      a.hov += ((n === hover ? 1 : 0) - a.hov) * kHov;
    }
  }
  function snapHighlights() {
    for (const n of nodes) {
      const a = anim.get(n)!;
      a.lit = isLit(n) ? 1 : 0;
      a.hov = n === hover ? 1 : 0;
    }
  }

  // ---- drawing --------------------------------------------------------------------
  const twinkle = (a: Anim) => (opts.ambient && running ? 0.84 + 0.16 * Math.sin(now / 1000 * a.tws * 2 + a.tw) : 1);

  function draw() {
    if (!running) snapHighlights();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    // Background stars with parallax (and a slow twinkle when ambient).
    ctx.fillStyle = '#e6e2d8';
    for (const s of stars) {
      const x = ((s.x * width + view.x * s.z) % width + width) % width;
      const y = ((s.y * height + view.y * s.z) % height + height) % height;
      ctx.globalAlpha = s.a * (opts.ambient && running ? 0.7 + 0.3 * Math.sin(now / 1000 * s.s + s.p) : 1);
      ctx.fillRect(x, y, s.r, s.r);
    }

    // The first instant of the big bang: a brief, soft flash at the centre.
    if (intro && opts.intro === 'bang' && intro.t0 >= 0) {
      const T = (now - intro.t0) / intro.dur;
      if (T < 0.45) {
        const c = toScreen({ x: 0, y: 0 } as GNode);
        const R = 40 + T * 900 * Math.sqrt(view.k);
        ctx.globalAlpha = 0.28 * (1 - T / 0.45);
        ctx.drawImage(halo(textColor), c.x - R, c.y - R, R * 2, R * 2);
      }
    }

    const sq = Math.sqrt(view.k);
    const linkFade = intro ? clamp01(((now - Math.max(intro.t0, 0)) / intro.dur - 0.35) / 0.5) : 1;

    // Links: a faint base line, plus the hovered star's links in its colour.
    ctx.lineWidth = 0.8;
    for (const l of links) {
      const a = l.source as GNode, b = l.target as GNode;
      const A = anim.get(a)!, B = anim.get(b)!;
      const vis = Math.min(A.vis, B.vis) * linkFade;
      if (vis <= 0.01) continue;
      const pa = toScreen(a), pb = toScreen(b);
      const lit = Math.min(A.lit, B.lit);
      const hot = Math.max(A.hov, B.hov);
      ctx.strokeStyle = linkColor;
      ctx.globalAlpha = vis * (0.12 + 0.48 * lit) * (1 - hot);
      ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
      if (hot > 0.01) {
        ctx.strokeStyle = color((A.hov > B.hov ? a : b).section);
        ctx.globalAlpha = vis * 0.75 * hot;
        ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
        ctx.lineWidth = 0.8;
      }
    }

    // Light travelling along links.
    if (opts.ambient && running && !intro) {
      const t = now / 1000;
      const stride = links.length > 1500 ? Math.ceil(links.length / 1500) : 1;
      for (let i = 0; i < links.length; i += stride) {
        const p = pulses[i];
        const phase = (t / p.period + p.offset) % 1;
        if (phase > 0.32) continue;
        const f = phase / 0.32;
        const a = links[i].source as GNode, b = links[i].target as GNode;
        const lit = Math.min(anim.get(a)!.lit, anim.get(b)!.lit);
        const pa = toScreen(a), pb = toScreen(b);
        const x = pa.x + (pb.x - pa.x) * f, y = pa.y + (pb.y - pa.y) * f;
        const R = 5 * sq;
        ctx.globalAlpha = 0.55 * Math.sin(Math.PI * f) * lit;
        ctx.drawImage(halo(color(a.section)), x - R, y - R, R * 2, R * 2);
      }
    }

    // Stars.
    for (const n of nodes) {
      const a = anim.get(n)!;
      if (a.vis <= 0.01) continue;
      const p = toScreen(n);
      const r = radius(n) * sq * (1 + 0.35 * a.hov) * (0.4 + 0.6 * a.vis);
      const c = color(n.section);
      const shine = twinkle(a);
      const dim = 0.18 + 0.82 * a.lit;
      const R = r * (2.6 + 0.8 * a.hov);
      ctx.globalAlpha = a.vis * dim * (0.16 + 0.14 * a.hov) * shine;
      ctx.drawImage(halo(c), p.x - R, p.y - R, R * 2, R * 2);
      ctx.globalAlpha = a.vis * dim * shine;
      ctx.fillStyle = n.id === opts.focus ? textColor : c;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    }

    const placed: { x0: number; x1: number; y0: number; y1: number }[] = [];
    const free = (b: (typeof placed)[number]) => !placed.some((o) => o.x0 < b.x1 && b.x0 < o.x1 && o.y0 < b.y1 && b.y0 < o.y1);

    // Star-system names (course folders), fading out as you zoom in.
    if (opts.systemLabels) {
      const show = clamp01((1.7 - view.k) / 0.5);
      if (show > 0.01) {
        const groups = new Map<string, GNode[]>();
        for (const n of nodes) if (n.group) groups.set(n.group, [...(groups.get(n.group) ?? []), n]);
        ctx.font = `600 10px 'JetBrains Mono', ui-monospace, monospace`;
        ctx.textAlign = 'center';
        if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '2px';
        for (const [g, members] of groups) {
          if (members.length < 3) continue;
          let sx = 0, top = Infinity, vis = 0, lit = 0;
          for (const m of members) {
            const p = toScreen(m);
            sx += p.x; top = Math.min(top, p.y);
            vis += anim.get(m)!.vis; lit += anim.get(m)!.lit;
          }
          const x = sx / members.length, y = top - 18;
          const label = g.split('/').pop()!.toUpperCase();
          const half = ctx.measureText(label).width / 2 + 4;
          const box = { x0: x - half, x1: x + half, y0: y - 10, y1: y + 4 };
          if (!free(box)) continue;
          placed.push(box);
          ctx.globalAlpha = show * (vis / members.length) * (0.25 + 0.45 * (lit / members.length));
          ctx.fillStyle = color(members[0].section);
          ctx.fillText(label, x, y);
        }
        if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px';
      }
    }

    // Star names: most important first; skip any that would overlap.
    ctx.font = `${opts.focus ? 11 : 12}px Inter, 'IBM Plex Sans Thai', sans-serif`;
    ctx.textAlign = 'center';
    const ordered = [...nodes].sort((a, b) =>
      Number(b === hover || b.id === opts.focus) - Number(a === hover || a.id === opts.focus) || b.degree - a.degree);
    const idle = !hover && !filter;
    for (const n of ordered) {
      const a = anim.get(n)!;
      if (a.vis < 0.5) continue;
      const show =
        n === hover || n.id === opts.focus ||
        (hover && neighbours.get(hover.id)?.has(n.id)) ||
        filter?.has(n.id) ||
        (idle && opts.focus && neighbours.get(opts.focus)?.has(n.id)) ||
        (idle && !opts.focus && (view.k > 1.3 || n.degree >= (opts.labelDegree ?? 6)));
      if (!show) continue;
      const p = toScreen(n);
      const label = n.title.length > 38 ? n.title.slice(0, 36) + '…' : n.title;
      const y = p.y + radius(n) * sq * (1 + 0.35 * a.hov) + 14;
      const half = ctx.measureText(label).width / 2 + 3;
      const box = { x0: p.x - half, x1: p.x + half, y0: y - 11, y1: y + 3 };
      if (!free(box)) continue;
      placed.push(box);
      ctx.globalAlpha = a.vis * (0.25 + 0.75 * a.lit);
      ctx.fillStyle = a.hov > 0.5 || n.id === opts.focus ? textColor : faint;
      ctx.fillText(label, p.x, y);
    }
    ctx.globalAlpha = 1;
  }

  /** Redraw now if the loop is not running (the loop redraws every frame). */
  const invalidate = () => { if (!running) draw(); };

  // Full frame rate while something is happening; ~30 fps for idle ambience.
  let lastInput = -1e9;
  let sinceDraw = 0;
  const poke = () => { lastInput = now; };

  function frame(_t: number, dt: number) {
    running = true;
    now += dt;
    sinceDraw += dt;
    stepIntro();
    stepCamera();
    stepHighlights(dt);
    if (opts.drift) {
      const speed = typeof opts.drift === 'number' ? opts.drift : 0.0055; // rad/s ≈ one turn / 19 min
      const target = hover || drag || filter || camera || leaving ? 0 : speed;
      rotSpeed += (target - rotSpeed) * approach(dt, 600);
      rot += rotSpeed * dt / 1000;
    }
    const busy = intro || camera || drag || pinch || leaving || now - lastInput < 900;
    if (!busy && sinceDraw < 33) return;
    sinceDraw = 0;
    draw();
  }

  /** Motion stopped (toggle, tab hidden, off-screen): jump every effect to its end state. */
  function settle() {
    running = false;
    finishIntro();
    if (camera) {
      Object.assign(view, camera.to);
      const done = camera.done;
      camera = null;
      done?.();
    }
    draw();
  }

  // ---- interaction ------------------------------------------------------------
  function pick(sx: number, sy: number): GNode | null {
    const w = toWorld(sx, sy);
    let best: GNode | null = null, bestD = Infinity;
    for (const n of nodes) {
      const d = Math.hypot(n.x! - w.x, n.y! - w.y);
      const hit = (radius(n) + 6) / Math.sqrt(view.k);
      if (d < hit && d < bestD) { best = n; bestD = d; }
    }
    return best;
  }

  /** Fly the camera into a star, then open it. */
  function open(n: GNode) {
    if (leaving) return;
    leaving = true;
    const r = rotated(n.x!, n.y!);
    const k = Math.min(4, Math.max(view.k * 2.2, 2.6));
    moveCamera({ x: -r.x * k, y: -r.y * k, k }, 650, () => { window.location.href = opts.base + n.slug; });
  }
  // Coming back via the back/forward cache: allow flying again.
  addEventListener('pageshow', (e) => { if (e.persisted) { leaving = false; fit(); invalidate(); } });

  const pointers = new Map<number, { x: number; y: number }>();
  let drag: { node: GNode | null; sx: number; sy: number; vx: number; vy: number; moved: boolean } | null = null;
  let pinch: { d: number; k: number } | null = null;

  const local = (e: PointerEvent | WheelEvent) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const takeControl = () => { userMoved = true; camera = null; finishIntro(); };

  canvas.addEventListener('pointerdown', (e) => {
    poke();
    const p = local(e);
    if (opts.preview) { drag = { node: null, sx: p.x, sy: p.y, vx: view.x, vy: view.y, moved: false }; return; }
    pointers.set(e.pointerId, p);
    canvas.setPointerCapture(e.pointerId);
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), k: view.k };
      drag = null;
      return;
    }
    drag = { node: pick(p.x, p.y), sx: p.x, sy: p.y, vx: view.x, vy: view.y, moved: false };
    canvas.style.cursor = 'grabbing';
  });

  canvas.addEventListener('pointermove', (e) => {
    poke();
    const p = local(e);
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, p);
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      takeControl();
      view.k = Math.min(6, Math.max(0.1, pinch.k * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.d)));
      invalidate();
      return;
    }
    if (drag && opts.preview) {
      if (Math.hypot(p.x - drag.sx, p.y - drag.sy) > 8) drag.moved = true;
    } else if (drag) {
      const dx = p.x - drag.sx, dy = p.y - drag.sy;
      if (Math.hypot(dx, dy) > 4) { drag.moved = true; takeControl(); }
      if (!drag.moved) return;
      if (drag.node) {
        const w = toWorld(p.x, p.y);
        drag.node.fx = w.x; drag.node.fy = w.y;
        if (motionEnabled()) sim.alphaTarget(0.2).restart();
        else { drag.node.x = w.x; drag.node.y = w.y; }
      } else {
        view.x = drag.vx + dx; view.y = drag.vy + dy;
      }
      invalidate();
      return;
    }
    const n = pick(p.x, p.y);
    if (n !== hover) {
      hover = n;
      canvas.style.cursor = n || opts.preview ? 'pointer' : 'grab';
      opts.onHover?.(n);
      invalidate();
    }
  });

  const end = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (!drag) return;
    if (opts.preview) {
      // Inside a link the link itself navigates (keyboard-accessible, view transition).
      const go = !drag.moved && e.type === 'pointerup' && !canvas.closest('a');
      drag = null;
      if (go) window.location.href = opts.base + 'universe';
      return;
    }
    const { node, moved } = drag;
    if (node && moved) {
      // Keep the new position as the star's resting place.
      final.set(node, { x: node.x!, y: node.y! });
      if (node.id !== opts.focus) { node.fx = null; node.fy = null; }
    }
    sim.alphaTarget(0);
    drag = null;
    canvas.style.cursor = 'grab';
    if (node && !moved && e.type === 'pointerup') open(node);
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', () => {
    poke();
    if (!drag && hover) { hover = null; opts.onHover?.(null); invalidate(); }
  });

  if (!opts.preview) canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    poke();
    const p = local(e);
    takeControl();
    const k = Math.min(6, Math.max(0.1, view.k * Math.exp(-e.deltaY * 0.0015)));
    const sx = (p.x - width / 2 - view.x) / view.k, sy = (p.y - height / 2 - view.y) / view.k;
    view.k = k;
    view.x = p.x - width / 2 - sx * k;
    view.y = p.y - height / 2 - sy * k;
    invalidate();
  }, { passive: false });

  // While a star is dragged the simulation runs so its neighbours follow.
  sim.on('tick', () => {
    for (const n of nodes) if (n !== drag?.node) final.set(n, { x: n.x!, y: n.y! });
    invalidate();
  });

  // ---- run ---------------------------------------------------------------------
  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width; height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    if (!userMoved && !camera) fit();
    invalidate();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();
  startIntro();
  draw();

  const stopLoop = animateWhileVisible(canvas, frame, settle);
  const offMotion = onMotionChange((on) => { if (!on) sim.stop(); });

  return {
    /** Highlight nodes whose title/tags match and frame them; empty string clears. */
    setFilter(q: string) {
      poke();
      const s = q.trim().toLowerCase();
      filter = s ? new Set(nodes.filter((n) => n.title.toLowerCase().includes(s) || n.tags.some((t) => t.toLowerCase().includes(s))).map((n) => n.id)) : null;
      const matched = filter ? nodes.filter((n) => filter!.has(n.id)) : nodes;
      if (filter && matched.length) moveCamera(framing(matched), 700);
      else if (!filter) moveCamera(framing(nodes), 700);
      invalidate();
      return filter?.size ?? nodes.length;
    },
    fit() { fit(); invalidate(); },
    destroy() { sim.stop(); ro.disconnect(); stopLoop(); offMotion(); },
  };
}
