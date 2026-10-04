/**
 * Knowledge graph renderer: d3-force simulation drawn on a <canvas>.
 *
 *   note    = star          (size ∝ number of connections)
 *   section = galaxy        (weak pull towards a per-section anchor)
 *   link    = connection
 *
 * Used for the full Knowledge Universe and the per-note local graph.
 */
import {
  forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY,
  type Simulation, type SimulationLinkDatum, type SimulationNodeDatum,
} from 'd3-force';
import { motionEnabled, onMotionChange } from './motion';

export interface GNode extends SimulationNodeDatum {
  id: string;
  title: string;
  slug: string;
  section: string;
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
  onHover?(node: GNode | null): void;
}

const SECTION_VARS: Record<string, string> = {
  Mathematics: '--sec-mathematics',
  Physics: '--sec-physics',
  'Computer Science': '--sec-computer-science',
  Research: '--sec-research',
  Ideas: '--sec-ideas',
};

export function mountGraph(canvas: HTMLCanvasElement, data: GraphData, opts: GraphOptions) {
  const ctx = canvas.getContext('2d')!;
  const css = getComputedStyle(document.documentElement);
  const color = (section: string) => css.getPropertyValue(SECTION_VARS[section] ?? '--sec-other').trim() || '#9aa6bb';
  const textColor = css.getPropertyValue('--text').trim();
  const faint = css.getPropertyValue('--text-faint').trim();
  const reduced = () => !motionEnabled();

  const nodes: GNode[] = data.nodes.map((n) => ({ ...n }));
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const links: GLink[] = data.links.filter((l) => byId.has(l.source) && byId.has(l.target)).map((l) => ({ ...l }));
  const neighbours = new Map<string, Set<string>>();
  for (const l of data.links) {
    if (!byId.has(l.source) || !byId.has(l.target)) continue;
    (neighbours.get(l.source) ?? neighbours.set(l.source, new Set()).get(l.source)!).add(l.target);
    (neighbours.get(l.target) ?? neighbours.set(l.target, new Set()).get(l.target)!).add(l.source);
  }

  let width = 0, height = 0, dpr = 1;
  const view = { x: 0, y: 0, k: 1 };
  let hover: GNode | null = null;
  let filter: Set<string> | null = null;
  let userMoved = false;
  const radius = (n: GNode) => 2.5 + Math.sqrt(n.degree) * 1.8 + (n.id === opts.focus ? 3 : 0);

  // ---- galaxies: one anchor per section on a ring -------------------------
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
    .force('y', forceY<GNode>((d) => anchors.get(d.section)!.y).strength(ring ? 0.06 : 0.02));

  if (opts.focus && byId.has(opts.focus)) {
    const f = byId.get(opts.focus)!;
    f.fx = 0; f.fy = 0;
  }

  // ---- starfield ------------------------------------------------------------
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const stars = opts.starfield
    ? Array.from({ length: 420 }, () => ({ x: rand(), y: rand(), r: rand() * 1.1 + 0.2, a: rand() * 0.6 + 0.15, z: rand() * 0.6 + 0.1 }))
    : [];

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = rect.width; height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    draw();
  }

  function fit() {
    if (!nodes.length) return;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const n of nodes) {
      minX = Math.min(minX, n.x!); maxX = Math.max(maxX, n.x!);
      minY = Math.min(minY, n.y!); maxY = Math.max(maxY, n.y!);
    }
    const pad = 60;
    const k = Math.min((width - pad) / Math.max(maxX - minX, 1), (height - pad) / Math.max(maxY - minY, 1), opts.focus ? 1.6 : 1.4);
    view.k = Math.max(0.15, k);
    view.x = -((minX + maxX) / 2) * view.k;
    view.y = -((minY + maxY) / 2) * view.k;
  }

  const toScreen = (n: GNode) => ({ x: width / 2 + view.x + n.x! * view.k, y: height / 2 + view.y + n.y! * view.k });
  const toWorld = (sx: number, sy: number) => ({ x: (sx - width / 2 - view.x) / view.k, y: (sy - height / 2 - view.y) / view.k });

  function isLit(n: GNode) {
    if (filter) return filter.has(n.id);
    const center = hover ?? (opts.focus ? byId.get(opts.focus) : undefined);
    if (!center || !hover) return true;
    return n === center || !!neighbours.get(center.id)?.has(n.id);
  }

  function draw() {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);

    for (const s of stars) {
      const x = ((s.x * width + view.x * s.z) % width + width) % width;
      const y = ((s.y * height + view.y * s.z) % height + height) % height;
      ctx.globalAlpha = s.a;
      ctx.fillStyle = '#cfd8ea';
      ctx.fillRect(x, y, s.r, s.r);
    }
    ctx.globalAlpha = 1;

    const active = hover ?? null;
    for (const l of links) {
      const a = l.source as GNode, b = l.target as GNode;
      const pa = toScreen(a), pb = toScreen(b);
      const hot = active && (a === active || b === active);
      const dim = filter && !(filter.has(a.id) && filter.has(b.id));
      ctx.strokeStyle = hot ? color(active!.section) : 'rgba(126,137,156,1)';
      ctx.globalAlpha = hot ? 0.8 : dim ? 0.04 : active ? 0.08 : 0.22;
      ctx.lineWidth = hot ? 1.4 : 0.8;
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.stroke();
    }

    for (const n of nodes) {
      const p = toScreen(n);
      const r = radius(n) * Math.sqrt(view.k);
      const c = color(n.section);
      const lit = isLit(n);
      ctx.globalAlpha = lit ? 1 : 0.14;
      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 4);
      glow.addColorStop(0, c);
      glow.addColorStop(1, 'transparent');
      ctx.globalAlpha = lit ? 0.35 : 0.05;
      ctx.fillStyle = glow;
      ctx.beginPath(); ctx.arc(p.x, p.y, r * 4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = lit ? 1 : 0.2;
      ctx.fillStyle = n.id === opts.focus ? '#ffffff' : c;
      ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, Math.PI * 2); ctx.fill();
    }

    ctx.font = `${opts.focus ? 11 : 12}px Inter, 'IBM Plex Sans Thai', sans-serif`;
    ctx.textAlign = 'center';
    // Most important labels first; skip any label that would overlap one already drawn.
    const placed: { x0: number; x1: number; y0: number; y1: number }[] = [];
    const ordered = [...nodes].sort((a, b) =>
      Number(b === hover || b.id === opts.focus) - Number(a === hover || a.id === opts.focus) || b.degree - a.degree);
    for (const n of ordered) {
      const lit = isLit(n);
      const idle = !hover && !filter;
      const show =
        n === hover || n.id === opts.focus ||
        (hover && neighbours.get(hover.id)?.has(n.id)) ||
        filter?.has(n.id) ||
        (idle && opts.focus && neighbours.get(opts.focus)?.has(n.id)) ||
        (idle && !opts.focus && (view.k > 1.3 || n.degree >= (opts.labelDegree ?? 6)));
      if (!show) continue;
      const p = toScreen(n);
      const label = n.title.length > 38 ? n.title.slice(0, 36) + '…' : n.title;
      const y = p.y + radius(n) * Math.sqrt(view.k) + 14;
      const half = ctx.measureText(label).width / 2 + 3;
      const box = { x0: p.x - half, x1: p.x + half, y0: y - 11, y1: y + 3 };
      if (placed.some((b) => b.x0 < box.x1 && box.x0 < b.x1 && b.y0 < box.y1 && box.y0 < b.y1)) continue;
      placed.push(box);
      ctx.globalAlpha = lit ? 1 : 0.25;
      ctx.fillStyle = n === hover || n.id === opts.focus ? textColor : faint;
      ctx.fillText(label, p.x, y);
    }
    ctx.globalAlpha = 1;
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

  const pointers = new Map<number, { x: number; y: number }>();
  let drag: { node: GNode | null; sx: number; sy: number; vx: number; vy: number; moved: boolean } | null = null;
  let pinch: { d: number; k: number } | null = null;

  const local = (e: PointerEvent | WheelEvent) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  canvas.addEventListener('pointerdown', (e) => {
    const p = local(e);
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
    const p = local(e);
    if (pointers.has(e.pointerId)) pointers.set(e.pointerId, p);
    if (pinch && pointers.size === 2) {
      const [a, b] = [...pointers.values()];
      userMoved = true;
      view.k = Math.min(6, Math.max(0.1, pinch.k * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.d)));
      draw();
      return;
    }
    if (drag) {
      const dx = p.x - drag.sx, dy = p.y - drag.sy;
      if (Math.hypot(dx, dy) > 4) drag.moved = userMoved = true;
      if (drag.node) {
        const w = toWorld(p.x, p.y);
        drag.node.fx = w.x; drag.node.fy = w.y;
        if (!reduced()) sim.alphaTarget(0.2).restart();
        else { drag.node.x = w.x; drag.node.y = w.y; }
      } else {
        userMoved = true;
        view.x = drag.vx + dx; view.y = drag.vy + dy;
      }
      draw();
      return;
    }
    const n = pick(p.x, p.y);
    if (n !== hover) {
      hover = n;
      canvas.style.cursor = n ? 'pointer' : 'grab';
      opts.onHover?.(n);
      draw();
    }
  });

  const end = (e: PointerEvent) => {
    pointers.delete(e.pointerId);
    if (pointers.size < 2) pinch = null;
    if (!drag) return;
    const { node, moved } = drag;
    if (node && node.id !== opts.focus) { node.fx = null; node.fy = null; }
    sim.alphaTarget(0);
    drag = null;
    canvas.style.cursor = 'grab';
    if (node && !moved && e.type === 'pointerup') window.location.href = opts.base + node.slug;
  };
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
  canvas.addEventListener('pointerleave', () => { if (!drag && hover) { hover = null; opts.onHover?.(null); draw(); } });

  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = local(e);
    userMoved = true;
    const k = Math.min(6, Math.max(0.1, view.k * Math.exp(-e.deltaY * 0.0015)));
    const w = toWorld(p.x, p.y);
    view.k = k;
    view.x = p.x - width / 2 - w.x * k;
    view.y = p.y - height / 2 - w.y * k;
    draw();
  }, { passive: false });

  // ---- run ---------------------------------------------------------------------
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  sim.on('tick', () => {
    if (!userMoved) fit(); // keep the constellation framed while it settles
    draw();
  });
  if (motionEnabled()) {
    sim.tick(120); // settle off-screen so the first frame is already a constellation
    fit();
    sim.alpha(0.3).restart();
  } else {
    sim.stop();
    sim.tick(300);
    fit();
    draw();
  }
  // Toggling motion off freezes the layout where it is.
  const offMotion = onMotionChange((on) => {
    if (on) sim.alpha(0.05).restart();
    else { sim.stop(); draw(); }
  });

  return {
    /** Highlight nodes whose title/tags match; empty string clears. */
    setFilter(q: string) {
      const s = q.trim().toLowerCase();
      filter = s ? new Set(nodes.filter((n) => n.title.toLowerCase().includes(s) || n.tags.some((t) => t.toLowerCase().includes(s))).map((n) => n.id)) : null;
      draw();
      return filter?.size ?? nodes.length;
    },
    fit() { fit(); draw(); },
    destroy() { sim.stop(); ro.disconnect(); offMotion(); },
  };
}
