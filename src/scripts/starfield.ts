/**
 * Home hero sky: drifting, twinkling stars with depth parallax (pointer, or
 * device tilt where the browser allows it without a permission prompt) and an
 * occasional shooting star. Animates only while visible with motion on.
 */
import { animateWhileVisible } from './motion';

interface Meteor { x: number; y: number; vx: number; vy: number; len: number; t: number; life: number }

export function mountStarfield(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d')!;
  const stars = Array.from({ length: 520 }, () => ({ x: Math.random(), y: Math.random(), z: Math.random(), tw: Math.random() * Math.PI * 2 }));
  let w = 0, h = 0, t = 0;
  // Parallax target from pointer/tilt, and an eased value that follows it.
  const target = { x: 0, y: 0 };
  const par = { x: 0, y: 0 };
  let meteors: Meteor[] = [];
  let nextMeteor = 3 + Math.random() * 4;

  function size() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    w = canvas.clientWidth;
    h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function spawnMeteor() {
    const ltr = Math.random() < 0.5;
    const angle = (ltr ? 0.35 : Math.PI - 0.35) + (Math.random() - 0.5) * 0.3;
    const speed = 520 + Math.random() * 380; // px/s
    meteors.push({
      x: w * (0.15 + Math.random() * 0.7), y: h * Math.random() * 0.45,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      len: 90 + Math.random() * 110, t: 0, life: 0.7 + Math.random() * 0.5,
    });
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      const depth = 0.2 + s.z * 0.8;
      const x = (((s.x * w + t * 4 * depth + par.x * 22 * depth) % w) + w) % w;
      const y = s.y * h + par.y * 14 * depth;
      const a = 0.25 + 0.55 * depth * (0.75 + 0.25 * Math.sin(s.tw + t * 2));
      const bright = s.z > 0.97;
      ctx.globalAlpha = a;
      if (bright) {
        ctx.fillStyle = 'rgb(232,212,172)'; // pale gold
        ctx.beginPath();
        ctx.arc(x, y, 1.1, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Sub-pixel stars: a square is indistinguishable from a circle and far cheaper.
        const r = (0.4 + depth) * 0.7;
        ctx.fillStyle = 'rgb(230,226,216)'; // warm white
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
      }
    }
    ctx.globalAlpha = 1;
    for (const m of meteors) {
      const k = m.t / m.life;
      const fade = Math.sin(Math.PI * Math.min(1, k)); // in and out
      const speed = Math.hypot(m.vx, m.vy);
      const tx = m.x - (m.vx / speed) * m.len, ty = m.y - (m.vy / speed) * m.len;
      const g = ctx.createLinearGradient(m.x, m.y, tx, ty);
      g.addColorStop(0, `rgba(240,232,214,${0.85 * fade})`);
      g.addColorStop(1, 'rgba(240,232,214,0)');
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(m.x, m.y); ctx.lineTo(tx, ty); ctx.stroke();
    }
  }

  addEventListener('resize', size);
  addEventListener('pointermove', (e) => {
    target.x = e.clientX / innerWidth - 0.5;
    target.y = e.clientY / innerHeight - 0.5;
  });
  // Tilt parallax on phones that expose orientation without a permission prompt.
  const DOE = (window as unknown as { DeviceOrientationEvent?: { requestPermission?: unknown } }).DeviceOrientationEvent;
  if (DOE && typeof DOE.requestPermission !== 'function') {
    addEventListener('deviceorientation', (e) => {
      if (e.gamma == null || e.beta == null) return;
      target.x = Math.max(-0.5, Math.min(0.5, e.gamma / 60));
      target.y = Math.max(-0.5, Math.min(0.5, (e.beta - 45) / 60));
    });
  }

  size();
  // Stars drift ~4 px/s: 30 fps is plenty, except while a meteor streaks across.
  let sinceDraw = 0;
  animateWhileVisible(canvas, (_, dt) => {
    sinceDraw += dt;
    const s = dt / 1000;
    t += s;
    par.x += (target.x - par.x) * Math.min(1, s * 3);
    par.y += (target.y - par.y) * Math.min(1, s * 3);
    nextMeteor -= s;
    if (nextMeteor <= 0) { spawnMeteor(); nextMeteor = 8 + Math.random() * 7; }
    for (const m of meteors) { m.t += s; m.x += m.vx * s; m.y += m.vy * s; }
    meteors = meteors.filter((m) => m.t < m.life);
    if (!meteors.length && sinceDraw < 33) return;
    sinceDraw = 0;
    draw();
  }, () => { meteors = []; draw(); });

  return { parallax: () => par };
}
