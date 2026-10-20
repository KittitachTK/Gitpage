/**
 * Motes of light over the painted garden: pollen drifting in the sun by day,
 * fireflies blinking under the trees at night, golden dust in the light of the
 * Creation fresco. Animates only while visible with motion on.
 */
import { animateWhileVisible } from './motion';

export interface PollenOptions {
  /** Particles per 100 000 px² of canvas. */
  density?: number;
  /** Warm light colour as "r,g,b". */
  color?: string;
  /** Concentrate motes around this point (0–1 of the canvas), e.g. the gap between the fingers. */
  focus?: { x: number; y: number; spread: number };
  /** Read each frame: 0 = sunlit pollen, 1 = fireflies. */
  night?: () => number;
  /** Read each frame: overall visibility 0–1. */
  alpha?: () => number;
}

interface Mote { x: number; y: number; r: number; vx: number; vy: number; ph: number; sp: number; z: number }

export function mountPollen(canvas: HTMLCanvasElement, opts: PollenOptions = {}) {
  const ctx = canvas.getContext('2d')!;
  const color = opts.color ?? '255,226,150';
  let w = 0, h = 0, t = 0;
  let motes: Mote[] = [];

  const spawn = (anywhere: boolean): Mote => {
    let x = Math.random(), y = Math.random();
    if (opts.focus) {
      // Gaussian-ish cloud around the focus point.
      const a = Math.random() * Math.PI * 2, d = Math.sqrt(-2 * Math.log(1 - Math.random() * 0.98)) * opts.focus.spread;
      x = opts.focus.x + Math.cos(a) * d;
      y = opts.focus.y + Math.sin(a) * d * 0.7;
    } else if (!anywhere) {
      y = 1.02;
    }
    const z = Math.random();
    return {
      x, y, z,
      r: 0.6 + z * 1.9,
      vx: (Math.random() - 0.35) * 0.006,
      vy: -(0.004 + Math.random() * 0.01) * (0.5 + z),
      ph: Math.random() * Math.PI * 2,
      sp: 0.4 + Math.random() * 1.2,
    };
  };

  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = Math.max(1, w * dpr);
    canvas.height = Math.max(1, h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(((w * h) / 100000) * (opts.density ?? 1.4));
    motes = Array.from({ length: Math.min(n, 220) }, () => spawn(true));
    draw();
  }

  // One soft sprite, tinted by the colour; cheaper than a gradient per mote.
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = 32;
  {
    const g = sprite.getContext('2d')!;
    const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, `rgba(${color},1)`);
    grad.addColorStop(0.25, `rgba(${color},0.55)`);
    grad.addColorStop(1, `rgba(${color},0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, 32, 32);
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    const night = opts.night?.() ?? 0;
    const alpha = opts.alpha?.() ?? 1;
    if (alpha <= 0.01) return;
    for (const m of motes) {
      // Pollen glints softly; fireflies blink on and off.
      const glint = 0.55 + 0.45 * Math.sin(t * m.sp * 1.6 + m.ph);
      const blink = Math.max(0, Math.sin(t * m.sp * 0.9 + m.ph)) ** 3;
      const a = alpha * ((1 - night) * (0.18 + 0.4 * m.z) * glint + night * (0.15 + 0.85 * blink));
      if (a < 0.01) continue;
      const R = m.r * (3 + night * 3 * blink);
      ctx.globalAlpha = Math.min(1, a);
      ctx.drawImage(sprite, m.x * w - R, m.y * h - R, R * 2, R * 2);
    }
    ctx.globalAlpha = 1;
  }

  const ro = new ResizeObserver(size);
  ro.observe(canvas);
  size();

  let since = 0;
  animateWhileVisible(canvas, (_, dt) => {
    const s = dt / 1000;
    t += s;
    const night = opts.night?.() ?? 0;
    for (let i = 0; i < motes.length; i++) {
      const m = motes[i];
      // Fireflies wander; pollen rises on warm air with a slow sway.
      const sway = Math.sin(t * 0.6 * m.sp + m.ph);
      m.x += (m.vx + sway * 0.004 * (1 + night)) * s;
      m.y += m.vy * s * (1 - night * 0.8) + Math.cos(t * 0.5 * m.sp + m.ph) * 0.003 * night * s;
      if (m.y < -0.04 || m.x < -0.04 || m.x > 1.04 || m.y > 1.06) motes[i] = spawn(false);
    }
    since += dt;
    if (since < 33) return; // ~30 fps is plenty for drifting motes
    since = 0;
    draw();
  }, draw);

  return { redraw: draw };
}
