/**
 * Shared motion policy.
 *
 *   html[data-motion="on"]   explicit choice from the header toggle: animate
 *   html[data-motion="off"]  explicit choice: no animation
 *   (absent)                 follow the OS: animate unless prefers-reduced-motion
 *
 * The choice is remembered in localStorage and applied by an inline script in
 * <head> before first paint, so CSS can rely on it too.
 */

const STORAGE_KEY = 'planktos:motion';
const root = document.documentElement;
const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
const listeners = new Set<(on: boolean) => void>();

export function motionEnabled(): boolean {
  if (root.dataset.motion === 'on') return true;
  if (root.dataset.motion === 'off') return false;
  return !reducedQuery.matches;
}

/** Called whenever motion is switched on/off (toggle or OS setting). */
export function onMotionChange(fn: (on: boolean) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  const on = motionEnabled();
  listeners.forEach((fn) => fn(on));
}

reducedQuery.addEventListener('change', emit);

export function setMotion(on: boolean) {
  root.dataset.motion = on ? 'on' : 'off';
  try {
    localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off');
  } catch {
    // Private mode / blocked storage: the choice lasts for this page only.
  }
  emit();
}

/**
 * Reveal elements as they scroll into view, staggered within each batch.
 * Content is only hidden once this runs with motion on, so it never stays
 * hidden without JavaScript or with motion off.
 */
export function reveal(elements: Iterable<HTMLElement>, stagger = 70) {
  const list = [...elements];
  if (!motionEnabled() || !('IntersectionObserver' in window)) return;
  const show = (el: HTMLElement) => {
    el.classList.add('revealed');
    // Hand the element back to its own transitions (e.g. card hover) afterwards.
    const done = () => {
      el.classList.remove('reveal', 'revealed');
      el.style.transitionDelay = '';
    };
    el.addEventListener('transitionend', done, { once: true });
    setTimeout(done, 1400);
  };
  for (const el of list) el.classList.add('reveal');
  const io = new IntersectionObserver((entries) => {
    entries.filter((e) => e.isIntersecting).forEach((e, i) => {
      const el = e.target as HTMLElement;
      el.style.transitionDelay = `${i * stagger}ms`;
      io.unobserve(el);
      requestAnimationFrame(() => show(el));
    });
  }, { rootMargin: '0px 0px -8% 0px' });
  list.forEach((el) => io.observe(el));
  // Turning motion off mid-way shows everything at once.
  onMotionChange((on) => { if (!on) list.forEach((el) => { io.unobserve(el); el.classList.remove('reveal', 'revealed'); el.style.transitionDelay = ''; }); });
}

/** Count a number up from zero (text content), easing out. */
export function countUp(el: HTMLElement, to: number, ms = 1200, delay = 0) {
  if (!motionEnabled()) return;
  el.textContent = '0';
  const start = performance.now() + delay;
  const tick = (t: number) => {
    const p = Math.max(0, Math.min(1, (t - start) / ms));
    el.textContent = String(Math.round(to * (1 - Math.pow(1 - p, 3))));
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/**
 * Run an animation loop only while it can be seen: motion enabled, element on
 * screen and the tab visible. `frame` receives the elapsed time in ms.
 * Returns a disposer.
 */
export function animateWhileVisible(el: Element, frame: (t: number, dt: number) => void, onStop?: () => void) {
  let raf = 0;
  let last = 0;
  let onScreen = true;

  const tick = (t: number) => {
    const dt = last ? Math.min(t - last, 64) : 16;
    last = t;
    frame(t, dt);
    raf = requestAnimationFrame(tick);
  };
  const update = () => {
    const run = motionEnabled() && onScreen && !document.hidden;
    if (run && !raf) {
      last = 0;
      raf = requestAnimationFrame(tick);
    } else if (!run && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
      onStop?.();
    }
  };

  const io = new IntersectionObserver(([e]) => {
    onScreen = e.isIntersecting;
    update();
  });
  io.observe(el);
  document.addEventListener('visibilitychange', update);
  const off = onMotionChange(update);
  update();

  return () => {
    cancelAnimationFrame(raf);
    io.disconnect();
    document.removeEventListener('visibilitychange', update);
    off();
  };
}
